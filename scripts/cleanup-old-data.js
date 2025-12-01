/**
 * Cleanup Script: Remove all data before 25/11/2025
 * Keeps Users collection, removes attendance and other mock data before cutoff date
 * 
 * Usage:
 *   node scripts/cleanup-old-data.js
 * 
 * Requirements:
 *   - Firebase env vars set in .env or environment
 *   - Firebase project must have Firestore enabled
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs,
  query,
  where,
  deleteDoc,
  doc,
  Timestamp
} from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

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

// Cutoff date: November 25, 2025
const CUTOFF_DATE = new Date('2025-11-25T00:00:00.000Z');

// Collections to clean (excluding Users)
const COLLECTIONS_TO_CLEAN = [
  'Attendance',
  'Photographer_Attendance',
  'Editor_Time_Logs',
  'Time_Breaks',
  'Shoots',
  'Assets',
  'Content_Calendar',
  'Asset_Comments',
  'Leave_Requests',
  'Monthly_Hours',
];

// Initialize Firebase
let app;
let db;

try {
  const missingVars = [];
  if (!firebaseConfig.apiKey) missingVars.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.projectId) missingVars.push('VITE_FIREBASE_PROJECT_ID');
  
  if (missingVars.length > 0) {
    console.error('❌ Firebase configuration missing!');
    console.error('\nMissing environment variables:');
    missingVars.forEach(v => console.error(`   - ${v}`));
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

/**
 * Get date from document (handles various date formats)
 */
function getDocumentDate(docData) {
  // Try different date fields
  const dateFields = ['date', 'created_at', 'updated_at', 'clock_in', 'start_time', 'shoot_date'];
  
  for (const field of dateFields) {
    if (docData[field]) {
      try {
        let date;
        if (docData[field] instanceof Timestamp) {
          date = docData[field].toDate();
        } else if (docData[field]?.toDate) {
          date = docData[field].toDate();
        } else if (typeof docData[field] === 'string') {
          date = new Date(docData[field]);
        } else if (docData[field] instanceof Date) {
          date = docData[field];
        }
        
        if (date && !isNaN(date.getTime())) {
          return date;
        }
      } catch (e) {
        // Continue to next field
      }
    }
  }
  
  return null;
}

/**
 * Clean a single collection
 */
async function cleanCollection(collectionName) {
  console.log(`\n📦 Cleaning "${collectionName}"...`);
  
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
      console.log(`   ✅ Collection is empty, nothing to clean`);
      return { deleted: 0, kept: 0 };
    }
    
    let deleted = 0;
    let kept = 0;
    
    for (const docSnap of snapshot.docs) {
      const docData = docSnap.data();
      const docDate = getDocumentDate(docData);
      
      // If no date found, keep the document (don't delete unknown dates)
      if (!docDate) {
        kept++;
        continue;
      }
      
      // Only delete if date is before cutoff
      if (docDate < CUTOFF_DATE) {
        try {
          await deleteDoc(doc(db, collectionName, docSnap.id));
          deleted++;
          if (deleted % 10 === 0) {
            process.stdout.write(`   Deleted ${deleted} documents...\r`);
          }
        } catch (error) {
          console.error(`   ⚠️  Error deleting document ${docSnap.id}:`, error.message);
        }
      } else {
        kept++;
      }
    }
    
    console.log(`   ✅ Deleted ${deleted} documents, kept ${kept} documents`);
    return { deleted, kept };
  } catch (error) {
    console.error(`   ❌ Error cleaning ${collectionName}:`, error.message);
    return { deleted: 0, kept: 0, error: error.message };
  }
}

/**
 * Main cleanup function
 */
async function cleanup() {
  console.log('🧹 Starting data cleanup...\n');
  console.log(`📅 Cutoff Date: ${CUTOFF_DATE.toISOString().split('T')[0]}`);
  console.log(`   All records before this date will be deleted\n`);
  console.log(`📋 Collections to clean: ${COLLECTIONS_TO_CLEAN.join(', ')}`);
  console.log(`✅ Users collection will be preserved\n`);
  
  const results = {};
  let totalDeleted = 0;
  let totalKept = 0;
  
  // Clean each collection
  for (const collectionName of COLLECTIONS_TO_CLEAN) {
    const result = await cleanCollection(collectionName);
    results[collectionName] = result;
    totalDeleted += result.deleted || 0;
    totalKept += result.kept || 0;
    
    // Small delay between collections
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 CLEANUP SUMMARY');
  console.log('='.repeat(60));
  
  COLLECTIONS_TO_CLEAN.forEach(name => {
    const result = results[name];
    if (result.error) {
      console.log(`❌ ${name}: Error - ${result.error}`);
    } else {
      console.log(`✅ ${name}: Deleted ${result.deleted || 0}, Kept ${result.kept || 0}`);
    }
  });
  
  console.log('='.repeat(60));
  console.log(`Total deleted: ${totalDeleted} documents`);
  console.log(`Total kept: ${totalKept} documents`);
  console.log('='.repeat(60));
  
  console.log('\n✅ Cleanup complete!');
  console.log('   All data before 25/11/2025 has been removed.');
  console.log('   Users collection has been preserved.');
}

// Run cleanup
cleanup()
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Cleanup failed:', error);
    process.exit(1);
  });

