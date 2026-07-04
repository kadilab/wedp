import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from 'react-query';
import api from '../../services/api';
import MarketplaceTemplateCard from '../../components/MarketplaceTemplateCard';
import {
  SparklesIcon, ChevronDownIcon, ArrowLongLeftIcon, ArrowLongRightIcon,
  PaintBrushIcon, ArrowRightIcon
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

const GRAIN = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

function Select({ value, onChange, children }) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={onChange}
        className="appearance-none pl-4 pr-10 py-2.5 border border-stone-200 rounded-xl text-sm text-stone-700 bg-white hover:border-stone-300 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition cursor-pointer"
      >
        {children}
      </select>
      <ChevronDownIcon className="h-4 w-4 text-stone-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
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

  const { data, isLoading, error } = useQuery(
    ['marketplace-templates', { page, limit, category, eventType, sort }],
    async () => {
      const params = new URLSearchParams({
        page, limit,
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
  const total = pagination.total ?? templates.length;

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
    <div className="bg-white min-h-screen">
      {/* ============ HERO (premium dark) ============ */}
      <section className="relative overflow-hidden bg-stone-900 text-white">
        <div className="pointer-events-none absolute inset-0" style={{ backgroundImage: GRAIN, opacity: 0.06 }} />
        <div className="pointer-events-none absolute -top-24 right-[8%] h-72 w-72 rounded-full bg-primary-600/25 blur-[100px]" />
        <div className="pointer-events-none absolute -bottom-28 left-[6%] h-72 w-72 rounded-full bg-gold-500/15 blur-[100px]" />
        <div className="pointer-events-none absolute inset-5 sm:inset-8 rounded-2xl" style={{ border: '1px solid rgba(176,129,47,.35)' }} />

        <div className="relative max-w-4xl mx-auto px-6 py-20 lg:py-24 text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[.22em] text-gold-300">
            <SparklesIcon className="h-4 w-4" /> Galerie de modèles
          </span>
          <h1 className="font-serif mt-7 text-5xl sm:text-7xl font-bold leading-[1.02] tracking-[-0.015em]">
            Le modèle parfait pour<br className="hidden sm:block" /> votre <span className="italic text-primary-400">événement</span>
          </h1>
          <p className="mt-6 text-lg text-stone-300 max-w-2xl mx-auto leading-relaxed">
            Les plus belles créations de notre communauté de designers —
            personnalisez-les entièrement, puis envoyez en quelques minutes.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 text-gold-400/80" aria-hidden="true">
            <span className="h-px w-12 bg-gradient-to-r from-transparent to-gold-500/50" />
            <svg viewBox="0 0 24 24" width="12" height="12"><path d="M12 2l3 9 9 1-9 1-3 9-3-9-9-1 9-1z" fill="currentColor" /></svg>
            <span className="h-px w-12 bg-gradient-to-l from-transparent to-gold-500/50" />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-5 sm:px-8 py-10 space-y-8">
        {/* ============ FILTER BAR ============ */}
        <div className="sticky top-[4.5rem] z-30 rounded-2xl border border-stone-200 bg-white/90 backdrop-blur shadow-sm p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((t) => {
                const active = eventType === t.value;
                return (
                  <button
                    key={t.value || 'all'}
                    onClick={() => setParam('eventType', t.value)}
                    className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                      active ? 'bg-primary-600 text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <Select value={category} onChange={(e) => setParam('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
              <Select value={sort} onChange={(e) => setParam('sort', e.target.value)}>
                <option value="newest">Plus récents</option>
                <option value="popular">Plus populaires</option>
                <option value="highest_commission">Meilleure commission</option>
              </Select>
            </div>
          </div>
        </div>

        {/* ============ CONTENT ============ */}
        {isLoading ? (
          <div className="flex flex-wrap justify-center gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="w-full sm:w-[300px] rounded-2xl border border-stone-200 overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-stone-100" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-stone-100 rounded w-3/4" />
                  <div className="h-3 bg-stone-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center">
            <p className="font-serif text-red-700 font-bold text-xl">Erreur lors du chargement</p>
            <p className="text-red-600 mt-2">Veuillez réessayer plus tard.</p>
          </div>
        ) : templates.length === 0 ? (
          <div className="rounded-3xl border border-stone-200 bg-stone-50 p-16 text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-white ring-1 ring-stone-200 shadow-sm mb-6">
              <SparklesIcon className="w-9 h-9 text-primary-500" />
            </div>
            <p className="font-serif text-stone-900 font-bold text-2xl mb-2">Aucun modèle pour le moment</p>
            <p className="text-stone-500 text-lg max-w-md mx-auto">
              Ajustez vos filtres, ou revenez bientôt : de nouvelles créations arrivent régulièrement.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-baseline justify-between">
              <p className="text-sm text-stone-500">
                <span className="font-semibold text-stone-900">{total}</span> modèle{total !== 1 ? 's' : ''} disponible{total !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Centered flex grid — stays elegant with few or many items */}
            <div className="flex flex-wrap justify-center gap-6">
              {templates.map((template) => (
                <div key={template.id} className="w-full sm:w-[300px]">
                  <MarketplaceTemplateCard template={template} />
                </div>
              ))}
            </div>

            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-8">
                <button
                  onClick={() => handlePageChange(pagination.page - 1)}
                  disabled={pagination.page <= 1}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-stone-200 rounded-xl text-stone-700 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ArrowLongLeftIcon className="h-4 w-4" /> Précédent
                </button>
                <div className="hidden sm:flex gap-1">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => handlePageChange(p)}
                      className={`w-10 h-10 rounded-xl text-sm font-medium transition ${
                        p === pagination.page ? 'bg-primary-600 text-white shadow-sm' : 'border border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
                <span className="sm:hidden text-sm text-stone-500 px-2">{pagination.page} / {pagination.totalPages}</span>
                <button
                  onClick={() => handlePageChange(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages}
                  className="inline-flex items-center gap-1.5 px-4 py-2 border border-stone-200 rounded-xl text-stone-700 text-sm font-medium hover:bg-stone-50 hover:border-stone-300 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Suivant <ArrowLongRightIcon className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}

        {/* ============ CREATOR CTA ============ */}
        <div className="relative overflow-hidden rounded-3xl border border-stone-200 bg-stone-50 px-6 py-12 sm:px-12 sm:py-14 mt-6">
          <div className="pointer-events-none absolute -top-16 right-0 h-56 w-56 rounded-full bg-primary-100/50 blur-[80px]" />
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="max-w-xl">
              <span className="inline-flex items-center gap-2 text-primary-600">
                <PaintBrushIcon className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-[.18em]">Vous êtes designer ?</span>
              </span>
              <h3 className="font-serif text-3xl font-bold text-stone-900 mt-3">Publiez vos modèles, touchez une commission</h3>
              <p className="text-stone-500 mt-2">
                Partagez vos créations avec des milliers d'organisateurs et gagnez à chaque utilisation.
              </p>
            </div>
            <Link to="/creator-dashboard" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 hover:-translate-y-0.5 transition-all shrink-0">
              Devenir créateur <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
