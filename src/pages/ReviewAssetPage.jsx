import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useToast } from '../components/Toast';
import { COLLECTIONS, ASSET_STATUS } from '../constants';
import { X, CheckCircle, Rocket, AlertTriangle, FileEdit, Clock, User, Link as LinkIcon, Calendar, ArrowLeft } from 'lucide-react';

export default function ReviewAssetPage() {
  const { assetId } = useParams();
  const navigate = useNavigate();
  const { data, loading, startPolling, stopPolling, updateRow, forceRefresh } = useData();
  const { success, error } = useToast();
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    startPolling('review-asset', [
      COLLECTIONS.ASSETS,
      COLLECTIONS.USERS,
      COLLECTIONS.SHOOTS,
      COLLECTIONS.CLIENTS
    ]);
    return () => stopPolling('review-asset');
  }, [startPolling, stopPolling]);

  const assets = Array.isArray(data.Assets) ? data.Assets : [];
  const users = Array.isArray(data.Users) ? data.Users : [];
  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];

  const asset = assets.find(a => a && a.asset_id === assetId);

  useEffect(() => {
    if (!asset && !loading.all && assets.length > 0) {
      error('Asset not found');
      navigate('/dashboard/lead');
    }
  }, [asset, loading.all, assets.length, error, navigate]);

  if (loading.all || !asset) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

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
      const assetIndex = assets.findIndex(a => a && a.asset_id === asset.asset_id);
      if (assetIndex !== -1) {
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...asset,
          status: ASSET_STATUS.FINAL,
          current_editor_status: ASSET_STATUS.COMPLETED,
        });
        await forceRefresh([COLLECTIONS.ASSETS]);
        success('Asset approved!');
        navigate('/dashboard/lead');
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
      const assetIndex = assets.findIndex(a => a && a.asset_id === asset.asset_id);
      if (assetIndex !== -1) {
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...asset,
          status: 'Published',
          current_editor_status: ASSET_STATUS.COMPLETED,
        });
        await forceRefresh([COLLECTIONS.ASSETS]);
        success('Asset published!');
        navigate('/dashboard/lead');
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
      const assetIndex = assets.findIndex(a => a && a.asset_id === asset.asset_id);
      if (assetIndex !== -1) {
        await updateRow(COLLECTIONS.ASSETS, assetIndex + 2, {
          ...asset,
          status: ASSET_STATUS.REVISION,
          revision_notes: revisionNotes,
          current_editor_status: ASSET_STATUS.REVISION,
        });
        await forceRefresh([COLLECTIONS.ASSETS]);
        success('Revision requested! Editor will see your notes.');
        setRevisionNotes('');
        setShowRevisionForm(false);
        navigate('/dashboard/lead');
      }
    } catch (err) {
      error('Error requesting revision: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="animate-fadeIn mobile-padding pb-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/dashboard/lead')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          <span className="font-medium">Back to Dashboard</span>
        </button>
        <div className="bg-gradient-to-r from-purple-600 to-primary rounded-2xl p-6 md:p-8 text-white">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">{asset.title || 'Untitled Asset'}</h1>
          {client && (
            <p className="text-sm md:text-base text-white/90 font-bold uppercase tracking-wider">{client.company_name}</p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Asset Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="glass-card p-4 md:p-6">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              <User className="w-4 h-4 flex-shrink-0" />
              <span>Assigned To</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-sm md:text-base shadow-sm">
                {editor?.name?.charAt(0) || <User className="w-5 h-5 md:w-6 md:h-6" />}
              </div>
              <p className="font-bold text-gray-900 text-sm md:text-base">{editor?.name || asset.assigned_editor_email || asset.assigned_creator_email || 'Unassigned'}</p>
            </div>
          </div>

          <div className="glass-card p-4 md:p-6">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              <Clock className="w-4 h-4 flex-shrink-0" />
              <span>Deadline</span>
            </div>
            <p className={`font-bold text-base md:text-lg ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
              {deadlineStr || 'No deadline'}
              {isOverdue && ' (Overdue)'}
            </p>
          </div>

          <div className="glass-card p-4 md:p-6">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
              <FileEdit className="w-4 h-4 flex-shrink-0" />
              <span>Progress</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-200 rounded-full h-3 md:h-4 overflow-hidden">
                <div
                  className="bg-primary h-3 md:h-4 rounded-full transition-all duration-500"
                  style={{ width: `${asset.work_progress || 0}%` }}
                />
              </div>
              <span className="text-sm md:text-base font-bold text-gray-900 whitespace-nowrap">{asset.work_progress || 0}%</span>
            </div>
          </div>

          {shoot && (
            <div className="glass-card p-4 md:p-6">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">
                <Calendar className="w-4 h-4 flex-shrink-0" />
                <span>From Shoot</span>
              </div>
              <p className="font-bold text-gray-900 text-sm md:text-base truncate">{shoot.shoot_name || 'Untitled Shoot'}</p>
            </div>
          )}
        </div>

        {/* Work Links */}
        {asset.upload_folder_link && (
          <div className="glass-card p-4 md:p-6 bg-blue-50 border-blue-100">
            <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-3">
              <LinkIcon className="w-4 h-4 flex-shrink-0" />
              <span>Work Files</span>
            </div>
            <a
              href={asset.upload_folder_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary font-medium hover:underline text-sm md:text-base break-all flex items-start gap-1"
            >
              <LinkIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span className="break-all">{asset.upload_folder_link}</span>
            </a>
          </div>
        )}

        {/* Revision Form */}
        {showRevisionForm && (
          <div className="glass-card p-4 md:p-6 animate-fadeIn">
            <label className="block text-sm md:text-base font-bold text-gray-700 mb-3">
              Revision Notes <span className="text-red-500">*</span>
            </label>
            <textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="Explain what needs to be changed..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none text-sm md:text-base"
              rows="6"
            />
            <div className="flex flex-col sm:flex-row gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRevisionForm(false);
                  setRevisionNotes('');
                }}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors touch-manipulation text-sm md:text-base"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRevision}
                disabled={isProcessing || !revisionNotes.trim()}
                className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 touch-manipulation text-sm md:text-base"
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

        {/* Action Buttons */}
        {!showRevisionForm && (
          <div className="glass-card p-4 md:p-6 space-y-3">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="w-full px-4 py-3 md:py-4 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-600/20 touch-manipulation text-sm md:text-base"
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
              className="w-full px-4 py-3 md:py-4 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 touch-manipulation text-sm md:text-base"
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
              className="w-full px-4 py-3 md:py-4 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 touch-manipulation text-sm md:text-base"
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

