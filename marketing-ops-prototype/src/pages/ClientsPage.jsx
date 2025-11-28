import { useEffect } from 'react';
import { useData } from '../contexts/DataContext';
import { Users, Mail, Phone, FileText } from 'lucide-react';

const ClientsPage = () => {
  const { data, loadCollections } = useData();

  useEffect(() => {
    loadCollections(['CLIENTS', 'SHOOTS', 'ASSETS']);
  }, [loadCollections]);

  const clients = data.CLIENTS || [];
  const shoots = data.SHOOTS || [];
  const assets = data.ASSETS || [];

  const getClientStats = (clientId) => {
    const clientShoots = shoots.filter(s => s.client_id === clientId);
    const clientAssets = assets.filter(a => a.client_id === clientId);
    return {
      shoots: clientShoots.length,
      assets: clientAssets.length,
      completedShoots: clientShoots.filter(s => s.status === 'completed').length,
    };
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Clients</h1>
        <p className="text-slate-600">Manage client relationships</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {clients.map((client) => {
          const stats = getClientStats(client.client_id);
          return (
            <div key={client.client_id} className="modern-card p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold text-lg">
                    {client.company_name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{client.company_name}</h3>
                    {client.contact_name && (
                      <p className="text-sm text-slate-600">{client.contact_name}</p>
                    )}
                  </div>
                </div>
                <span className={`badge ${
                  client.agreement_status === 'Signed' ? 'badge-success' :
                  client.agreement_status === 'Pending' ? 'badge-warning' :
                  'badge-danger'
                }`}>
                  {client.agreement_status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                {client.contact_email && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="w-4 h-4" />
                    {client.contact_email}
                  </div>
                )}
                {client.contact_phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4" />
                    {client.contact_phone}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2 pt-4 border-t border-slate-200">
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{stats.shoots}</p>
                  <p className="text-xs text-slate-600">Shoots</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{stats.assets}</p>
                  <p className="text-xs text-slate-600">Assets</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-slate-900">{stats.completedShoots}</p>
                  <p className="text-xs text-slate-600">Done</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ClientsPage;

