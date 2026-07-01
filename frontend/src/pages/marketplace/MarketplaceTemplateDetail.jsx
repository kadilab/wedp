import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import { StarIcon, LinkIcon } from '@heroicons/react/24/outline';

export default function MarketplaceTemplateDetail() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, isLoading, error } = useQuery(
    ['marketplace-template', templateId],
    async () => {
      const response = await api.get(`/marketplace/templates/${templateId}`);
      return response.data;
    }
  );

  const template = data?.template;

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p>Loading template...</p>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Template not found</p>
        <button
          onClick={() => navigate('/marketplace')}
          className="btn-primary mt-4"
        >
          Back to Marketplace
        </button>
      </div>
    );
  }

  const { name, description, thumbnail, previewImage, category, eventType, marketplace } = template;
  const { creator, priceUSD, commissionPercentage, usageCount, publishedAt } = marketplace;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/marketplace')}
          className="text-primary-600 hover:text-primary-700 text-sm font-medium"
        >
          ← Back to Marketplace
        </button>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Main Image */}
          <div className="bg-gray-200 rounded-lg overflow-hidden aspect-video">
            {thumbnail && (
              <img
                src={thumbnail}
                alt={name}
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Preview Images */}
          {previewImage && (
            <div className="bg-gray-200 rounded-lg overflow-hidden aspect-video">
              <img
                src={previewImage}
                alt={`${name} preview`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Description */}
          <div>
            <h2 className="text-xl font-serif font-bold text-gray-900 mb-3">
              About This Template
            </h2>
            <p className="text-gray-600 whitespace-pre-wrap">
              {description || 'No description provided'}
            </p>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 p-6 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm text-gray-600">Event Type</p>
              <p className="font-medium text-gray-900">{eventType || 'All'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Category</p>
              <p className="font-medium text-gray-900">{category}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Times Used</p>
              <p className="font-medium text-gray-900">{usageCount}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Published</p>
              <p className="font-medium text-gray-900">
                {new Date(publishedAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </div>

        {/* Right: Creator & CTA */}
        <div className="space-y-6">
          {/* Creator Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-serif font-bold mb-4">Created by</h3>

            {creator && (
              <div className="space-y-4">
                {/* Creator Profile */}
                <div
                  onClick={() => navigate(`/marketplace/creators/${creator.id}`)}
                  className="flex gap-4 cursor-pointer hover:opacity-75 transition-opacity"
                >
                  {creator.profileImage && (
                    <img
                      src={creator.profileImage}
                      alt={creator.displayName}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium text-gray-900">
                        {creator.displayName}
                      </h4>
                      {creator.verified && (
                        <StarIcon className="w-4 h-4 text-yellow-400 fill-current" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {creator.bio}
                    </p>
                    {creator.website && (
                      <a
                        href={creator.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary-600 hover:text-primary-700 inline-flex items-center gap-1 mt-2"
                      >
                        <LinkIcon className="w-4 h-4" />
                        Visit Website
                      </a>
                    )}
                  </div>
                </div>

                {/* Creator Stats */}
                <div className="space-y-2 pt-4 border-t">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Earnings</span>
                    <span className="font-medium">${creator.totalEarnings.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Pricing & CTA */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            {/* Commission Info */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="text-sm text-blue-900 mb-1">Creator Commission</p>
              <p className="text-2xl font-bold text-blue-600">
                {commissionPercentage}%
              </p>
              <p className="text-xs text-blue-800 mt-2">
                Creator earns {commissionPercentage}% commission when you use this template
              </p>
            </div>

            {/* Price */}
            {priceUSD > 0 && (
              <div className="text-center py-4 border-y">
                <p className="text-gray-600 text-sm">Commission Basis</p>
                <p className="text-3xl font-bold text-gray-900">
                  {priceUSD.toLocaleString('fr-FR')} FC
                </p>
              </div>
            )}

            {/* CTA Button */}
            {user ? (
              <button
                onClick={() => navigate(`/weddings/new?templateId=${templateId}&eventType=${eventType || 'WEDDING'}`)}
                className="w-full btn-primary py-3 font-medium"
              >
                Use This Template
              </button>
            ) : (
              <button
                onClick={() => navigate(`/login?redirect=/marketplace/templates/${templateId}`)}
                className="w-full btn-primary py-3 font-medium"
              >
                Login to Use Template
              </button>
            )}

            {/* Info Text */}
            <p className="text-xs text-gray-500 text-center">
              {user
                ? 'Click to create a new wedding with this template'
                : 'You must be logged in to use templates'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
