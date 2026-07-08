import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const EVENT_TYPES = [
  { value: 'WEDDING', label: 'Mariage' },
  { value: 'DOT', label: 'Mariage coutumier' },
  { value: 'BIRTHDAY', label: 'Anniversaire' },
  { value: 'CEREMONY', label: 'Cérémonie (baptême…)' },
  { value: 'CONFERENCE', label: 'Conférence / Séminaire' },
  { value: 'OTHER', label: 'Autre' }
];

const CATEGORIES = [
  { value: 'ELEGANT', label: 'Élégant' },
  { value: 'MODERN', label: 'Moderne' },
  { value: 'ROMANTIC', label: 'Romantique' },
  { value: 'MINIMALIST', label: 'Minimaliste' },
  { value: 'TRADITIONAL', label: 'Traditionnel' }
];

export default function TemplatePublish() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    eventType: 'WEDDING',
    category: 'MODERN',
    description: '',
    priceUSD: ''
  });

  // Fixed revenue split applied to the price the creator sets.
  const CREATOR_SHARE = 40;
  const SITE_SHARE = 40;
  const FEES_SHARE = 20;

  // Fetch template
  const { data: templateData, isLoading: templateLoading } = useQuery(
    ['template', templateId],
    async () => {
      const response = await api.get(`/templates/${templateId}`);
      return response.data;
    }
  );

  const template = templateData?.template;

  // Prefill the form from the template once it loads
  useEffect(() => {
    if (template) {
      setFormData(prev => ({
        ...prev,
        name: template.name || '',
        eventType: template.eventType || 'WEDDING',
        category: template.category || 'MODERN',
        description: template.description || ''
      }));
    }
  }, [template]);

  // Check if user is creator
  if (user?.role !== 'CREATOR' && !user?.isCreator) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-red-500 font-semibold">Accès réservé aux créateurs</p>
        <p className="text-gray-600">Vous devez être créateur pour publier des templates</p>
        <button onClick={() => navigate('/dashboard')} className="btn-primary">Retour au dashboard</button>
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
        <button onClick={() => navigate('/creator-templates')} className="btn-primary">Retour à Créer un Template</button>
      </div>
    );
  }

  if (!template.isCustom) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-red-500 font-semibold">Impossible de publier ce template</p>
        <p className="text-gray-600">Seuls les templates personnalisés peuvent être publiés</p>
        <button onClick={() => navigate('/creator-templates')} className="btn-primary">Retour à Créer un Template</button>
      </div>
    );
  }

  // Clones of a marketplace template cannot be published.
  if (template.sourceTemplateId) {
    return (
      <div className="text-center py-12 space-y-4">
        <p className="text-red-500 font-semibold">Ce template est un clone</p>
        <p className="text-gray-600 max-w-md mx-auto">
          Il a été cloné depuis un template de la marketplace. Seul l'original peut être publié,
          et son créateur conserve la commission.
        </p>
        <button onClick={() => navigate('/creator-templates')} className="btn-primary">Retour à mes templates</button>
      </div>
    );
  }

  // Resolve the best available preview image.
  const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
  const rawPreview =
    template.previewImage || template.config?.previewImage || template.thumbnail || template.backgroundUrl || '';
  const previewSrc = rawPreview
    ? (rawPreview.startsWith('data:') || rawPreview.startsWith('http') ? rawPreview : `${apiBase}${rawPreview}`)
    : '';

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // The creator sets name/event type/category/description AND the price.
      // The split is fixed (creator 40% / Winvite 30% / fees 20%); the admin
      // validates and may adjust the price.
      await api.post(`/marketplace/${templateId}/publish`, {
        name: formData.name.trim(),
        eventType: formData.eventType,
        category: formData.category,
        description: formData.description.trim(),
        priceUSD: parseFloat(formData.priceUSD) || 0
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
        <h1 className="text-3xl font-serif font-bold text-gray-900">Publier dans la Marketplace</h1>
        <p className="text-gray-600 mt-1">Partagez votre template et gagnez des commissions</p>
      </div>

      {/* Step Indicator */}
      <div className="flex gap-4">
        {[1, 2, 3].map(s => (
          <div key={s} className={`flex-1 h-2 rounded-full ${s <= step ? 'bg-primary-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">{error}</div>
      )}

      {step < 3 && (
        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Step 1: Details */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-xl font-serif font-bold">Détails du template</h2>

              <div className="aspect-[3/4] max-w-xs mx-auto bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                {previewSrc ? (
                  <img src={previewSrc} alt={formData.name} className="w-full h-full object-contain" />
                ) : (
                  <span className="text-sm text-gray-400">Aucun aperçu disponible</span>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Nom du template *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Ex: Élégance dorée"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Type d'événement *</label>
                  <select
                    value={formData.eventType}
                    onChange={(e) => handleInputChange('eventType', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {EVENT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-2">Style</label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleInputChange('category', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  >
                    {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Description (optionnel)</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Décrivez le style de votre template et ce qui le rend unique..."
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Price set by the creator */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Prix du template *</label>
                <div className="flex">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.priceUSD}
                    onChange={(e) => handleInputChange('priceUSD', e.target.value)}
                    placeholder="Ex: 2000"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-l-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <span className="inline-flex items-center px-4 bg-gray-100 text-gray-600 text-sm font-medium rounded-r-lg border border-l-0 border-gray-300">FC</span>
                </div>
                <p className="mt-1 text-xs text-gray-500">C'est le prix affiché dans la marketplace. Vous en percevez {CREATOR_SHARE}% (voir l'étape suivante).</p>
              </div>
            </div>
          )}

          {/* Step 2: Revenue split */}
          {step === 2 && (() => {
            const price = Math.max(0, parseFloat(formData.priceUSD) || 0)
            const share = (pct) => Math.round(price * pct / 100).toLocaleString('fr-FR')
            return (
              <div className="space-y-6">
                <h2 className="text-xl font-serif font-bold">Votre rémunération</h2>
                <div className="rounded-xl border border-primary-200 bg-primary-50 p-4">
                  <p className="text-sm text-gray-700">
                    Sur chaque vente de ce template, la répartition est la suivante :
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center">
                    <div className="rounded-xl bg-white border border-primary-200 p-3">
                      <p className="text-2xl font-bold text-primary-600">{CREATOR_SHARE}%</p>
                      <p className="mt-1 text-xs font-medium text-gray-700">Vous (créateur)</p>
                      {price > 0 && <p className="text-[11px] text-gray-400">{share(CREATOR_SHARE)} FC</p>}
                    </div>
                    <div className="rounded-xl bg-white border border-gray-200 p-3">
                      <p className="text-2xl font-bold text-gray-700">{SITE_SHARE}%</p>
                      <p className="mt-1 text-xs font-medium text-gray-700">Winvite</p>
                      {price > 0 && <p className="text-[11px] text-gray-400">{share(SITE_SHARE)} FC</p>}
                    </div>
                    <div className="rounded-xl bg-white border border-gray-200 p-3">
                      <p className="text-2xl font-bold text-gray-700">{FEES_SHARE}%</p>
                      <p className="mt-1 text-xs font-medium text-gray-700">Frais de transaction</p>
                      {price > 0 && <p className="text-[11px] text-gray-400">{share(FEES_SHARE)} FC</p>}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Prix fixé</span>
                    <span className="text-sm font-semibold text-gray-900">{price > 0 ? `${price.toLocaleString('fr-FR')} FC` : '—'}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-sm text-gray-600">Vous percevez ({CREATOR_SHARE}%)</span>
                    <span className="text-lg font-bold text-primary-600">{price > 0 ? `${share(CREATOR_SHARE)} FC` : '—'}</span>
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  Vos gains s'accumulent à chaque utilisation de votre template et sont versés depuis votre espace créateur.
                  Notre équipe valide votre soumission (elle peut ajuster le prix) avant la mise en ligne.
                </p>
              </div>
            )
          })()}

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
                onClick={() => {
                  if (!formData.name.trim()) { setError('Le nom du template est requis'); return; }
                  if (!(parseFloat(formData.priceUSD) > 0)) { setError('Veuillez fixer un prix pour votre template'); return; }
                  setError('');
                  setStep(2);
                }}
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
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Template soumis !</h2>
            <p className="text-gray-600">
              Votre template est maintenant <strong>en attente de validation</strong>. Notre équipe va le vérifier
              (et confirmer le prix que vous avez fixé), puis vous notifier dès son approbation.
            </p>
          </div>
          <div className="flex gap-4 justify-center">
            <button onClick={() => navigate('/creator-templates')} className="px-6 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">
              Voir mes templates
            </button>
            <button onClick={() => navigate('/creator-dashboard')} className="px-6 py-2 border border-gray-300 rounded-lg font-medium hover:bg-gray-50">
              Aller au Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
