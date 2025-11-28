import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Plane, Plus, CheckCircle, X } from 'lucide-react';
import { format } from 'date-fns';
import { LEAVE_STATUS } from '../constants';

const LeavePage = () => {
  const { data, loadCollections, addRow, updateRow } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    leave_type: 'Casual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    loadCollections(['LEAVE_REQUESTS']);
  }, [loadCollections]);

  const leaveRequests = data.LEAVE_REQUESTS || [];
  const myRequests = leaveRequests.filter(l => l.employee_email === user?.email);
  const pendingRequests = leaveRequests.filter(l => l.status === LEAVE_STATUS.PENDING);

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    try {
      await addRow('LEAVE_REQUESTS', {
        request_id: `LR-${Date.now()}`,
        employee_email: user.email,
        leave_type: formData.leave_type,
        start_date: formData.start_date,
        end_date: formData.end_date,
        reason: formData.reason,
        status: LEAVE_STATUS.PENDING,
      });
      success('Leave request submitted!');
      setShowModal(false);
      setFormData({ leave_type: 'Casual', start_date: '', end_date: '', reason: '' });
    } catch (err) {
      error(err.message || 'Failed to submit leave request');
    }
  };

  const handleApprove = async (request) => {
    try {
      await updateRow('LEAVE_REQUESTS', request.request_id, {
        status: LEAVE_STATUS.APPROVED,
        manager_email: user.email,
      }, 'request_id');
      success('Leave request approved!');
    } catch (err) {
      error(err.message || 'Failed to approve');
    }
  };

  const handleReject = async (request) => {
    try {
      await updateRow('LEAVE_REQUESTS', request.request_id, {
        status: LEAVE_STATUS.REJECTED,
        manager_email: user.email,
      }, 'request_id');
      success('Leave request rejected');
    } catch (err) {
      error(err.message || 'Failed to reject');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Leave Requests</h1>
          <p className="text-slate-600">Manage leave requests</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Request Leave
        </button>
      </div>

      {(user?.role === 'manager' || user?.role === 'lead') && pendingRequests.length > 0 && (
        <div className="modern-card p-6">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Pending Approvals</h2>
          <div className="space-y-3">
            {pendingRequests.map((request) => (
              <div key={request.request_id} className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 mb-1">
                      {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                    </p>
                    <p className="text-sm text-slate-600 mb-2">{request.reason}</p>
                    <span className="badge badge-warning">{request.leave_type}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(request)}
                      className="p-2 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleReject(request)}
                      className="p-2 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="modern-card p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-4">My Leave Requests</h2>
        {myRequests.length === 0 ? (
          <p className="text-slate-500 text-center py-8">No leave requests</p>
        ) : (
          <div className="space-y-3">
            {myRequests
              .sort((a, b) => new Date(b.start_date) - new Date(a.start_date))
              .map((request) => (
                <div key={request.request_id} className="p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900 mb-1">
                        {format(new Date(request.start_date), 'MMM dd')} - {format(new Date(request.end_date), 'MMM dd, yyyy')}
                      </p>
                      <p className="text-sm text-slate-600 mb-2">{request.reason}</p>
                      <span className="badge badge-warning">{request.leave_type}</span>
                    </div>
                    <span className={`badge ${
                      request.status === LEAVE_STATUS.APPROVED ? 'badge-success' :
                      request.status === LEAVE_STATUS.REJECTED ? 'badge-danger' :
                      'badge-warning'
                    }`}>
                      {request.status}
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="modern-card p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Request Leave</h2>
            <form onSubmit={handleSubmitLeave} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Leave Type
                </label>
                <select
                  value={formData.leave_type}
                  onChange={(e) => setFormData({ ...formData, leave_type: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                >
                  <option value="Casual">Casual</option>
                  <option value="Sick">Sick</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Reason
                </label>
                <textarea
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
                  rows="3"
                  required
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex-1">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LeavePage;

