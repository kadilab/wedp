import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';
import { ShoppingBagIcon, EyeIcon, XMarkIcon, ArrowRightIcon, SparklesIcon } from '@heroicons/react/24/outline';
import api from '../services/api';
import TemplatePreview from './templates/TemplatePreview';

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

  const [previewOpen, setPreviewOpen] = useState(false);
  const { id, name, previewImage, thumbnail, category, eventType, marketplace } = template;
  const { creator, usageCount, priceUSD } = marketplace;

  const img = resolveImg(previewImage || thumbnail);
  const detailUrl = `/marketplace/templates/${id}`;

  return (
    <>
      <div className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-primary-500/40 hover:shadow-xl">
        {/* Preview */}
        <button
          type="button"
          onClick={() => setPreviewOpen(true)}
          aria-label={`Aperçu de ${name}`}
          className="relative block aspect-[3/4] w-full overflow-hidden bg-surface-2 text-left"
        >
          {img ? (
            <img
              src={img}
              alt={name}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <span className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted">
              <SparklesIcon className="h-10 w-10 text-primary-500/60" />
              <span className="text-xs font-medium">Aperçu du modèle</span>
            </span>
          )}

          {/* Hover veil */}
          <span className="absolute inset-0 bg-gradient-to-t from-stone-950/60 via-stone-950/5 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Event type chip */}
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-stone-800 shadow-sm backdrop-blur">
            {EVENT_TYPE_LABELS[eventType] || eventType}
          </span>

          {/* Price */}
          {priceUSD > 0 && (
            <span className="absolute right-3 top-3 inline-flex items-center rounded-full bg-primary-500 px-2.5 py-1 text-xs font-bold text-white shadow-sm">
              {priceUSD.toLocaleString('fr-FR')} FC
            </span>
          )}

          {/* Aperçu pill on hover */}
          <span className="pointer-events-none absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 translate-y-2 items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-stone-900 opacity-0 shadow-lg transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100">
            <EyeIcon className="h-4 w-4" /> Aperçu
          </span>
        </button>

        {/* Content */}
        <div className="flex flex-1 flex-col p-4">
          <Link to={detailUrl} className="font-serif text-lg font-bold text-content transition-colors hover:text-primary-600 dark:hover:text-primary-400">
            <span className="line-clamp-1">{name}</span>
          </Link>

          {creator && (
            <div className="mt-2.5 flex items-center gap-2">
              {creator.profileImage ? (
                <img
                  src={resolveImg(creator.profileImage)}
                  alt={creator.displayName}
                  className="h-7 w-7 rounded-full object-cover ring-2 ring-surface"
                />
              ) : (
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-500/15 text-xs font-bold text-primary-600 dark:text-primary-400">
                  {creator.displayName?.charAt(0)?.toUpperCase() || '?'}
                </div>
              )}
              <span className="flex items-center gap-1 truncate text-sm text-muted">
                {creator.displayName}
                {creator.verified && <CheckBadgeIcon className="h-4 w-4 shrink-0 text-primary-500" />}
              </span>
            </div>
          )}

          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <ShoppingBagIcon className="h-3.5 w-3.5" />
              {usageCount || 0} utilisation{(usageCount || 0) !== 1 ? 's' : ''}
            </span>
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-medium text-muted">
              {category}
            </span>
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPreviewOpen(true)}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold text-content transition-colors hover:bg-surface-2"
            >
              <EyeIcon className="h-4 w-4" /> Aperçu
            </button>
            <Link
              to={detailUrl}
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
            >
              Voir <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>

      {previewOpen && (
        <TemplatePreviewModal templateId={id} name={name} detailUrl={detailUrl} onClose={() => setPreviewOpen(false)} />
      )}
    </>
  );
}

/* ---- Full-size preview modal (real invitation rendered with test data) ---- */
function TemplatePreviewModal({ templateId, name, detailUrl, onClose }) {
  const { data, isLoading } = useQuery(
    ['marketplace-template', templateId],
    async () => (await api.get(`/marketplace/templates/${templateId}`)).data,
    { staleTime: 60_000 }
  );
  const template = data?.template;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-stone-950/70 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Aperçu de ${name}`}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="truncate font-serif text-lg font-bold text-content">{name}</h3>
            <p className="flex items-center gap-1 text-xs text-muted">
              <SparklesIcon className="h-3.5 w-3.5 text-primary-500" /> Aperçu avec des données de test
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fermer"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-content"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body — real-size invitation */}
        <div className="flex-1 overflow-y-auto bg-surface-2 p-5">
          {isLoading ? (
            <div className="flex aspect-[3/4] w-full items-center justify-center rounded-2xl bg-surface">
              <span className="h-9 w-9 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
            </div>
          ) : template ? (
            <div className="mx-auto overflow-hidden rounded-2xl bg-white shadow-lg ring-1 ring-black/5">
              <TemplatePreview template={template} adaptive fit="width" />
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted">Aperçu indisponible.</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 border-t border-border px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-border bg-surface px-4 py-2.5 text-sm font-semibold text-content transition-colors hover:bg-surface-2"
          >
            Fermer
          </button>
          <Link
            to={detailUrl}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-primary-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-600"
          >
            Utiliser ce modèle <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
