/**
 * Data Migration Script: Google Sheets → Firebase Firestore
 * 
 * This script migrates all data from Google Sheets to Firebase Firestore.
 * It preserves all data structure and handles authentication.
 * 
 * Usage:
 *   node scripts/migrate-to-firebase.js
 * 
 * Requirements:
 *   - Firebase env vars set in .env or environment
 *   - Google Sheets API key and Sheet ID in .env
 *   - Firebase project must have Firestore enabled
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc,
  addDoc,
  getDocs,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import https from 'https';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../.env') });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Google Sheets configuration
const GOOGLE_SHEET_ID = process.env.VITE_GOOGLE_SHEET_ID;
const GOOGLE_API_KEY = process.env.VITE_GOOGLE_API_KEY;
const GOOGLE_SHEETS_API = 'https://sheets.googleapis.com/v4/spreadsheets';

// Collections to migrate (matching Google Sheets names)
const COLLECTIONS = [
  'Users',
  'Clients',
  'Shoots',
  'Assets',
  'Photographer_Attendance',
  'Editor_Time_Logs',
  'Time_Breaks',
  'Content_Calendar',
  'Asset_Comments',
  'Leave_Requests',
  'Attendance',
  'Monthly_Hours',
];

// Initialize Firebase
let app;
let db;

try {
  // Check for missing Firebase config
  const missingVars = [];
  if (!firebaseConfig.apiKey) missingVars.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.authDomain) missingVars.push('VITE_FIREBASE_AUTH_DOMAIN');
  if (!firebaseConfig.projectId) missingVars.push('VITE_FIREBASE_PROJECT_ID');
  if (!firebaseConfig.storageBucket) missingVars.push('VITE_FIREBASE_STORAGE_BUCKET');
  if (!firebaseConfig.messagingSenderId) missingVars.push('VITE_FIREBASE_MESSAGING_SENDER_ID');
  if (!firebaseConfig.appId) missingVars.push('VITE_FIREBASE_APP_ID');
  
  if (missingVars.length > 0) {
    console.error('❌ Firebase configuration missing!');
    console.error('\nMissing environment variables:');
    missingVars.forEach(v => console.error(`   - ${v}`));
    console.error('\nPlease add these to your .env file in marketing-ops/.env');
    console.error('You can get these values from:');
    console.error('   1. Firebase Console → Project Settings → General → Your apps');
    console.error('   2. Or copy from Vercel environment variables');
    console.error('\nExample .env format:');
    console.error('   VITE_FIREBASE_API_KEY=your_api_key_here');
    console.error('   VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com');
    console.error('   VITE_FIREBASE_PROJECT_ID=your_project_id');
    console.error('   VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com');
    console.error('   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id');
    console.error('   VITE_FIREBASE_APP_ID=your_app_id');
    process.exit(1);
  }
  
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('✅ Firebase initialized successfully');
  console.log(`   Project: ${firebaseConfig.projectId}`);
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

// Helper: Fetch data from Google Sheets
async function fetchSheetData(sheetName) {
  if (!GOOGLE_SHEET_ID || !GOOGLE_API_KEY) {
    throw new Error('Google Sheets credentials missing. Please set VITE_GOOGLE_SHEET_ID and VITE_GOOGLE_API_KEY.');
  }

  const url = `${GOOGLE_SHEETS_API}/${GOOGLE_SHEET_ID}/values/${sheetName}?key=${GOOGLE_API_KEY}`;
  
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const responseData = JSON.parse(data);
          
          if (responseData.error) {
            if (responseData.error.code === 400 || responseData.error.code === 404) {
              console.warn(`⚠️  Sheet "${sheetName}" not found - skipping`);
              resolve([]);
              return;
            }
            reject(new Error(`Google Sheets API error: ${responseData.error.message}`));
            return;
          }
          
          if (!responseData.values || responseData.values.length === 0) {
            console.log(`ℹ️  Sheet "${sheetName}" is empty`);
            resolve([]);
            return;
          }
          
          // Parse sheet data: first row is headers, rest is data
          const [headers, ...rows] = responseData.values;
          
          // Filter out empty rows
          const dataRows = rows.filter(row => row && row.length > 0 && row.some(cell => cell && cell.trim()));
          
          // Convert to array of objects
          const parsedData = dataRows.map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              const value = row[index] || '';
              // Preserve empty strings and null values
              obj[header] = value === '' ? '' : value;
            });
            return obj;
          });
          
          resolve(parsedData);
        } catch (error) {
          reject(new Error(`Failed to parse sheet data: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(new Error(`Network error: ${error.message}`));
    });
  });
}

// Helper: Check if collection already has data
async function collectionHasData(collectionName) {
  try {
    const snapshot = await getDocs(collection(db, collectionName));
    return !snapshot.empty;
  } catch (error) {
    // If permission denied, we'll proceed anyway (might be first migration)
    if (error.code === 'permission-denied') {
      console.warn(`   ⚠️  Permission denied checking ${collectionName} - will proceed (may need to set Firestore rules)`);
      return false; // Assume empty, proceed with migration
    }
    console.error(`   ⚠️  Error checking ${collectionName}:`, error.message);
    return false;
  }
}

// Helper: Migrate a single collection
async function migrateCollection(collectionName, dryRun = false) {
  console.log(`\n📦 Migrating "${collectionName}"...`);
  
  try {
    // Check if collection already has data
    const hasData = await collectionHasData(collectionName);
    if (hasData) {
      console.log(`⚠️  Collection "${collectionName}" already has data. Skipping to avoid duplicates.`);
      console.log(`   To re-migrate, delete the collection in Firebase Console first.`);
      return { success: false, skipped: true, count: 0 };
    }
    
    // Fetch data from Google Sheets
    console.log(`   Fetching data from Google Sheets...`);
    const sheetData = await fetchSheetData(collectionName);
    
    if (sheetData.length === 0) {
      console.log(`   ✅ No data to migrate (sheet is empty)`);
      return { success: true, count: 0 };
    }
    
    console.log(`   Found ${sheetData.length} rows`);
    
    if (dryRun) {
      console.log(`   [DRY RUN] Would migrate ${sheetData.length} documents`);
      return { success: true, count: sheetData.length, dryRun: true };
    }
    
    // Migrate in batches (Firestore limit: 500 per batch)
    const BATCH_SIZE = 500;
    let migrated = 0;
    let errors = 0;
    
    for (let i = 0; i < sheetData.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const batchData = sheetData.slice(i, i + BATCH_SIZE);
      
      batchData.forEach((row) => {
        // Prepare document data
        const docData = {
          ...row,
          // Add metadata
          migrated_at: serverTimestamp(),
          // Preserve original timestamps if they exist
          created_at: row.created_at || serverTimestamp(),
          updated_at: row.updated_at || serverTimestamp(),
        };
        
        // Remove empty id field if it exists (Firestore will generate its own)
        if (docData.id === '' || docData.id === undefined) {
          delete docData.id;
        }
        
        // Create a new document reference (Firestore will auto-generate ID)
        const docRef = doc(collection(db, collectionName));
        batch.set(docRef, docData);
      });
      
      try {
        await batch.commit();
        migrated += batchData.length;
        console.log(`   ✅ Migrated batch: ${migrated}/${sheetData.length} documents`);
      } catch (error) {
        console.error(`   ❌ Error migrating batch:`, error.message);
        errors += batchData.length;
      }
    }
    
    if (errors > 0) {
      console.log(`   ⚠️  Completed with ${errors} errors`);
      return { success: false, count: migrated, errors };
    }
    
    console.log(`   ✅ Successfully migrated ${migrated} documents`);
    return { success: true, count: migrated };
    
  } catch (error) {
    console.error(`   ❌ Error migrating "${collectionName}":`, error.message);
    return { success: false, error: error.message, count: 0 };
  }
}

// Main migration function
async function migrateAll(dryRun = false) {
  console.log('🚀 Starting data migration from Google Sheets to Firebase...\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no data will be written)' : 'LIVE MIGRATION'}\n`);
  
  // Verify configuration
  if (!GOOGLE_SHEET_ID || !GOOGLE_API_KEY) {
    console.error('❌ Google Sheets credentials missing!');
    console.error('   Please set VITE_GOOGLE_SHEET_ID and VITE_GOOGLE_API_KEY in .env');
    process.exit(1);
  }
  
  console.log(`📊 Google Sheet ID: ${GOOGLE_SHEET_ID}`);
  console.log(`🔥 Firebase Project: ${firebaseConfig.projectId}\n`);
  
  const results = {};
  let totalMigrated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  
  // Migrate each collection
  for (const collectionName of COLLECTIONS) {
    const result = await migrateCollection(collectionName, dryRun);
    results[collectionName] = result;
    
    if (result.skipped) {
      totalSkipped++;
    } else if (result.success) {
      totalMigrated += result.count;
    } else {
      totalErrors++;
    }
    
    // Small delay between collections to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 MIGRATION SUMMARY');
  console.log('='.repeat(60));
  
  COLLECTIONS.forEach(name => {
    const result = results[name];
    if (result.skipped) {
      console.log(`⏭️  ${name}: Skipped (already has data)`);
    } else if (result.success) {
      console.log(`✅ ${name}: ${result.count} documents`);
    } else {
      console.log(`❌ ${name}: Failed - ${result.error || 'Unknown error'}`);
    }
  });
  
  console.log('='.repeat(60));
  console.log(`Total migrated: ${totalMigrated} documents`);
  if (totalSkipped > 0) {
    console.log(`Total skipped: ${totalSkipped} collections (already have data)`);
  }
  if (totalErrors > 0) {
    console.log(`Total errors: ${totalErrors} collections`);
  }
  console.log('='.repeat(60));
  
  if (dryRun) {
    console.log('\n⚠️  This was a DRY RUN. No data was actually migrated.');
    console.log('   Run without --dry-run to perform the actual migration.');
  } else {
    console.log('\n✅ Migration complete!');
    console.log('   Your Firebase collections are now populated with Google Sheets data.');
  }
}

// Run migration
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run') || args.includes('-d');

migrateAll(dryRun)
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  });

