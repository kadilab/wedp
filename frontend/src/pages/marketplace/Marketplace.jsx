import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../services/api';
import MarketplaceTemplateCard from '../../components/MarketplaceTemplateCard';
import {
  SparklesIcon, ChevronDownIcon, ArrowLongLeftIcon, ArrowLongRightIcon,
  PaintBrushIcon, ArrowRightIcon, MagnifyingGlassIcon, XMarkIcon
} from '@heroicons/react/24/outline';

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

function Select({ value, onChange, label, children }) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={onChange}
        className="cursor-pointer appearance-none rounded-xl border border-border bg-surface py-2.5 pl-4 pr-10 text-sm text-content transition hover:border-primary-500/40 focus:border-transparent focus:ring-2 focus:ring-primary-500"
      >
        {children}
      </select>
      <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
    </div>
  );
}

export default function Marketplace() {
  const [searchParams, setSearchParams] = useSearchParams();

  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '12');
  const category = searchParams.get('category') || '';
  const eventType = searchParams.get('eventType') || '';
  const sort = searchParams.get('sort') || 'newest';
  const search = searchParams.get('search') || '';

  // Local, debounced search box synced to the URL param.
  const [searchInput, setSearchInput] = useState(search);
  const firstRun = useRef(true);
  useEffect(() => { setSearchInput(search); }, [search]);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    const id = setTimeout(() => {
      if ((searchInput || '') !== search) setParam('search', searchInput.trim());
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const { data, isLoading, error } = useQuery(
    ['marketplace-templates', { page, limit, category, eventType, sort, search }],
    async () => {
      const params = new URLSearchParams({
        page, limit,
        ...(category && { category }),
        ...(eventType && { eventType }),
        ...(search && { search }),
        sort
      });
      const response = await api.get(`/marketplace/templates?${params}`);
      return response.data;
    },
    { keepPreviousData: true }
  );

  const templates = data?.templates || [];
  const pagination = data?.pagination || {};
  const total = pagination.total ?? templates.length;

  function setParam(key, value) {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    next.set('page', '1');
    setSearchParams(next);
  }

  const handlePageChange = (newPage) => {
    const next = new URLSearchParams(searchParams);
    next.set('page', newPage);
    setSearchParams(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const hasFilters = !!(category || eventType || search);

  return (
    <div className="min-h-screen bg-bg">
      {/* ============ SEARCH HEADER ============ */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-surface to-bg">
        <div className="pointer-events-none absolute -top-20 right-[12%] h-56 w-56 rounded-full bg-primary-500/15 blur-[90px]" />
        <div className="pointer-events-none absolute -bottom-24 left-[10%] h-56 w-56 rounded-full bg-primary-500/10 blur-[90px]" />
        <div className="relative mx-auto max-w-3xl px-5 pb-10 pt-14 text-center sm:px-8">
          <span className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400">
            <SparklesIcon className="h-4 w-4" />
            <span className="text-xs font-semibold uppercase tracking-[.18em]">Galerie de modèles</span>
          </span>
          <h1 className="mt-4 font-serif text-4xl font-bold leading-[1.05] tracking-[-0.015em] text-content sm:text-5xl">
            Trouvez le modèle parfait
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Des créations signées par notre communauté de designers — à personnaliser en quelques minutes.
          </p>

          {/* Search bar */}
          <div className="relative mx-auto mt-7 max-w-xl">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Rechercher un modèle par nom…"
              aria-label="Rechercher un modèle"
              className="w-full rounded-2xl border border-border bg-surface py-3.5 pl-12 pr-11 text-[15px] text-content shadow-sm transition placeholder:text-muted focus:border-transparent focus:ring-2 focus:ring-primary-500"
            />
            {searchInput && (
              <button
                onClick={() => setSearchInput('')}
                aria-label="Effacer la recherche"
                className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer rounded-full p-1.5 text-muted transition hover:bg-surface-2 hover:text-content"
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-5 py-8 sm:px-8">
        {/* ============ FILTER BAR ============ */}
        <div className="sticky top-20 z-30 rounded-2xl border border-border bg-surface/90 p-4 shadow-sm backdrop-blur sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((t) => {
                const active = eventType === t.value;
                return (
                  <button
                    key={t.value || 'all'}
                    onClick={() => setParam('eventType', t.value)}
                    className={`cursor-pointer rounded-full px-4 py-2.5 text-sm font-medium transition-colors sm:py-2 ${
                      active ? 'bg-primary-500 text-white shadow-sm' : 'bg-surface-2 text-muted hover:bg-border'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="flex shrink-0 flex-wrap gap-2.5">
              <Select label="Catégorie" value={category} onChange={(e) => setParam('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
              <Select label="Trier par" value={sort} onChange={(e) => setParam('sort', e.target.value)}>
                <option value="newest">Plus récents</option>
                <option value="popular">Plus populaires</option>
                <option value="highest_commission">Meilleure commission</option>
              </Select>
            </div>
          </div>
        </div>

        {/* ============ CONTENT ============ */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-border animate-pulse">
                <div className="aspect-[3/4] bg-surface-2" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 rounded bg-surface-2" />
                  <div className="h-3 w-1/2 rounded bg-surface-2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center dark:border-red-500/30 dark:bg-red-500/10">
            <p className="font-serif text-xl font-bold text-red-700 dark:text-red-400">Erreur lors du chargement</p>
            <p className="mt-2 text-red-600 dark:text-red-300">Veuillez réessayer plus tard.</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-3xl border border-border bg-surface p-16 text-center">
            <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-bg ring-1 ring-border">
              <SparklesIcon className="h-9 w-9 text-primary-500" />
            </div>
            <p className="mb-2 font-serif text-2xl font-bold text-content">
              {search ? `Aucun résultat pour « ${search} »` : 'Aucun modèle pour le moment'}
            </p>
            <p className="mx-auto max-w-md text-lg text-muted">
              {hasFilters ? 'Ajustez vos filtres ou votre recherche.' : 'Revenez bientôt : de nouvelles créations arrivent régulièrement.'}
            </p>
            {hasFilters && (
              <button
                onClick={() => setSearchParams(new URLSearchParams())}
                className="mt-6 inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-content transition-colors hover:bg-surface-2"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-muted">
                <span className="font-semibold text-content">{total}</span> modèle{total !== 1 ? 's' : ''}
                {search ? <> pour « <span className="text-content">{search}</span> »</> : ' disponible' + (total !== 1 ? 's' : '')}
              </p>
              {hasFilters && (
                <button onClick={() => setSearchParams(new URLSearchParams())} className="cursor-pointer text-sm font-medium text-primary-600 hover:text-primary-700 dark:text-primary-400">
                  Réinitialiser
                </button>
              )}
            </div>

            {/* Responsive grid */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {templates.map((template) => (
                <MarketplaceTemplateCard key={template.id} template={template} />
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-content transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ArrowLongLeftIcon className="h-4 w-4" /> Précédent
                </button>
                <div className="hidden gap-1 sm:flex">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`h-10 w-10 cursor-pointer rounded-xl text-sm font-medium transition-colors ${
                        p === pagination.page ? 'bg-primary-500 text-white shadow-sm' : 'border border-border text-content hover:bg-surface-2'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <span className="px-2 text-sm text-muted sm:hidden">{pagination.page} / {pagination.totalPages}</span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-border px-4 py-2 text-sm font-medium text-content transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Suivant <ArrowLongRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* ============ CREATOR CTA ============ */}
        <div className="relative mt-6 overflow-hidden rounded-3xl border border-border bg-surface px-6 py-12 sm:px-12 sm:py-14">
          <div className="pointer-events-none absolute -top-16 right-0 h-56 w-56 rounded-full bg-primary-500/15 blur-[80px]" />
          <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 text-primary-600 dark:text-primary-400">
                <PaintBrushIcon className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-[.18em]">Vous êtes designer ?</span>
              </span>
              <h3 className="mt-3 font-serif text-3xl font-bold text-content">Publiez vos modèles, touchez une commission</h3>
              <p className="mt-2 text-muted">
                Partagez vos créations avec des milliers d'organisateurs et gagnez à chaque utilisation.
              </p>
            </div>
            <Link to="/creator-dashboard" className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary-500 px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:bg-primary-600">
              Devenir créateur <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
