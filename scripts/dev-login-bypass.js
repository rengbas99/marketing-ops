/**
 * Development Login Bypass
 * 
 * This script allows you to test the UI without configuring Firebase or Google Sheets.
 * It creates mock users directly in localStorage for development/testing purposes.
 * 
 * Usage:
 * 1. Open browser console (F12 or Cmd+Option+I)
 * 2. Copy and paste this entire script
 * 3. Run: loginAs('manager') or any other role
 * 
 * Available roles: 'manager', 'lead', 'photographer', 'editor', 'content_creator'
 */

const mockUsers = {
  manager: {
    email: 'manager@test.com',
    name: 'Test Manager',
    role: 'manager',
    avatar: ''
  },
  lead: {
    email: 'lead@test.com',
    name: 'Test Lead',
    role: 'lead',
    avatar: ''
  },
  photographer: {
    email: 'photographer@test.com',
    name: 'Test Photographer',
    role: 'photographer',
    avatar: ''
  },
  editor: {
    email: 'editor@test.com',
    name: 'Test Editor',
    role: 'editor',
    avatar: ''
  },
  creator: {
    email: 'creator@test.com',
    name: 'Test Content Creator',
    role: 'content_creator',
    avatar: ''
  }
};

/**
 * Login as a specific role (bypasses authentication)
 */
function loginAs(role) {
  const roleKey = role.toLowerCase();
  const user = mockUsers[roleKey];
  
  if (!user) {
    console.error(`❌ Invalid role: ${role}`);
    console.log('Available roles:', Object.keys(mockUsers).join(', '));
    return false;
  }
  
  // Store user in localStorage (same format as real auth)
  localStorage.setItem('user', JSON.stringify(user));
  
  // Dispatch event to update React context
  window.dispatchEvent(new CustomEvent('userUpdated', { detail: { user } }));
  
  console.log(`✅ Logged in as ${user.name} (${user.role})`);
  console.log(`📧 Email: ${user.email}`);
  
  // Redirect to appropriate dashboard
  const roleRoutes = {
    manager: '/dashboard/manager',
    lead: '/dashboard/lead',
    photographer: '/dashboard/photographer',
    editor: '/dashboard/editor',
    content_creator: '/dashboard/content-creator'
  };
  
  const route = roleRoutes[roleKey] || '/dashboard';
  window.location.href = route;
  
  return true;
}

/**
 * Logout (clears mock user)
 */
function logout() {
  localStorage.removeItem('user');
  window.dispatchEvent(new CustomEvent('userUpdated', { detail: { user: null } }));
  window.location.href = '/';
  console.log('✅ Logged out');
}

/**
 * Show available commands
 */
function showHelp() {
  console.log('🚀 Development Login Bypass');
  console.log('\n📋 Available Commands:');
  console.log('  loginAs("manager")      - Login as Manager');
  console.log('  loginAs("lead")         - Login as Lead');
  console.log('  loginAs("photographer") - Login as Photographer');
  console.log('  loginAs("editor")       - Login as Editor');
  console.log('  loginAs("creator")      - Login as Content Creator');
  console.log('  logout()                - Logout');
  console.log('  showHelp()              - Show this help');
  console.log('\n💡 Quick Login:');
  Object.keys(mockUsers).forEach(key => {
    const user = mockUsers[key];
    console.log(`  loginAs("${key}") → ${user.name}`);
  });
}

// Export functions to window for console access
if (typeof window !== 'undefined') {
  window.loginAs = loginAs;
  window.logout = logout;
  window.showHelp = showHelp;
  window.mockUsers = mockUsers;
  
  console.log('✅ Development login bypass loaded!');
  console.log('Run showHelp() to see available commands');
  console.log('Or run loginAs("manager") to login as Manager');
}

