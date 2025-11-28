import { useState } from 'react';
import { X, Link as LinkIcon, Plus, Trash2 } from 'lucide-react';

export default function WorkLinksModal({ isOpen, onClose, onSave, existingLinks = '', title = 'Add Work Links' }) {
  const [links, setLinks] = useState(existingLinks ? existingLinks.split(',').filter(l => l.trim()) : ['']);

  if (!isOpen) return null;

  const handleAddLink = () => {
    setLinks([...links, '']);
  };

  const handleRemoveLink = (index) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index, value) => {
    const newLinks = [...links];
    newLinks[index] = value;
    setLinks(newLinks);
  };

  const handleSave = () => {
    const validLinks = links.filter(l => l.trim()).map(l => l.trim());
    onSave(validLinks.join(', '));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity z-[100]" onClick={onClose} />
      <div className="glass-card w-full max-w-2xl p-6 relative z-[101] animate-fadeIn max-h-[90vh] overflow-y-auto bg-white/95 shadow-2xl">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <LinkIcon className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <p className="text-sm text-gray-600 font-medium mb-6">
          Add Google Drive, Dropbox, or other file/folder links where your work is stored.
        </p>

        <div className="space-y-4 mb-6">
          {links.map((link, index) => (
            <div key={index} className="flex items-center gap-3 animate-fadeIn">
              <div className="flex-1 relative">
                <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="url"
                  value={link}
                  onChange={(e) => handleLinkChange(index, e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
              </div>
              {links.length > 1 && (
                <button
                  onClick={() => handleRemoveLink(index)}
                  className="p-3 text-red-600 hover:bg-red-50 rounded-xl transition-colors border border-transparent hover:border-red-100"
                  title="Remove link"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={handleAddLink}
          className="w-full mb-8 px-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 font-bold hover:border-primary hover:text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Another Link
        </button>

        <div className="flex gap-4">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-4 py-3 text-white bg-primary rounded-xl font-bold hover:bg-primary-dark transition-colors shadow-lg shadow-primary/30"
          >
            Save Links
          </button>
        </div>
      </div>
    </div>
  );
}
