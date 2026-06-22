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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-gray-900">
            Template Marketplace
          </h1>
          <p className="text-gray-600 mt-1">
            Discover beautiful templates created by our community
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 text-lg font-medium mb-4 sm:mb-0"
        >
          <FunnelIcon className="w-5 h-5" />
          Filters
        </button>

        {showFilters && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-6 border-t">
            {/* Sort */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Sort By
              </label>
              <select
                value={sort}
                onChange={(e) => handleFilterChange('sort', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="newest">Newest</option>
                <option value="popular">Most Popular</option>
                <option value="highest_commission">Highest Commission</option>
              </select>
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Events</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">Loading templates...</p>
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <p className="text-red-500">Error loading templates</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg">
          <p className="text-gray-500 text-lg">No templates found</p>
          <p className="text-gray-400 text-sm mt-2">Try adjusting your filters</p>
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
            <div className="flex items-center justify-center gap-2">
              {pagination.page > 1 && (
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Previous
                </button>
              )}

              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePageChange(p)}
                    className={`px-3 py-2 rounded-lg ${
                      p === pagination.page
                        ? 'bg-primary-600 text-white'
                        : 'border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              {pagination.page < pagination.totalPages && (
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
