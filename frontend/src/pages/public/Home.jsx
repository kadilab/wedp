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
  PhoneIcon
} from '@heroicons/react/24/outline'

export default function Home() {
  const { contactEmail, supportPhone } = useSiteSettingsStore()
  const features = [
    {
      icon: SparklesIcon,
      title: 'Templates Élégants',
      description: 'Choisissez parmi des dizaines de modèles raffinés pour votre mariage'
    },
    {
      icon: PhotoIcon,
      title: 'Photo Personnalisée',
      description: 'Ajoutez la photo des mariés avec bordure, opacité et style sur mesure'
    },
    {
      icon: QrCodeIcon,
      title: 'QR Codes Uniques',
      description: 'Chaque invité reçoit son QR code personnel pour un check-in fluide'
    },
    {
      icon: DevicePhoneMobileIcon,
      title: 'Mobile First',
      description: 'Invitations optimisées pour tous les appareils et réseaux sociaux'
    },
    {
      icon: ChartBarIcon,
      title: 'Suivi en Temps Réel',
      description: 'Suivez les RSVP et check-ins en direct le jour J'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Payez à l\'usage',
      description: '1 invitation gratuite, puis payez uniquement ce que vous utilisez via Mobile Money — sans abonnement'
    }
  ]

  const testimonials = [
    {
      name: 'Aminata & Moussa',
      location: 'Dakar',
      text: 'WeddingInvite Pro a rendu la gestion de nos 500 invités tellement simple !'
    },
    {
      name: 'Fatou & Ibrahim',
      location: 'Abidjan',
      text: 'Le système de QR code a impressionné tous nos invités. Très professionnel !'
    },
    {
      name: 'Marie & Jean',
      location: 'Douala',
      text: 'Les templates sont magnifiques et le support client est exceptionnel.'
    }
  ]

  return (
    <div className="bg-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-rose-50 via-white to-gold-50 overflow-hidden">
        <div className="absolute inset-0 bg-[url('/hero-pattern.svg')] opacity-5"></div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <span className="inline-flex items-center px-4 py-1 rounded-full bg-gold-100 text-gold-700 text-sm font-medium mb-6">
                <HeartIcon className="h-4 w-4 mr-2" />
                La solution #1 pour vos invitations
              </span>
              <h1 className="text-4xl lg:text-6xl font-serif font-bold text-gray-900 leading-tight">
                Créez des invitations de mariage{' '}
                <span className="text-primary-600">inoubliables</span>
              </h1>
              <p className="mt-6 text-xl text-gray-600 leading-relaxed">
                Gérez vos invitations, suivez les RSVP et accueillez vos invités avec des QR codes
                personnalisés. Tout en un seul endroit.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-4">
                <Link to="/register" className="btn-primary text-lg px-8 py-4 text-center">
                  Commencer gratuitement
                </Link>
                <a href="#comment-ca-marche" className="btn-secondary text-lg px-8 py-4 text-center">
                  Comment ça marche
                </a>
              </div>
              <div className="mt-8 flex items-center gap-8 text-sm text-gray-500">
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  1 invitation gratuite
                </div>
                <div className="flex items-center">
                  <CheckCircleIcon className="h-5 w-5 text-green-500 mr-2" />
                  Sans abonnement
                </div>
              </div>
            </motion.div>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 bg-white rounded-2xl shadow-2xl p-4 transform rotate-2 hover:rotate-0 transition-transform duration-300">
                <div className="w-full aspect-[3/4] rounded-xl bg-gradient-to-br from-primary-50 via-gold-50 to-primary-100 flex flex-col items-center justify-center p-8 text-center">
                  <div className="text-6xl mb-4">💒</div>
                  <p className="text-primary-400 text-sm uppercase tracking-widest mb-2">Vous êtes invité au mariage de</p>
                  <h3 className="font-serif text-3xl text-gray-800 mb-2">Marie & Thomas</h3>
                  <p className="text-primary-500 font-medium mb-4">15 Juin 2026</p>
                  <div className="w-16 h-0.5 bg-gold-400 mb-4"></div>
                  <p className="text-gray-500 text-sm">Château de Versailles</p>
                  <p className="text-gray-400 text-xs mt-4">Cliquez pour confirmer votre présence</p>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 bg-gold-400 rounded-full p-6 shadow-lg">
                <QrCodeIcon className="h-12 w-12 text-white" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900">
              Tout ce dont vous avez besoin
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Une solution complète pour gérer vos invitations de A à Z
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 rounded-2xl p-8 text-center hover:bg-primary-50 transition-colors group"
              >
                <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 text-primary-600 group-hover:bg-primary-600 group-hover:text-white transition-colors mb-6">
                  <feature.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-serif font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="comment-ca-marche" className="py-24 bg-gradient-to-br from-primary-50 to-rose-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900">
              Comment ça marche ?
            </h2>
            <p className="mt-4 text-xl text-gray-600">En 3 étapes simples</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Créez votre mariage',
                description: 'Ajoutez les détails de votre événement, choisissez un template et personnalisez-le avec la photo des mariés. Votre 1ère invitation est gratuite.'
              },
              {
                step: '2',
                title: 'Invitez vos proches',
                description: 'Importez votre liste ou ajoutez vos invités manuellement'
              },
              {
                step: '3',
                title: 'Envoyez & Suivez',
                description: 'Besoin de plus d\'invitations ? Payez uniquement ce qu\'il vous faut via Mobile Money, puis envoyez et suivez les réponses en temps réel'
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="relative bg-white rounded-2xl p-8 shadow-lg"
              >
                <div className="absolute -top-4 -left-4 h-12 w-12 rounded-full bg-gold-400 flex items-center justify-center text-white text-xl font-bold">
                  {item.step}
                </div>
                <h3 className="text-xl font-serif font-bold text-gray-900 mt-4 mb-3">
                  {item.title}
                </h3>
                <p className="text-gray-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900">
              Ils nous font confiance
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              +1000 couples nous ont déjà fait confiance
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((t, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="bg-gray-50 rounded-2xl p-8"
              >
                <div className="flex items-center mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className="h-5 w-5 text-gold-400"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <p className="text-gray-600 italic mb-4">"{t.text}"</p>
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-600 font-bold">
                    {t.name.charAt(0)}
                  </div>
                  <div className="ml-3">
                    <p className="font-medium text-gray-900">{t.name}</p>
                    <p className="text-sm text-gray-500">{t.location}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900">
              Une question ? Contactez-nous
            </h2>
            <p className="mt-4 text-xl text-gray-600">
              Notre équipe vous répond rapidement, par email ou par téléphone
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <motion.a
              href={contactEmail ? `mailto:${contactEmail}` : undefined}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className={`bg-white rounded-2xl p-8 shadow-lg text-center transition-all ${
                contactEmail ? 'hover:shadow-xl hover:-translate-y-1' : 'cursor-default opacity-75'
              }`}
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-primary-100 text-primary-600 mb-6">
                <EnvelopeIcon className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Par email</h3>
              <p className="text-gray-600">
                {contactEmail || 'Adresse en cours de configuration'}
              </p>
            </motion.a>

            <motion.a
              href={supportPhone ? `tel:${supportPhone}` : undefined}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              viewport={{ once: true }}
              className={`bg-white rounded-2xl p-8 shadow-lg text-center transition-all ${
                supportPhone ? 'hover:shadow-xl hover:-translate-y-1' : 'cursor-default opacity-75'
              }`}
            >
              <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-gold-100 text-gold-600 mb-6">
                <PhoneIcon className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">Par téléphone</h3>
              <p className="text-gray-600">
                {supportPhone || 'Numéro en cours de configuration'}
              </p>
            </motion.a>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-primary-600 to-primary-800">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl lg:text-4xl font-serif font-bold text-white mb-6">
              Prêt à créer vos invitations ?
            </h2>
            <p className="text-xl text-primary-100 mb-8">
              Rejoignez des milliers de couples qui ont fait confiance à WeddingInvite Pro
            </p>
            <Link
              to="/register"
              className="inline-flex items-center bg-white text-primary-600 font-semibold text-lg px-8 py-4 rounded-full hover:bg-primary-50 transition-colors shadow-lg"
            >
              Commencer maintenant
              <svg
                className="ml-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 8l4 4m0 0l-4 4m4-4H3"
                />
              </svg>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
