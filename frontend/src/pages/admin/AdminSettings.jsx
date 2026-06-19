import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import useSiteSettingsStore from '../../stores/siteSettingsStore'
import toast from 'react-hot-toast'
import {
  Cog6ToothIcon,
  EnvelopeIcon,
  CurrencyDollarIcon,
  BellIcon,
  PhotoIcon,
  TrashIcon,
  PlusIcon
} from '@heroicons/react/24/outline'

const DEFAULT_FORM = {
  siteName: 'WeddingInvite Pro',
  siteDescription: '',
  contactEmail: '',
  supportPhone: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUser: '',
  smtpPassword: '',
  emailFrom: '',
  mobileMoney: { orangeMoney: '', mtn: '', wave: '' },
  invitationUnitPrice: '0.3',
  invitationPaymentMethods: [],
  telegramBotToken: '',
  telegramChatId: '',
  telegramNotificationsEnabled: false,
  enableEmailNotifications: true,
  enableAdminNotifications: true
}

export default function AdminSettings() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')
  const [formData, setFormData] = useState(DEFAULT_FORM)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoHeight, setLogoHeight] = useState(32)
  const logoInputRef = useRef(null)
  const { updateSiteName, updateSiteLogo, updateLogoHeight, updateContactInfo } = useSiteSettingsStore()

  const { data: settingsData, isLoading, isError, error: fetchError } = useQuery(
    'admin-settings',
    () => adminAPI.getSettings(),
    { retry: 1 }
  )

  // Sync form state whenever settings load / change
  useEffect(() => {
    const s = settingsData?.data?.settings
    if (!s) return
    setFormData({
      siteName: s.siteName || DEFAULT_FORM.siteName,
      siteDescription: s.siteDescription || '',
      contactEmail: s.contactEmail || '',
      supportPhone: s.supportPhone || '',
      smtpHost: s.smtpHost || '',
      smtpPort: s.smtpPort || '587',
      smtpUser: s.smtpUser || '',
      smtpPassword: s.smtpPassword || '',
      emailFrom: s.emailFrom || '',
      mobileMoney: {
        orangeMoney: s.mobileMoney?.orangeMoney || s.orangeMoneyNumber || '',
        mtn: s.mobileMoney?.mtn || s.mtnNumber || '',
        wave: s.mobileMoney?.wave || s.waveNumber || ''
      },
      invitationUnitPrice: s.invitationUnitPrice || DEFAULT_FORM.invitationUnitPrice,
      invitationPaymentMethods: Array.isArray(s.invitationPaymentMethods) ? s.invitationPaymentMethods : [],
      telegramBotToken: s.telegramBotToken || '',
      telegramChatId: s.telegramChatId || '',
      telegramNotificationsEnabled: s.telegramNotificationsEnabled === 'true' || s.telegramNotificationsEnabled === true,
      enableEmailNotifications: s.enableEmailNotifications !== 'false' && s.enableEmailNotifications !== false,
      enableAdminNotifications: s.enableAdminNotifications !== 'false' && s.enableAdminNotifications !== false
    })
    // Sync logo preview
    if (s.siteLogo) setLogoPreview(s.siteLogo)
    if (s.logoHeight) setLogoHeight(parseInt(s.logoHeight) || 32)
  }, [settingsData])

  const updateMutation = useMutation((data) => adminAPI.updateSettings(data), {
    onSuccess: () => {
      queryClient.invalidateQueries('admin-settings')
      updateSiteName(formData.siteName)
      updateLogoHeight(logoHeight)
      updateContactInfo(formData.contactEmail, formData.supportPhone)
      toast.success('Paramètres enregistrés')
    },
    onError: (err) => toast.error(err.response?.data?.error || err.response?.data?.message || 'Erreur lors de la sauvegarde')
  })

  const testTelegramMutation = useMutation(
    () => adminAPI.testTelegram({ botToken: formData.telegramBotToken, chatId: formData.telegramChatId }),
    {
      onSuccess: (res) => toast.success(res.data.message || 'Test envoyé'),
      onError: (err) => toast.error(err.response?.data?.error || 'Échec du test Telegram')
    }
  )

  const logoUploadMutation = useMutation((file) => adminAPI.uploadSettingsLogo(file), {
    onSuccess: (res) => {
      const url = res.data.logoUrl
      setLogoPreview(url)
      updateSiteLogo(url)
      queryClient.invalidateQueries('admin-settings')
      toast.success('Logo mis à jour')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur lors de l\'upload du logo')
  })

  const logoDeleteMutation = useMutation(() => adminAPI.deleteSettingsLogo(), {
    onSuccess: () => {
      setLogoPreview(null)
      updateSiteLogo(null)
      queryClient.invalidateQueries('admin-settings')
      if (logoInputRef.current) logoInputRef.current.value = ''
      toast.success('Logo supprimé')
    },
    onError: () => toast.error('Erreur lors de la suppression du logo')
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    updateMutation.mutate({ ...formData, logoHeight: String(logoHeight) })
  }

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))
  const updateMobileMoney = (field, value) =>
    setFormData(prev => ({ ...prev, mobileMoney: { ...prev.mobileMoney, [field]: value } }))

  const addInvitationPaymentMethod = () =>
    setFormData(prev => ({
      ...prev,
      invitationPaymentMethods: [...prev.invitationPaymentMethods, { provider: '', number: '', instructions: '' }]
    }))

  const updateInvitationPaymentMethod = (index, field, value) =>
    setFormData(prev => ({
      ...prev,
      invitationPaymentMethods: prev.invitationPaymentMethods.map((m, i) => i === index ? { ...m, [field]: value } : m)
    }))

  const removeInvitationPaymentMethod = (index) =>
    setFormData(prev => ({
      ...prev,
      invitationPaymentMethods: prev.invitationPaymentMethods.filter((_, i) => i !== index)
    }))

  const tabs = [
    { id: 'general', label: 'Général', icon: Cog6ToothIcon },
    { id: 'email', label: 'Email', icon: EnvelopeIcon },
    { id: 'payment', label: 'Paiement', icon: CurrencyDollarIcon },
    { id: 'notifications', label: 'Notifications', icon: BellIcon }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-red-600 font-medium">
          Erreur lors du chargement des paramètres
        </p>
        <p className="text-sm text-gray-500">{fetchError?.response?.data?.error || fetchError?.message || 'Erreur serveur'}</p>
        <button
          onClick={() => queryClient.invalidateQueries('admin-settings')}
          className="btn-primary text-sm"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-600 mt-1">Configuration de la plateforme</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-4">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-4 py-3 text-sm rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-50 text-primary-700 font-medium'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-3" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6">
            {/* General Tab */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <h2 className="text-xl font-serif font-bold text-gray-900 pb-4 border-b">
                  Paramètres généraux
                </h2>

                <div>
                  <label htmlFor="siteName" className="block text-sm font-medium text-gray-700 mb-1">
                    Nom du site
                  </label>
                  <input
                    id="siteName"
                    type="text"
                    className="input"
                    value={formData.siteName}
                    onChange={(e) => updateField('siteName', e.target.value)}
                  />
                </div>

                {/* Logo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Logo de l'application
                  </label>
                  <div className="flex items-start gap-6">
                    {/* Preview */}
                    <div className="flex-shrink-0">
                      {logoPreview ? (
                        <div className="relative group">
                          <img
                            src={logoPreview}
                            alt="Logo du site"
                            className="h-20 w-20 object-contain rounded-xl border-2 border-gray-200 bg-white p-1"
                          />
                          <button
                            type="button"
                            onClick={() => logoDeleteMutation.mutate()}
                            disabled={logoDeleteMutation.isLoading}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                            title="Supprimer le logo"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-20 w-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                          <PhotoIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Upload */}
                    <div className="flex-1">
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        id="logoUpload"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) logoUploadMutation.mutate(file)
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        disabled={logoUploadMutation.isLoading}
                        className="btn-outline text-sm"
                      >
                        {logoUploadMutation.isLoading ? 'Envoi...' : logoPreview ? 'Changer le logo' : 'Choisir un logo'}
                      </button>
                      <p className="text-xs text-gray-500 mt-2">
                        PNG, JPG, SVG ou WebP. Recommandé : fond transparent.
                      </p>
                    </div>
                  </div>

                  {/* Logo size adjustment */}
                  {logoPreview && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center justify-between mb-3">
                        <label htmlFor="logoHeight" className="text-sm font-medium text-gray-700">
                          Taille du logo
                        </label>
                        <span className="text-sm font-mono text-gray-500 bg-white px-2 py-0.5 rounded border">
                          {logoHeight}px
                        </span>
                      </div>
                      <input
                        id="logoHeight"
                        type="range"
                        min="20"
                        max="80"
                        step="2"
                        value={logoHeight}
                        onChange={(e) => setLogoHeight(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                      />
                      <div className="flex justify-between text-xs text-gray-400 mt-1">
                        <span>Petit</span>
                        <span>Moyen</span>
                        <span>Grand</span>
                      </div>

                      {/* Live preview strip */}
                      <div className="mt-4 flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                        <img
                          src={logoPreview}
                          alt="Aperçu logo"
                          style={{ height: `${logoHeight}px` }}
                          className="object-contain"
                        />
                        <span className="text-sm font-serif font-bold text-gray-900 truncate">
                          {formData.siteName}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 mt-2 text-center">Aperçu en taille réelle</p>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="siteDescription" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="siteDescription"
                    className="input"
                    rows="3"
                    value={formData.siteDescription}
                    onChange={(e) => updateField('siteDescription', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700 mb-1">
                      Email de contact
                    </label>
                    <input
                      id="contactEmail"
                      type="email"
                      className="input"
                      placeholder="contact@weddinginvite.pro"
                      value={formData.contactEmail}
                      onChange={(e) => updateField('contactEmail', e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="supportPhone" className="block text-sm font-medium text-gray-700 mb-1">
                      Téléphone support
                    </label>
                    <input
                      id="supportPhone"
                      type="tel"
                      className="input"
                      placeholder="+221 77 XXX XX XX"
                      value={formData.supportPhone}
                      onChange={(e) => updateField('supportPhone', e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400">
                  Cet email et ce numéro sont affichés publiquement dans la section Contact de la page d'accueil.
                </p>
              </div>
            )}

            {/* Email Tab */}
            {activeTab === 'email' && (
              <div className="space-y-6">
                <h2 className="text-xl font-serif font-bold text-gray-900 pb-4 border-b">
                  Configuration SMTP
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="smtpHost" className="block text-sm font-medium text-gray-700 mb-1">
                      Serveur SMTP
                    </label>
                    <input
                      id="smtpHost"
                      type="text"
                      className="input"
                      placeholder="smtp.example.com"
                      value={formData.smtpHost}
                      onChange={(e) => updateField('smtpHost', e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="smtpPort" className="block text-sm font-medium text-gray-700 mb-1">
                      Port SMTP
                    </label>
                    <input
                      id="smtpPort"
                      type="text"
                      className="input"
                      placeholder="587"
                      value={formData.smtpPort}
                      onChange={(e) => updateField('smtpPort', e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="smtpUser" className="block text-sm font-medium text-gray-700 mb-1">
                      Utilisateur SMTP
                    </label>
                    <input
                      id="smtpUser"
                      type="text"
                      className="input"
                      value={formData.smtpUser}
                      onChange={(e) => updateField('smtpUser', e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="smtpPassword" className="block text-sm font-medium text-gray-700 mb-1">
                      Mot de passe SMTP
                    </label>
                    <input
                      id="smtpPassword"
                      type="password"
                      className="input"
                      value={formData.smtpPassword}
                      onChange={(e) => updateField('smtpPassword', e.target.value)}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="emailFrom" className="block text-sm font-medium text-gray-700 mb-1">
                    Email d'expéditeur
                  </label>
                  <input
                    id="emailFrom"
                    type="email"
                    className="input"
                    placeholder="noreply@weddinginvite.pro"
                    value={formData.emailFrom}
                    onChange={(e) => updateField('emailFrom', e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Payment Tab */}
            {activeTab === 'payment' && (
              <div className="space-y-6">
                <h2 className="text-xl font-serif font-bold text-gray-900 pb-4 border-b">
                  Numéros Mobile Money
                </h2>
                <p className="text-gray-500 text-sm -mt-4">
                  Ces numéros seront affichés aux utilisateurs pour les paiements
                </p>

                <div>
                  <label htmlFor="orangeMoney" className="block text-sm font-medium text-gray-700 mb-1">
                    Orange Money
                  </label>
                  <input
                    id="orangeMoney"
                    type="tel"
                    className="input"
                    placeholder="+221 77 XXX XX XX"
                    value={formData.mobileMoney.orangeMoney}
                    onChange={(e) => updateMobileMoney('orangeMoney', e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="mtnMoney" className="block text-sm font-medium text-gray-700 mb-1">
                    MTN Money
                  </label>
                  <input
                    id="mtnMoney"
                    type="tel"
                    className="input"
                    placeholder="+237 6XX XXX XXX"
                    value={formData.mobileMoney.mtn}
                    onChange={(e) => updateMobileMoney('mtn', e.target.value)}
                  />
                </div>

                <div>
                  <label htmlFor="waveMoney" className="block text-sm font-medium text-gray-700 mb-1">
                    Wave
                  </label>
                  <input
                    id="waveMoney"
                    type="tel"
                    className="input"
                    placeholder="+221 7X XXX XX XX"
                    value={formData.mobileMoney.wave}
                    onChange={(e) => updateMobileMoney('wave', e.target.value)}
                  />
                </div>

                <div className="pt-6 border-t">
                  <h3 className="text-lg font-serif font-bold text-gray-900">
                    Tarification des invitations
                  </h3>
                  <p className="text-gray-500 text-sm mt-1 mb-4">
                    Chaque mariage a droit à 1 invitation gratuite. Au-delà, le client achète un quota
                    d'invitations payé manuellement via les moyens de paiement définis ci-dessous.
                  </p>

                  <div className="mb-6">
                    <label htmlFor="invitationUnitPrice" className="block text-sm font-medium text-gray-700 mb-1">
                      Prix unitaire par invitation ($)
                    </label>
                    <input
                      id="invitationUnitPrice"
                      type="number"
                      step="0.01"
                      min="0"
                      className="input max-w-xs"
                      placeholder="0.3"
                      value={formData.invitationUnitPrice}
                      onChange={(e) => updateField('invitationUnitPrice', e.target.value)}
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-700">
                        Moyens de paiement (affichés au client)
                      </label>
                      <button
                        type="button"
                        onClick={addInvitationPaymentMethod}
                        className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium"
                      >
                        <PlusIcon className="h-4 w-4 mr-1" />
                        Ajouter
                      </button>
                    </div>

                    {formData.invitationPaymentMethods.length === 0 && (
                      <p className="text-sm text-gray-400 italic py-2">
                        Aucun moyen de paiement configuré.
                      </p>
                    )}

                    <div className="space-y-3">
                      {formData.invitationPaymentMethods.map((method, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_1fr_auto] gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <input
                            type="text"
                            className="input"
                            placeholder="Ex: Orange Money"
                            value={method.provider}
                            onChange={(e) => updateInvitationPaymentMethod(index, 'provider', e.target.value)}
                          />
                          <input
                            type="text"
                            className="input"
                            placeholder="Numéro (+221 77 XXX XX XX)"
                            value={method.number}
                            onChange={(e) => updateInvitationPaymentMethod(index, 'number', e.target.value)}
                          />
                          <input
                            type="text"
                            className="input"
                            placeholder="Instructions (optionnel)"
                            value={method.instructions}
                            onChange={(e) => updateInvitationPaymentMethod(index, 'instructions', e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => removeInvitationPaymentMethod(index)}
                            className="flex items-center justify-center text-red-500 hover:text-red-700 px-2"
                            title="Supprimer"
                          >
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-serif font-bold text-gray-900 pb-4 border-b">
                  Préférences de notification
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 border-b">
                    <div>
                      <p className="font-medium text-gray-900">
                        Notifications par email aux utilisateurs
                      </p>
                      <p className="text-sm text-gray-500">
                        Envoyer des emails de confirmation et de suivi
                      </p>
                    </div>
                    <label htmlFor="emailNotifToggle" className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="emailNotifToggle"
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.enableEmailNotifications}
                        onChange={(e) => updateField('enableEmailNotifications', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        Notifications admin
                      </p>
                      <p className="text-sm text-gray-500">
                        Recevoir des alertes pour les nouveaux paiements et inscriptions
                      </p>
                    </div>
                    <label htmlFor="adminNotifToggle" className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="adminNotifToggle"
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.enableAdminNotifications}
                        onChange={(e) => updateField('enableAdminNotifications', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>
                </div>

                <div className="pt-6 border-t">
                  <h3 className="text-lg font-serif font-bold text-gray-900">
                    Bot Telegram
                  </h3>
                  <p className="text-gray-500 text-sm mt-1 mb-4">
                    Reçevez une alerte Telegram dès qu'un client soumet une commande d'invitations
                    payée par Mobile Money.
                  </p>

                  <div className="flex items-center justify-between py-3 border-b mb-4">
                    <p className="font-medium text-gray-900">Activer les notifications Telegram</p>
                    <label htmlFor="telegramEnabledToggle" className="relative inline-flex items-center cursor-pointer">
                      <input
                        id="telegramEnabledToggle"
                        type="checkbox"
                        className="sr-only peer"
                        checked={formData.telegramNotificationsEnabled}
                        onChange={(e) => updateField('telegramNotificationsEnabled', e.target.checked)}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label htmlFor="telegramBotToken" className="block text-sm font-medium text-gray-700 mb-1">
                        Bot Token
                      </label>
                      <input
                        id="telegramBotToken"
                        type="text"
                        className="input font-mono"
                        placeholder="123456789:ABC-DEF..."
                        value={formData.telegramBotToken}
                        onChange={(e) => updateField('telegramBotToken', e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor="telegramChatId" className="block text-sm font-medium text-gray-700 mb-1">
                        Chat ID
                      </label>
                      <input
                        id="telegramChatId"
                        type="text"
                        className="input font-mono"
                        placeholder="-1001234567890"
                        value={formData.telegramChatId}
                        onChange={(e) => updateField('telegramChatId', e.target.value)}
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => testTelegramMutation.mutate()}
                    disabled={testTelegramMutation.isLoading || !formData.telegramBotToken || !formData.telegramChatId}
                    className="btn-outline text-sm"
                  >
                    {testTelegramMutation.isLoading ? 'Envoi...' : 'Envoyer un test'}
                  </button>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-6 mt-6 border-t">
              <button
                type="submit"
                disabled={updateMutation.isLoading}
                className="btn-primary"
              >
                {updateMutation.isLoading ? 'Enregistrement...' : 'Enregistrer les paramètres'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
