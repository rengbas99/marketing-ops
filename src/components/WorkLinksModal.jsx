import { useCallback, useEffect, useId, useState } from 'react';
import { Link as LinkIcon, Plus, Trash2 } from 'lucide-react';
import OverlayMount from './overlay/OverlayMount.jsx';
import Modal from './primitives/Modal.jsx';
import Button from './primitives/Button.jsx';

export default function WorkLinksModal({ isOpen, onClose, onSave, existingLinks = '', title = 'Add Work Links' }) {
  const [links, setLinks] = useState(existingLinks ? existingLinks.split(',').filter(l => l.trim()) : ['']);
  const reactId = useId();

  useEffect(() => {
    if (isOpen) {
      setLinks(existingLinks ? existingLinks.split(',').filter(l => l.trim()) : ['']);
    }
  }, [existingLinks, isOpen]);

  const renderOverlay = useCallback(
    ({ close }) => {
      const handleClose = () => {
        close();
        onClose?.();
      };

      const handleSave = () => {
        const validLinks = links.filter(l => l.trim()).map(l => l.trim());
        onSave(validLinks.join(', '));
        handleClose();
      };

      const handleAddLink = () => {
        setLinks(prev => [...prev, '']);
      };

      const handleRemoveLink = (index) => {
        setLinks(prev => prev.filter((_, i) => i !== index));
      };

      const handleLinkChange = (index, value) => {
        setLinks(prev => {
          const next = [...prev];
          next[index] = value;
          return next;
        });
      };

      return (
        <Modal
          title={title}
          description="Add Google Drive, Dropbox, or other file/folder links where completed work is stored."
          onClose={handleClose}
          size="lg"
          footer={(
            <div className="flex gap-3 justify-end">
              <Button variant="secondary" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Links
              </Button>
            </div>
          )}
        >
          <div className="space-y-4">
            {links.map((link, index) => (
              <div key={`${link}-${index}`} className="flex items-center gap-3">
                <div className="flex-1 relative">
                  <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="url"
                    value={link}
                    onChange={(e) => handleLinkChange(index, e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-[transform,opacity,colors,shadow]"
                  />
                </div>
                {links.length > 1 && (
                  <Button
                    onClick={() => handleRemoveLink(index)}
                    variant="secondary"
                    size="sm"
                    className="text-red-600 hover:text-red-700 border-red-100 hover:border-red-200"
                    aria-label="Remove link"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            variant="secondary"
            className="mt-6 w-full border-dashed border-2 border-gray-300 text-gray-600 hover:border-primary hover:text-primary"
            onClick={handleAddLink}
            size="md"
          >
            <Plus className="w-4 h-4" />
            Add Another Link
          </Button>
        </Modal>
      );
    },
    [links, onClose, onSave, title],
  );

  return (
    <OverlayMount
      id={`work-links-${reactId}`}
      isOpen={isOpen}
      type="modal"
      blocking
      priority={20}
      render={renderOverlay}
    />
  );
}
