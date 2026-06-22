import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

export default function CreatorOnboarding({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, setUser } = useAuthStore();

  const [formData, setFormData] = useState({
    displayName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    bio: ''
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post('/creators/register', {
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim()
      });

      // Update user state to mark as creator
      if (setUser && user) {
        setUser({
          ...user,
          isCreator: true
        });
      }

      // Call success callback to trigger parent refresh
      onSuccess?.();

      // Close modal after successful creation
      setTimeout(() => {
        onClose?.();
      }, 500);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create creator profile';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isValid = formData.displayName.trim().length > 0;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-serif font-bold text-gray-900">
              ✨ Become a Creator
            </h2>
            <button
              onClick={onClose}
              disabled={loading}
              className="text-gray-400 hover:text-gray-600 disabled:opacity-50 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name *
              </label>
              <input
                type="text"
                value={formData.displayName}
                onChange={(e) => handleInputChange('displayName', e.target.value)}
                placeholder="Your creator name"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
              />
              <p className="mt-1 text-xs text-gray-500">
                This is how creators appear on the marketplace
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Tell the world about yourself..."
                rows="4"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isValid || loading}
              className="w-full px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition font-medium mt-6"
            >
              {loading ? 'Creating Profile...' : 'Create Profile'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
