import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../services/api';
import { useAuthStore } from '../../stores/authStore';
import TemplatePreview from '../../components/templates/TemplatePreview';
import {
  ArrowLongLeftIcon, ArrowRightIcon, LinkIcon, SparklesIcon,
  ShoppingBagIcon, CalendarDaysIcon, TagIcon,
} from '@heroicons/react/24/outline';
import { CheckBadgeIcon } from '@heroicons/react/24/solid';

const EVENT_TYPE_LABELS = {
  WEDDING: 'Mariage', BIRTHDAY: 'Anniversaire', DOT: 'Mariage coutumier',
  CEREMONY: 'Cérémonie', CONFERENCE: 'Conférence', OTHER: 'Autre',
};
const CATEGORY_LABELS = {
  MODERN: 'Moderne', ELEGANT: 'Élégant', ROMANTIC: 'Romantique',
  MINIMALIST: 'Minimaliste', TRADITIONAL: 'Traditionnel',
};

const apiBase = import.meta.env.VITE_API_URL?.replace('/api', '') || '';
const resolveImg = (url) => {
  if (!url) return '';
  return url.startsWith('data:') || url.startsWith('http') ? url : `${apiBase}${url}`;
};

export default function MarketplaceTemplateDetail() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const { data, isLoading, error } = useQuery(
    ['marketplace-template', templateId],
    async () => (await api.get(`/marketplace/templates/${templateId}`)).data,
    { staleTime: 60_000 }
  );

  const template = data?.template;

  if (isLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-bg">
        <span className="h-10 w-10 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="grid min-h-[60vh] place-items-center bg-bg px-6 text-center">
        <div>
          <p className="font-serif text-2xl font-bold text-content">Modèle introuvable</p>
          <p className="mt-2 text-muted">Ce modèle n'existe pas ou n'est plus disponible.</p>
          <Link to="/marketplace" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-600">
            <ArrowLongLeftIcon className="h-4 w-4" /> Retour à la galerie
          </Link>
        </div>
      </div>
    );
  }

  const { name, description, previewImage, thumbnail, category, eventType, marketplace } = template;
  const { creator, priceUSD, usageCount, publishedAt } = marketplace;

  const hasDesign = Array.isArray(template.config?.designElements) && template.config.designElements.length > 0;
  const fallbackImg = resolveImg(previewImage || thumbnail);
  const published = publishedAt ? new Date(publishedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }) : '—';

  const useTemplate = () => {
    if (user) navigate(`/weddings/new?templateId=${templateId}&eventType=${eventType || 'WEDDING'}`);
    else navigate(`/login?redirect=/marketplace/templates/${templateId}`);
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        {/* Back */}
        <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-content">
          <ArrowLongLeftIcon className="h-4 w-4" /> Retour à la galerie
        </Link>

        <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-[1.05fr_.95fr]">
          {/* ---------- Left: real-size preview ---------- */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="relative overflow-hidden rounded-3xl border border-border bg-surface-2 p-5 sm:p-8">
              <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1 text-xs font-medium text-muted shadow-sm">
                <SparklesIcon className="h-3.5 w-3.5 text-primary-500" /> Aperçu avec des données de test
              </span>
              <div className="mx-auto max-w-sm overflow-hidden rounded-2xl bg-white shadow-xl ring-1 ring-black/5">
                {hasDesign ? (
                  <TemplatePreview template={template} adaptive fit="width" />
                ) : fallbackImg ? (
                  <img src={fallbackImg} alt={name} className="block w-full" />
                ) : (
                  <div className="grid aspect-[3/4] place-items-center text-stone-300">
                    <SparklesIcon className="h-12 w-12" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ---------- Right: info & CTA ---------- */}
          <div className="space-y-6">
            {/* Title block */}
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
                  {EVENT_TYPE_LABELS[eventType] || eventType || 'Événement'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-3 py-1 text-xs font-medium text-muted">
                  <TagIcon className="h-3.5 w-3.5" /> {CATEGORY_LABELS[category] || category}
                </span>
              </div>
              <h1 className="mt-3 font-serif text-3xl font-bold tracking-tight text-content sm:text-4xl">{name}</h1>
            </div>

            {/* Creator */}
            {creator && (
              <div className="flex items-center gap-3 rounded-2xl border border-border bg-surface p-4">
                {creator.profileImage ? (
                  <img src={resolveImg(creator.profileImage)} alt={creator.displayName} className="h-12 w-12 rounded-full object-cover ring-2 ring-surface" />
                ) : (
                  <div className="grid h-12 w-12 place-items-center rounded-full bg-primary-500/15 text-lg font-bold text-primary-600 dark:text-primary-400">
                    {creator.displayName?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate font-semibold text-content">{creator.displayName}</p>
                    {creator.verified && <CheckBadgeIcon className="h-4 w-4 shrink-0 text-primary-500" />}
                  </div>
                  {creator.bio && <p className="line-clamp-1 text-sm text-muted">{creator.bio}</p>}
                </div>
                {creator.website && (
                  <a href={creator.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                    <LinkIcon className="h-4 w-4" /> Site
                  </a>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-border bg-surface p-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted"><ShoppingBagIcon className="h-4 w-4" /> Utilisations</span>
                <p className="mt-1 font-serif text-xl font-bold text-content">{usageCount || 0}</p>
              </div>
              <div className="rounded-2xl border border-border bg-surface p-4">
                <span className="inline-flex items-center gap-1.5 text-xs text-muted"><CalendarDaysIcon className="h-4 w-4" /> Publié le</span>
                <p className="mt-1 text-sm font-semibold text-content">{published}</p>
              </div>
            </div>

            {/* Description */}
            {description && (
              <div>
                <h2 className="font-serif text-lg font-bold text-content">À propos de ce modèle</h2>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{description}</p>
              </div>
            )}

            {/* Pricing + CTA */}
            <div className="rounded-2xl border border-border bg-surface p-5">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-muted">Prix d'utilisation</span>
                <span className="font-serif text-2xl font-bold text-content">
                  {priceUSD > 0 ? `${priceUSD.toLocaleString('fr-FR')} FC` : 'Gratuit'}
                </span>
              </div>
              <button
                onClick={useTemplate}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:bg-primary-600"
              >
                {user ? 'Utiliser ce modèle' : 'Se connecter pour utiliser'} <ArrowRightIcon className="h-4 w-4" />
              </button>
              <p className="mt-3 text-center text-xs text-muted">
                {user ? 'Crée un nouvel événement à partir de ce modèle, entièrement personnalisable.' : 'Connectez-vous pour créer votre invitation à partir de ce modèle.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
