import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import useSiteSettingsStore from '../../stores/siteSettingsStore'
import {
  QrCodeIcon, DevicePhoneMobileIcon, ChartBarIcon, PhotoIcon,
  CurrencyDollarIcon, SparklesIcon, EnvelopeIcon, PhoneIcon,
  ArrowRightIcon, CheckCircleIcon, ArrowUpRightIcon
} from '@heroicons/react/24/outline'

// Modern, professional marketing page: warm-neutral canvas (stone), a confident
// terracotta accent, Playfair display + Montserrat UI, crisp cards and soft
// depth. Restrained motion. No AI-slop gradients or icon-tile clichés.

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }
}
const stagger = { show: { transition: { staggerChildren: 0.08 } } }

export default function Home() {
  const { siteName, contactEmail, supportPhone } = useSiteSettingsStore()

  const features = [
    { icon: SparklesIcon, title: 'Modèles élégants', text: 'Des dizaines de modèles raffinés, entièrement personnalisables — couleurs, polices, photos.' },
    { icon: PhotoIcon, title: 'Éditeur sur mesure', text: 'Déplacez chaque élément au pixel près, ajoutez vos images, icônes et vos propres polices.' },
    { icon: QrCodeIcon, title: 'QR par invité', text: 'Chaque convive reçoit son QR unique pour un accueil fluide et sans file le jour J.' },
    { icon: DevicePhoneMobileIcon, title: 'Envoi WhatsApp', text: 'Partagez le lien personnalisé de chaque invité en un geste, avec un bel aperçu.' },
    { icon: ChartBarIcon, title: 'Suivi en temps réel', text: 'RSVP et arrivées en direct. Mode hôtesse et recherche par nom si le QR est illisible.' },
    { icon: CurrencyDollarIcon, title: 'Mobile Money', text: 'Réglez vos invitations en ligne, à l’usage — sans abonnement ni engagement.' }
  ]

  const events = ['Mariage', 'Dot', 'Anniversaire', 'Cérémonie', 'Conférence', 'Baptême']

  const steps = [
    { n: '01', title: 'Composez', text: "Choisissez un type d'événement et un modèle, puis personnalisez-le avec vos infos et vos photos." },
    { n: '02', title: 'Invitez', text: 'Importez votre liste (Excel) ou ajoutez vos convives à la main, par catégories et par tables.' },
    { n: '03', title: 'Célébrez', text: 'Réglez via Mobile Money, envoyez les liens par WhatsApp et suivez les réponses en direct.' }
  ]

  const stats = [
    { v: 'Multi-événements', l: 'Mariage, anniversaire, dot…' },
    { v: 'Check-in QR', l: 'Le jour J, sans file' },
    { v: 'Mobile Money', l: 'Paiement en ligne, à l’usage' },
    { v: 'Temps réel', l: 'RSVP & arrivées en direct' }
  ]

  const testimonials = [
    { name: 'Aminata & Moussa', place: 'Dakar', text: 'Gérer nos 500 invités est devenu d’une simplicité déconcertante — tout au même endroit.' },
    { name: 'Fatou & Ibrahim', place: 'Abidjan', text: 'Le QR a impressionné chacun de nos invités. Une élégance très professionnelle.' },
    { name: 'Marie & Jean', place: 'Kinshasa', text: 'Les modèles sont superbes et l’accompagnement, d’une rare attention.' }
  ]

  return (
    <div className="mp text-stone-800">
      <style>{`
        .mp { font-family: 'Montserrat', system-ui, sans-serif; }
        .mp .serif { font-family: 'Playfair Display', Georgia, serif; }
        .mp .eyebrow { font-size:.72rem; letter-spacing:.18em; text-transform:uppercase; font-weight:600; color:#cc5038; }
        .mp .marq { display:inline-flex; gap:2.75rem; padding-right:2.75rem; animation:mp-marq 30s linear infinite; }
        @keyframes mp-marq { to { transform:translateX(-50%); } }
        .mp .float { animation:mp-float 6s ease-in-out infinite; }
        @keyframes mp-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
        .mp .link-underline { position:relative; }
        .mp .link-underline::after { content:''; position:absolute; left:0; bottom:-3px; height:1.5px; width:0; background:#cc5038; transition:width .3s ease; }
        .mp .link-underline:hover::after { width:100%; }
        @media (prefers-reduced-motion: reduce){ .mp .marq,.mp .float{ animation:none; } }
      `}</style>

      {/* ================= HERO ================= */}
      <section className="relative overflow-hidden bg-white">
        {/* soft ambient accents */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-32 right-[-6rem] h-[26rem] w-[26rem] rounded-full bg-primary-100/50 blur-[110px]" />
          <div className="absolute top-40 -left-24 h-80 w-80 rounded-full bg-gold-100/40 blur-[110px]" />
        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 pt-16 lg:pt-24 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-12 lg:gap-16 items-center">
            {/* Copy */}
            <motion.div variants={stagger} initial="hidden" animate="show">
              <motion.span variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-3.5 py-1.5 text-xs font-medium text-stone-600 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-primary-500" />
                Invitations digitales · pensées pour l’Afrique
              </motion.span>

              <motion.h1 variants={fadeUp} className="serif mt-6 text-[2.85rem] sm:text-6xl lg:text-[4.4rem] font-bold leading-[1.03] tracking-[-0.015em] text-stone-900">
                Des invitations
                <span className="text-primary-600"> mémorables</span>,
                gérées avec précision
              </motion.h1>

              <motion.p variants={fadeUp} className="mt-6 text-lg leading-relaxed text-stone-500 max-w-xl">
                Créez, personnalisez et envoyez vos invitations en quelques minutes.
                QR par invité, suivi RSVP en temps réel et paiement Mobile Money — le tout au même endroit.
              </motion.p>

              <motion.div variants={fadeUp} className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-3.5 text-[15px] font-semibold text-white shadow-lg shadow-primary-600/25 hover:bg-primary-700 hover:-translate-y-0.5 transition-all">
                  Commencer gratuitement <ArrowRightIcon className="h-5 w-5" />
                </Link>
                <a href="#fonctionnalites" className="inline-flex items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-6 py-3.5 text-[15px] font-semibold text-stone-800 hover:border-stone-300 hover:bg-stone-50 transition-all">
                  Voir comment ça marche
                </a>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-stone-500">
                {['Sans abonnement', 'Aperçu gratuit', 'Paiement à l’usage'].map((t) => (
                  <span key={t} className="inline-flex items-center gap-1.5">
                    <CheckCircleIcon className="h-5 w-5 text-primary-500" /> {t}
                  </span>
                ))}
              </motion.div>
            </motion.div>

            {/* Invitation preview */}
            <motion.div
              initial={{ opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
              className="relative mx-auto w-full max-w-sm"
            >
              <div className="rounded-3xl bg-white ring-1 ring-stone-200/80 shadow-[0_30px_60px_-25px_rgba(60,45,35,.35)] p-3">
                <div className="rounded-[1.35rem] bg-gradient-to-b from-stone-50 to-white border border-stone-100 px-8 py-12 text-center">
                  <p className="eyebrow text-gold-600">Le mariage de</p>
                  <h3 className="serif mt-5 text-5xl leading-none text-stone-900">Marie</h3>
                  <p className="serif text-2xl my-1.5 text-primary-500">&amp;</p>
                  <h3 className="serif text-5xl leading-none text-stone-900">Thomas</h3>
                  <div className="mx-auto my-6 h-px w-16 bg-stone-300" />
                  <p className="text-[13px] font-semibold tracking-[.2em] text-stone-700">15 · 06 · 2026</p>
                  <p className="mt-1.5 text-sm text-stone-400">Kinshasa · 16h00</p>
                  <div className="mt-7 inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary-600 text-white serif text-lg shadow-md">
                    M&amp;T
                  </div>
                </div>
              </div>

              {/* Floating QR card */}
              <div className="float absolute -top-4 -right-3 rounded-2xl bg-white shadow-xl ring-1 ring-stone-200 p-3.5">
                <QrCodeIcon className="h-9 w-9 text-stone-900" />
                <p className="mt-1 text-[9px] tracking-[.18em] text-stone-400 text-center">ACCÈS</p>
              </div>
              {/* Floating RSVP card */}
              <div className="float absolute -bottom-4 -left-4 rounded-2xl bg-white shadow-xl ring-1 ring-stone-200 px-4 py-3 flex items-center gap-2.5" style={{ animationDelay: '1.1s' }}>
                <span className="h-7 w-7 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                </span>
                <div className="leading-tight">
                  <p className="text-[11px] font-semibold text-stone-900">RSVP confirmé</p>
                  <p className="text-[10px] text-stone-400">à l’instant</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Event ticker */}
        <div className="border-y border-stone-200 bg-stone-50/70">
          <div className="relative overflow-hidden py-3.5">
            <div className="marq">
              {[...events, ...events].map((e, i) => (
                <span key={i} className="inline-flex items-center gap-2.5 text-sm font-medium text-stone-500 whitespace-nowrap">
                  <span className="h-1 w-1 rounded-full bg-primary-400" /> {e}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ================= STATS ================= */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <motion.div key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: i * 0.06 }} className="text-center md:text-left">
              <p className="serif text-xl sm:text-2xl font-bold text-stone-900">{s.v}</p>
              <p className="mt-1 text-sm text-stone-500">{s.l}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ================= FEATURES ================= */}
      <section id="fonctionnalites" className="bg-stone-50 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-24">
          <div className="max-w-2xl mb-14">
            <span className="eyebrow">Fonctionnalités</span>
            <h2 className="serif mt-3 text-4xl sm:text-5xl font-bold text-stone-900 leading-tight">
              Tout ce qu’il faut, du faire-part au jour J
            </h2>
            <p className="mt-4 text-lg text-stone-500">
              Une solution complète pour concevoir, envoyer et orchestrer vos invitations — sans quitter l’élégance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => (
              <motion.div
                key={i}
                variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: (i % 3) * 0.06 }}
                className="group rounded-2xl bg-white border border-stone-200 p-7 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100 group-hover:bg-primary-600 group-hover:text-white transition-colors">
                  <f.icon className="h-6 w-6" />
                </span>
                <h3 className="serif text-xl font-bold text-stone-900 mt-5">{f.title}</h3>
                <p className="mt-2 text-[14.5px] leading-relaxed text-stone-500">{f.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= HOW IT WORKS ================= */}
      <section className="bg-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-20 lg:py-24">
          <div className="text-center mb-16">
            <span className="eyebrow">Simple & rapide</span>
            <h2 className="serif mt-3 text-4xl sm:text-5xl font-bold text-stone-900">En trois étapes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-8 left-[16%] right-[16%] border-t border-dashed border-stone-200" />
            {steps.map((s, i) => (
              <motion.div key={s.n} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: i * 0.1 }} className="relative text-center">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-white border border-stone-200 shadow-sm flex items-center justify-center ring-4 ring-white">
                  <span className="serif text-2xl font-bold text-primary-600">{s.n}</span>
                </div>
                <h3 className="serif text-2xl font-bold text-stone-900 mt-6">{s.title}</h3>
                <p className="mt-2.5 text-[14.5px] leading-relaxed text-stone-500 max-w-xs mx-auto">{s.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= TESTIMONIALS ================= */}
      <section className="bg-stone-50 border-y border-stone-200">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 lg:py-24">
          <div className="text-center mb-14">
            <span className="eyebrow">Témoignages</span>
            <h2 className="serif mt-3 text-4xl sm:text-5xl font-bold text-stone-900">Ils nous font confiance</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.figure key={i} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                className="relative rounded-2xl bg-white border border-stone-200 p-8 shadow-sm">
                <span className="serif absolute top-4 left-6 text-5xl leading-none text-stone-200">“</span>
                <blockquote className="relative pt-6 text-stone-700 leading-relaxed">{t.text}</blockquote>
                <figcaption className="mt-6 flex items-center gap-3">
                  <span className="h-10 w-10 rounded-full bg-primary-600 text-white serif text-lg flex items-center justify-center">{t.name.charAt(0)}</span>
                  <span>
                    <span className="block text-sm font-semibold text-stone-900">{t.name}</span>
                    <span className="block text-xs text-stone-400">{t.place}</span>
                  </span>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>
      </section>

      {/* ================= CONTACT ================= */}
      <section id="contact" className="bg-white">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 py-20 lg:py-24">
          <div className="text-center mb-12">
            <span className="eyebrow">À votre écoute</span>
            <h2 className="serif mt-3 text-4xl sm:text-5xl font-bold text-stone-900">Une question ? Contactez-nous</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <a href={contactEmail ? `mailto:${contactEmail}` : undefined}
              className={`rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center transition-all ${contactEmail ? 'hover:-translate-y-1 hover:shadow-xl' : 'opacity-70 cursor-default'}`}>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100 mb-4"><EnvelopeIcon className="h-6 w-6" /></span>
              <h3 className="serif text-xl font-bold text-stone-900">Par email</h3>
              <p className="mt-1.5 text-sm text-stone-500">{contactEmail || 'Adresse en cours de configuration'}</p>
            </a>
            <a href={supportPhone ? `tel:${supportPhone}` : undefined}
              className={`rounded-2xl border border-stone-200 bg-stone-50 p-8 text-center transition-all ${supportPhone ? 'hover:-translate-y-1 hover:shadow-xl' : 'opacity-70 cursor-default'}`}>
              <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-600 ring-1 ring-primary-100 mb-4"><PhoneIcon className="h-6 w-6" /></span>
              <h3 className="serif text-xl font-bold text-stone-900">Par téléphone</h3>
              <p className="mt-1.5 text-sm text-stone-500">{supportPhone || 'Numéro en cours de configuration'}</p>
            </a>
          </div>
        </div>
      </section>

      {/* ================= CTA ================= */}
      <section className="bg-white px-5 sm:px-8 pb-20">
        <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}
          className="relative max-w-6xl mx-auto overflow-hidden rounded-3xl px-6 py-16 sm:py-20 text-center bg-stone-900">
          <div className="pointer-events-none absolute -top-24 right-0 h-72 w-72 rounded-full bg-primary-600/25 blur-[90px]" />
          <div className="pointer-events-none absolute -bottom-24 left-0 h-72 w-72 rounded-full bg-gold-500/15 blur-[90px]" />
          <div className="relative">
            <span className="eyebrow text-primary-300">Prêt à commencer ?</span>
            <h2 className="serif mt-4 text-4xl sm:text-5xl font-bold text-white leading-tight">
              Votre plus belle invitation vous attend
            </h2>
            <p className="mt-4 text-stone-300 max-w-xl mx-auto">
              Rejoignez les couples et organisateurs qui confient leurs grands jours à {siteName}.
            </p>
            <div className="mt-9 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-primary-500 hover:-translate-y-0.5 transition-all shadow-lg">
                Créer mon invitation <ArrowUpRightIcon className="h-5 w-5" />
              </Link>
              <Link to="/marketplace" className="inline-flex items-center justify-center rounded-xl border border-white/25 px-7 py-3.5 text-[15px] font-semibold text-white hover:bg-white/10 transition-all">
                Parcourir les modèles
              </Link>
            </div>
          </div>
        </motion.div>
      </section>
    </div>
  )
}
