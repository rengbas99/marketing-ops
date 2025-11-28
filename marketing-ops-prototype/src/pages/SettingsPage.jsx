import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useToast } from '../components/Toast';
import { Users, Plus, Edit, Trash2 } from 'lucide-react';
import { ROLES } from '../constants';

const SettingsPage = () => {
  const { data, loadCollections, addRow, updateRow, deleteRow } = useData();
  const { success, error } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'editor',
    password: 'demo123',
  });

  useEffect(() => {
    loadCollections(['USERS']);
  }, [loadCollections]);

  const users = data.USERS || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingUser) {
        await updateRow('USERS', editingUser.email, {
          name: formData.name,
          role: formData.role,
        }, 'email');
        success('User updated successfully!');
      } else {
        await addRow('USERS', {
          email: formData.email,
          name: formData.name,
          role: formData.role,
          password: formData.password,
          active: true,
        });
        success('User created successfully!');
      }
      setShowModal(false);
      setEditingUser(null);
      setFormData({ name: '', email: '', role: 'editor', password: 'demo123' });
    } catch (err) {
      error(err.message || 'Failed to save user');
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      password: '',
    });
    setShowModal(true);
  };

  const handleDelete = async (user) => {
    if (window.confirm(`Are you sure you want to deactivate ${user.name}?`)) {
      try {
        await updateRow('USERS', user.email, {
          active: false,
        }, 'email');
        success('User deactivated');
      } catch (err) {
        error(err.message || 'Failed to deactivate user');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Settings</h1>
          <p className="text-slate-600">Manage users and system settings</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ name: '', email: '', role: 'editor', password: 'demo123' });
            setShowModal(true);
          }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      <div className="modern-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">Users</h2>
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.email} className="p-4 bg-slate-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-semibold">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <p className="text-sm text-slate-600">{user.email}</p>
                    <span className="badge badge-gray capitalize">{user.role}</span>
                    {!user.active && <span className="badge badge-danger ml-2">Inactive</span>}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(user)}
                    className="p-2 rounded-lg bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(user)}
                    className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="modern-card p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              {editingUser ? 'Edit User' : 'Add New User'}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  required
                  disabled={!!editingUser}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  required
                >
                  <option value={ROLES.EDITOR}>Editor</option>
                  <option value={ROLES.PHOTOGRAPHER}>Photographer</option>
                  <option value={ROLES.CONTENT_CREATOR}>Content Creator</option>
                  <option value={ROLES.LEAD}>Lead</option>
                  <option value={ROLES.MANAGER}>Manager</option>
                </select>
              </div>
              {!editingUser && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                    required
                  />
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setEditingUser(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {editingUser ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;

