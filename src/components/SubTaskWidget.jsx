/**
 * SubTaskWidget - Manual Work Entry Widget for Editors
 * Allows editors to manually enter what they're working on when clocked in
 * Displays on EditorDashboard and LeadDashboard
 */

import { useState, useEffect } from 'react';
import { FileText, Save, Edit2, X } from 'lucide-react';

export default function SubTaskWidget({
  activeTimeLog,
  onSave,
  readOnly = false,
  className = ''
}) {
  const [notes, setNotes] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing notes from time log
  useEffect(() => {
    if (activeTimeLog?.notes) {
      setNotes(activeTimeLog.notes);
    } else {
      setNotes('');
    }
    setIsEditing(false);
  }, [activeTimeLog]);

  const handleSave = async () => {
    if (!onSave) return;

    setIsSaving(true);
    try {
      await onSave(notes);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving notes:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    // Reset to original notes
    setNotes(activeTimeLog?.notes || '');
    setIsEditing(false);
  };

  if (!activeTimeLog && !readOnly) {
    return null; // Don't show widget if no active time log
  }

  return (
    <div className={`glass-card p-4 ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">
            What I'm Working On
          </h3>
        </div>
        {!readOnly && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-primary hover:text-primary-dark transition-colors p-1 hover:bg-primary/10 rounded-lg"
            title="Edit work description"
          >
            <Edit2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {isEditing ? (
        <div className="space-y-3 animate-fadeIn">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Describe what you're working on... (e.g., 'Editing product photos for client X', 'Color correction on shoot Y', 'Adding text overlays')"
            className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent resize-none outline-none transition-all"
            rows={3}
            disabled={isSaving}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 bg-primary text-white px-4 py-2 rounded-xl font-bold hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </>
              )}
            </button>
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              <span>Cancel</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-700 bg-gray-50/50 rounded-xl p-3 border border-gray-100">
          {notes ? (
            <p className="whitespace-pre-wrap leading-relaxed">{notes}</p>
          ) : (
            <p className="text-gray-400 italic font-medium">
              {readOnly ? 'No work description yet' : 'Click edit to add what you\'re working on'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
