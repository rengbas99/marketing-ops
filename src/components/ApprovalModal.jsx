import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import { CheckCircle, Rocket, AlertTriangle, FileEdit, Clock, User, Link as LinkIcon, Calendar } from 'lucide-react';
import { useData } from '../contexts/DataContext';
import { useToast } from './Toast';
import { COLLECTIONS, ASSET_STATUS } from '../constants';
import OverlayMount from './overlay/OverlayMount.jsx';
import Drawer from './primitives/Drawer.jsx';
import Button from './primitives/Button.jsx';

export default function ApprovalModal({ isOpen, onClose, asset, users, shoots, clients, onUpdate }) {
  const { data, updateRow, forceRefresh } = useData();
  const { success, error } = useToast();
  const [revisionNotes, setRevisionNotes] = useState('');
  const [showRevisionForm, setShowRevisionForm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const overlayId = useId();

  useEffect(() => {
    if (!isOpen) {
      setRevisionNotes('');
      setShowRevisionForm(false);
      setIsProcessing(false);
    }
  }, [isOpen]);

  if (!asset) return null;

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

  const handleApprove = async (handleClose) => {
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
        handleClose();
      }
    } catch (err) {
      error('Error approving asset: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePublish = async (handleClose) => {
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
        handleClose();
      }
    } catch (err) {
      error('Error publishing asset: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRequestRevision = async (handleClose) => {
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
        handleClose();
      }
    } catch (err) {
      error('Error requesting revision: ' + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const renderOverlay = useCallback(({ close }) => {
    const handleClose = () => {
      close();
      onClose?.();
    };

    const footer = showRevisionForm
      ? null
      : (
        <div className="flex flex-col gap-3">
          <Button
            onClick={() => handleApprove(handleClose)}
            disabled={isProcessing}
            className="w-full gap-2"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Approve
              </>
            )}
          </Button>
          <Button
            onClick={() => handlePublish(handleClose)}
            disabled={isProcessing}
            variant="primary"
            className="w-full gap-2 bg-blue-600 hover:bg-blue-700"
          >
            {isProcessing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Processing...</span>
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Publish
              </>
            )}
          </Button>
          <Button
            variant="destructive"
            onClick={() => setShowRevisionForm(true)}
            disabled={isProcessing}
            className="w-full gap-2 bg-orange-500 hover:bg-orange-600"
          >
            <AlertTriangle className="w-4 h-4" />
            Request Revision
          </Button>
        </div>
      );

    return (
      <Drawer
        title={asset.title || 'Untitled Asset'}
        description={client ? `Client • ${client.company_name}` : undefined}
        onClose={handleClose}
        side="right"
        width="640px"
        footer={footer}
      >
        <div className="flex-1 space-y-6 min-h-0">
          {/* Asset Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div className="bg-gray-50 rounded-xl p-3 md:p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <User className="w-4 h-4 flex-shrink-0" />
                <span>Assigned To</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="w-8 h-8 flex-shrink-0 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {editor?.name?.charAt(0) || <User className="w-4 h-4" />}
                </div>
                <p className="font-bold text-gray-900 text-sm md:text-base truncate">{editor?.name || asset.assigned_editor_email || asset.assigned_creator_email || 'Unassigned'}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 md:p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <Clock className="w-4 h-4 flex-shrink-0" />
                <span>Deadline</span>
              </div>
              <p className={`font-bold text-sm md:text-base ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
                {deadlineStr || 'No deadline'}
                {isOverdue && ' (Overdue)'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 md:p-4 border border-gray-100">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                <FileEdit className="w-4 h-4 flex-shrink-0" />
                <span>Progress</span>
              </div>
              <div className="flex items-center gap-2 md:gap-3">
                <div className="flex-1 bg-gray-200 rounded-full h-2 md:h-2.5 overflow-hidden">
                  <div
                    className="bg-primary h-2 md:h-2.5 rounded-full"
                    style={{ width: `${asset.work_progress || 0}%` }}
                  />
                </div>
                <span className="text-xs md:text-sm font-bold text-gray-900 whitespace-nowrap">{asset.work_progress || 0}%</span>
              </div>
            </div>

            {shoot && (
              <div className="bg-gray-50 rounded-xl p-3 md:p-4 border border-gray-100">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  <Calendar className="w-4 h-4 flex-shrink-0" />
                  <span>From Shoot</span>
                </div>
                <p className="font-bold text-gray-900 text-sm md:text-base truncate">{shoot.shoot_name || 'Untitled Shoot'}</p>
              </div>
            )}
          </div>

          {/* Work Links */}
          {asset.upload_folder_link && (
            <div className="bg-blue-50 rounded-xl p-3 md:p-4 border border-blue-100">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-600 uppercase tracking-wider mb-2">
                <LinkIcon className="w-4 h-4 flex-shrink-0" />
                <span>Work Files</span>
              </div>
              <a
                href={asset.upload_folder_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary font-medium hover:underline text-xs md:text-sm break-all flex items-start gap-1"
              >
                <LinkIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
                <span className="break-all">{asset.upload_folder_link}</span>
              </a>
            </div>
          )}

          {showRevisionForm ? (
            <div className="border-t border-gray-100 pt-4 md:pt-6 animate-fadeIn">
              <label className="block text-sm md:text-base font-bold text-gray-700 mb-2">
                Revision Notes <span className="text-red-500">*</span>
              </label>
              <textarea
                value={revisionNotes}
                onChange={(e) => setRevisionNotes(e.target.value)}
                placeholder="Explain what needs to be changed..."
                className="w-full px-3 md:px-4 py-2.5 md:py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow] resize-none text-sm md:text-base"
                rows="4"
              />
              <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mt-4">
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3 mt-4">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowRevisionForm(false);
                      setRevisionNotes('');
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => handleRequestRevision(handleClose)}
                    disabled={isProcessing || !revisionNotes.trim()}
                    className="bg-orange-500 hover:bg-orange-600 gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4" />
                        Send Revision Request
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </Drawer>
    );
  }, [asset, client, handleApprove, handlePublish, handleRequestRevision, isProcessing, revisionNotes, showRevisionForm]);

  return (
    <OverlayMount
      id={`approval-${overlayId}`}
      isOpen={isOpen}
      type="drawer"
      blocking
      priority={30}
      render={renderOverlay}
    />
  );
}
