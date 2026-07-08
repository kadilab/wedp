import { Link } from 'react-router-dom'
import {
  ArrowRightIcon, PlayIcon, PhotoIcon, SwatchIcon, Bars3BottomLeftIcon,
  QrCodeIcon, CheckIcon, BanknotesIcon, ChatBubbleLeftRightIcon,
  ArrowUpRightIcon,
} from '@heroicons/react/24/outline'

// Page d'accueil — style "winvitepro" (Bento product-led), tokens sémantiques
// (bg/surface/content/muted/border + accent orange #FF5C00) pour un rendu
// dark/light géré centralement. Header/footer fournis par PublicLayout.

const EVENTS = ['Mariage', 'Dot', 'Anniversaire', 'Cérémonie', 'Baptême', 'Conférence']

const TEMPLATES = [
  { name: 'Classic Ivory', couple: 'Ava & Liam', tone: 'bg-[#f5efe6] text-[#7a5c34]' },
  { name: 'Modern Noir', couple: 'Zoé & Noah', tone: 'bg-[#1c1917] text-[#e7e5e4]' },
  { name: 'Coral Bloom', couple: 'Mia & Lucas', tone: 'bg-primary-500/12 text-primary-700 dark:text-primary-300' },
  { name: 'Sage Garden', couple: 'Lea & Adam', tone: 'bg-[#e8efe6] text-[#3f5c3f]' },
  { name: 'Golden Hour', couple: 'Ines & Omar', tone: 'bg-[#f3e9d2] text-[#8a6d2f]' },
]

const STATS = [
  { v: 'Multi-événements', l: 'Mariages, anniversaires, dots…' },
  { v: 'Check-in QR', l: 'Le jour J, sans file' },
  { v: 'Temps réel', l: 'RSVP & arrivées en direct' },
  { v: 'À l’usage', l: 'Jamais d’abonnement' },
]

export default function Home() {
  return (
    <div className="wv-home overflow-x-hidden text-content">
      <style>{`
        .wv-home h1, .wv-home h2, .wv-home h3, .wv-home .serif { font-family: 'Playfair Display', Georgia, serif; }
        .wv-home .container-page { max-width: 72rem; margin-inline: auto; padding-inline: 1.25rem; }
        @media (min-width: 640px){ .wv-home .container-page { padding-inline: 2rem; } }
        @keyframes wv-marquee { to { transform: translateX(-50%); } }
        @keyframes wv-up { from { opacity:0; transform: translateY(16px); } to { opacity:1; transform: translateY(0); } }
        .wv-up { animation: wv-up .6s cubic-bezier(.22,1,.36,1) both; }
        @media (prefers-reduced-motion: reduce){ .wv-home .wv-up, .wv-home .marq { animation: none !important; } }
      `}</style>

      <Hero />
      <BentoGrid />
      <TemplatesMarquee />
      <StatsStrip />
      <CtaBand />
    </div>
  )
}

/* ======================= HERO ======================= */
function Hero() {
  return (
    <section className="relative overflow-hidden pt-4 sm:pt-8">
      {/* Accent ambiant — une seule lueur orange douce */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 h-[30rem] w-[30rem] -translate-x-1/2 rounded-full bg-primary-500/15 blur-[120px]" />
        <div
          className="absolute inset-0 opacity-40 dark:opacity-25"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, rgb(var(--muted) / 0.18) 1px, transparent 0)',
            backgroundSize: '28px 28px',
            maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black 40%, transparent 75%)',
          }}
        />
      </div>

      <div className="container-page flex flex-col items-center text-center">
        <span className="wv-up inline-flex items-center gap-2 rounded-full border border-border bg-surface/60 px-4 py-1.5 text-xs font-semibold text-muted backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary-500/70" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary-500" />
          </span>
          Invitations digitales · pensées pour l’Afrique
        </span>

        <h1 className="wv-up mt-7 max-w-4xl text-[2rem] font-bold leading-[1.06] tracking-tight text-content [animation-delay:60ms] sm:text-6xl sm:leading-[1.03] lg:text-7xl">
          Dites <span className="italic text-primary-500">« oui »</span> à des invitations sans effort
        </h1>

        <p className="wv-up mt-5 max-w-2xl text-[15px] leading-relaxed text-muted [animation-delay:120ms] sm:mt-6 sm:text-lg">
          Créez-la, envoyez-la et orchestrez tout le jour J au même endroit — QR par invité,
          suivi RSVP en direct et Mobile Money, sans les fichiers Excel.
        </p>

        <div className="wv-up mt-9 flex flex-col gap-3 [animation-delay:180ms] sm:flex-row">
          <Link
            to="/register"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:bg-primary-600"
          >
            Créer mon invitation <ArrowRightIcon className="h-4 w-4" />
          </Link>
          <a
            href="#fonctionnalites"
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-surface px-7 py-3.5 text-base font-semibold text-content transition-colors hover:bg-surface-2"
          >
            <PlayIcon className="h-4 w-4" /> Voir en action
          </a>
        </div>

        <p className="wv-up mt-5 text-sm text-muted [animation-delay:220ms]">
          Sans abonnement · Aperçu gratuit · Paiement à l’usage
        </p>
      </div>

      {/* Ticker d’événements */}
      <div className="relative mt-16 overflow-hidden border-y border-border py-4">
        <div className="marq flex w-max gap-12 pr-12" style={{ animation: 'wv-marquee 32s linear infinite' }}>
          {[...EVENTS, ...EVENTS].map((e, i) => (
            <span key={i} className="serif flex items-center gap-3 whitespace-nowrap text-lg italic text-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
              {e}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ======================= BENTO ======================= */
function Tile({ className = '', children }) {
  return (
    <div className={`group relative overflow-hidden rounded-3xl border border-border bg-surface p-6 transition-colors duration-200 hover:border-primary-500/40 ${className}`}>
      {children}
    </div>
  )
}

function TileText({ title, desc }) {
  return (
    <div className="mt-4">
      <h3 className="serif text-base font-bold text-content">{title}</h3>
      <p className="mt-1 text-sm leading-relaxed text-muted">{desc}</p>
    </div>
  )
}

function BentoGrid() {
  return (
    <section id="fonctionnalites" className="scroll-mt-24 py-20 md:py-28">
      <div className="container-page">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">
            Une seule toile, toute la célébration
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl lg:text-5xl">
            Tout ce qu’il faut pour le grand jour
          </h2>
        </div>

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-4 md:grid-rows-2">
          {/* Éditeur (large) */}
          <Tile className="flex flex-col md:col-span-2 md:row-span-2">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary-500/10 px-3 py-1 text-xs font-semibold text-primary-600 dark:text-primary-400">
                Éditeur
              </span>
              <div className="flex items-center gap-1.5">
                {[Bars3BottomLeftIcon, PhotoIcon, SwatchIcon].map((Icon, i) => (
                  <span key={i} className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-bg text-muted">
                    <Icon className="h-4 w-4" />
                  </span>
                ))}
              </div>
            </div>

            <div className="relative mt-5 flex-1 rounded-2xl border border-border bg-bg p-6">
              <div className="relative mx-auto max-w-[16rem] rounded-xl border-2 border-dashed border-primary-500/50 bg-surface px-6 py-8 text-center">
                <p className="text-[0.6rem] uppercase tracking-[0.3em] text-muted">Save the date</p>
                <p className="serif mt-3 text-2xl font-bold text-content">Amina &amp; Yassine</p>
                <div className="mx-auto my-3 h-px w-10 bg-primary-500" />
                <p className="text-xs text-muted">14 septembre 2026 · Paris</p>
                <span className="absolute -left-1.5 top-1/2 h-3 w-3 rounded-full border-2 border-primary-500 bg-surface" />
                <span className="absolute -right-1.5 top-1/2 h-3 w-3 rounded-full border-2 border-primary-500 bg-surface" />
              </div>
              <span className="absolute bottom-4 right-4 inline-flex items-center gap-1.5 rounded-full bg-primary-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-white" /> 100%
              </span>
            </div>

            <TileText title="Composez librement, au pixel près" desc="Déplacez chaque élément, ajoutez vos photos, couleurs et polices. Aucune compétence en design requise." />
          </Tile>

          {/* QR */}
          <Tile className="flex flex-col">
            <div className="flex items-start justify-between">
              <div className="grid h-14 w-14 place-items-center rounded-2xl bg-content text-bg">
                <QrCodeIcon className="h-8 w-8" />
              </div>
              <span className="text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-muted">Accès</span>
            </div>
            <TileText title="Un QR par invité" desc="Un accueil fluide, sans file." />
          </Tile>

          {/* RSVP */}
          <Tile className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="serif text-4xl font-bold text-content">98%</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckIcon className="h-3 w-3" /> live
              </span>
            </div>
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-surface-2">
              <div className="h-full w-[98%] rounded-full bg-primary-500" />
            </div>
            <p className="mt-2 text-xs text-muted">128 / 150 confirmés</p>
            <TileText title="RSVP en direct" desc="Les réponses arrivent en temps réel." />
          </Tile>

          {/* Plan de table */}
          <Tile className="flex flex-col">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <span
                  key={i}
                  className={`grid h-9 w-9 place-items-center rounded-full border text-[0.6rem] font-semibold ${
                    i === 1 ? 'border-primary-500 bg-primary-500/10 text-primary-600 dark:text-primary-400' : 'border-border bg-bg text-muted'
                  }`}
                >
                  T{i + 1}
                </span>
              ))}
            </div>
            <TileText title="Plan de table" desc="Placez tables et sièges par glisser-déposer." />
          </Tile>

          {/* Mobile Money */}
          <Tile className="flex flex-col">
            <div className="flex items-center justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400">
                <BanknotesIcon className="h-5 w-5" />
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckIcon className="h-3 w-3" /> Payé
              </span>
            </div>
            <TileText title="Mobile Money" desc="Payez en ligne, à l’usage — sans abonnement." />
          </Tile>
        </div>

        {/* Partage (pleine largeur) */}
        <div className="mt-4">
          <Tile className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#25D366]/15 text-[#128C4B] dark:text-[#25D366]">
                <ChatBubbleLeftRightIcon className="h-6 w-6" />
              </span>
              <div>
                <h3 className="serif text-lg font-bold text-content">Partagez sur WhatsApp en un lien</h3>
                <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted">
                  Chaque invité reçoit un lien personnalisé avec un bel aperçu — sur tous les appareils.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-border bg-bg px-4 py-2.5 text-sm font-medium text-muted">
              /i/amina-yassine
              <ArrowUpRightIcon className="h-4 w-4 text-primary-500" />
            </div>
          </Tile>
        </div>
      </div>
    </section>
  )
}

/* ======================= MODÈLES (marquee) ======================= */
function TemplateCard({ name, couple, tone }) {
  return (
    <div className="w-56 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface">
      <div className={`flex aspect-[4/5] flex-col items-center justify-center ${tone}`}>
        <p className="text-[0.55rem] uppercase tracking-[0.3em] opacity-70">Save the date</p>
        <p className="serif mt-3 text-xl font-bold">{couple}</p>
        <p className="mt-1 text-[0.7rem] opacity-70">06 · 20 · 2026</p>
      </div>
      <div className="px-4 py-3 text-sm font-semibold text-content">{name}</div>
    </div>
  )
}

function TemplatesMarquee() {
  return (
    <section className="overflow-hidden border-y border-border bg-surface py-20 md:py-28">
      <div className="container-page">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div className="max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-primary-600 dark:text-primary-400">Modèles</p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-content sm:text-4xl lg:text-5xl">
              Un style pour chaque célébration
            </h2>
          </div>
          <Link
            to="/marketplace"
            className="inline-flex items-center gap-2 rounded-full border border-primary-500/60 px-5 py-2.5 text-sm font-semibold text-primary-600 transition-colors hover:bg-primary-500/10 dark:text-primary-400"
          >
            Voir tous les modèles <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      <div className="group relative mt-12">
        <div className="marq flex w-max gap-5" style={{ animation: 'wv-marquee 40s linear infinite' }}>
          {[...TEMPLATES, ...TEMPLATES].map((tpl, i) => (
            <TemplateCard key={i} {...tpl} />
          ))}
        </div>
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-surface to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-surface to-transparent" />
      </div>
    </section>
  )
}

/* ======================= STATS ======================= */
function StatsStrip() {
  return (
    <section className="py-16 md:py-20">
      <div className="container-page grid grid-cols-2 gap-8 md:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.v} className="text-center md:text-left">
            <p className="serif text-2xl font-bold text-content sm:text-3xl">{s.v}</p>
            <p className="mt-1.5 text-sm text-muted">{s.l}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

/* ======================= CTA ======================= */
function CtaBand() {
  return (
    <section className="px-4 pb-24 pt-6">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 px-6 py-14 text-center shadow-2xl sm:px-12 sm:py-16">
        {/* Lueur + texture discrètes */}
        <div aria-hidden="true" className="pointer-events-none absolute -top-20 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-primary-500/25 blur-[100px]" />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)',
            backgroundSize: '26px 26px',
          }}
        />
        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-300">
            <span className="h-1.5 w-1.5 rounded-full bg-primary-400" />
            Prêt à commencer ?
          </span>

          <h2 className="serif mx-auto mt-6 max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
            Votre plus belle invitation vous attend
          </h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-stone-300">
            Gratuit pour commencer — vous ne payez qu’au moment d’envoyer.
          </p>

          <div className="mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              to="/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary-500 px-7 py-3.5 text-base font-semibold text-white shadow-lg shadow-primary-500/25 transition-all hover:-translate-y-0.5 hover:bg-primary-600"
            >
              Créer mon invitation <ArrowUpRightIcon className="h-4 w-4" />
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/0 px-7 py-3.5 text-base font-semibold text-white transition-colors hover:bg-white/10"
            >
              Parcourir les modèles
            </Link>
          </div>

          <p className="mt-7 text-xs text-stone-400">Sans abonnement · Aperçu gratuit · Paiement à l’usage</p>
        </div>
      </div>
    </section>
  )
}
