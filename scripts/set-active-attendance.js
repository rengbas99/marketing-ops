/**
 * Script to set a specific attendance record as active (clocked in)
 * Usage: node scripts/set-active-attendance.js --employee=email --date=YYYY-MM-DD [--apply]
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
 * Set attendance record as active
 */
async function setActiveAttendance() {
  try {
    if (!employeeEmail || !date) {
      console.error('❌ Both --employee and --date are required');
      console.error('Usage: node scripts/set-active-attendance.js --employee=email --date=YYYY-MM-DD [--apply]');
      process.exit(1);
    }

    console.log('🔍 Finding attendance record...\n');
    console.log(`   Employee: ${employeeEmail}`);
    console.log(`   Date: ${date}`);
    console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'APPLY (will update record)'}\n`);

    const attendanceRef = collection(db, 'Attendance');
    const querySnapshot = await getDocs(attendanceRef);
    
    let foundRecord = null;
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      
      // Check if this is the record we're looking for
      const recordDate = data.date ? new Date(data.date).toISOString().split('T')[0] : 
                        (data.clock_in ? new Date(data.clock_in).toISOString().split('T')[0] : null);
      
      if (recordDate === date && 
          data.employee_id && 
          data.employee_id.trim() === employeeEmail.trim() &&
          data.clock_in) {
        foundRecord = {
          id: docId,
          employee_id: data.employee_id,
          date: recordDate,
          clock_in: data.clock_in,
          clock_out: data.clock_out,
          status: data.status,
          hours_worked: data.hours_worked,
        };
      }
    });
    
    if (!foundRecord) {
      console.log('❌ Record not found!');
      console.log(`   Looking for: ${employeeEmail} on ${date}`);
      process.exit(1);
    }
    
    console.log('📋 Found Record:');
    console.log('─'.repeat(60));
    console.log(`   Record ID: ${foundRecord.id}`);
    console.log(`   Employee: ${foundRecord.employee_id}`);
    console.log(`   Date: ${foundRecord.date}`);
    console.log(`   Clock In: ${new Date(foundRecord.clock_in).toLocaleString()}`);
    console.log(`   Clock Out: ${foundRecord.clock_out ? new Date(foundRecord.clock_out).toLocaleString() : 'None (will be removed)'}`);
    console.log(`   Status: ${foundRecord.status} → clocked_in`);
    console.log(`   Hours Worked: ${foundRecord.hours_worked || 'None (will be removed)'}`);
    console.log('─'.repeat(60));
    
    if (!dryRun) {
      console.log('\n🔄 Setting record as active attendance...\n');
      
      try {
        const docRef = doc(db, 'Attendance', foundRecord.id);
        
        // Set as active: remove clock_out, set status to clocked_in, remove hours_worked
        await updateDoc(docRef, {
          clock_out: deleteField(),
          status: 'clocked_in',
          hours_worked: deleteField(),
          // Keep clock_in and date as is
        });
        
        console.log(`   ✅ Successfully set record as active attendance`);
        console.log(`   ✅ Employee can now clock out manually when work is complete`);
      } catch (err) {
        console.error(`   ❌ Error updating record:`, err.message);
        process.exit(1);
      }
    } else {
      console.log('\n💡 To apply changes, run with --apply flag:');
      console.log(`   node scripts/set-active-attendance.js --employee=${employeeEmail} --date=${date} --apply\n`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the function
setActiveAttendance()
  .then(() => {
    console.log('\n✅ Completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

