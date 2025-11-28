import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useToast } from '../components/Toast';
import { COLLECTIONS, ASSET_STATUS } from '../constants';
import {
  ArrowLeft,
  User,
  Clock,
  Calendar,
  FileEdit,
  Link as LinkIcon,
  CheckCircle,
  Rocket,
  AlertTriangle
} from 'lucide-react';

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

  const asset = assets.find(a => a?.asset_id === assetId);

  useEffect(() => {
    if (!asset && !loading.all && assets.length > 0) {
      error('Asset not found');
      navigate('/dashboard/lead');
    }
  }, [asset, loading.all, assets.length, error, navigate]);

  if (loading.all || !asset) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  const editor = users.find(
    u => u?.email === asset.assigned_editor_email || u?.email === asset.assigned_creator_email
  );
  const shoot = asset.shoot_id ? shoots.find(s => s?.shoot_id === asset.shoot_id) : null;
  const client = shoot ? clients.find(c => c?.client_id === shoot.client_id) : null;

  let deadlineStr = '';
  let isOverdue = false;
  if (asset.deadline) {
    const deadline = new Date(asset.deadline);
    if (!isNaN(deadline.getTime())) {
      deadlineStr = deadline.toLocaleDateString();
      isOverdue =
        deadline < new Date() &&
        asset.status !== ASSET_STATUS.COMPLETED &&
        asset.status !== ASSET_STATUS.FINAL;
    }
  }

  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      const index = assets.findIndex(a => a?.asset_id === asset.asset_id);
      if (index !== -1) {
        await updateRow(COLLECTIONS.ASSETS, index + 2, {
          ...asset,
          status: ASSET_STATUS.FINAL,
          current_editor_status: ASSET_STATUS.COMPLETED
        });
        await forceRefresh([COLLECTIONS.ASSETS]);
        success('Asset approved');
        navigate('/dashboard/lead');
      }
    } catch (err) {
      error(`Error approving asset: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async () => {
    setIsProcessing(true);
    try {
      const index = assets.findIndex(a => a?.asset_id === asset.asset_id);
      if (index !== -1) {
        await updateRow(COLLECTIONS.ASSETS, index + 2, {
          ...asset,
          status: 'Published',
          current_editor_status: ASSET_STATUS.COMPLETED
        });
        await forceRefresh([COLLECTIONS.ASSETS]);
        success('Asset published');
        navigate('/dashboard/lead');
      }
    } catch (err) {
      error(`Error publishing asset: ${err.message}`);
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
      const index = assets.findIndex(a => a?.asset_id === asset.asset_id);
      if (index !== -1) {
        await updateRow(COLLECTIONS.ASSETS, index + 2, {
          ...asset,
          status: ASSET_STATUS.REVISION,
          revision_notes: revisionNotes,
          current_editor_status: ASSET_STATUS.REVISION
        });
        await forceRefresh([COLLECTIONS.ASSETS]);
        success('Revision requested');
        setRevisionNotes('');
        setShowRevisionForm(false);
        navigate('/dashboard/lead');
      }
    } catch (err) {
      error(`Error requesting revision: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const Card = ({ title, icon: Icon, children }) => (
    <div className="rounded-xl border border-gray-100 bg-white p-4 md:p-6 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <Icon className="h-4 w-4 text-gray-400" />
        <span>{title}</span>
      </div>
      {children}
    </div>
  );

  return (
    <div className="pb-10 px-4 md:px-6 animate-fadeIn">
      {/* Back */}
      <button
        onClick={() => navigate('/dashboard/lead')}
        className="mb-4 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </button>

      {/* Header */}
      <div className="mb-6 rounded-2xl bg-primary px-6 py-7 text-white">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {asset.title || 'Untitled Asset'}
        </h1>
        {client && (
          <p className="mt-1 text-xs uppercase tracking-wider text-white/80">
            {client.company_name}
          </p>
        )}
      </div>

      <div className="mx-auto max-w-4xl space-y-4 md:space-y-6">
        {/* Meta grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card title="Assigned To" icon={User}>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white font-semibold">
                {editor?.name?.[0] || <User className="h-5 w-5" />}
              </div>
              <p className="font-medium text-gray-900 text-sm md:text-base">
                {editor?.name || asset.assigned_editor_email || 'Unassigned'}
              </p>
            </div>
          </Card>

          <Card title="Deadline" icon={Clock}>
            <p className={`font-semibold ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
              {deadlineStr || 'No deadline'}
              {isOverdue && ' (Overdue)'}
            </p>
          </Card>

          <Card title="Progress" icon={FileEdit}>
            <div className="space-y-2">
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${asset.work_progress || 0}%` }}
                />
              </div>
              <p className="text-xs font-medium text-gray-500">
                {asset.work_progress || 0}%
              </p>
            </div>
          </Card>

          {shoot && (
            <Card title="From Shoot" icon={Calendar}>
              <p className="font-medium text-gray-900 truncate">
                {shoot.shoot_name || 'Untitled Shoot'}
              </p>
            </Card>
          )}
        </div>

        {/* Work link */}
        {asset.upload_folder_link && (
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-gray-400" />
              Work Files
            </p>
            <a
              href={asset.upload_folder_link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary text-sm font-medium break-all hover:underline"
            >
              {asset.upload_folder_link}
            </a>
          </div>
        )}

        {/* Revision */}
        {showRevisionForm && (
          <div className="rounded-xl border border-orange-100 bg-orange-50 p-5">
            <label className="block mb-2 text-sm font-semibold text-gray-700">
              Revision Notes *
            </label>
            <textarea
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              rows={5}
              className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30 outline-none resize-none"
              placeholder="Explain what needs to change..."
            />
            <div className="mt-4 flex gap-3">
              <button
                onClick={() => {
                  setShowRevisionForm(false);
                  setRevisionNotes('');
                }}
                className="flex-1 rounded-lg bg-gray-200 py-3 text-sm font-semibold text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleRequestRevision}
                disabled={isProcessing}
                className="flex-1 rounded-lg bg-orange-500 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
              >
                Request Revision
              </button>
            </div>
          </div>
        )}

        {/* Actions */}
        {!showRevisionForm && (
          <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
            <button
              onClick={handleApprove}
              disabled={isProcessing}
              className="w-full rounded-lg bg-primary py-3 text-white font-semibold hover:bg-primary/90 disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Approve
              </span>
            </button>

            <button
              onClick={handlePublish}
              disabled={isProcessing}
              className="w-full rounded-lg bg-gray-900 py-3 text-white font-semibold hover:bg-gray-800 disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                <Rocket className="h-5 w-5" />
                Publish
              </span>
            </button>

            <button
              onClick={() => setShowRevisionForm(true)}
              disabled={isProcessing}
              className="w-full rounded-lg bg-orange-500 py-3 text-white font-semibold hover:bg-orange-600 disabled:opacity-50"
            >
              <span className="flex items-center justify-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Request Revision
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
