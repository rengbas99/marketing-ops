/**
 * Script to check if a user is currently clocked in
 * Usage: node scripts/check-clockin-status.js --employee=email
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs
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
 * Check clock-in status
 */
async function checkClockInStatus() {
  try {
    if (!employeeEmail) {
      console.error('❌ --employee parameter is required');
      console.error('Usage: node scripts/check-clockin-status.js --employee=email');
      process.exit(1);
    }

    const today = new Date().toISOString().split('T')[0];
    console.log(`🔍 Checking clock-in status for: ${employeeEmail}`);
    console.log(`📅 Date: ${today}\n`);

    const attendanceRef = collection(db, 'Attendance');
    const querySnapshot = await getDocs(attendanceRef);
    
    // Helper to get date from record
    const getRecordDate = (record) => {
      if (record.date) {
        return new Date(record.date).toISOString().split('T')[0];
      }
      if (record.clock_in) {
        return new Date(record.clock_in).toISOString().split('T')[0];
      }
      return null;
    };
    
    const todayRecords = [];
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      
      // Check if this is a record for the specified employee and today
      if (data.employee_id && data.employee_id.trim() === employeeEmail.trim()) {
        const recordDate = getRecordDate(data);
        if (recordDate === today) {
          todayRecords.push({
            id: docId,
            employee_id: data.employee_id,
            date: recordDate,
            clock_in: data.clock_in,
            clock_out: data.clock_out,
            status: data.status,
            hours_worked: data.hours_worked,
          });
        }
      }
    });
    
    if (todayRecords.length === 0) {
      console.log('❌ No attendance records found for today');
      console.log(`   Employee: ${employeeEmail}`);
      console.log(`   Date: ${today}`);
      console.log(`\n✅ Status: NOT CLOCKED IN`);
      process.exit(0);
    }
    
    // Find active clock-in (no clock_out)
    const activeClockIn = todayRecords.find(r => 
      r.clock_in && !r.clock_out && (r.status === 'clocked_in' || !r.status)
    );
    
    console.log(`📊 Found ${todayRecords.length} record(s) for today:\n`);
    
    todayRecords.forEach((record, index) => {
      console.log(`${index + 1}. Record ID: ${record.id.substring(0, 12)}...`);
      console.log(`   Clock In: ${record.clock_in ? new Date(record.clock_in).toLocaleString() : 'N/A'}`);
      console.log(`   Clock Out: ${record.clock_out ? new Date(record.clock_out).toLocaleString() : 'None (Active)'}`);
      console.log(`   Status: ${record.status || 'N/A'}`);
      console.log(`   Hours Worked: ${record.hours_worked || 'N/A'}`);
      console.log('');
    });
    
    if (activeClockIn) {
      const clockInTime = new Date(activeClockIn.clock_in);
      const now = new Date();
      const diff = now - clockInTime;
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      console.log('─'.repeat(60));
      console.log(`\n✅ STATUS: CLOCKED IN`);
      console.log(`   Clock In Time: ${clockInTime.toLocaleString()}`);
      console.log(`   Elapsed Time: ${hours}h ${minutes}m`);
      console.log(`   Record ID: ${activeClockIn.id}`);
    } else {
      console.log('─'.repeat(60));
      console.log(`\n❌ STATUS: NOT CLOCKED IN`);
      console.log(`   All records for today have been clocked out`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the check
checkClockInStatus()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

