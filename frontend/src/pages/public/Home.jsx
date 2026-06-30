import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import useSiteSettingsStore from '../../stores/siteSettingsStore'
import {
  SparklesIcon,
  DevicePhoneMobileIcon,
  QrCodeIcon,
  ChartBarIcon,
  HeartIcon,
  CheckCircleIcon,
  PhotoIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  PhoneIcon,
  ArrowRightIcon,
  CalendarDaysIcon
} from '@heroicons/react/24/outline'

export default function Home() {
  const { siteName, contactEmail, supportPhone } = useSiteSettingsStore()

  const features = [
    { icon: SparklesIcon, title: 'Templates élégants', description: 'Des dizaines de modèles raffinés, entièrement personnalisables (couleurs, polices, photos).', color: 'from-rose-500 to-pink-500' },
    { icon: PhotoIcon, title: 'Design sur mesure', description: 'Éditeur visuel : déplacez chaque élément, ajoutez vos photos, icônes et même vos propres polices.', color: 'from-amber-500 to-orange-500' },
    { icon: QrCodeIcon, title: 'QR codes uniques', description: 'Chaque invité reçoit son QR personnel pour un check-in fluide le jour J.', color: 'from-violet-500 to-purple-500' },
    { icon: DevicePhoneMobileIcon, title: 'Envoi WhatsApp', description: 'Partagez le lien personnalisé de chaque invité en un clic, directement sur WhatsApp.', color: 'from-emerald-500 to-green-500' },
    { icon: ChartBarIcon, title: 'Suivi en temps réel', description: 'RSVP et arrivées en direct. Mode hôtesse + recherche par nom si le QR est illisible.', color: 'from-sky-500 to-blue-500' },
    { icon: CurrencyDollarIcon, title: 'Paiement Mobile Money', description: "Achetez vos invitations en ligne via Mobile Money. Payez uniquement ce que vous utilisez, sans abonnement.", color: 'from-fuchsia-500 to-rose-500' }
  ]

  const eventTypes = ['Mariage', 'Mariage coutumier', 'Anniversaire', 'Cérémonie', 'Conférence', 'Dot']

  const testimonials = [
    { name: 'Aminata & Moussa', location: 'Dakar', text: "WeddingInvite Pro a rendu la gestion de nos 500 invités tellement simple !" },
    { name: 'Fatou & Ibrahim', location: 'Abidjan', text: "Le système de QR code a impressionné tous nos invités. Très professionnel !" },
    { name: 'Marie & Jean', location: 'Douala', text: "Les templates sont magnifiques et le support client est exceptionnel." }
  ]

  return (
    <div className="bg-white overflow-hidden">
      {/* ============ HERO ============ */}
      <section className="relative isolate overflow-hidden bg-gradient-to-b from-rose-50/60 via-white to-white">
        {/* Decorative blurred blobs */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary-300/30 blur-3xl" />
          <div className="absolute top-20 -right-20 h-80 w-80 rounded-full bg-gold-300/30 blur-3xl" />
          <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-rose-300/20 blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur border border-gold-200 text-gold-700 text-sm font-medium shadow-sm">
                <SparklesIcon className="h-4 w-4" />
                Invitations digitales nouvelle génération
              </span>

              <h1 className="mt-6 text-4xl sm:text-5xl lg:text-6xl font-serif font-bold text-gray-900 leading-[1.1]">
                Des invitations{' '}
                <span className="bg-gradient-to-r from-primary-600 via-rose-500 to-gold-500 bg-clip-text text-transparent">
                  inoubliables
                </span>{' '}
                pour tous vos événements
              </h1>

              <p className="mt-6 text-lg sm:text-xl text-gray-600 leading-relaxed max-w-xl">
                Créez, personnalisez et envoyez vos invitations en quelques minutes.
                QR codes par invité, suivi RSVP en temps réel et paiement Mobile Money.
              </p>

              {/* Event type chips */}
              <div className="mt-6 flex flex-wrap gap-2">
                {eventTypes.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-50 text-primary-700 text-xs font-medium border border-primary-100">
                    <CalendarDaysIcon className="h-3.5 w-3.5" /> {t}
                  </span>
                ))}
              </div>

              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="inline-flex items-center justify-center gap-2 text-lg px-8 py-4 rounded-full bg-gradient-to-r from-primary-600 to-primary-700 text-white font-semibold shadow-lg shadow-primary-600/25 hover:shadow-xl hover:-translate-y-0.5 transition-all">
                  Commencer gratuitement <ArrowRightIcon className="h-5 w-5" />
                </Link>
                <a href="#comment-ca-marche" className="inline-flex items-center justify-center text-lg px-8 py-4 rounded-full bg-white text-gray-800 font-semibold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all">
                  Comment ça marche
                </a>
              </div>

              <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-gray-500">
                <div className="flex items-center"><CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" /> Sans abonnement</div>
                <div className="flex items-center"><CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" /> Aperçu gratuit</div>
                <div className="flex items-center"><CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" /> Paiement à l'usage</div>
              </div>
            </motion.div>

            {/* Hero mockup */}
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="relative mx-auto w-full max-w-md"
            >
              <div className="relative z-10 rounded-[2rem] bg-white shadow-2xl ring-1 ring-black/5 p-4 rotate-2 hover:rotate-0 transition-transform duration-500">
                <div className="w-full aspect-[3/4] rounded-[1.5rem] bg-gradient-to-br from-primary-50 via-gold-50 to-rose-100 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
                  <div className="absolute top-3 left-3 h-16 w-16 rounded-full bg-gold-200/40 blur-xl" />
                  <p className="text-primary-400 text-xs uppercase tracking-[0.25em] mb-3">Invitation au mariage</p>
                  <h3 className="font-serif text-4xl text-gray-800 leading-tight">Marie<br/><span className="text-gold-500 text-2xl">&</span><br/>Thomas</h3>
                  <div className="w-14 h-px bg-gold-400 my-5" />
                  <p className="text-primary-600 font-medium">15 Juin 2026</p>
                  <p className="text-gray-500 text-sm mt-1">Château de Versailles</p>
                </div>
              </div>

              {/* Floating QR chip */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -top-5 -right-3 z-20 bg-white rounded-2xl shadow-xl p-4 ring-1 ring-black/5"
              >
                <QrCodeIcon className="h-10 w-10 text-primary-600" />
              </motion.div>

              {/* Floating RSVP chip */}
              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}
                className="absolute -bottom-4 -left-4 z-20 bg-white rounded-2xl shadow-xl px-4 py-3 ring-1 ring-black/5 flex items-center gap-2"
              >
                <span className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-600" />
                </span>
                <div className="text-left">
                  <p className="text-xs font-semibold text-gray-900 leading-none">RSVP confirmé</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">il y a 2 min</p>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ============ TRUST STRIP ============ */}
      <section className="border-y border-gray-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { value: 'Multi-événements', label: 'Mariage, anniversaire…' },
            { value: 'QR check-in', label: 'Le jour J, sans file' },
            { value: 'Mobile Money', label: 'Paiement en ligne' },
            { value: 'Temps réel', label: 'RSVP & arrivées en direct' }
          ].map((s, i) => (
            <div key={i}>
              <p className="text-lg sm:text-xl font-serif font-bold text-gray-900">{s.value}</p>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Fonctionnalités</span>
            <h2 className="mt-2 text-3xl lg:text-4xl font-serif font-bold text-gray-900">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-xl text-gray-600 max-w-2xl mx-auto">
              Une solution complète pour gérer vos invitations de A à Z
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.08 }}
                viewport={{ once: true }}
                className="group relative bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br ${feature.color} text-white shadow-lg mb-6`}>
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="comment-ca-marche" className="py-24 bg-gradient-to-br from-primary-50 via-rose-50 to-gold-50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Simple & rapide</span>
            <h2 className="mt-2 text-3xl lg:text-4xl font-serif font-bold text-gray-900">Comment ça marche ?</h2>
            <p className="mt-4 text-xl text-gray-600">En 3 étapes</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {[
              { step: '1', title: 'Créez votre événement', description: "Choisissez un type d'événement, un template, et personnalisez-le avec vos infos et vos photos." },
              { step: '2', title: 'Invitez vos proches', description: 'Importez votre liste (Excel/CSV) ou ajoutez vos invités manuellement, par catégories.' },
              { step: '3', title: 'Envoyez & suivez', description: "Payez vos invitations via Mobile Money, envoyez les liens (WhatsApp) et suivez les réponses en direct." }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative bg-white rounded-3xl p-8 pt-10 shadow-lg border border-white"
              >
                <div className="absolute -top-5 left-8 h-12 w-12 rounded-2xl bg-gradient-to-br from-primary-600 to-primary-700 flex items-center justify-center text-white text-xl font-bold shadow-lg">
                  {item.step}
                </div>
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-3">{item.title}</h3>
                <p className="text-gray-600 leading-relaxed">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ TESTIMONIALS ============ */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="text-primary-600 font-semibold text-sm uppercase tracking-wider">Témoignages</span>
            <h2 className="mt-2 text-3xl lg:text-4xl font-serif font-bold text-gray-900">Ils nous font confiance</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gradient-to-br from-gray-50 to-white rounded-3xl p-8 border border-gray-100 shadow-sm"
              >
                <div className="flex items-center mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg key={star} className="h-5 w-5 text-gold-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-700 italic mb-6 leading-relaxed">"{t.text}"</p>
                <div className="flex items-center">
                  <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-500">{t.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CONTACT ============ */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900">Une question ? Contactez-nous</h2>
            <p className="mt-4 text-xl text-gray-600">Notre équipe vous répond rapidement</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <motion.a
              href={contactEmail ? `mailto:${contactEmail}` : undefined}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className={`bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center transition-all ${contactEmail ? 'hover:shadow-xl hover:-translate-y-1' : 'cursor-default opacity-75'}`}
            >
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white mb-5">
                <EnvelopeIcon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Par email</h3>
              <p className="text-gray-600">{contactEmail || 'Adresse en cours de configuration'}</p>
            </motion.a>

            <motion.a
              href={supportPhone ? `tel:${supportPhone}` : undefined}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className={`bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center transition-all ${supportPhone ? 'hover:shadow-xl hover:-translate-y-1' : 'cursor-default opacity-75'}`}
            >
              <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-gradient-to-br from-gold-400 to-amber-500 text-white mb-5">
                <PhoneIcon className="h-7 w-7" />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Par téléphone</h3>
              <p className="text-gray-600">{supportPhone || 'Numéro en cours de configuration'}</p>
            </motion.a>
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-24 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-primary-600 to-primary-800 px-8 py-16 text-center shadow-2xl"
          >
            <div className="pointer-events-none absolute -top-16 -right-10 h-64 w-64 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-10 h-64 w-64 rounded-full bg-gold-400/20 blur-2xl" />
            <HeartIcon className="h-10 w-10 text-white/70 mx-auto mb-4" />
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-white mb-4">
              Prêt à créer vos invitations ?
            </h2>
            <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
              Rejoignez les couples et organisateurs qui font confiance à {siteName}.
            </p>
            <Link
              to="/register"
              className="inline-flex items-center gap-2 bg-white text-primary-700 font-semibold text-lg px-8 py-4 rounded-full hover:bg-primary-50 hover:-translate-y-0.5 transition-all shadow-lg"
            >
              Commencer maintenant <ArrowRightIcon className="h-5 w-5" />
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
