import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../services/api';
import MarketplaceTemplateCard from '../../components/MarketplaceTemplateCard';
import { FunnelIcon } from '@heroicons/react/24/outline';

export default function Marketplace() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showFilters, setShowFilters] = useState(false);

  // Get params from URL
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '12');
  const category = searchParams.get('category') || '';
  const eventType = searchParams.get('eventType') || '';
  const sort = searchParams.get('sort') || 'newest';

  // Fetch templates
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
    }
  );

  const templates = data?.templates || [];
  const pagination = data?.pagination || {};

  const handleFilterChange = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1');
    setSearchParams(newParams);
  };

  const handlePageChange = (newPage) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', newPage);
    setSearchParams(newParams);
    window.scrollTo(0, 0);
  };

  const eventTypes = ['WEDDING', 'BIRTHDAY', 'DOT', 'CEREMONY', 'CONFERENCE'];
  const categories = ['MODERN', 'ELEGANT', 'ROMANTIC', 'RUSTIC', 'MINIMALIST'];

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-primary-50 to-secondary-50 rounded-3xl p-12 border border-primary-100 shadow-sm">
        <div className="max-w-3xl">
          <h1 className="text-5xl font-serif font-bold text-primary-700 mb-4">
            Template Marketplace
          </h1>
          <p className="text-gray-700 text-xl leading-relaxed">
            Découvrez les plus beaux templates d'invitations créés par notre communauté de designers talentueux
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-lg font-semibold text-gray-900 hover:text-primary-600 transition-colors"
        >
          <FunnelIcon className="w-5 h-5" />
          {showFilters ? 'Masquer les filtres' : 'Afficher les filtres'}
        </button>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t border-gray-200">
            {/* Sort */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Trier par
              </label>
              <select
                value={sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-all hover:border-gray-400"
              >
                <option value="newest">Plus récent</option>
                <option value="popular">Plus populaire</option>
                <option value="highest_commission">Commission la plus élevée</option>
              </select>
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Type d'événement
              </label>
              <select
                value={eventType}
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-all hover:border-gray-400"
              >
                <option value="">Tous les événements</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'WEDDING' ? 'Mariage' : type === 'BIRTHDAY' ? 'Anniversaire' : type === 'DOT' ? 'Jubilé' : type === 'CEREMONY' ? 'Cérémonie' : 'Conférence'}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-3">
                Catégorie
              </label>
              <select
                value={category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-white transition-all hover:border-gray-400"
              >
                <option value="">Toutes les catégories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat === 'MODERN' ? 'Moderne' : cat === 'ELEGANT' ? 'Élégant' : cat === 'ROMANTIC' ? 'Romantique' : cat === 'RUSTIC' ? 'Rustique' : 'Minimaliste'}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600 font-medium">Chargement des templates...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-700 font-semibold text-lg">Erreur lors du chargement</p>
          <p className="text-red-600 mt-2">Veuillez réessayer plus tard</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl p-16 text-center border border-primary-100">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary-100 mb-6">
            <svg className="w-10 h-10 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 015.646 5.646M9 9h.01M15 15h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5-4h.01" />
            </svg>
          </div>
          <p className="text-gray-900 font-bold text-xl mb-2">Aucun template trouvé</p>
          <p className="text-gray-600 text-lg max-w-md mx-auto">Essayez d'ajuster vos filtres ou consultez tous les templates disponibles</p>
        </div>
      ) : (
        <>
          {/* Templates Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {templates.map(template => (
              <MarketplaceTemplateCard
                key={template.id}
                template={template}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-8">
              {pagination.page > 1 && (
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="px-5 py-2 border border-gray-300 rounded-xl hover:bg-primary-50 hover:border-primary-300 text-gray-700 font-medium transition-all duration-200"
                >
                  ← Précédent
                </button>
              )}

              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`px-3.5 py-2 rounded-xl font-medium transition-all duration-200 ${
                      p === pagination.page
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-primary-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {pagination.page < pagination.totalPages && (
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="px-5 py-2 border border-gray-300 rounded-xl hover:bg-primary-50 hover:border-primary-300 text-gray-700 font-medium transition-all duration-200"
                >
                  Suivant →
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
