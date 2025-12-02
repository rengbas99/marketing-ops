import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../components/Toast';
import { Camera, User, Calendar, Clock, MapPin, ArrowRight, Check, X, Sparkles } from 'lucide-react';
import { COLLECTIONS, ROLES, SHOOT_STATUS } from '../constants';

export default function AssignShootPage() {
  const navigate = useNavigate();
  const { data, loading, startPolling, stopPolling, addRow, forceRefresh } = useData();
  const { user } = useAuth();
  const { success, error } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [isCreatingShoot, setIsCreatingShoot] = useState(false);
  const [newShoot, setNewShoot] = useState({
    shoot_name: '',
    client_id: '',
    photographer_id: '',
    date: '',
    time: '',
    location_name: '',
  });

  useEffect(() => {
    startPolling('assign-shoot-page', [
      COLLECTIONS.SHOOTS,
      COLLECTIONS.CLIENTS,
      COLLECTIONS.USERS,
    ]);
    return () => stopPolling('assign-shoot-page');
  }, [startPolling, stopPolling]);

  const shoots = Array.isArray(data.Shoots) ? data.Shoots : [];
  const clients = Array.isArray(data.Clients) ? data.Clients : [];
  const users = Array.isArray(data.Users) ? data.Users : [];

  // Available photographers for shoot assignment
  const availablePhotographers = (Array.isArray(users) ? users : []).filter(
    u => u && u.active !== 'FALSE' && u.active !== false && 
    (u.role === ROLES.PHOTOGRAPHER || u.role === ROLES.LEAD)
  );

  const steps = [
    { id: 1, title: 'Shoot Details', icon: Camera },
    { id: 2, title: 'Assign Team', icon: User },
    { id: 3, title: 'Schedule', icon: Calendar },
    { id: 4, title: 'Review', icon: Check },
  ];

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return newShoot.shoot_name.trim() !== '';
      case 2:
        return newShoot.photographer_id !== '';
      case 3:
        return newShoot.date !== '';
      case 4:
        return true;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (canProceed()) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleAssignShoot = async () => {
    if (!newShoot.shoot_name || !newShoot.photographer_id || !newShoot.date) {
      error('Please fill in all required fields');
      return;
    }

    try {
      const existingShoot = shoots.find(s =>
        s &&
        (s.shoot_name === newShoot.shoot_name || s.title === newShoot.shoot_name) &&
        s.photographer_id === newShoot.photographer_id &&
        s.date === newShoot.date &&
        s.status !== SHOOT_STATUS.COMPLETED
      );

      if (existingShoot) {
        error('A shoot with the same name, videographer, and date already exists');
        return;
      }

      setIsCreatingShoot(true);
      await addRow(COLLECTIONS.SHOOTS, {
        shoot_id: `SH-${Date.now()}`,
        title: newShoot.shoot_name,
        shoot_name: newShoot.shoot_name,
        client_id: newShoot.client_id || '',
        photographer_id: newShoot.photographer_id,
        lead_photographer_email: newShoot.photographer_id,
        date: newShoot.date,
        time: newShoot.time || '',
        location: newShoot.location_name || '',
        location_name: newShoot.location_name || '',
        status: SHOOT_STATUS.SCHEDULED,
        notes: '',
        created_at: new Date().toISOString(),
      });

      const photographerName = users.find(u => u && u.email === newShoot.photographer_id)?.name || newShoot.photographer_id;
      success(`Shoot "${newShoot.shoot_name}" assigned to ${photographerName}!`);

      // Reset form
      setNewShoot({
        shoot_name: '',
        client_id: '',
        photographer_id: '',
        date: '',
        time: '',
        location_name: '',
      });
      setCurrentStep(1);

      await forceRefresh([COLLECTIONS.SHOOTS]);
      setIsCreatingShoot(false);

      // Navigate back to shoots page after a short delay
      setTimeout(() => {
        navigate('/dashboard/shoots');
      }, 1500);
    } catch (err) {
      setIsCreatingShoot(false);
      error('Error creating shoot: ' + err.message);
    }
  };

  const selectedClient = clients.find(c => c && c.client_id === newShoot.client_id);
  const selectedPhotographer = users.find(u => u && u.email === newShoot.photographer_id);

  if (loading.all) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 animate-fadeIn">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 mb-4 shadow-lg">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Assign New Shoot
          </h1>
          <p className="text-gray-600 text-lg">Create and assign shoots to your team members</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-3xl mx-auto">
            {steps.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = currentStep === step.id;
              const isCompleted = currentStep > step.id;
              const isUpcoming = currentStep < step.id;

              return (
                <div key={step.id} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                        isActive
                          ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white shadow-lg scale-110'
                          : isCompleted
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {isCompleted ? (
                        <Check className="w-6 h-6" />
                      ) : (
                        <StepIcon className="w-6 h-6" />
                      )}
                    </div>
                    <span
                      className={`mt-2 text-xs font-semibold ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                      }`}
                    >
                      {step.title}
                    </span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-2 transition-all duration-300 ${
                        isCompleted ? 'bg-green-500' : 'bg-gray-200'
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Form Content */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-10 border border-gray-100">
            {/* Step 1: Shoot Details */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-6">
                  <Camera className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Shoot Information</h2>
                  <p className="text-gray-600 mt-2">Tell us about the shoot</p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Shoot Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newShoot.shoot_name}
                      onChange={(e) => setNewShoot({ ...newShoot, shoot_name: e.target.value })}
                      placeholder="e.g. Product Launch Shoot, Brand Campaign..."
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Client (Optional)
                    </label>
                    <select
                      value={newShoot.client_id}
                      onChange={(e) => setNewShoot({ ...newShoot, client_id: e.target.value })}
                      className="w-full px-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                    >
                      <option value="">No client (General shoot)</option>
                      {(Array.isArray(clients) ? clients : []).map(client => (
                        <option key={client?.client_id} value={client?.client_id}>
                          {client?.company_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Location (Optional)
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        value={newShoot.location_name}
                        onChange={(e) => setNewShoot({ ...newShoot, location_name: e.target.value })}
                        placeholder="e.g. Studio A, Outdoor Location..."
                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Assign Team */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-6">
                  <User className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Assign Videographer</h2>
                  <p className="text-gray-600 mt-2">Select who will handle this shoot</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">
                    Videographer/Lead <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availablePhotographers.map(person => {
                      const isSelected = newShoot.photographer_id === person.email;
                      return (
                        <button
                          key={person.email}
                          type="button"
                          onClick={() => setNewShoot({ ...newShoot, photographer_id: person.email })}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              isSelected ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                              <User className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                              <div className="font-bold text-gray-900">{person.name || person.email}</div>
                              <div className="text-sm text-gray-500">
                                {person.role === ROLES.LEAD ? 'Lead' : 'Media'}
                              </div>
                            </div>
                            {isSelected && (
                              <Check className="w-5 h-5 text-blue-500" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {availablePhotographers.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <User className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No available photographers</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Schedule */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-6">
                  <Calendar className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Schedule</h2>
                  <p className="text-gray-600 mt-2">When will this shoot take place?</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="date"
                        value={newShoot.date}
                        onChange={(e) => setNewShoot({ ...newShoot, date: e.target.value })}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                      Time (Optional)
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="time"
                        value={newShoot.time}
                        onChange={(e) => setNewShoot({ ...newShoot, time: e.target.value })}
                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-lg"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <div className="space-y-6 animate-fadeIn">
                <div className="text-center mb-6">
                  <Check className="w-12 h-12 text-green-500 mx-auto mb-3" />
                  <h2 className="text-2xl font-bold text-gray-900">Review & Confirm</h2>
                  <p className="text-gray-600 mt-2">Review the details before assigning</p>
                </div>

                <div className="bg-gray-50 rounded-2xl p-6 space-y-4">
                  <div className="flex items-start justify-between pb-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <Camera className="w-6 h-6 text-blue-500" />
                      <div>
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Shoot Name</div>
                        <div className="text-xl font-bold text-gray-900 mt-1">{newShoot.shoot_name || 'Not set'}</div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Videographer</div>
                        <div className="text-lg font-bold text-gray-900 mt-1">
                          {selectedPhotographer?.name || newShoot.photographer_id || 'Not set'}
                        </div>
                      </div>
                    </div>

                    {selectedClient && (
                      <div className="flex items-start gap-3">
                        <User className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Client</div>
                          <div className="text-lg font-bold text-gray-900 mt-1">{selectedClient.company_name}</div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-1" />
                      <div>
                        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Date</div>
                        <div className="text-lg font-bold text-gray-900 mt-1">
                          {newShoot.date ? new Date(newShoot.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric' 
                          }) : 'Not set'}
                        </div>
                      </div>
                    </div>

                    {newShoot.time && (
                      <div className="flex items-start gap-3">
                        <Clock className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Time</div>
                          <div className="text-lg font-bold text-gray-900 mt-1">{newShoot.time}</div>
                        </div>
                      </div>
                    )}

                    {newShoot.location_name && (
                      <div className="flex items-start gap-3 md:col-span-2">
                        <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                        <div>
                          <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Location</div>
                          <div className="text-lg font-bold text-gray-900 mt-1">{newShoot.location_name}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => currentStep === 1 ? navigate('/dashboard/shoots') : handleBack()}
                className="px-6 py-3 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors flex items-center gap-2"
              >
                {currentStep === 1 ? (
                  <>
                    <X className="w-5 h-5" />
                    Cancel
                  </>
                ) : (
                  <>
                    ← Back
                  </>
                )}
              </button>

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl font-bold hover:from-blue-600 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-blue-500/30"
                >
                  Next Step
                  <ArrowRight className="w-5 h-5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleAssignShoot}
                  disabled={isCreatingShoot || !canProceed()}
                  className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-lg shadow-green-500/30"
                >
                  {isCreatingShoot ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      Assign Shoot
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

