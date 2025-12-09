import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Plus, Mail, Phone, Calendar, FileText, TrendingUp, Camera, Users, MapPin, Search, Edit, X, Trash2, AlertTriangle } from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import Card from '../components/primitives/Card.jsx';
import { COLLECTIONS, ROLES, SHOOT_STATUS, ASSET_STATUS } from '../constants';

export default function ClientsPage() {
  const { data, loading, startPolling, stopPolling, addRow, updateRow, deleteRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [selectedClient, setSelectedClient] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [newClient, setNewClient] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    notes: '',
  });

  useEffect(() => {
    startPolling('clients-page', [
      COLLECTIONS.CLIENTS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.ASSETS,
      COLLECTIONS.CONTENT_CALENDAR
    ]);
    return () => stopPolling('clients-page');
  }, [startPolling, stopPolling]);

  useEffect(() => {
    if (data.Clients?.length > 0 && !selectedClient) {
      setSelectedClient(data.Clients[0]);
    }
    if (selectedClient && data.Clients?.length > 0) {
      const stillExists = data.Clients.find(c => c.client_id === selectedClient.client_id);
      if (!stillExists) {
        setSelectedClient(data.Clients[0]);
      }
    }
  }, [data.Clients, selectedClient]);

  const handleAddClient = async (e) => {
    e.preventDefault();
    try {
      const existingClient = data.Clients?.find(c =>
        c && c.company_name &&
        c.company_name.toLowerCase().trim() === newClient.company_name.toLowerCase().trim()
      );

      if (existingClient) {
        error('A client with this company name already exists');
        return;
      }

      const newClientData = {
        client_id: `CLI-${Date.now()}`,
        company_name: newClient.company_name || '',
        contact_name: newClient.contact_name || '',
        contact_email: newClient.contact_email || '',
        contact_phone: newClient.contact_phone || '',
        notes: newClient.notes || '',
        agreement_status: 'Pending',
        created_at: new Date().toISOString(),
      };

      if (!newClientData.company_name) {
        error('Company name is required');
        return;
      }

      await addRow(COLLECTIONS.CLIENTS, newClientData);
      setSelectedClient(newClientData);
      setShowAddForm(false);
      setNewClient({
        company_name: '',
        contact_name: '',
        contact_email: '',
        contact_phone: '',
        notes: '',
      });

      await forceRefresh([COLLECTIONS.CLIENTS]);
      success('Client added successfully!');

      setTimeout(() => {
        const clientButton = document.querySelector(`[data-client-id="${newClientData.client_id}"]`);
        if (clientButton) {
          clientButton.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 100);
    } catch (err) {
      error('Error adding client: ' + err.message);
    }
  };

  const handleEditClient = () => {
    if (!selectedClient) return;
    setEditingClient({ ...selectedClient });
    setShowEditForm(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      const clientIndex = data.Clients?.findIndex(c => c && c.client_id === editingClient.client_id);
      if (clientIndex !== -1) {
        await updateRow(COLLECTIONS.CLIENTS, clientIndex + 2, {
          ...editingClient,
          updated_at: new Date().toISOString(),
        });
        setSelectedClient(editingClient);
        setShowEditForm(false);
        setEditingClient(null);
        await forceRefresh([COLLECTIONS.CLIENTS]);
        success('Client updated successfully!');
      }
    } catch (err) {
      error('Error updating client: ' + err.message);
    }
  };

  const handleDeleteClient = () => {
    if (!selectedClient) return;
    setClientToDelete(selectedClient);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      // Check if client has related shoots or assets
      const clientShoots = data.Shoots?.filter(s => s.client_id === clientToDelete.client_id) || [];
      const clientAssets = data.Assets?.filter(a => {
        const shoot = data.Shoots?.find(s => s.shoot_id === a.shoot_id);
        return shoot?.client_id === clientToDelete.client_id;
      }) || [];
      
      const hasShoots = clientShoots.length > 0;
      const hasAssets = clientAssets.length > 0;

      if (hasShoots || hasAssets) {
        const warning = `This client has ${clientShoots.length} shoot(s) and ${clientAssets.length} asset(s) associated with it. Are you sure you want to delete?`;
        if (!confirm(warning)) {
          setShowDeleteConfirm(false);
          setClientToDelete(null);
          return;
        }
      }

      const clientIndex = data.Clients?.findIndex(c => c && c.client_id === clientToDelete.client_id);
      if (clientIndex !== -1) {
        // Delete from database
        await deleteRow(COLLECTIONS.CLIENTS, clientIndex + 2);
        
        // Select another client if available
        const remainingClients = data.Clients?.filter(c => c && c.client_id !== clientToDelete.client_id) || [];
        if (remainingClients.length > 0) {
          setSelectedClient(remainingClients[0]);
        } else {
          setSelectedClient(null);
        }

        setShowDeleteConfirm(false);
        setClientToDelete(null);
        
        await forceRefresh([COLLECTIONS.CLIENTS]);
        success('Client deleted successfully!');
      }
    } catch (err) {
      console.error('Error deleting client:', err);
      error('Error deleting client: ' + err.message);
      setShowDeleteConfirm(false);
      setClientToDelete(null);
    }
  };

  const filteredClients = data.Clients?.filter(client => {
    if (!client || !client.client_id || client._tempId) return false;
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      client.company_name?.toLowerCase().includes(searchLower) ||
      client.contact_name?.toLowerCase().includes(searchLower) ||
      client.contact_email?.toLowerCase().includes(searchLower)
    );
  }) || [];

  const relatedShoots = data.Shoots?.filter(
    s => s.client_id === selectedClient?.client_id
  ) || [];

  const relatedAssets = data.Assets?.filter(
    a => {
      const shoot = data.Shoots?.find(s => s.shoot_id === a.shoot_id);
      return shoot?.client_id === selectedClient?.client_id;
    }
  ) || [];

  const relatedCalendar = data.Content_Calendar?.filter(
    cal => {
      const asset = data.Assets?.find(a => a.asset_id === cal.asset_id);
      const shoot = asset ? data.Shoots?.find(s => s.shoot_id === asset.shoot_id) : null;
      return shoot?.client_id === selectedClient?.client_id;
    }
  ) || [];

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn mobile-padding pb-8 space-y-8">
      {/* Header */}
      <Card glass className="p-6 rounded-2xl border-l-4 border-primary flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Clients</h1>
          <p className="text-gray-600">Manage client relationships and projects</p>
        </div>
        {(user?.role === ROLES.LEAD || user?.role === ROLES.MANAGER || user?.role === ROLES.CONTENT_CREATOR || user?.role === 'sales') && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-primary text-white hover:bg-primary-dark px-6 py-3 rounded-xl font-bold shadow-lg shadow-primary/30 transition-[transform,opacity,colors,shadow] duration-200 hover:scale-105 active:scale-95 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Client</span>
          </button>
        )}
      </Card>

      {/* Add Client Form */}
      {showAddForm && (
        <Card glass className="p-6 animate-fadeIn">
          <h2 className="text-xl font-bold text-gray-900 mb-6">Add New Client</h2>
          <form onSubmit={handleAddClient} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
              <input
                type="text"
                required
                value={newClient.company_name}
                onChange={(e) => setNewClient({ ...newClient, company_name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                placeholder="Enter company name"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                <input
                  type="text"
                  value={newClient.contact_name}
                  onChange={(e) => setNewClient({ ...newClient, contact_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                <input
                  type="email"
                  value={newClient.contact_email}
                  onChange={(e) => setNewClient({ ...newClient, contact_email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                  placeholder="contact@company.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
              <input
                type="tel"
                value={newClient.contact_phone}
                onChange={(e) => setNewClient({ ...newClient, contact_phone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={newClient.notes}
                onChange={(e) => setNewClient({ ...newClient, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors"
              >
                Add Client
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Edit Client Form */}
      {showEditForm && editingClient && (
        <Card glass className="p-6 animate-fadeIn">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Edit Client</h2>
            <button
              onClick={() => {
                setShowEditForm(false);
                setEditingClient(null);
              }}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <form onSubmit={handleSaveEdit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
              <input
                type="text"
                required
                value={editingClient.company_name || ''}
                onChange={(e) => setEditingClient({ ...editingClient, company_name: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                placeholder="Enter company name"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                <input
                  type="text"
                  value={editingClient.contact_name || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, contact_name: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                  placeholder="Contact person name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
                <input
                  type="email"
                  value={editingClient.contact_email || ''}
                  onChange={(e) => setEditingClient({ ...editingClient, contact_email: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                  placeholder="contact@company.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
              <input
                type="tel"
                value={editingClient.contact_phone || ''}
                onChange={(e) => setEditingClient({ ...editingClient, contact_phone: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={editingClient.notes || ''}
                onChange={(e) => setEditingClient({ ...editingClient, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors"
              >
                Save Changes
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEditForm(false);
                  setEditingClient(null);
                }}
                className="bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client List Sidebar */}
        <div className="lg:col-span-1">
          <Card
            glass
            className="p-4 flex flex-col"
            style={{ height: 'calc((var(--vh) * 100) - 200px)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Client List</h2>
              <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-1 rounded-full">
                {filteredClients.length}
              </span>
            </div>

            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {filteredClients.length > 0 ? (
                filteredClients.map((client, index) => (
                  <button
                    key={client.client_id || index}
                    data-client-id={client.client_id}
                    onClick={() => setSelectedClient(client)}
                    className={`w-full text-left p-4 rounded-xl transition-[transform,opacity,colors,shadow] duration-200 group ${selectedClient?.client_id === client.client_id
                        ? 'bg-primary text-white shadow-lg shadow-primary/30'
                        : 'bg-gray-50 hover:bg-white hover:shadow-md text-gray-900'
                      }`}
                  >
                    <div className="font-bold text-sm mb-1 truncate">
                      {client.company_name || 'Unnamed Client'}
                    </div>
                    {client.contact_email && (
                      <div className={`text-xs truncate ${selectedClient?.client_id === client.client_id ? 'text-white/80' : 'text-gray-500 group-hover:text-gray-600'
                        }`}>
                        {client.contact_email}
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">No clients found</p>
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Client Detail Panel */}
        {selectedClient && (
          <div className="lg:col-span-2 space-y-6">
            {/* Client Info */}
            <Card glass className="p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-primary/5 to-transparent rounded-bl-full -z-10" />
              <div className="flex items-start justify-between mb-6">
                <h2 className="text-3xl font-bold text-gray-900">
                  {selectedClient.company_name}
                </h2>
                {(user?.role === ROLES.LEAD || user?.role === ROLES.MANAGER || user?.role === ROLES.CONTENT_CREATOR || user?.role === 'sales') && (
                  <div className="flex items-center gap-2">
                  <button
                    onClick={handleEditClient}
                    className="p-2 text-gray-500 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                    title="Edit Client"
                  >
                    <Edit className="w-5 h-5" />
                  </button>
                    <button
                      onClick={handleDeleteClient}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Client"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedClient.contact_email && (
                  <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-gray-100">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Email</p>
                      <a href={`mailto:${selectedClient.contact_email}`} className="text-primary font-medium hover:underline">
                        {selectedClient.contact_email}
                      </a>
                    </div>
                  </div>
                )}
                {selectedClient.contact_phone && (
                  <div className="flex items-center gap-3 p-3 bg-white/50 rounded-xl border border-gray-100">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wider">Phone</p>
                      <a href={`tel:${selectedClient.contact_phone}`} className="text-primary font-medium hover:underline">
                        {selectedClient.contact_phone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
              {selectedClient.notes && (
                <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Notes</p>
                  <p className="text-gray-700 leading-relaxed">{selectedClient.notes}</p>
                </div>
              )}
            </Card>

            {/* Related Shoots */}
            <Card glass className="p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Camera className="w-5 h-5 text-purple-600" />
                Related Shoots ({relatedShoots.length})
              </h3>
              <div className="space-y-3">
                {relatedShoots.length > 0 ? (
                  relatedShoots.map((shoot, index) => (
                    <div
                      key={shoot.shoot_id || index}
                      className="p-4 rounded-xl bg-white border border-gray-100 hover:shadow-md transition-[transform,opacity,colors,shadow] flex items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="font-bold text-gray-900 mb-1">
                          {shoot.shoot_name}
                        </h4>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(shoot.date).toLocaleDateString()}
                          </span>
                          {shoot.location_name && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {shoot.location_name}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${shoot.status === SHOOT_STATUS.COMPLETED ? 'bg-green-100 text-green-700' :
                          shoot.status === SHOOT_STATUS.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                            'bg-yellow-100 text-yellow-700'
                        }`}>
                        {shoot.status || 'Scheduled'}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <Camera className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No shoots found</p>
                  </div>
                )}
              </div>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Assets in Progress */}
              <Card glass className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Active Assets
                </h3>
                <div className="space-y-3">
                  {relatedAssets.filter(a => a.status !== ASSET_STATUS.COMPLETED && a.status !== 'Published').length > 0 ? (
                    relatedAssets
                      .filter(a => a.status !== ASSET_STATUS.COMPLETED && a.status !== 'Published')
                      .map((asset, index) => (
                        <div
                          key={asset.asset_id || index}
                          className="p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition-[transform,opacity,colors,shadow]"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h4 className="font-bold text-sm text-gray-900 mb-1 truncate">
                                {asset.title}
                              </h4>
                              <p className="text-xs text-gray-500 truncate">
                                {asset.description || 'No description'}
                              </p>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase whitespace-nowrap ${asset.status === ASSET_STATUS.REVIEW ? 'bg-purple-100 text-purple-700' :
                                asset.status === ASSET_STATUS.IN_PROGRESS ? 'bg-blue-100 text-blue-700' :
                                  'bg-yellow-100 text-yellow-700'
                              }`}>
                              {asset.status || 'To Edit'}
                            </span>
                          </div>
                        </div>
                      ))
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">No active assets</p>
                  )}
                </div>
              </Card>

              {/* Content Calendar Preview */}
              <Card glass className="p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-green-600" />
                  Upcoming
                </h3>
                <div className="space-y-3">
                  {relatedCalendar.length > 0 ? (
                    relatedCalendar
                      .sort((a, b) => new Date(a.publish_date) - new Date(b.publish_date))
                      .slice(0, 5)
                      .map((entry, index) => {
                        const asset = data.Assets?.find(a => a.asset_id === entry.asset_id);
                        return (
                          <div
                            key={entry.calendar_id || index}
                            className="p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-white hover:shadow-sm transition-[transform,opacity,colors,shadow]"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="font-bold text-sm text-gray-900 mb-1 truncate">
                                  {asset?.title || 'Content'}
                                </h4>
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                  <span>{new Date(entry.publish_date).toLocaleDateString()}</span>
                                  {entry.channel && (
                                    <span className="bg-white border border-gray-200 px-1.5 rounded text-[10px]">
                                      {entry.channel}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className={`w-2 h-2 rounded-full mt-1.5 ${entry.status === 'published' ? 'bg-green-500' : 'bg-blue-500'
                                }`} />
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">No upcoming content</p>
                  )}
                </div>
              </Card>
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setClientToDelete(null);
        }}
        onConfirm={confirmDeleteClient}
        title="Delete Client"
        message={
          clientToDelete ? (
            <div>
              <p className="mb-3">
                Are you sure you want to delete <strong>{clientToDelete.company_name}</strong>?
              </p>
              {(() => {
                const clientShoots = clientToDelete ? (data.Shoots?.filter(s => s.client_id === clientToDelete.client_id) || []) : [];
                const clientAssets = clientToDelete ? (data.Assets?.filter(a => {
                  const shoot = data.Shoots?.find(s => s.shoot_id === a.shoot_id);
                  return shoot?.client_id === clientToDelete.client_id;
                }) || []) : [];
                
                return (clientShoots.length > 0 || clientAssets.length > 0) && (
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                      <div className="text-sm text-yellow-800">
                        <p className="font-bold mb-1">Warning:</p>
                        <ul className="list-disc list-inside space-y-1">
                          {clientShoots.length > 0 && (
                            <li>This client has {clientShoots.length} associated shoot(s)</li>
                          )}
                          {clientAssets.length > 0 && (
                            <li>This client has {clientAssets.length} associated asset(s)</li>
                          )}
                        </ul>
                        <p className="mt-2">Deleting this client will not delete the shoots or assets, but they will no longer be associated with a client.</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <p className="mt-3 text-red-600 font-bold">This action cannot be undone.</p>
            </div>
          ) : (
            'Are you sure you want to delete this client?'
          )
        }
        confirmText="Delete"
        confirmColor="bg-red-600 hover:bg-red-700"
      />
    </div>
  );
}
