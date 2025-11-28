import { useState } from 'react';
import { X } from 'lucide-react';
import { SHOOT_STATUS } from '../constants';

export default function CreateShootModal({ onClose, onSubmit, clients, photographers }) {
    const [formData, setFormData] = useState({
        shoot_name: '',
        client_id: '',
        photographer_id: '',
        date: new Date().toISOString().split('T')[0],
        location_name: '',
        notes: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        const shootData = {
            shoot_id: `SHOOT-${Date.now()}`,
            shoot_name: formData.shoot_name,
            client_id: formData.client_id || null,
            photographer_id: formData.photographer_id || null,
            date: formData.date,
            location_name: formData.location_name,
            notes: formData.notes,
            status: SHOOT_STATUS.SCHEDULED,
            created_at: new Date().toISOString()
        };

        await onSubmit(shootData);
        onClose();
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="fixed inset-0" style={{ background: 'rgba(0, 0, 0, 0.25)', backdropFilter: 'blur(6px)', borderRadius: '16px' }} onClick={onClose} />
            <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto relative z-10 bg-white rounded-2xl" style={{ borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.15)' }}>
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Create New Shoot</h2>
                    <button onClick={onClose} className="text-white/60 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Shoot Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g., X Hotel Promotions"
                            value={formData.shoot_name}
                            onChange={(e) => setFormData({ ...formData, shoot_name: e.target.value })}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Client (Optional)
                        </label>
                        <select
                            value={formData.client_id}
                            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        >
                            <option value="">No Client</option>
                            {clients.map(c => (
                                <option key={c.client_id} value={c.client_id} className="bg-gray-800">
                                    {c.company_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Photographer (Optional)
                        </label>
                        <select
                            value={formData.photographer_id}
                            onChange={(e) => setFormData({ ...formData, photographer_id: e.target.value })}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        >
                            <option value="">Assign Later</option>
                            {photographers.map(p => (
                                <option key={p.email} value={p.email} className="bg-gray-800">
                                    {p.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Date *
                        </label>
                        <input
                            type="date"
                            required
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Location
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Downtown Studio"
                            value={formData.location_name}
                            onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Notes
                        </label>
                        <textarea
                            placeholder="Additional details..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="submit"
                            className="flex-1 glass-button"
                        >
                            Create Shoot
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
