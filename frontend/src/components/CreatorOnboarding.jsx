import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { api } from '../services/api';
import '../styles/modal.css';

export default function CreatorOnboarding({ isOpen, onClose, onSuccess }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { user, setUser } = useAuthStore();

  const [formData, setFormData] = useState({
    displayName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim(),
    bio: '',
    website: '',
    socialLinks: {
      instagram: '',
      twitter: '',
      tiktok: '',
      pinterest: ''
    }
  });

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSocialChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [platform]: value
      }
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Filter out empty social links
      const socialLinks = {};
      Object.entries(formData.socialLinks).forEach(([key, value]) => {
        if (value.trim()) socialLinks[key] = value.trim();
      });

      const response = await api.post('/creators/register', {
        displayName: formData.displayName.trim(),
        bio: formData.bio.trim(),
        website: formData.website.trim(),
        socialLinks
      });

      // Update user state
      setUser({
        ...user,
        isCreator: true
      });

      onSuccess?.();
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create creator profile');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isStep1Valid = formData.displayName.trim().length > 0;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '500px' }}>
        <div className="modal-header">
          <h2>Become a Creator</h2>
          <button
            className="modal-close"
            onClick={onClose}
            disabled={loading}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Basic Info */}
            <div style={{ display: step >= 1 ? 'block' : 'none' }}>
              <div className="form-group">
                <label>Display Name *</label>
                <input
                  type="text"
                  value={formData.displayName}
                  onChange={(e) => handleInputChange('displayName', e.target.value)}
                  placeholder="Your creator name"
                  required
                />
                <small>This is how creators appear on the marketplace</small>
              </div>

              <div className="form-group">
                <label>Bio</label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => handleInputChange('bio', e.target.value)}
                  placeholder="Tell creators about yourself..."
                  rows="3"
                />
              </div>

              <div className="form-group">
                <label>Website</label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://yourwebsite.com"
                />
              </div>
            </div>

            {/* Step 2: Social Links */}
            {step >= 2 && (
              <div>
                <h3 style={{ marginBottom: '1rem' }}>Social Links (Optional)</h3>

                <div className="form-group">
                  <label>Instagram</label>
                  <input
                    type="text"
                    value={formData.socialLinks.instagram}
                    onChange={(e) => handleSocialChange('instagram', e.target.value)}
                    placeholder="@yourusername"
                  />
                </div>

                <div className="form-group">
                  <label>Twitter</label>
                  <input
                    type="text"
                    value={formData.socialLinks.twitter}
                    onChange={(e) => handleSocialChange('twitter', e.target.value)}
                    placeholder="@yourusername"
                  />
                </div>

                <div className="form-group">
                  <label>TikTok</label>
                  <input
                    type="text"
                    value={formData.socialLinks.tiktok}
                    onChange={(e) => handleSocialChange('tiktok', e.target.value)}
                    placeholder="@yourusername"
                  />
                </div>

                <div className="form-group">
                  <label>Pinterest</label>
                  <input
                    type="text"
                    value={formData.socialLinks.pinterest}
                    onChange={(e) => handleSocialChange('pinterest', e.target.value)}
                    placeholder="@yourusername"
                  />
                </div>
              </div>
            )}

            {/* Step 3: Terms */}
            {step >= 3 && (
              <div style={{ backgroundColor: '#f5f5f5', padding: '1rem', borderRadius: '8px' }}>
                <h3 style={{ marginBottom: '0.5rem' }}>Creator Terms</h3>
                <p style={{ fontSize: '0.9rem', lineHeight: '1.6', color: '#666' }}>
                  By becoming a creator, you agree to:
                </p>
                <ul style={{ fontSize: '0.9rem', color: '#666', paddingLeft: '1.5rem' }}>
                  <li>Create original or properly licensed templates</li>
                  <li>Maintain creator account in good standing</li>
                  <li>Accept platform commission structure</li>
                  <li>Comply with platform policies</li>
                </ul>
                <label style={{ marginTop: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" required />
                  <span>I agree to creator terms</span>
                </label>
              </div>
            )}

            {/* Navigation */}
            <div className="modal-footer">
              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
                {step > 1 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setStep(step - 1)}
                    disabled={loading}
                  >
                    Back
                  </button>
                )}

                {step < 3 ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setStep(step + 1)}
                    disabled={!isStep1Valid || loading}
                    style={{ marginLeft: step === 1 ? 'auto' : 'auto' }}
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loading}
                    style={{ marginLeft: 'auto' }}
                  >
                    {loading ? 'Creating...' : 'Create Profile'}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
