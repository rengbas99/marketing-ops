/**
 * Script to fix duplicate clock-in sessions on the same day
 * Clocks out the earlier session when the later session started
 * Usage: node scripts/fix-duplicate-sessions.js --employee=email --date=YYYY-MM-DD [--apply]
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs,
  updateDoc,
  doc
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
const employeeEmail = args.find(arg => arg.startsWith('--employee='))?.split('=')[1] || null;
const date = args.find(arg => arg.startsWith('--date='))?.split('=')[1] || null;
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
    process.exit(1);
  }
  
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  console.log('✅ Firebase initialized successfully\n');
} catch (error) {
  console.error('❌ Firebase initialization error:', error.message);
  process.exit(1);
}

/**
 * Fix duplicate sessions by clocking out earlier session when later one started
 */
async function fixDuplicateSessions() {
  try {
    if (!employeeEmail || !date) {
      console.error('❌ Both --employee and --date are required');
      console.error('Usage: node scripts/fix-duplicate-sessions.js --employee=email --date=YYYY-MM-DD [--apply]');
      process.exit(1);
    }

    console.log('🔍 Finding duplicate clock-in sessions...\n');
    console.log(`   Employee: ${employeeEmail}`);
    console.log(`   Date: ${date}`);
    console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'APPLY (will update records)'}\n`);

    const attendanceRef = collection(db, 'Attendance');
    const querySnapshot = await getDocs(attendanceRef);
    
    const records = [];
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      
      // Check if this is a record for the specified employee and date
      const recordDate = data.date ? new Date(data.date).toISOString().split('T')[0] : 
                        (data.clock_in ? new Date(data.clock_in).toISOString().split('T')[0] : null);
      
      if (recordDate === date && 
          data.employee_id && 
          data.employee_id.trim() === employeeEmail.trim() &&
          data.clock_in) {
        records.push({
          id: docId,
          employee_id: data.employee_id,
          date: recordDate,
          clock_in: new Date(data.clock_in),
          clock_out: data.clock_out ? new Date(data.clock_out) : null,
          status: data.status,
          hours_worked: data.hours_worked,
        });
      }
    });
    
    if (records.length === 0) {
      console.log('❌ No records found!');
      process.exit(1);
    }
    
    // Sort by clock_in time
    records.sort((a, b) => a.clock_in - b.clock_in);
    
    console.log(`📋 Found ${records.length} record(s) for ${employeeEmail} on ${date}\n`);
    
    // Find records that need to be clocked out (have clock_in but no clock_out)
    const activeRecords = records.filter(r => !r.clock_out);
    
    if (activeRecords.length < 2) {
      console.log('✅ No duplicate active sessions found. All good!');
      process.exit(0);
    }
    
    console.log(`⚠️  Found ${activeRecords.length} active session(s) on the same day\n`);
    
    // Clock out all but the last one (keep the most recent as active)
    const recordsToClockOut = activeRecords.slice(0, -1); // All except the last one
    const keepActive = activeRecords[activeRecords.length - 1]; // The most recent one
    
    console.log('📝 Plan:');
    console.log('─'.repeat(60));
    recordsToClockOut.forEach((record, index) => {
      const clockOutTime = activeRecords[index + 1].clock_in; // Clock out when next session started
      const totalMinutes = (clockOutTime - record.clock_in) / (1000 * 60);
      const hours = (totalMinutes / 60).toFixed(2);
      
      console.log(`\n${index + 1}. Record ${record.id.substring(0, 8)}...`);
      console.log(`   Clock In: ${record.clock_in.toLocaleString()}`);
      console.log(`   Clock Out: ${clockOutTime.toLocaleString()} (when next session started)`);
      console.log(`   Hours: ${hours}h`);
      console.log(`   Status: ${record.status} → clocked_out`);
    });
    
    console.log(`\n✅ Keep Active: Record ${keepActive.id.substring(0, 8)}...`);
    console.log(`   Clock In: ${keepActive.clock_in.toLocaleString()}`);
    console.log(`   Status: ${keepActive.status} (stays clocked_in)`);
    console.log('─'.repeat(60));
    
    if (!dryRun) {
      console.log('\n🔄 Applying changes...\n');
      
      let updated = 0;
      let errors = 0;
      
      for (let i = 0; i < recordsToClockOut.length; i++) {
        const record = recordsToClockOut[i];
        const clockOutTime = activeRecords[i + 1].clock_in; // Clock out when next session started
        
        try {
          const totalMinutes = (clockOutTime - record.clock_in) / (1000 * 60);
          const breakMinutes = 0; // Assuming no break data
          const workMinutes = Math.max(0, totalMinutes - breakMinutes);
          const hoursWorked = workMinutes / 60;
          
          const docRef = doc(db, 'Attendance', record.id);
          await updateDoc(docRef, {
            clock_out: clockOutTime.toISOString(),
            status: 'clocked_out',
            hours_worked: hoursWorked.toFixed(2),
          });
          
          console.log(`   ✅ Clocked out record ${record.id.substring(0, 8)}... at ${clockOutTime.toLocaleTimeString()}`);
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
      console.log(`✅ Kept record ${keepActive.id.substring(0, 8)}... as active (clocked in)`);
    } else {
      console.log('\n💡 To apply changes, run with --apply flag:');
      console.log(`   node scripts/fix-duplicate-sessions.js --employee=${employeeEmail} --date=${date} --apply\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the function
fixDuplicateSessions()
  .then(() => {
    console.log('\n✅ Completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

