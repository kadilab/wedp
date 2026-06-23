import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

export default function TemplatePublish() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    priceUSD: 0,
    commissionPercentage: 30,
    description: ''
  });

  // Fetch template
  const { data: templateData, isLoading: templateLoading } = useQuery(
    ['template', templateId],
    async () => {
      const response = await api.get(`/api/templates/${templateId}`);
      return response.data;
    }
  );

  const template = templateData?.template;

  // Check if user is creator
  if (user?.role !== 'CREATOR' && !user?.isCreator) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-red-500 font-semibold">Accès réservé aux créateurs</p>
        <p className="text-gray-600">Vous devez être créateur pour publier des templates</p>
        <button
          onClick={() => navigate('/dashboard')}
          className="btn-primary"
        >
          Retour au dashboard
        </button>
      </div>
    );
  }

  if (templateLoading) {
    return <div className="text-center py-12">Chargement du template...</div>;
  }

  if (!template) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-red-500 font-semibold">Template non trouvé</p>
        <p className="text-gray-600">Le template n'existe pas ou a été supprimé</p>
        <button
          onClick={() => navigate('/creator-templates')}
          className="btn-primary"
        >
          Retour à Créer un Template
        </button>
      </div>
    );
  }

  if (!template.isCustom) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-red-500 font-semibold">Impossible de publier ce template</p>
        <p className="text-gray-600">Seuls les templates personnalisés peuvent être publiés</p>
        <button
          onClick={() => navigate('/creator-templates')}
          className="btn-primary"
        >
          Retour à Créer un Template
        </button>
      </div>
    );
  }

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
      const response = await api.post(`/marketplace/${templateId}/publish`, {
        priceUSD: parseFloat(formData.priceUSD) || 0,
        commissionPercentage: Math.min(Math.max(parseInt(formData.commissionPercentage), 10), 50),
        description: formData.description.trim()
      });

      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish template');
    } finally {
      setLoading(false);
    }
  };

  const estimatedCreatorEarning = (parseFloat(formData.priceUSD) || 0) * (parseFloat(formData.commissionPercentage) || 30) / 100;

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">
          Publish to Marketplace
        </h1>
        <p className="text-gray-600 mt-1">
          Share your template and earn commissions
        </p>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-4">
        {[1, 2, 3].map(s => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full ${
              s <= step ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Step 1 & 2: Publishing Form */}
      {step < 3 && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Template Preview */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-serif font-bold mb-4">Review Your Template</h2>
              <div className="aspect-video bg-gray-200 rounded-lg overflow-hidden mb-4">
                {template.thumbnail && (
                  <img src={template.thumbnail} alt={template.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Template Name</p>
                  <p className="font-medium">{template.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-medium">{template.category}</p>
                </div>
              </div>
            </div>
          )}

          {/* Pricing & Commission */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-serif font-bold">Set Pricing & Commission</h2>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Commission Basis (USD)
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  This is the amount used to calculate creator commission
                </p>
                <div className="flex">
                  <span className="inline-flex items-center px-3 bg-gray-200 text-gray-700 text-sm rounded-l-lg">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.priceUSD}
                    onChange={(e) => handleInputChange('priceUSD', e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent rounded-r-lg"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Commission Percentage (%)
                </label>
                <p className="text-xs text-gray-600 mb-2">
                  Creator earns this percentage of the commission basis when someone uses your template (10-50%)
                </p>
                <input
                  type="number"
                  min="10"
                  max="50"
                  value={formData.commissionPercentage}
                  onChange={(e) => handleInputChange('commissionPercentage', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent rounded-lg"
                />
              </div>

              {/* Earning Preview */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800 mb-1">Estimated Earning Per Use</p>
                <p className="text-3xl font-bold text-green-600">
                  ${estimatedCreatorEarning.toFixed(2)}
                </p>
                <p className="text-xs text-green-700 mt-2">
                  Calculation: ${formData.priceUSD || '0'} × {formData.commissionPercentage || '0'}%
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your template design, style, and what makes it special..."
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent rounded-lg"
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-4 pt-6 border-t">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Back
              </button>
            )}

            {step < 2 ? (
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                Continue
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Publishing...' : 'Submit for Review'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === 3 && (
        <div className="bg-white rounded-lg shadow p-12 text-center space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
            <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>

          <div>
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">
              Template Submitted!
            </h2>
            <p className="text-gray-600">
              Your template has been submitted for review. Our team will review it and notify you when it's approved.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>What happens next:</strong> Our team reviews all submissions within 24-48 hours. You'll receive an email notification when your template is approved or if we need any changes.
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/creator-dashboard')}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
            >
              Go to Dashboard
            </button>
            <button
              onClick={() => navigate('/templates')}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Browse Templates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
