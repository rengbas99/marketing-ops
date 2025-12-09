import { useState, useId } from 'react';
import { Plus } from 'lucide-react';
import { ASSET_STATUS } from '../constants';
import ModalPortal from './primitives/ModalPortal.jsx';
import Button from './primitives/Button.jsx';

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

    const modalId = useId();
    const safeClients = Array.isArray(clients) ? clients : [];
    const safeShoots = Array.isArray(shoots) ? shoots : [];
    const safeEditors = Array.isArray(editors) ? editors : [];
    const safeCreators = Array.isArray(creators) ? creators : [];

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
        <ModalPortal
            id={`create-asset-${modalId}`}
            isOpen
            onClose={onClose}
            title="Create New Asset"
            description="Fill out the details below to assign a new deliverable."
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Asset Title *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g., X Hotel Instagram Post"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                        />
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Deliverable Type *
                            </label>
                            <select
                                required
                                value={formData.deliverable_type}
                                onChange={(e) => setFormData({ ...formData, deliverable_type: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                            >
                                <option value="">Select Type</option>
                                {DELIVERABLE_TYPES.map(type => (
                                    <option key={type} value={type}>
                                        {type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {formData.deliverable_type === 'Other' && (
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Custom Deliverable *
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Specify deliverable type"
                                    value={formData.custom_deliverable}
                                    onChange={(e) => setFormData({ ...formData, custom_deliverable: e.target.value })}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Client (Optional)
                        </label>
                        <select
                            value={formData.client_id}
                            onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                        >
                            <option value="">No Client</option>
                            {safeClients.map(c => (
                                <option key={c.client_id} value={c.client_id}>
                                    {c.company_name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Shoot (Optional)
                        </label>
                        <select
                            value={formData.shoot_id}
                            onChange={(e) => setFormData({ ...formData, shoot_id: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                        >
                            <option value="">No Shoot</option>
                            {safeShoots.map(s => (
                                <option key={s.shoot_id} value={s.shoot_id}>
                                    {s.shoot_name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Assign Editor
                        </label>
                        <select
                            value={formData.assigned_editor_email}
                            onChange={(e) => setFormData({ ...formData, assigned_editor_email: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                        >
                            <option value="">Assign Later</option>
                            {safeEditors.map(e => (
                                <option key={e.email} value={e.email}>
                                    {e.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Assign Creator (Optional)
                        </label>
                        <select
                            value={formData.assigned_creator_email}
                            onChange={(e) => setFormData({ ...formData, assigned_creator_email: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                        >
                            <option value="">None</option>
                            {safeCreators.map(c => (
                                <option key={c.email} value={c.email}>
                                    {c.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Deadline
                        </label>
                        <input
                            type="date"
                            value={formData.deadline}
                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Notes / Requirements
                        </label>
                        <textarea
                            placeholder="Additional details..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                    <Button type="submit" className="flex-1 gap-2">
                        <Plus className="w-4 h-4" />
                        Create Asset
                    </Button>
                    <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </form>
        </ModalPortal>
    );
}
