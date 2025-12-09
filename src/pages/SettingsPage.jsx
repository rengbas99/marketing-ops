import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Settings, User, Mail, Shield, Save, Plus, X, CheckCircle, XCircle, Lock } from 'lucide-react';
import Card from '../components/primitives/Card.jsx';
import Button from '../components/primitives/Button.jsx';
import { COLLECTIONS, ROLES } from '../constants';

export default function SettingsPage() {
  const { data, loading, startPolling, stopPolling, addRow, updateRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: ROLES.CONTENT_CREATOR,
    active: 'TRUE',
    password: '',
  });

  useEffect(() => {
    startPolling('settings-page', [COLLECTIONS.USERS]);
    return () => stopPolling('settings-page');
  }, [startPolling, stopPolling]);

  const users = Array.isArray(data.Users) ? data.Users : [];

  const handleAddUser = async (e) => {
    e.preventDefault();
    try {
      // Validate password
      if (!newUser.password || newUser.password.trim() === '') {
        error('Password is required');
        return;
      }

      // Check for duplicate user (same email)
      const existingUser = users.find(u =>
        u && u.email &&
        u.email.toLowerCase().trim() === newUser.email.toLowerCase().trim()
      );

      if (existingUser) {
        error('A user with this email already exists');
        return;
      }

      // Generate user_id and created_at
      const userId = `USR-${Date.now()}`;
      const createdAt = new Date().toISOString();

      await addRow(COLLECTIONS.USERS, {
        user_id: userId,
        ...newUser,
        email: newUser.email.toLowerCase(),
        created_at: createdAt,
        // Password is stored as plain text (for MVP - consider hashing in production)
      });
      setShowAddUser(false);
      setNewUser({
        email: '',
        name: '',
        role: ROLES.CONTENT_CREATOR,
        active: 'TRUE',
        password: '',
      });

      await forceRefresh([COLLECTIONS.USERS]);

      success('User added successfully!');
    } catch (err) {
      error('Error adding user: ' + err.message);
    }
  };

  const handleToggleUserStatus = async (userEmail, currentStatus) => {
    try {
      const index = users.findIndex(u => u && u.email === userEmail);
      if (index !== -1) {
        await updateRow(COLLECTIONS.USERS, index + 2, {
          ...users[index],
          active: currentStatus === 'TRUE' ? 'FALSE' : 'TRUE',
        });

        await forceRefresh([COLLECTIONS.USERS]);

        success('User status updated!');
      }
    } catch (err) {
      error('Error updating user: ' + err.message);
    }
  };

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const roleLabels = {
    [ROLES.MANAGER]: 'Manager',
    [ROLES.LEAD]: 'Lead',
    [ROLES.PHOTOGRAPHER]: 'Media',
    [ROLES.EDITOR]: 'Designer',
    [ROLES.CONTENT_CREATOR]: 'Content Creator',
    [ROLES.SALES]: 'Sales',
  };

  return (
    <div className="animate-fadeIn mobile-padding pb-8 space-y-8">
      {/* Header */}
      <Card glass className="p-6 rounded-2xl border-l-4 border-primary flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Settings className="w-8 h-8 text-primary" />
            Settings
          </h1>
          <p className="text-gray-600">Manage users and system settings</p>
        </div>
        <Button
          onClick={() => setShowAddUser(!showAddUser)}
          icon={showAddUser ? X : Plus}
        >
          {showAddUser ? 'Cancel' : 'Add User'}
        </Button>
      </Card>

      {/* Add User Form */}
      {showAddUser && (
        <Card glass className="p-6 animate-fadeIn">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <User className="w-6 h-6 text-primary" />
            Add New User
          </h2>
          <form onSubmit={handleAddUser} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Email *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                    placeholder="user@company.com"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Name *</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                    placeholder="Full Name"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Role *</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow] appearance-none"
                  >
                    <option value={ROLES.CONTENT_CREATOR}>Content Creator</option>
                    <option value={ROLES.EDITOR}>Designer</option>
                    <option value={ROLES.PHOTOGRAPHER}>Media</option>
                    <option value={ROLES.LEAD}>Lead</option>
                    <option value={ROLES.MANAGER}>Manager</option>
                    <option value={ROLES.SALES}>Sales</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Password *</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                    placeholder="Enter password"
                    minLength={4}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1 ml-1">Password will be stored securely</p>
              </div>
            </div>
            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                className="flex-1 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Create User
              </button>
              <button
                type="button"
                onClick={() => setShowAddUser(false)}
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Users List */}
      <Card glass className="p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6 text-primary" />
          User Management ({users.length})
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {users.length > 0 ? (
            users.map((u, index) => (
              <div
                key={u.email || index}
                className="p-4 border border-gray-100 rounded-xl hover:shadow-md transition-[transform,opacity,colors,shadow] bg-white group animate-fadeIn"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-primary/20 flex-shrink-0">
                      {u.name?.charAt(0) || <User className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-bold text-gray-900 truncate">
                          {u.name || 'Unknown'}
                        </p>
                        {u.email === user?.email && (
                          <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border border-primary/20">
                            You
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                        <Mail className="w-3.5 h-3.5" />
                        <span className="truncate">{u.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border border-gray-200">
                          {roleLabels[u.role] || u.role}
                        </span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border ${u.active === 'FALSE' || u.active === false
                            ? 'bg-red-50 text-red-600 border-red-100'
                            : 'bg-green-50 text-green-600 border-green-100'
                          }`}>
                          {u.active === 'FALSE' || u.active === false ? (
                            <><XCircle className="w-3 h-3" /> Inactive</>
                          ) : (
                            <><CheckCircle className="w-3 h-3" /> Active</>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                  {u.email !== user?.email && (
                    <button
                      onClick={() => handleToggleUserStatus(u.email, u.active)}
                      className={`p-2 rounded-lg transition-[transform,opacity,colors,shadow] ${u.active === 'FALSE' || u.active === false
                          ? 'text-green-600 hover:bg-green-50'
                          : 'text-red-600 hover:bg-red-50'
                        }`}
                      title={u.active === 'FALSE' || u.active === false ? 'Activate User' : 'Deactivate User'}
                    >
                      {u.active === 'FALSE' || u.active === false ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <XCircle className="w-6 h-6" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <User className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No users found</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
