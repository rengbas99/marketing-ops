/**
 * Script to create test users for UI testing
 * 
 * Usage:
 * 1. Open browser console (F12 or Cmd+Option+I)
 * 2. Navigate to the app (must be logged in as Manager or have access to Settings)
 * 3. Copy and paste this entire script into the console
 * 4. Run: createTestUsers()
 * 
 * OR use the individual functions to create specific role users
 */

// Test users to create
const testUsers = [
  {
    email: 'manager@test.com',
    name: 'Test Manager',
    role: 'manager',
    password: 'test123',
    active: 'TRUE'
  },
  {
    email: 'lead@test.com',
    name: 'Test Lead',
    role: 'lead',
    password: 'test123',
    active: 'TRUE'
  },
  {
    email: 'photographer@test.com',
    name: 'Test Photographer',
    role: 'photographer',
    password: 'test123',
    active: 'TRUE'
  },
  {
    email: 'editor@test.com',
    name: 'Test Editor',
    role: 'editor',
    password: 'test123',
    active: 'TRUE'
  },
  {
    email: 'creator@test.com',
    name: 'Test Content Creator',
    role: 'content_creator',
    password: 'test123',
    active: 'TRUE'
  }
];

/**
 * Create a single test user
 */
async function createTestUser(userData) {
  try {
    // Access React context from window (if available)
    const reactRoot = document.querySelector('#root')._reactInternalInstance || 
                     document.querySelector('#root')._reactInternalFiber;
    
    if (!reactRoot) {
      throw new Error('Could not access React context. Please run this from the app page.');
    }

    // Try to access DataContext through React DevTools or direct access
    // Alternative: Use the Settings page form programmatically
    
    console.log('Creating user:', userData.email);
    
    // If you're on the Settings page, you can use this approach:
    // Otherwise, we'll need to use the API directly
    
    // For now, return instructions
    return {
      success: false,
      message: 'Please use the Settings page to create users, or see instructions below'
    };
  } catch (error) {
    console.error('Error creating user:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Create all test users
 */
async function createTestUsers() {
  console.log('🚀 Creating test users...');
  console.log('📝 Test Users to create:');
  testUsers.forEach(user => {
    console.log(`  - ${user.email} (${user.role}) - Password: ${user.password}`);
  });
  
  console.log('\n📋 Instructions:');
  console.log('1. Navigate to Settings page (must be logged in as Manager)');
  console.log('2. Click "Add User" button');
  console.log('3. Fill in the form with the credentials above');
  console.log('4. Repeat for each role you want to test');
  console.log('\n💡 Quick Login Credentials:');
  testUsers.forEach(user => {
    console.log(`   Email: ${user.email} | Password: ${user.password} | Role: ${user.role}`);
  });
}

// Export for console use
if (typeof window !== 'undefined') {
  window.createTestUsers = createTestUsers;
  window.testUsers = testUsers;
  
  console.log('✅ Test user script loaded!');
  console.log('Run createTestUsers() to see instructions');
  console.log('Or access testUsers array for credentials');
}

