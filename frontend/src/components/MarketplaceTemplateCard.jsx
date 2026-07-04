import { Link } from 'react-router-dom';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';

const EVENT_TYPE_LABELS = {
  WEDDING: 'Mariage',
  BIRTHDAY: 'Anniversaire',
  DOT: 'Mariage coutumier',
  CEREMONY: 'Cérémonie',
  CONFERENCE: 'Conférence',
  OTHER: 'Autre'
};

const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
const resolveImg = (url) => {
  if (!url) return '';
  return url.startsWith('data:') || url.startsWith('http') ? url : `${apiBase}${url}`;
};

export default function MarketplaceTemplateCard({ template }) {
  if (!template.marketplace) return null;

  const { id, name, previewImage, thumbnail, category, eventType, marketplace } = template;
  const { creator, usageCount, priceUSD } = marketplace;

  const img = resolveImg(previewImage || thumbnail);

  return (
    <Link
      to={`/marketplace/templates/${id}`}
      className="group relative block bg-white rounded-2xl border border-stone-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden"
    >
      {/* Preview */}
      <div className="relative aspect-[3/4] bg-stone-100 overflow-hidden">
        {img ? (
          <img
            src={img}
            alt={name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-stone-300">
            <ShoppingBagIcon className="w-12 h-12" />
          </div>
        )}

        {/* Veil on hover */}
        <div className="absolute inset-0 bg-gradient-to-t from-stone-900/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        {/* Event type chip */}
        <span className="absolute top-3 left-3 inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white/90 backdrop-blur text-stone-800 shadow-sm">
          {EVENT_TYPE_LABELS[eventType] || eventType}
        </span>

        {/* Price */}
        {priceUSD > 0 && (
          <span className="absolute top-3 right-3 inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-primary-600 text-white shadow-sm">
            {priceUSD.toLocaleString('fr-FR')} FC
          </span>
        )}

        {/* CTA on hover */}
        <span className="absolute bottom-3 left-1/2 -translate-x-1/2 translate-y-2 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all duration-300 px-4 py-2 rounded-xl bg-white text-stone-900 text-sm font-semibold shadow-lg whitespace-nowrap">
          Voir le modèle
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-serif text-lg font-bold text-stone-900 truncate">{name}</h3>

        {creator && (
          <div className="flex items-center gap-2 mt-2.5">
            {creator.profileImage ? (
              <img
                src={resolveImg(creator.profileImage)}
                alt={creator.displayName}
                className="w-7 h-7 rounded-full object-cover ring-2 ring-white shadow"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-bold">
                {creator.displayName?.charAt(0)?.toUpperCase() || '?'}
              </div>
            )}
            <span className="text-sm text-stone-500 truncate flex items-center gap-1">
              {creator.displayName}
              {creator.verified && <CheckBadgeIcon className="w-4 h-4 text-primary-500 shrink-0" />}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
          <span className="inline-flex items-center gap-1 text-xs text-stone-500">
            <ShoppingBagIcon className="w-3.5 h-3.5" />
            {usageCount || 0} utilisation{(usageCount || 0) !== 1 ? 's' : ''}
          </span>
          <span className="text-[11px] font-medium text-stone-600 bg-stone-100 px-2 py-0.5 rounded-full">
            {category}
          </span>
        </div>
      </div>
    </Link>
  );
}
