import { useState, useId } from 'react';
import { Calendar as CalendarIcon, MapPin, PenSquare } from 'lucide-react';
import { SHOOT_STATUS } from '../constants';
import ModalPortal from './primitives/ModalPortal.jsx';
import Button from './primitives/Button.jsx';

export default function CreateShootModal({ onClose, onSubmit, clients, photographers }) {
    const [formData, setFormData] = useState({
        shoot_name: '',
        client_id: '',
        photographer_id: '',
        date: new Date().toISOString().split('T')[0],
        location_name: '',
        notes: ''
    });

    const modalId = useId();
    const safeClients = Array.isArray(clients) ? clients : [];
    const safePhotographers = Array.isArray(photographers) ? photographers : [];

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
        <ModalPortal
            id={`create-shoot-${modalId}`}
            isOpen
            onClose={onClose}
            title="Create New Shoot"
            description="Capture the essentials before assigning your team."
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid gap-4">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Shoot Name *
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="e.g., X Hotel Promotions"
                            value={formData.shoot_name}
                            onChange={(e) => setFormData({ ...formData, shoot_name: e.target.value })}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                        />
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
                                Photographer (Optional)
                            </label>
                            <select
                                value={formData.photographer_id}
                                onChange={(e) => setFormData({ ...formData, photographer_id: e.target.value })}
                                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                            >
                                <option value="">Assign Later</option>
                                {safePhotographers.map(p => (
                                    <option key={p.email} value={p.email}>
                                        {p.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Date *
                        </label>
                        <div className="relative">
                            <CalendarIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Location
                        </label>
                        <div className="relative">
                            <MapPin className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                                type="text"
                                placeholder="e.g., Downtown Studio"
                                value={formData.location_name}
                                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                            />
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Notes
                    </label>
                    <div className="relative">
                        <PenSquare className="w-4 h-4 text-gray-400 absolute left-3 top-4" />
                        <textarea
                            placeholder="Additional details..."
                            value={formData.notes}
                            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                            rows={4}
                            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-[transform,opacity,colors,shadow]"
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-3 pt-4 sm:flex-row">
                    <Button type="submit" className="flex-1 gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Create Shoot
                    </Button>
                    <Button type="button" variant="secondary" className="flex-1" onClick={onClose}>
                        Cancel
                    </Button>
                </div>
            </form>
        </ModalPortal>
    );
}
