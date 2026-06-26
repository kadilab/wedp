import { useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../services/api';
import MarketplaceTemplateCard from '../../components/MarketplaceTemplateCard';
import { SparklesIcon } from '@heroicons/react/24/outline';

const EVENT_TYPES = [
  { value: '', label: 'Tous' },
  { value: 'WEDDING', label: 'Mariage' },
  { value: 'DOT', label: 'Mariage coutumier' },
  { value: 'BIRTHDAY', label: 'Anniversaire' },
  { value: 'CEREMONY', label: 'Cérémonie' },
  { value: 'CONFERENCE', label: 'Conférence' },
  { value: 'OTHER', label: 'Autre' }
];

const CATEGORIES = [
  { value: '', label: 'Toutes les catégories' },
  { value: 'MODERN', label: 'Moderne' },
  { value: 'ELEGANT', label: 'Élégant' },
  { value: 'ROMANTIC', label: 'Romantique' },
  { value: 'MINIMALIST', label: 'Minimaliste' },
  { value: 'TRADITIONAL', label: 'Traditionnel' }
];

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '12');
  const category = searchParams.get('category') || '';
  const eventType = searchParams.get('eventType') || '';
  const sort = searchParams.get('sort') || 'newest';

  const { data, isLoading, error } = useQuery(
    ['marketplace-templates', { page, limit, category, eventType, sort }],
    async () => {
      const params = new URLSearchParams({
        page,
        limit,
        ...(category && { category }),
        ...(eventType && { eventType }),
        sort
      });
      const response = await api.get(`/marketplace/templates?${params}`);
      return response.data;
    },
    { keepPreviousData: true }
  );

  const templates = data?.templates || [];
  const pagination = data?.pagination || {};

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  };

  const handlePageChange = (newPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', newPage);
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-600 via-primary-500 to-gold-500 p-10 sm:p-14 shadow-lg">
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative max-w-2xl">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 text-white text-xs font-semibold backdrop-blur mb-4">
            <SparklesIcon className="w-4 h-4" /> Marketplace de templates
          </span>
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-white mb-3 leading-tight">
            Des invitations qui font sensation
          </h1>
          <p className="text-white/90 text-lg leading-relaxed">
            Parcourez les plus beaux templates créés par notre communauté de designers et trouvez celui qui sublimera votre événement.
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5 space-y-4">
        {/* Event type pills */}
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map(t => {
            const active = eventType === t.value;
            return (
              <button
                key={t.value || 'all'}
                onClick={() => setParam('eventType', t.value)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  active
                    ? 'bg-primary-600 text-white shadow-sm'
                    : 'bg-gray-50 text-gray-600 hover:bg-primary-50 hover:text-primary-700'
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Selects */}
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between pt-1">
          <select
            value={category}
            onChange={(e) => setParam('category', e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white hover:border-gray-300 transition"
          >
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>

          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white hover:border-gray-300 transition"
          >
            <option value="newest">Plus récents</option>
            <option value="popular">Plus populaires</option>
            <option value="highest_commission">Meilleure commission</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
              <div className="aspect-[3/4] bg-gray-100" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-100 rounded w-3/4" />
                <div className="h-3 bg-gray-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-12 text-center">
          <p className="text-red-700 font-semibold text-lg">Erreur lors du chargement</p>
          <p className="text-red-600 mt-2">Veuillez réessayer plus tard</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-gradient-to-br from-primary-50 to-gold-50 rounded-3xl p-16 text-center border border-primary-100">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white shadow-sm mb-6">
            <SparklesIcon className="w-10 h-10 text-primary-500" />
          </div>
          <p className="text-gray-900 font-serif font-bold text-2xl mb-2">Aucun template pour le moment</p>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            Ajustez vos filtres, ou revenez bientôt : de nouveaux designs arrivent régulièrement.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{pagination.total ?? templates.length}</span> template{(pagination.total ?? templates.length) !== 1 ? 's' : ''} disponible{(pagination.total ?? templates.length) !== 1 ? 's' : ''}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map(template => (
              <MarketplaceTemplateCard key={template.id} template={template} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-6">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-primary-50 hover:border-primary-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                ← Précédent
              </button>
              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`w-10 h-10 rounded-xl font-medium transition ${
                      p === pagination.page
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-primary-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-4 py-2 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-primary-50 hover:border-primary-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                Suivant →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
