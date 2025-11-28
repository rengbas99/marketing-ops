import { useState } from 'react';
import { X, CheckCircle, Rocket, AlertTriangle, FileEdit, Clock, User, Link as LinkIcon, Calendar } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useToast } from './Toast';
import { COLLECTIONS, ASSET_STATUS } from '../constants';

export default function ApprovalModal({ isOpen, onClose, asset, users, shoots, clients, onUpdate }) {
  const { data, updateRow, forceRefresh } = useData();
  const { success, error } = useToast();
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen || !asset) return null;

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
        isOverdue = deadline < new Date() && asset.status !== ASSET_STATUS.COMPLETED && asset.status !== ASSET_STATUS.FINAL;
      }
    }
  } catch (e) {
    console.error('Date error:', e);
  }

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const assets = Array.isArray(data.Assets) ? data.Assets : [];
      const assetIndex = assets.findIndex(a => a && a.asset_id === asset.asset_id);
      if (assetIndex !== -1) {
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...asset,
          status: ASSET_STATUS.FINAL,
          current_editor_status: ASSET_STATUS.COMPLETED,
        });
        // Force refresh to update all dashboards
        await forceRefresh([COLLECTIONS.ASSETS]);

        success('Asset approved!');
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (err) {
      error('Error approving asset: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    setIsProcessing(true);
    try {
      const assets = Array.isArray(data.Assets) ? data.Assets : [];
      const assetIndex = assets.findIndex(a => a && a.asset_id === asset.asset_id);
      if (assetIndex !== -1) {
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...asset,
          status: 'Published',
          current_editor_status: ASSET_STATUS.COMPLETED,
        });
        // Force refresh to update all dashboards
        await forceRefresh([COLLECTIONS.ASSETS]);

        success('Asset published!');
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (err) {
      error('Error publishing asset: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestRevision = async () => {
    if (!revisionNotes.trim()) {
      error('Please enter revision notes');
      return;
    }

    setIsProcessing(true);
    try {
      const assets = Array.isArray(data.Assets) ? data.Assets : [];
      const assetIndex = assets.findIndex(a => a && a.asset_id === asset.asset_id);
      if (assetIndex !== -1) {
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...asset,
          status: ASSET_STATUS.REVISION,
          revision_notes: revisionNotes,
          current_editor_status: ASSET_STATUS.REVISION,
        });
        // Force refresh to update all dashboards (especially Editor dashboard)
        await forceRefresh([COLLECTIONS.ASSETS]);

        success('Revision requested! Editor will see your notes.');
        setRevisionNotes('');
        setShowRevisionForm(false);
        if (onUpdate) onUpdate();
        onClose();
      }
    } catch (err) {
      error('Error requesting revision: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 transition-opacity" 
        style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', pointerEvents: 'auto' }}
        onClick={(e) => {
          // Only close if clicking the backdrop, not the modal content
          if (e.target === e.currentTarget) {
            onClose();
          }
        }} 
      />
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-[10000] animate-fadeIn p-0 flex flex-col bg-white rounded-3xl border border-gray-100" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-start justify-between z-[10001] rounded-t-3xl">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{asset.title || 'Untitled Asset'}</h3>
            {client && (
              <p className="text-sm text-primary font-bold uppercase tracking-wider mt-1">{client.company_name}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Asset Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <User className="w-4 h-4" />
                <span>Assigned To</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {editor?.name?.charAt(0) || <User className="w-4 h-4" />}
                </div>
                <p className="font-bold text-gray-900">{editor?.name || asset.assigned_editor_email || asset.assigned_creator_email || 'Unassigned'}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <Clock className="w-4 h-4" />
                <span>Deadline</span>
              </div>
              <p className={`font-bold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {deadlineStr || 'No deadline'}
                {isOverdue && ' (Overdue)'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <FileEdit className="w-4 h-4" />
                <span>Progress</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-primary h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${asset.work_progress || 0}%` }}
                  />
                </div>
                <span className="text-sm font-bold text-gray-900">{asset.work_progress || 0}%</span>
              </div>
            </div>

            {shoot && (
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <Calendar className="w-4 h-4" />
                  <span>From Shoot</span>
                </div>
                <p className="font-bold text-gray-900">{shoot.shoot_name || 'Untitled Shoot'}</p>
              </div>
            )}
          </div>

          {/* Work Links */}
          {asset.upload_folder_link && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                <LinkIcon className="w-4 h-4" />
                <span>Work Files</span>
              </div>
              <a
                href={asset.upload_folder_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline text-sm break-all flex items-center gap-1"
              >
                {asset.upload_folder_link}
              </a>
            </div>
          )}

          {/* Revision Form */}
          {showRevisionForm && (
            <div className="border-t border-gray-100 pt-6 animate-fadeIn">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Revision Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Explain what needs to be changed..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                rows="5"
              />
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setShowRevisionForm(false);
                    setRevisionNotes('');
                  }}
                  className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestRevision}
                  disabled={isProcessing || !revisionNotes.trim()}
                  className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="w-4 h-4" />
                      <span>Send Revision Request</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons - Sticky at bottom */}
          {!showRevisionForm && (
          <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 rounded-b-3xl flex flex-wrap gap-3 z-[10001]">
              <button
                onClick={handleApprove}
                disabled={isProcessing}
                className="flex-1 min-w-[140px] px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    <span>Approve</span>
                  </>
                )}
              </button>
              <button
                onClick={handlePublish}
                disabled={isProcessing}
                className="flex-1 min-w-[140px] px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Rocket className="w-5 h-5" />
                    <span>Publish</span>
                  </>
                )}
              </button>
              <button
                onClick={() => setShowRevisionForm(true)}
                disabled={isProcessing}
                className="flex-1 min-w-[140px] px-4 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
              >
                <AlertTriangle className="w-5 h-5" />
                <span>Request Revision</span>
              </button>
            </div>
          )}
      </div>
    </div>
  );
}
