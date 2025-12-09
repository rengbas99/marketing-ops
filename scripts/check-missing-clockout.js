/**
 * Script to check for attendance records missing clock-out times
 * Usage: node scripts/check-missing-clockout.js [--employee=email] [--month=YYYY-MM] [--apply]
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs,
  query,
  where,
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
const month = args.find(arg => arg.startsWith('--month='))?.split('=')[1] || null;
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
    console.error('\nPlease add these to your .env file in marketing-ops/.env');
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
 * Check for records missing clock-out times
 */
async function checkMissingClockOut() {
  try {
    console.log('🔍 Checking for attendance records missing clock-out times...\n');
    
    if (employeeEmail) {
      console.log(`   Filtering by employee: ${employeeEmail}`);
    }
    if (month) {
      console.log(`   Filtering by month: ${month}`);
    }
    console.log(`   Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'APPLY (will update records)'}\n`);

    const attendanceRef = collection(db, 'Attendance');
    
    // Build query
    let q = query(attendanceRef);
    
    // Get all documents (Firestore doesn't support querying for missing fields directly)
    const querySnapshot = await getDocs(q);
    
    const recordsMissingClockOut = [];
    const recordsByEmployee = {};
    const recordsByMonth = {};
    
    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      const docId = docSnapshot.id;
      
      // Check if record has clock_in but no clock_out
      if (data.clock_in && !data.clock_out) {
        // Skip today's records (people might still be working)
        const recordDate = data.date ? new Date(data.date).toISOString().split('T')[0] : 
                          (data.clock_in ? new Date(data.clock_in).toISOString().split('T')[0] : null);
        const today = new Date().toISOString().split('T')[0];
        if (recordDate === today) {
          return; // Skip today's records
        }
        
        // Filter by employee email if provided (trim both for comparison)
        if (employeeEmail && data.employee_id?.trim() !== employeeEmail.trim()) {
          return;
        }
        
        // Filter by month if provided
        if (month) {
          if (recordDate) {
            const recordMonth = recordDate.slice(0, 7); // YYYY-MM
            if (recordMonth !== month) {
              return;
            }
          } else {
            return; // Skip if no date can be determined
          }
        }
        
        const record = {
          id: docId,
          employee_id: data.employee_id || 'Unknown',
          date: data.date || (data.clock_in ? new Date(data.clock_in).toISOString().split('T')[0] : 'Unknown'),
          clock_in: data.clock_in ? new Date(data.clock_in).toISOString() : 'Unknown',
          status: data.status || 'Unknown',
          hours_worked: data.hours_worked || null,
        };
        
        recordsMissingClockOut.push(record);
        
        // Group by employee
        const email = record.employee_id;
        if (!recordsByEmployee[email]) {
          recordsByEmployee[email] = [];
        }
        recordsByEmployee[email].push(record);
        
        // Group by month
        if (record.date && record.date !== 'Unknown') {
          const recordMonth = record.date.slice(0, 7);
          if (!recordsByMonth[recordMonth]) {
            recordsByMonth[recordMonth] = [];
          }
          recordsByMonth[recordMonth].push(record);
        }
      }
    });
    
    // Display results
    console.log(`📊 Found ${recordsMissingClockOut.length} record(s) missing clock-out times\n`);
    
    if (recordsMissingClockOut.length === 0) {
      console.log('✅ No records found missing clock-out times!');
      return;
    }
    
    // Summary by employee
    console.log('📋 Summary by Employee:');
    console.log('─'.repeat(60));
    Object.keys(recordsByEmployee).sort().forEach(email => {
      const count = recordsByEmployee[email].length;
      console.log(`   ${email}: ${count} record(s)`);
    });
    console.log('');
    
    // Summary by month
    console.log('📅 Summary by Month:');
    console.log('─'.repeat(60));
    Object.keys(recordsByMonth).sort().forEach(monthKey => {
      const count = recordsByMonth[monthKey].length;
      console.log(`   ${monthKey}: ${count} record(s)`);
    });
    console.log('');
    
    // Detailed list
    console.log('📝 Detailed Records:');
    console.log('─'.repeat(100));
    recordsMissingClockOut.forEach((record, index) => {
      console.log(`\n${index + 1}. Record ID: ${record.id}`);
      console.log(`   Employee: ${record.employee_id}`);
      console.log(`   Date: ${record.date}`);
      console.log(`   Clock In: ${record.clock_in}`);
      console.log(`   Status: ${record.status}`);
      console.log(`   Hours Worked: ${record.hours_worked || 'N/A'}`);
    });
    console.log('\n' + '─'.repeat(100));
    
    // Apply clock-out times if requested
    if (!dryRun && recordsMissingClockOut.length > 0) {
      console.log('\n🔄 Applying clock-out times...\n');
      
      let updated = 0;
      let errors = 0;
      
      for (const record of recordsMissingClockOut) {
        try {
          const clockInTime = new Date(record.clock_in);
          let clockOutTime = new Date(clockInTime);
          
          // Set default clock-out to 5 PM (17:00)
          if (clockInTime.getHours() >= 17) {
            clockOutTime.setHours(18, 0, 0, 0);
          } else {
            clockOutTime.setHours(17, 0, 0, 0);
          }
          
          // If clock-out is before clock-in, set to end of day
          if (clockOutTime <= clockInTime) {
            clockOutTime = new Date(clockInTime);
            clockOutTime.setHours(23, 59, 59, 999);
          }
          
          // Calculate hours worked
          const totalMinutes = (clockOutTime - clockInTime) / (1000 * 60);
          const breakMinutes = 0; // Assuming no break data available
          const workMinutes = Math.max(0, totalMinutes - breakMinutes);
          const hoursWorked = workMinutes / 60;
          
          const docRef = doc(db, 'Attendance', record.id);
          await updateDoc(docRef, {
            clock_out: clockOutTime.toISOString(),
            status: 'clocked_out',
            hours_worked: hoursWorked.toFixed(2),
            daily_report: 'Auto clocked out - clock-out time applied by script'
          });
          
          console.log(`   ✅ Updated record ${record.id} for ${record.employee_id} (${record.date})`);
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
    } else if (dryRun && recordsMissingClockOut.length > 0) {
      console.log('\n💡 To apply clock-out times, run with --apply flag:');
      console.log(`   node scripts/check-missing-clockout.js${employeeEmail ? ` --employee=${employeeEmail}` : ''}${month ? ` --month=${month}` : ''} --apply\n`);
    }
    
  } catch (error) {
    console.error('❌ Error checking records:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the check
checkMissingClockOut()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  });

