import { useNavigate } from 'react-router-dom';
import { FileEdit, Clock, User, AlertCircle } from 'lucide-react';
import { ASSET_STATUS } from '../constants';

export default function ApprovalsList({ assets, users, shoots, clients, onUpdate }) {
  const navigate = useNavigate();

  if (!assets || assets.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
        <FileEdit className="w-12 h-12 mx-auto mb-3 opacity-20" />
        <p>No assets pending review</p>
      </div>
    );
  }

  // Sort by deadline (overdue first)
  const sortedAssets = [...assets].sort((a, b) => {
    try {
      const deadlineA = a.deadline ? new Date(a.deadline) : new Date('9999-12-31');
      const deadlineB = b.deadline ? new Date(b.deadline) : new Date('9999-12-31');
      return deadlineA - deadlineB;
    } catch {
      return 0;
    }
  });

  return (
    <>
      <div className="space-y-4">
        {sortedAssets.map((asset, index) => {
          const editor = users.find(u => u && (u.email === asset.assigned_editor_email || u.email === asset.assigned_creator_email));
          const shoot = asset.shoot_id ? shoots.find(s => s && s.shoot_id === asset.shoot_id) : null;
          const client = shoot ? clients.find(c => c && c.client_id === shoot.client_id) : null;

          let deadlineStr = '';
          let isOverdue = false;
          try {
            if (asset.deadline) {
              const deadline = new Date(asset.deadline);
              if (!isNaN(deadline.getTime())) {
                deadlineStr = deadline.toLocaleDateString();
                isOverdue = deadline < new Date();
              }
            }
          } catch (e) {
            console.error('Date error:', e);
          }

          return (
            <div
              key={asset.asset_id || index}
              className="glass-card p-4 hover:shadow-md transition-all cursor-pointer animate-fadeIn border-l-4 border-l-purple-500"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => navigate(`/dashboard/review/${asset.asset_id}`)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-bold text-gray-900 line-clamp-1 text-lg">
                      {asset.title || 'Untitled Asset'}
                    </h4>
                    {isOverdue && (
                      <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-bold flex items-center gap-1 uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3" />
                        Overdue
                      </span>
                    )}
                  </div>

                  {client && (
                    <p className="text-xs text-primary font-bold uppercase tracking-wider mb-3">
                      {client.company_name}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                    {editor && (
                      <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
                        <User className="w-3.5 h-3.5" />
                        <span className="font-medium">{editor.name}</span>
                      </span>
                    )}
                    {deadlineStr && (
                      <span className={`flex items-center gap-1.5 px-2 py-1 rounded-md border ${isOverdue
                          ? 'bg-red-50 text-red-600 border-red-100 font-bold'
                          : 'bg-gray-50 border-gray-100 font-medium'
                        }`}>
                        <Clock className="w-3.5 h-3.5" />
                        Due: {deadlineStr}
                      </span>
                    )}
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                      <span className="text-gray-400 uppercase tracking-wider">Progress</span>
                      <span className="text-purple-600">{asset.work_progress || 0}%</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-500 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${asset.work_progress || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-2">
                  <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border border-purple-200">
                    Review
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dashboard/review/${asset.asset_id}`);
                    }}
                    className="px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark transition-colors flex items-center gap-1.5"
                  >
                    <FileEdit className="w-3.5 h-3.5" />
                    Review
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
