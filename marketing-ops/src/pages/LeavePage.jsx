import { useEffect, useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Plane, Calendar, CheckCircle, XCircle, Clock, Plus, X, User, Briefcase } from 'lucide-react';
import { COLLECTIONS, ROLES } from '../constants';

export default function LeavePage() {
  const { data, loading, startPolling, stopPolling, addRow, updateRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [newLeave, setNewLeave] = useState({
    leave_type: 'Casual',
    start_date: '',
    end_date: '',
    reason: '',
  });

  useEffect(() => {
    startPolling('leave-page', [COLLECTIONS.LEAVE_REQUESTS, COLLECTIONS.USERS]);
    return () => stopPolling('leave-page');
  }, [startPolling, stopPolling]);

  // Get user's leave requests
  const myLeaves = data.Leave_Requests?.filter(
    l => l.employee_email === user?.email
  ).sort((a, b) => new Date(b.created_at) - new Date(a.created_at)) || [];

  // Get all pending leaves (for managers)
  const pendingLeaves = data.Leave_Requests?.filter(
    l => l.status === 'Pending'
  ).sort((a, b) => new Date(a.created_at) - new Date(b.created_at)) || [];

  const handleSubmitLeave = async (e) => {
    e.preventDefault();
    try {
      const startDate = new Date(newLeave.start_date);
      const endDate = new Date(newLeave.end_date);

      // Check for duplicate leave request (same date range and status)
      const existingLeave = data.Leave_Requests?.find(l =>
        l && l.employee_email === user?.email &&
        l.start_date === newLeave.start_date &&
        l.end_date === newLeave.end_date &&
        (l.status === 'Pending' || l.status === 'Approved')
      );

      if (existingLeave) {
        error('A leave request for this date range already exists');
        return;
      }

      const daysCount = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

      await addRow(COLLECTIONS.LEAVE_REQUESTS, {
        request_id: `LR-${Date.now()}`,
        employee_email: user.email,
        leave_type: newLeave.leave_type,
        start_date: newLeave.start_date,
        end_date: newLeave.end_date,
        days_count: daysCount,
        reason: newLeave.reason,
        status: 'Pending',
        created_at: new Date().toISOString(),
      });

      setShowForm(false);
      setNewLeave({
        leave_type: 'Casual',
        start_date: '',
        end_date: '',
        reason: '',
      });

      await forceRefresh([COLLECTIONS.LEAVE_REQUESTS]);

      success('Leave request submitted!');
    } catch (err) {
      error('Error submitting leave: ' + err.message);
    }
  };

  const handleApproveLeave = async (leaveId) => {
    try {
      const index = data.Leave_Requests?.findIndex(l => l.request_id === leaveId);
      if (index !== -1) {
        await updateRow(COLLECTIONS.LEAVE_REQUESTS, index + 2, {
          status: 'Approved',
          manager_email: user.email,
          updated_at: new Date().toISOString(),
        });

        await forceRefresh([COLLECTIONS.LEAVE_REQUESTS]);

        success('Leave approved!');
      }
    } catch (err) {
      error('Error: ' + err.message);
    }
  };

  const handleRejectLeave = async (leaveId) => {
    try {
      const index = data.Leave_Requests?.findIndex(l => l.request_id === leaveId);
      if (index !== -1) {
        await updateRow(COLLECTIONS.LEAVE_REQUESTS, index + 2, {
          status: 'Rejected',
          manager_email: user.email,
          updated_at: new Date().toISOString(),
        });

        await forceRefresh([COLLECTIONS.LEAVE_REQUESTS]);

        success('Leave rejected');
      }
    } catch (err) {
      error('Error: ' + err.message);
    }
  };

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isManager = user?.role === ROLES.MANAGER;
  const isLead = user?.role === ROLES.LEAD;

  return (
    <div className="animate-fadeIn mobile-padding pb-8 space-y-8">
      {/* Header */}
      <div className="glass-panel p-6 rounded-2xl border-l-4 border-primary flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
            <Plane className="w-8 h-8 text-primary" />
            Leave Management
          </h1>
          <p className="text-gray-600">
            {(isManager || isLead) ? 'Review and manage leave requests' : 'Request and track your leave'}
          </p>
        </div>
        {!isManager && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="glass-button bg-primary text-white hover:bg-primary-dark"
          >
            {showForm ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            <span>{showForm ? 'Cancel Request' : 'Request Leave'}</span>
          </button>
        )}
      </div>

      {/* Request Form */}
      {showForm && (
        <div className="glass-card p-6 animate-fadeIn">
          <h2 className="text-xl font-bold text-gray-900 mb-6">New Leave Request</h2>
          <form onSubmit={handleSubmitLeave} className="space-y-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Leave Type *</label>
              <select
                value={newLeave.leave_type}
                onChange={(e) => setNewLeave({ ...newLeave, leave_type: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              >
                <option value="Sick">Sick Leave</option>
                <option value="Casual">Casual Leave</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Start Date *</label>
                <input
                  type="date"
                  required
                  value={newLeave.start_date}
                  onChange={(e) => setNewLeave({ ...newLeave, start_date: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">End Date *</label>
                <input
                  type="date"
                  required
                  value={newLeave.end_date}
                  onChange={(e) => setNewLeave({ ...newLeave, end_date: e.target.value })}
                  min={newLeave.start_date || new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Reason *</label>
              <textarea
                required
                value={newLeave.reason}
                onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none"
                placeholder="Please provide a reason for your leave request..."
              />
            </div>
            <div className="flex gap-4 pt-2">
              <button
                type="submit"
                className="flex-1 bg-primary text-white px-6 py-3 rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30"
              >
                Submit Request
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Manager/Lead View - Pending Leaves */}
      {(isManager || isLead) && pendingLeaves.length > 0 && (
        <div className="glass-card p-6 bg-orange-50/50 border-orange-100">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            <Clock className="w-6 h-6 text-orange-500" />
            Pending Requests ({pendingLeaves.length})
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingLeaves.map((leave, index) => {
              const employee = data.Users?.find(u => u.email === leave.employee_email);
              // Leads can approve for non-leads, managers can approve for everyone
              const canApprove = isManager || (isLead && employee?.role !== ROLES.LEAD);
              return (
                <LeaveCard
                  key={leave.request_id || index}
                  leave={leave}
                  employee={employee}
                  onApprove={canApprove ? () => handleApproveLeave(leave.request_id) : null}
                  onReject={canApprove ? () => handleRejectLeave(leave.request_id) : null}
                  index={index}
                  isPending={true}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* My Leaves / All Leaves */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Briefcase className="w-6 h-6 text-primary" />
          {(isManager || isLead) ? 'All Leave Requests' : 'My Leave Requests'}
        </h2>
        <div className="space-y-4">
          {((isManager || isLead) ? data.Leave_Requests : myLeaves).length > 0 ? (
            ((isManager || isLead) ? data.Leave_Requests : myLeaves).map((leave, index) => {
              const employee = data.Users?.find(u => u.email === leave.employee_email);
              // Leads can approve for non-leads, managers can approve for everyone
              const canApprove = isManager || (isLead && employee?.role !== ROLES.LEAD && leave.status === 'Pending');
              return (
                <LeaveCard
                  key={leave.request_id || index}
                  leave={leave}
                  employee={employee}
                  onApprove={canApprove ? () => handleApproveLeave(leave.request_id) : null}
                  onReject={canApprove ? () => handleRejectLeave(leave.request_id) : null}
                  index={index}
                />
              );
            })
          ) : (
            <div className="text-center py-12 text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              <Plane className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>No leave requests found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LeaveCard({ leave, employee, onApprove, onReject, index, isPending }) {
  const getStatusIcon = () => {
    switch (leave.status) {
      case 'Approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-orange-500" />;
    }
  };

  const getStatusStyle = () => {
    switch (leave.status) {
      case 'Approved':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-orange-100 text-orange-700 border-orange-200';
    }
  };

  return (
    <div
      className={`p-5 rounded-xl border transition-all hover:shadow-md animate-fadeIn ${isPending ? 'bg-white border-orange-200 shadow-sm' : 'bg-white border-gray-100'
        }`}
      style={{ animationDelay: `${index * 0.1}s` }}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-primary/20">
            {employee?.name?.charAt(0) || <User className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="font-bold text-gray-900">
              {employee?.name || leave.employee_email}
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium mt-0.5">
              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                {leave.leave_type}
              </span>
              <span>•</span>
              <span>{leave.days_count || 0} days</span>
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider border ${getStatusStyle()}`}>
          {leave.status || 'Pending'}
        </span>
      </div>

      <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
        <div className="flex items-center gap-2 text-sm font-bold text-gray-900 mb-2">
          <Calendar className="w-4 h-4 text-primary" />
          {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          {leave.reason}
        </p>
      </div>

      {onApprove && onReject && leave.status === 'Pending' && (
        <div className="flex gap-3 pt-2 border-t border-gray-100">
          <button
            onClick={onApprove}
            className="flex-1 bg-green-50 text-green-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
          <button
            onClick={onReject}
            className="flex-1 bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Reject
          </button>
        </div>
      )}
    </div>
  );
}
