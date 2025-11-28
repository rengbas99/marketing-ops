import { useState } from 'react';
import { X } from 'lucide-react';
import { ASSET_STATUS } from '../constants';

const DELIVERABLE_TYPES = [
    'Social Media Post',
    'Instagram Story',
    'Facebook Post',
    'Print Media',
    'Poster',
    'Flyer',
    'Banner',
    'Menu Design',
    'Logo Design',
    'Video Edit',
    'Reel',
    'Website Banner',
    'Email Newsletter',
    'Brochure',
    'Business Card',
    'Other'
];

export default function CreateAssetModal({ onClose, onSubmit, clients, shoots, editors, creators }) {
    const [formData, setFormData] = useState({
        title: '',
        deliverable_type: '',
        custom_deliverable: '',
        client_id: '',
        shoot_id: '',
        assigned_editor_email: '',
        assigned_creator_email: '',
        deadline: '',
        notes: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();

        const assetData = {
            asset_id: `ASSET-${Date.now()}`,
            title: formData.title,
            deliverable_type: formData.deliverable_type === 'Other'
                ? formData.custom_deliverable
                : formData.deliverable_type,
            client_id: formData.client_id || null,
            shoot_id: formData.shoot_id || null,
            assigned_editor_email: formData.assigned_editor_email || null,
            assigned_creator_email: formData.assigned_creator_email || null,
            status: ASSET_STATUS.TO_EDIT,
            work_progress: 0,
            deadline: formData.deadline || null,
            notes: formData.notes,
            created_at: new Date().toISOString()
        };

        await onSubmit(assetData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="glass-card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white">Create New Asset</h2>
                    <button onClick={onClose} className="text-white/60 hover:text-white">
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Asset Title *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g., X Hotel Instagram Post"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Deliverable Type *
                        </label>
                        <select
                            required
                            value={formData.deliverable_type}
                            onChange={(e) => setFormData({ ...formData, deliverable_type: e.target.value })}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        >
                            <option value="">Select Type</option>
                            {DELIVERABLE_TYPES.map(type => (
                                <option key={type} value={type} className="bg-gray-800">
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    {formData.deliverable_type === 'Other' && (
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Custom Deliverable Type *
                            </label>
                            <input
                                type="text"
                                required
                                placeholder="Specify deliverable type"
                                value={formData.custom_deliverable}
                                onChange={(e) => setFormData({ ...formData, custom_deliverable: e.target.value })}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-blue-400"
                            />
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
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
                                Shoot (Optional)
                            </label>
                            <select
                                value={formData.shoot_id}
                                onChange={(e) => setFormData({ ...formData, shoot_id: e.target.value })}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                            >
                                <option value="">No Shoot</option>
                                {shoots.map(s => (
                                    <option key={s.shoot_id} value={s.shoot_id} className="bg-gray-800">
                                        {s.shoot_name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Assign Editor
                            </label>
                            <select
                                value={formData.assigned_editor_email}
                                onChange={(e) => setFormData({ ...formData, assigned_editor_email: e.target.value })}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                            >
                                <option value="">Assign Later</option>
                                {editors.map(e => (
                                    <option key={e.email} value={e.email} className="bg-gray-800">
                                        {e.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-white/80 mb-2">
                                Assign Creator (Optional)
                            </label>
                            <select
                                value={formData.assigned_creator_email}
                                onChange={(e) => setFormData({ ...formData, assigned_creator_email: e.target.value })}
                                className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                            >
                                <option value="">None</option>
                                {creators.map(c => (
                                    <option key={c.email} value={c.email} className="bg-gray-800">
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Deadline
                        </label>
                        <input
                            type="date"
                            value={formData.deadline}
                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                            className="w-full px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-white/80 mb-2">
                            Notes/Requirements
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
                            Create Asset
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
