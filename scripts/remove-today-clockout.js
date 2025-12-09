/**
 * Script to remove clock-out times that were applied today
 * This is for records where people are still working today
 * Usage: node scripts/remove-today-clockout.js [--apply]
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs,
  updateDoc,
  doc,
  deleteField
} from 'firebase/firestore';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

// Parse command line arguments
const args = process.argv.slice(2);
const shouldApply = args.includes('--apply');
const dryRun = !shouldApply;

// Initialize Firebase
let app;
let db;

try {
  const missingVars = [];
  if (!firebaseConfig.apiKey) missingVars.push('VITE_FIREBASE_API_KEY');
  if (!firebaseConfig.authDomain) missingVars.push('VITE_FIREBASE_AUTH_DOMAIN');
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
  console.log(`   Project: ${firebaseConfig.projectId}\n`);
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

/**
 * Remove clock-out times for today's records
 */
async function removeTodayClockOut() {
  try {
    console.log('🔍 Finding records with clock-out times applied today...\n');
    console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'APPLY (will remove clock-out times)'}\n`);

    const today = new Date().toISOString().split('T')[0];
    const attendanceRef = collection(db, 'Attendance');
    const querySnapshot = await getDocs(attendanceRef);
    
    const recordsToFix = [];
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      
      // Find records that:
      // 1. Have clock_out (was clocked out)
      // 2. Are from today
      // 3. Have clock_in
      if (data.clock_out && data.clock_in) {
        const recordDate = data.date ? new Date(data.date).toISOString().split('T')[0] : 
                          (data.clock_in ? new Date(data.clock_in).toISOString().split('T')[0] : null);
        
        if (recordDate === today) {
          // Check if this was auto-applied (has the script message in daily_report)
          const wasAutoApplied = data.daily_report && 
            (data.daily_report.includes('Auto clocked out') || 
             data.daily_report.includes('clock-out time applied'));
          
          recordsToFix.push({
            id: docId,
            employee_id: data.employee_id || 'Unknown',
            date: recordDate,
            clock_in: data.clock_in,
            clock_out: data.clock_out,
            status: data.status,
            wasAutoApplied,
            daily_report: data.daily_report
          });
        }
      }
    });
    
    console.log(`📊 Found ${recordsToFix.length} record(s) with clock-out times from today\n`);
    
    if (recordsToFix.length === 0) {
      console.log('✅ No records found that need clock-out times removed!');
      return;
    }
    
    // Group by employee
    const recordsByEmployee = {};
    recordsToFix.forEach(record => {
      const email = record.employee_id.trim();
      if (!recordsByEmployee[email]) {
        recordsByEmployee[email] = [];
      }
      recordsByEmployee[email].push(record);
    });
    
    console.log('📋 Records by Employee:');
    console.log('─'.repeat(60));
    Object.keys(recordsByEmployee).sort().forEach(email => {
      const count = recordsByEmployee[email].length;
      console.log(`   ${email}: ${count} record(s)`);
    });
    console.log('');
    
    // Detailed list
    console.log('📝 Detailed Records:');
    console.log('─'.repeat(100));
    recordsToFix.forEach((record, index) => {
      console.log(`\n${index + 1}. Record ID: ${record.id}`);
      console.log(`   Employee: ${record.employee_id}`);
      console.log(`   Date: ${record.date}`);
      console.log(`   Clock In: ${new Date(record.clock_in).toLocaleTimeString()}`);
      console.log(`   Clock Out: ${new Date(record.clock_out).toLocaleTimeString()} (will be removed)`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Auto-applied: ${record.wasAutoApplied ? 'Yes' : 'No'}`);
    });
    console.log('\n' + '─'.repeat(100));
    
    // Remove clock-out times if requested
    if (!dryRun && recordsToFix.length > 0) {
      console.log('\n🔄 Removing clock-out times for today...\n');
      
      let updated = 0;
      let errors = 0;
      
      for (const record of recordsToFix) {
        try {
          const docRef = doc(db, 'Attendance', record.id);
          
          // Remove clock_out, set status back to clocked_in, clear hours_worked
          // Use deleteField() to properly remove fields in Firestore
          await updateDoc(docRef, {
            clock_out: deleteField(),
            status: 'clocked_in',
            hours_worked: deleteField(),
            // Keep daily_report as is (don't overwrite)
          });
          
          console.log(`   ✅ Removed clock-out for ${record.employee_id.trim()} (${record.date})`);
          updated++;
        } catch (err) {
          console.error(`   ❌ Error updating record ${record.id}:`, err.message);
          errors++;
        }
      }
      
      console.log(`\n✅ Successfully updated ${updated} record(s)`);
      if (errors > 0) {
        console.log(`⚠️  ${errors} error(s) occurred`);
      }
    } else if (dryRun && recordsToFix.length > 0) {
      console.log('\n💡 To remove clock-out times, run with --apply flag:');
      console.log(`   node scripts/remove-today-clockout.js --apply\n`);
    }
    
  } catch (error) {
    console.error('❌ Error processing records:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the function
removeTodayClockOut()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

