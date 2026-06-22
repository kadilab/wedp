import { Link } from 'react-router-dom';
import { StarIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';

export default function MarketplaceTemplateCard({ template }) {
  if (!template.marketplace) return null;

  const { id, name, slug, thumbnail, category, marketplace } = template;
  const { creator, usageCount, commissionPercentage } = marketplace;

  return (
    <Link
      to={`/marketplace/templates/${id}`}
      className="group block bg-white rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden"
    >
      {/* Thumbnail */}
      <div className="relative overflow-hidden bg-gray-200 aspect-video">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        )}
        <div className="absolute top-2 right-2 bg-primary-600 text-white px-2 py-1 rounded-full text-xs font-medium">
          {commissionPercentage}% commission
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Template Name */}
        <h3 className="font-medium text-gray-900 truncate mb-2">
          {name}
        </h3>

        {/* Creator */}
        {creator && (
          <div className="flex items-center gap-2 mb-3">
            {creator.profileImage && (
              <img
                src={creator.profileImage}
                alt={creator.displayName}
                className="w-6 h-6 rounded-full object-cover"
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-600 truncate">
                {creator.displayName}
              </p>
              {creator.verified && (
                <div className="flex items-center gap-1">
                  <StarIcon className="w-3 h-3 text-yellow-400" />
                  <span className="text-xs text-gray-500">Verified</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-200">
          <div className="flex items-center gap-1 text-sm text-gray-600">
            <ShoppingCartIcon className="w-4 h-4" />
            <span>{usageCount} uses</span>
          </div>
          <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
            {category}
          </span>
        </div>
      </div>
    </Link>
  );
}
