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
    description: ''
  });

  // Fetch template
  const { data: templateData, isLoading: templateLoading } = useQuery(
    ['template', templateId],
    async () => {
      const response = await api.get(`/templates/${templateId}`);
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

  // Resolve the best available preview image. Custom templates store their
  // rendered preview in previewImage / config.previewImage (data URLs), with
  // thumbnail / backgroundUrl as relative-path fallbacks served by the API.
  const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
  const rawPreview =
    template.previewImage ||
    template.config?.previewImage ||
    template.thumbnail ||
    template.backgroundUrl ||
    '';
  const previewSrc = rawPreview
    ? (rawPreview.startsWith('data:') || rawPreview.startsWith('http')
        ? rawPreview
        : `${apiBase}${rawPreview}`)
    : '';

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
      // Pricing and commission are set by the admin during review.
      // The creator only submits the template (and an optional description).
      await api.post(`/marketplace/${templateId}/publish`, {
        description: formData.description.trim()
      });

      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to publish template');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">
          Publier dans la Marketplace
        </h1>
        <p className="text-gray-600 mt-1">
          Partagez votre template et gagnez des commissions
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
              <h2 className="text-xl font-serif font-bold mb-4">Vérifiez votre template</h2>
              <div className="aspect-[3/4] max-w-xs mx-auto bg-gray-100 rounded-lg overflow-hidden mb-4 flex items-center justify-center">
                {previewSrc ? (
                  <img src={previewSrc} alt={template.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-sm text-gray-400">Aucun aperçu disponible</span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Nom du template</p>
                  <p className="font-medium">{template.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Catégorie</p>
                  <p className="font-medium">{template.category || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {/* Commission Info & Description */}
          {step === 2 && (
            <div className="space-y-6">
              <h2 className="text-xl font-serif font-bold">Comment vous gagnez de l'argent</h2>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
                <p className="text-sm text-blue-900">
                  Le <strong>prix de vente</strong> et votre <strong>pourcentage de commission</strong> sont
                  définis par notre équipe lors de la validation, afin de garantir une tarification cohérente
                  sur toute la marketplace.
                </p>
                <p className="text-sm text-blue-900">
                  À chaque fois qu'un client utilise votre template, vous gagnez votre commission
                  (un pourcentage du prix de vente). Vos gains s'accumulent et sont versés depuis votre
                  espace créateur.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-2xl mb-1">📤</p>
                  <p className="text-xs text-gray-600">Vous soumettez votre template</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-2xl mb-1">✅</p>
                  <p className="text-xs text-gray-600">L'admin fixe le prix et votre commission</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-2xl mb-1">💰</p>
                  <p className="text-xs text-gray-600">Vous gagnez à chaque utilisation</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">
                  Description (optionnel)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Décrivez le style de votre template et ce qui le rend unique..."
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
                Retour
              </button>
            )}

            {step < 2 ? (
              <button
                onClick={() => setStep(2)}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
              >
                Continuer
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50"
              >
                {loading ? 'Envoi...' : 'Soumettre pour validation'}
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
              Template soumis !
            </h2>
            <p className="text-gray-600">
              Votre template a été soumis pour validation. Notre équipe va le vérifier, fixer le prix et
              votre commission, puis vous notifier dès son approbation.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Et ensuite ?</strong> Notre équipe examine toutes les soumissions sous 24-48h.
              Vous recevrez une notification dès que votre template est approuvé ou si une modification est nécessaire.
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => navigate('/creator-dashboard')}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700"
            >
              Aller au Dashboard
            </button>
            <button
              onClick={() => navigate('/templates')}
              className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              Parcourir les Templates
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
