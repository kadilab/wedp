import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from 'react-query'
import { adminAPI } from '../../services/api'
import useSiteSettingsStore from '../../stores/siteSettingsStore'
import { confirmDialog } from '../../components/common/confirm'
import toast from 'react-hot-toast'
import {
  Cog6ToothIcon,
  EnvelopeIcon,
  CreditCardIcon,
  BanknotesIcon,
  BellIcon,
  PhotoIcon,
  TrashIcon,
  PlusIcon,
  BeakerIcon,
  BoltIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentIcon,
  CheckIcon,
  ChevronDownIcon,
  ArrowPathIcon,
  KeyIcon,
  LinkIcon,
  SignalIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline'

const KPAY_OPERATORS = [
  { code: 'VODACOM_MPESA_COD', label: 'Vodacom M-Pesa', logo: '/providers/mpesa.png' },
  { code: 'AIRTEL_COD', label: 'Airtel Money', logo: '/providers/airtel.png' },
  { code: 'ORANGE_COD', label: 'Orange Money', logo: '/providers/orange.png' }
]

// URLs to declare in the K-PAY dashboard (domain must be verified there).
const KPAY_URLS = [
  { label: 'Webhook générique', path: '/api/webhooks/kpay' },
  { label: 'Webhook dépôts (payment.*)', path: '/api/webhooks/deposits' },
  { label: 'Webhook retraits (payout.*)', path: '/api/webhooks/payouts' },
  { label: 'Webhook remboursements (refund.*)', path: '/api/webhooks/refunds' },
  { label: 'Notification paiements carte', path: '/api/kpay/cards' },
  { label: 'Retour client après paiement carte', path: '/paiement/retour' }
]

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
  invitationPricePerUnit: '0.3',
  creatorCommissionPercentage: '10',
  telegramBotToken: '',
  telegramChatId: '',
  telegramNotificationsEnabled: false,
  kpayEnabled: true,
  kpayMode: 'LIVE',
  kpayApiKey: '',
  kpaySecretKey: '',
  kpayWebhookSecret: '',
  kpayTestApiKey: '',
  kpayTestSecretKey: '',
  kpayTestWebhookSecret: '',
  kpayGatewaySecret: '',
  kpayCardEnabled: false,
  kpayDisabledProviders: '',
  kpayBaseUrl: '',
  kpayPriceCurrency: 'CDF',
  kpayAccountCurrency: 'CDF',
  kpayMinAmount: '50',
  enableEmailNotifications: true,
  enableAdminNotifications: true,
  printServiceEnabled: false,
  googleClientId: '',
  googleClientSecret: ''
}

const isTrue = (v) => v === true || v === 'true'

// Server settings (string values) → form state.
function formFromSettings(s) {
  return {
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
    invitationPricePerUnit: s.invitationPricePerUnit || DEFAULT_FORM.invitationPricePerUnit,
    creatorCommissionPercentage: s.creatorCommissionPercentage || DEFAULT_FORM.creatorCommissionPercentage,
    telegramBotToken: s.telegramBotToken || '',
    telegramChatId: s.telegramChatId || '',
    telegramNotificationsEnabled: isTrue(s.telegramNotificationsEnabled),
    kpayEnabled: s.kpayEnabled !== 'false' && s.kpayEnabled !== false,
    // Never saved yet → same inference as the backend (key prefix).
    kpayMode: s.kpayMode === 'TEST' || s.kpayMode === 'LIVE'
      ? s.kpayMode
      : (String(s.kpayApiKey || '').startsWith('kpay_test_') ? 'TEST' : 'LIVE'),
    kpayApiKey: s.kpayApiKey || '',
    kpaySecretKey: s.kpaySecretKey || '',
    kpayWebhookSecret: s.kpayWebhookSecret || '',
    kpayTestApiKey: s.kpayTestApiKey || '',
    kpayTestSecretKey: s.kpayTestSecretKey || '',
    kpayTestWebhookSecret: s.kpayTestWebhookSecret || '',
    kpayGatewaySecret: s.kpayGatewaySecret || '',
    kpayCardEnabled: isTrue(s.kpayCardEnabled),
    kpayDisabledProviders: s.kpayDisabledProviders || '',
    kpayBaseUrl: s.kpayBaseUrl || '',
    kpayPriceCurrency: s.kpayPriceCurrency || DEFAULT_FORM.kpayPriceCurrency,
    kpayAccountCurrency: s.kpayAccountCurrency || DEFAULT_FORM.kpayAccountCurrency,
    kpayMinAmount: s.kpayMinAmount || DEFAULT_FORM.kpayMinAmount,
    enableEmailNotifications: s.enableEmailNotifications !== 'false' && s.enableEmailNotifications !== false,
    enableAdminNotifications: s.enableAdminNotifications !== 'false' && s.enableAdminNotifications !== false,
    printServiceEnabled: isTrue(s.printServiceEnabled),
    googleClientId: s.googleClientId || '',
    googleClientSecret: s.googleClientSecret || ''
  }
}

// ---------------------------------------------------------------- UI pieces

function Toggle({ id, checked, onChange, disabled, label }) {
  return (
    <label htmlFor={id} className={`relative inline-flex items-center shrink-0 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
      <input
        id={id}
        type="checkbox"
        className="sr-only peer"
        checked={checked}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(e.target.checked)}
      />
      <div className="w-11 h-6 bg-gray-200 peer-focus-visible:ring-4 peer-focus-visible:ring-primary-200 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
    </label>
  )
}

function Section({ title, description, icon: Icon, children, aside }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      {(title || aside) && (
        <header className="flex items-start justify-between gap-4 px-5 sm:px-6 pt-5">
          <div className="flex items-start gap-3 min-w-0">
            {Icon && (
              <span className="h-9 w-9 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5" />
              </span>
            )}
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900">{title}</h3>
              {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
            </div>
          </div>
          {aside}
        </header>
      )}
      <div className="px-5 sm:px-6 py-5">{children}</div>
    </section>
  )
}

function Field({ id, label, hint, children, className = '' }) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}

// Row with a title/description on the left and a control (toggle) on the right.
function SettingRow({ title, description, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {description && <div className="text-xs text-gray-500 mt-0.5">{description}</div>}
      </div>
      {children}
    </div>
  )
}

// Secret value, masked by default with a show/hide button.
function SecretInput({ id, value, onChange, placeholder }) {
  const [visible, setVisible] = useState(false)
  return (
    <div className="relative">
      <input
        id={id}
        type={visible ? 'text' : 'password'}
        autoComplete="new-password"
        spellCheck={false}
        className="input font-mono pr-10"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setVisible(v => !v)}
        className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
        aria-label={visible ? 'Masquer' : 'Afficher'}
        title={visible ? 'Masquer' : 'Afficher'}
      >
        {visible ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}
      </button>
    </div>
  )
}

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Copie impossible — sélectionnez le texte manuellement')
    }
  }
  return (
    <div className="flex items-center gap-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="font-mono text-sm text-gray-800 truncate" title={value}>{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className={`shrink-0 inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${copied ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
      >
        {copied ? <><CheckIcon className="h-3.5 w-3.5" /> Copié</> : <><ClipboardDocumentIcon className="h-3.5 w-3.5" /> Copier</>}
      </button>
    </div>
  )
}

function Collapsible({ title, description, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="rounded-xl border border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left"
        aria-expanded={open}
      >
        <span>
          <span className="block text-sm font-semibold text-gray-800">{title}</span>
          {description && <span className="block text-xs text-gray-500 mt-0.5">{description}</span>}
        </span>
        <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

// ---------------------------------------------------------------- page

const TABS = [
  { id: 'general', label: 'Général', description: 'Identité, contact, connexion', icon: Cog6ToothIcon },
  { id: 'payment', label: 'Paiement en ligne', description: 'K-PAY : Mobile Money & carte', icon: CreditCardIcon },
  { id: 'manual', label: 'Paiement manuel', description: 'Tarifs & numéros affichés', icon: BanknotesIcon },
  { id: 'email', label: 'Email', description: 'Serveur SMTP', icon: EnvelopeIcon },
  { id: 'notifications', label: 'Notifications', description: 'Emails, alertes, Telegram', icon: BellIcon }
]

export default function AdminSettings() {
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState('general')
  const [formData, setFormData] = useState(DEFAULT_FORM)
  // Last saved state — used to detect unsaved changes.
  const [savedForm, setSavedForm] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)
  const [logoHeight, setLogoHeight] = useState(32)
  const [savedLogoHeight, setSavedLogoHeight] = useState(32)
  const logoInputRef = useRef(null)
  const { updateSiteName, updateSiteLogo, updateLogoHeight, updateContactInfo } = useSiteSettingsStore()

  const { data: settingsData, isLoading, isError, error: fetchError } = useQuery(
    'admin-settings',
    () => adminAPI.getSettings(),
    { retry: 1, refetchOnWindowFocus: false }
  )

  // Sync form state whenever settings load / are saved.
  useEffect(() => {
    const s = settingsData?.data?.settings
    if (!s) return
    const next = formFromSettings(s)
    setFormData(next)
    setSavedForm(next)
    if (s.siteLogo) setLogoPreview(s.siteLogo)
    const h = parseInt(s.logoHeight) || 32
    setLogoHeight(h)
    setSavedLogoHeight(h)
  }, [settingsData])

  const isDirty = Boolean(savedForm) &&
    (JSON.stringify(formData) !== JSON.stringify(savedForm) || logoHeight !== savedLogoHeight)

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (!isDirty) return
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [isDirty])

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }))

  const updateMutation = useMutation((data) => adminAPI.updateSettings(data), {
    onSuccess: () => {
      queryClient.invalidateQueries('admin-settings')
      queryClient.invalidateQueries('admin-kpay-overview')
      queryClient.invalidateQueries('payment-availability')
      updateSiteName(formData.siteName)
      updateLogoHeight(logoHeight)
      updateContactInfo(formData.contactEmail, formData.supportPhone)
      toast.success('Paramètres enregistrés')
    },
    onError: (err) => toast.error(err.response?.data?.error || err.response?.data?.message || 'Erreur lors de la sauvegarde')
  })

  const handleSubmit = (e) => {
    e?.preventDefault()
    updateMutation.mutate({ ...formData, logoHeight: String(logoHeight) })
  }

  const discardChanges = () => {
    if (savedForm) setFormData(savedForm)
    setLogoHeight(savedLogoHeight)
  }

  const testTelegramMutation = useMutation(
    () => adminAPI.testTelegram({ botToken: formData.telegramBotToken, chatId: formData.telegramChatId }),
    {
      onSuccess: (res) => toast.success(res.data.message || 'Test envoyé'),
      onError: (err) => toast.error(err.response?.data?.error || 'Échec du test Telegram')
    }
  )

  const {
    data: kpayOverviewData,
    refetch: refetchKpayOverview,
    isFetching: kpayOverviewFetching
  } = useQuery(
    'admin-kpay-overview',
    () => adminAPI.getKpayOverview(),
    { enabled: activeTab === 'payment', retry: 0, refetchOnWindowFocus: false }
  )
  const kpayOverview = kpayOverviewData?.data

  // TEST ⇄ PRODUCTION switch — saved immediately (only the kpayMode key). It
  // must NOT refetch the whole settings: that would wipe other unsaved edits.
  const kpayModeMutation = useMutation((mode) => adminAPI.updateSettings({ kpayMode: mode }), {
    onSuccess: (_res, mode) => {
      updateField('kpayMode', mode)
      setSavedForm(prev => (prev ? { ...prev, kpayMode: mode } : prev))
      refetchKpayOverview()
      queryClient.invalidateQueries('payment-availability')
      toast.success(mode === 'LIVE' ? 'K-PAY est maintenant en PRODUCTION (argent réel)' : 'K-PAY est maintenant en mode TEST (sandbox)')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Impossible de changer d\'environnement')
  })

  const switchKpayMode = async (mode) => {
    if (mode === formData.kpayMode || kpayModeMutation.isLoading) return
    const toLive = mode === 'LIVE'
    const hasKeys = toLive
      ? savedForm?.kpayApiKey && savedForm?.kpaySecretKey
      : savedForm?.kpayTestApiKey && savedForm?.kpayTestSecretKey
    const ok = await confirmDialog({
      title: toLive ? 'Passer en PRODUCTION ?' : 'Passer en mode TEST ?',
      message: (toLive
        ? 'Les clients paieront avec de l\'argent réel (clés kpay_live_).'
        : 'Les paiements passeront par la sandbox K-PAY (clés kpay_test_) : aucun argent réel ne sera encaissé. À ne pas laisser actif en production.') +
        (hasKeys ? '' : '\n\n⚠️ Aucune clé ' + (toLive ? 'de production' : 'de test') + ' enregistrée : les paiements échoueront tant que vous ne les aurez pas renseignées et enregistrées.'),
      confirmText: toLive ? 'Passer en production' : 'Passer en test',
      danger: toLive
    })
    if (ok) kpayModeMutation.mutate(mode)
  }

  const disabledProviders = formData.kpayDisabledProviders.split(',').map(p => p.trim()).filter(Boolean)
  const toggleDisabledProvider = (code) => {
    const next = disabledProviders.includes(code)
      ? disabledProviders.filter(p => p !== code)
      : [...disabledProviders, code]
    updateField('kpayDisabledProviders', next.join(','))
  }

  const unblockMutation = useMutation((provider) => adminAPI.unblockKpayProvider(provider), {
    onSuccess: () => {
      refetchKpayOverview()
      queryClient.invalidateQueries('payment-availability')
      toast.success('Opérateur réactivé')
    },
    onError: () => toast.error('Impossible de réactiver l\'opérateur')
  })

  const testKpay = async () => {
    const { data: res } = await refetchKpayOverview()
    const d = res?.data
    if (!d) return toast.error('Échec du test K-PAY')
    if (!d.configured) toast.error('K-PAY non configuré — enregistrez une clé API et une clé secrète d\'abord')
    else if (d.error) toast.error(d.error)
    else toast.success(`Connecté à K-PAY (${d.environment || 'environnement inconnu'})`)
  }

  // Logo changes are saved by their own endpoint; update local state only so
  // other unsaved edits on the page are kept.
  const logoUploadMutation = useMutation((file) => adminAPI.uploadSettingsLogo(file), {
    onSuccess: (res) => {
      const url = res.data.logoUrl
      setLogoPreview(url)
      updateSiteLogo(url)
      toast.success('Logo mis à jour')
    },
    onError: (err) => toast.error(err.response?.data?.error || 'Erreur lors de l\'upload du logo')
  })

  const logoDeleteMutation = useMutation(() => adminAPI.deleteSettingsLogo(), {
    onSuccess: () => {
      setLogoPreview(null)
      updateSiteLogo(null)
      if (logoInputRef.current) logoInputRef.current.value = ''
      toast.success('Logo supprimé')
    },
    onError: () => toast.error('Erreur lors de la suppression du logo')
  })

  const addInvitationPaymentMethod = () =>
    setFormData(prev => ({
      ...prev,
      invitationPaymentMethods: [...prev.invitationPaymentMethods, { provider: '', number: '', instructions: '', logo: '' }]
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

  const uploadPaymentLogo = async (index, file) => {
    if (!file) return
    try {
      const res = await adminAPI.uploadPaymentLogo(file)
      updateInvitationPaymentMethod(index, 'logo', res.data.logoUrl)
      toast.success('Logo ajouté — pensez à enregistrer')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'upload du logo')
    }
  }

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
        <p className="text-red-600 font-medium">Erreur lors du chargement des paramètres</p>
        <p className="text-sm text-gray-500">{fetchError?.response?.data?.error || fetchError?.message || 'Erreur serveur'}</p>
        <button onClick={() => queryClient.invalidateQueries('admin-settings')} className="btn-primary text-sm">
          Réessayer
        </button>
      </div>
    )
  }

  const isLive = formData.kpayMode === 'LIVE'
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const kpayStatus = !kpayOverview
    ? { tone: 'gray', label: kpayOverviewFetching ? 'Vérification…' : 'Non vérifié' }
    : !formData.kpayEnabled
      ? { tone: 'gray', label: 'Désactivé' }
      : !kpayOverview.configured
        ? { tone: 'amber', label: `Clés ${isLive ? 'de production' : 'de test'} manquantes` }
        : kpayOverview.error
          ? { tone: 'red', label: 'Erreur de connexion' }
          : { tone: 'green', label: 'Connecté' }
  const toneClass = {
    gray: 'bg-gray-100 text-gray-600',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-700',
    green: 'bg-green-100 text-green-700'
  }[kpayStatus.tone]

  const keyGroup = (mode) => {
    const live = mode === 'LIVE'
    const f = live
      ? { api: 'kpayApiKey', secret: 'kpaySecretKey', webhook: 'kpayWebhookSecret', prefix: 'kpay_live_' }
      : { api: 'kpayTestApiKey', secret: 'kpayTestSecretKey', webhook: 'kpayTestWebhookSecret', prefix: 'kpay_test_' }
    const apiVal = formData[f.api]
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field id={f.api} label="Clé API">
          <input
            id={f.api}
            type="text"
            autoComplete="off"
            spellCheck={false}
            className="input font-mono"
            placeholder={`${f.prefix}...`}
            value={apiVal}
            onChange={(e) => updateField(f.api, e.target.value)}
          />
          {apiVal && !apiVal.trim().startsWith(f.prefix) && (
            <p className="text-xs text-amber-600 mt-1">Cette clé ne commence pas par « {f.prefix} ».</p>
          )}
        </Field>
        <Field id={f.secret} label="Clé secrète">
          <SecretInput id={f.secret} value={formData[f.secret]} onChange={(v) => updateField(f.secret, v)} placeholder="Depuis le dashboard K-PAY" />
        </Field>
        <Field id={f.webhook} label="Secret webhook">
          <SecretInput id={f.webhook} value={formData[f.webhook]} onChange={(v) => updateField(f.webhook, v)} placeholder="Signature X-KPAY-Signature" />
        </Field>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 mt-1">Configuration de la plateforme</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
        {/* Navigation — sidebar on desktop, scrollable pills on mobile */}
        <nav className="lg:sticky lg:top-6" aria-label="Sections des paramètres">
          <div className="flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1 lg:bg-white lg:rounded-2xl lg:border lg:border-gray-100 lg:shadow-sm lg:p-2">
            {TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={active ? 'page' : undefined}
                  className={`shrink-0 flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                    active ? 'bg-primary-50 text-primary-700' : 'bg-white lg:bg-transparent text-gray-600 hover:bg-gray-50 border border-gray-100 lg:border-0'
                  }`}
                >
                  <tab.icon className="h-5 w-5 shrink-0" />
                  <span className="min-w-0">
                    <span className={`block text-sm whitespace-nowrap ${active ? 'font-semibold' : 'font-medium'}`}>{tab.label}</span>
                    <span className="hidden lg:block text-xs text-gray-400 truncate">{tab.description}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </nav>

        <form onSubmit={handleSubmit} className="space-y-6 min-w-0">
          {/* ============================== GENERAL */}
          {activeTab === 'general' && (
            <>
              <Section title="Identité du site" description="Nom, logo et description affichés sur tout le site, les PDF et les emails." icon={Cog6ToothIcon}>
                <div className="space-y-5">
                  <Field id="siteName" label="Nom du site">
                    <input id="siteName" type="text" className="input" value={formData.siteName} onChange={(e) => updateField('siteName', e.target.value)} />
                  </Field>

                  <div>
                    <p className="block text-sm font-medium text-gray-700 mb-2">Logo</p>
                    <div className="flex items-center gap-4">
                      {logoPreview ? (
                        <div className="relative group shrink-0">
                          <img src={logoPreview} alt="Logo du site" className="h-20 w-20 object-contain rounded-xl border border-gray-200 bg-white p-1" />
                          <button
                            type="button"
                            onClick={() => logoDeleteMutation.mutate()}
                            disabled={logoDeleteMutation.isLoading}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity hover:bg-red-600"
                            title="Supprimer le logo"
                            aria-label="Supprimer le logo"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="h-20 w-20 shrink-0 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gray-50">
                          <PhotoIcon className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                      <div>
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
                        <button type="button" onClick={() => logoInputRef.current?.click()} disabled={logoUploadMutation.isLoading} className="btn-outline text-sm">
                          {logoUploadMutation.isLoading ? 'Envoi…' : logoPreview ? 'Changer le logo' : 'Choisir un logo'}
                        </button>
                        <p className="text-xs text-gray-500 mt-2">PNG, JPG, SVG ou WebP. Fond transparent recommandé. Enregistré immédiatement.</p>
                      </div>
                    </div>

                    {logoPreview && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <label htmlFor="logoHeight" className="text-sm font-medium text-gray-700">Taille du logo</label>
                          <span className="text-sm font-mono text-gray-500 bg-white px-2 py-0.5 rounded border">{logoHeight}px</span>
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
                        <div className="mt-4 flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                          <img src={logoPreview} alt="Aperçu logo" style={{ height: `${logoHeight}px` }} className="object-contain" />
                          <span className="text-sm font-serif font-bold text-gray-900 truncate">{formData.siteName}</span>
                        </div>
                        <p className="text-xs text-gray-400 mt-2 text-center">Aperçu en taille réelle</p>
                      </div>
                    )}
                  </div>

                  <Field id="siteDescription" label="Description">
                    <textarea id="siteDescription" className="input" rows="3" value={formData.siteDescription} onChange={(e) => updateField('siteDescription', e.target.value)} />
                  </Field>
                </div>
              </Section>

              <Section title="Contact" description="Affichés publiquement dans la section Contact de la page d'accueil." icon={EnvelopeIcon}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field id="contactEmail" label="Email de contact">
                    <input id="contactEmail" type="email" className="input" placeholder="contact@winvite.pro" value={formData.contactEmail} onChange={(e) => updateField('contactEmail', e.target.value)} />
                  </Field>
                  <Field id="supportPhone" label="Téléphone support">
                    <input id="supportPhone" type="tel" className="input" placeholder="+243 81 234 5678" value={formData.supportPhone} onChange={(e) => updateField('supportPhone', e.target.value)} />
                  </Field>
                </div>
              </Section>

              <Section title="Fonctionnalités">
                <SettingRow
                  title="Commande d'impression pour les clients"
                  description="Désactivé : les clients téléchargent toujours leurs fichiers d'impression, mais le bouton « Commander l'impression chez nous » est masqué."
                >
                  <Toggle id="printServiceToggle" label="Service d'impression" checked={formData.printServiceEnabled} onChange={(v) => updateField('printServiceEnabled', v)} />
                </SettingRow>
              </Section>

              <Section
                title="Connexion avec Google"
                description="Identifiants OAuth du bouton « Continuer avec Google ». Le Client ID doit être autorisé pour ton domaine dans Google Cloud Console (Origines JavaScript autorisées)."
                icon={KeyIcon}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field id="googleClientId" label="Client ID" hint="Valeur publique, envoyée au navigateur.">
                    <input id="googleClientId" type="text" autoComplete="off" className="input font-mono" placeholder="xxxxxxxxxx.apps.googleusercontent.com" value={formData.googleClientId} onChange={(e) => updateField('googleClientId', e.target.value)} />
                  </Field>
                  <Field id="googleClientSecret" label="Client Secret" hint="Non utilisé par le flux actuel.">
                    <SecretInput id="googleClientSecret" value={formData.googleClientSecret} onChange={(v) => updateField('googleClientSecret', v)} placeholder="GOCSPX-..." />
                  </Field>
                </div>
              </Section>
            </>
          )}

          {/* ============================== PAYMENT (K-PAY) */}
          {activeTab === 'payment' && (
            <>
              {/* Status + environment */}
              <section className={`rounded-2xl border-2 shadow-sm overflow-hidden ${isLive ? 'border-emerald-200' : 'border-amber-300'}`}>
                <div className={`px-5 sm:px-6 py-5 ${isLive ? 'bg-gradient-to-br from-emerald-50 to-white' : 'bg-gradient-to-br from-amber-50 to-white'}`}>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-lg font-semibold text-gray-900">K-PAY</h3>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${toneClass}`}>
                          <SignalIcon className="h-3.5 w-3.5" /> {kpayStatus.label}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        {isLive
                          ? 'Production : les clients paient avec de l\'argent réel.'
                          : 'Mode test (sandbox) : aucun argent réel n\'est encaissé. À ne pas laisser actif en production.'}
                      </p>
                      {kpayOverview?.error && (
                        <p className="text-sm text-red-600 mt-1 flex items-start gap-1.5">
                          <ExclamationTriangleIcon className="h-4 w-4 mt-0.5 shrink-0" /> {kpayOverview.error}
                        </p>
                      )}
                      {kpayOverview?.balances?.length > 0 && (
                        <p className="text-sm text-gray-700 mt-2">
                          Solde disponible :{' '}
                          {kpayOverview.balances.map((b) => (
                            <strong key={b.currency} className="mr-3">{b.availableBalance.toLocaleString('fr-FR')} {b.currency}</strong>
                          ))}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-stretch md:items-end gap-2 shrink-0">
                      <div className="inline-flex rounded-xl bg-white p-1 shadow-sm border border-gray-200" role="radiogroup" aria-label="Environnement K-PAY">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={!isLive}
                          onClick={() => switchKpayMode('TEST')}
                          disabled={kpayModeMutation.isLoading}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${!isLive ? 'bg-amber-500 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          <BeakerIcon className="h-4 w-4" /> Test (dev)
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={isLive}
                          onClick={() => switchKpayMode('LIVE')}
                          disabled={kpayModeMutation.isLoading}
                          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition ${isLive ? 'bg-emerald-600 text-white shadow' : 'text-gray-600 hover:bg-gray-50'}`}
                        >
                          <BoltIcon className="h-4 w-4" /> Production
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={testKpay}
                        disabled={kpayOverviewFetching}
                        className="inline-flex items-center justify-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
                      >
                        <ArrowPathIcon className={`h-4 w-4 ${kpayOverviewFetching ? 'animate-spin' : ''}`} />
                        Tester la connexion
                      </button>
                    </div>
                  </div>
                </div>
                <div className="bg-white px-5 sm:px-6 py-4 border-t border-gray-100">
                  <SettingRow
                    title="Paiements automatiques K-PAY"
                    description="Désactivé : aucun paiement en ligne n'est proposé aux clients."
                  >
                    <Toggle id="kpayEnabledToggle" label="Activer K-PAY" checked={formData.kpayEnabled} onChange={(v) => updateField('kpayEnabled', v)} />
                  </SettingRow>
                </div>
              </section>

              {/* Methods offered */}
              <Section
                title="Moyens de paiement proposés"
                description="Ce que le client peut choisir dans la fenêtre de paiement."
                icon={CreditCardIcon}
              >
                <div className="divide-y divide-gray-100">
                  <SettingRow
                    title={<span className="flex items-center gap-2">Carte Visa / Mastercard <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600">USD</span></span>}
                    description="Page de paiement sécurisée K-PAY. Faites un petit paiement réel avant de l'ouvrir au public."
                  >
                    <Toggle id="kpayCardToggle" label="Paiement par carte" checked={formData.kpayCardEnabled} onChange={(v) => updateField('kpayCardEnabled', v)} />
                  </SettingRow>
                  {KPAY_OPERATORS.map((op) => {
                    const off = disabledProviders.includes(op.code)
                    const blocked = kpayOverview?.blocklist?.[op.code]
                    return (
                      <SettingRow
                        key={op.code}
                        title={
                          <span className="flex items-center gap-2">
                            <img src={op.logo} alt="" className={`h-6 w-6 object-contain ${off ? 'grayscale opacity-50' : ''}`} />
                            {op.label}
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-600">FC</span>
                          </span>
                        }
                        description={
                          blocked ? (
                            <span className="text-red-600">
                              Bloqué automatiquement jusqu'à {new Date(blocked.blockedUntil).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} — {blocked.reason}{' '}
                              <button
                                type="button"
                                onClick={() => unblockMutation.mutate(op.code)}
                                disabled={unblockMutation.isLoading}
                                className="font-medium text-primary-700 underline hover:text-primary-900"
                              >
                                Débloquer
                              </button>
                            </span>
                          ) : off ? 'Désactivé manuellement — masqué aux clients.' : 'Mobile Money, proposé aux clients.'
                        }
                      >
                        <Toggle id={`op-${op.code}`} label={`Proposer ${op.label}`} checked={!off} onChange={() => toggleDisabledProvider(op.code)} />
                      </SettingRow>
                    )
                  })}
                </div>
              </Section>

              {/* API keys */}
              <Section
                title="Clés API"
                description="Le bouton Test / Production ci-dessus choisit lequel des deux jeux de clés est utilisé."
                icon={KeyIcon}
              >
                <div className="space-y-4">
                  <div className={`rounded-xl border p-4 ${isLive ? 'border-emerald-200 bg-emerald-50/30' : 'border-amber-200 bg-amber-50/30'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-800">
                        {isLive ? 'Clés de production (kpay_live_)' : 'Clés de test (kpay_test_)'}
                      </h4>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full bg-white text-gray-700 border">
                        <CheckCircleIcon className="h-3.5 w-3.5 text-green-600" /> Utilisées
                      </span>
                    </div>
                    {keyGroup(formData.kpayMode)}
                  </div>
                  <Collapsible
                    title={isLive ? 'Clés de test (kpay_test_)' : 'Clés de production (kpay_live_)'}
                    description="Non utilisées tant que vous ne changez pas d'environnement."
                  >
                    {keyGroup(isLive ? 'TEST' : 'LIVE')}
                  </Collapsible>
                </div>
              </Section>

              {/* URLs for the KPay dashboard */}
              <Section
                title="URLs à déclarer chez K-PAY"
                description="À copier dans le tableau de bord K-PAY (le domaine doit y être vérifié)."
                icon={LinkIcon}
              >
                <div className="divide-y divide-gray-100">
                  {KPAY_URLS.map((u) => <CopyRow key={u.path} label={u.label} value={`${origin}${u.path}`} />)}
                </div>
              </Section>

              <Collapsible title="Paramètres avancés" description="URL de l'API, devises, montant minimum, signature du retour carte.">
                <div className="space-y-4 pt-1">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field id="kpayBaseUrl" label="URL de l'API" hint="Même URL en test et en production : c'est le préfixe de la clé qui choisit l'environnement.">
                      <input id="kpayBaseUrl" type="text" className="input font-mono" placeholder="https://admin.kpay.site" value={formData.kpayBaseUrl} onChange={(e) => updateField('kpayBaseUrl', e.target.value)} />
                    </Field>
                    <Field id="kpayGatewaySecret" label="Secret de la page de paiement (optionnel)" hint="Vérifie le retour client après un paiement par carte. Par défaut : le secret webhook.">
                      <SecretInput id="kpayGatewaySecret" value={formData.kpayGatewaySecret} onChange={(v) => updateField('kpayGatewaySecret', v)} placeholder="Par défaut : le secret webhook" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Field id="kpayPriceCurrency" label="Devise des prix" hint="Devise dans laquelle les prix sont saisis.">
                      <input id="kpayPriceCurrency" type="text" maxLength={3} className="input font-mono uppercase" placeholder="CDF" value={formData.kpayPriceCurrency} onChange={(e) => updateField('kpayPriceCurrency', e.target.value.toUpperCase())} />
                    </Field>
                    <Field id="kpayAccountCurrency" label="Devise du compte K-PAY" hint="Devise débitée en Mobile Money.">
                      <input id="kpayAccountCurrency" type="text" maxLength={3} className="input font-mono uppercase" placeholder="CDF" value={formData.kpayAccountCurrency} onChange={(e) => updateField('kpayAccountCurrency', e.target.value.toUpperCase())} />
                    </Field>
                    <Field id="kpayMinAmount" label="Montant minimum" hint="Plancher en Mobile Money.">
                      <input id="kpayMinAmount" type="number" min="0" step="1" className="input" placeholder="50" value={formData.kpayMinAmount} onChange={(e) => updateField('kpayMinAmount', e.target.value)} />
                    </Field>
                  </div>
                </div>
              </Collapsible>
            </>
          )}

          {/* ============================== MANUAL PAYMENT */}
          {activeTab === 'manual' && (
            <>
              <Section title="Tarification des invitations" icon={BanknotesIcon}>
                <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                  Le <strong>prix par invitation est défini par design</strong> (sur chaque template), et non
                  globalement. Modifiez-le dans le catalogue des templates, ou lors de la validation d'un
                  template créateur dans la marketplace.
                </div>
              </Section>

              <Section
                title="Moyens de paiement manuels"
                description="Numéros affichés au client qui paie par transfert puis soumet son numéro de transaction."
                icon={BanknotesIcon}
                aside={
                  <button type="button" onClick={addInvitationPaymentMethod} className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 font-medium shrink-0">
                    <PlusIcon className="h-4 w-4 mr-1" /> Ajouter
                  </button>
                }
              >
                {formData.invitationPaymentMethods.length === 0 ? (
                  <button
                    type="button"
                    onClick={addInvitationPaymentMethod}
                    className="w-full rounded-xl border-2 border-dashed border-gray-200 py-8 text-sm text-gray-500 hover:border-primary-300 hover:text-primary-700 transition"
                  >
                    Aucun moyen de paiement manuel — cliquez pour en ajouter un
                  </button>
                ) : (
                  <div className="space-y-3">
                    {formData.invitationPaymentMethods.map((method, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-[auto_1fr_1fr_1fr_auto] gap-2 items-start">
                          <div className="flex flex-col items-center gap-1">
                            <label className="w-14 h-14 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer bg-white hover:border-primary-400 overflow-hidden" title="Logo du moyen de paiement">
                              {method.logo ? <img src={method.logo} alt={method.provider} className="w-full h-full object-contain" /> : <PhotoIcon className="h-6 w-6 text-gray-300" />}
                              <input type="file" accept="image/*" className="hidden" onChange={(e) => uploadPaymentLogo(index, e.target.files?.[0])} />
                            </label>
                            {method.logo && (
                              <button type="button" onClick={() => updateInvitationPaymentMethod(index, 'logo', '')} className="text-[10px] text-red-500 hover:text-red-700">Retirer</button>
                            )}
                          </div>
                          <input type="text" className="input" placeholder="Ex : Orange Money" aria-label="Nom" value={method.provider} onChange={(e) => updateInvitationPaymentMethod(index, 'provider', e.target.value)} />
                          <input type="text" className="input" placeholder="Numéro (+243 …)" aria-label="Numéro" value={method.number} onChange={(e) => updateInvitationPaymentMethod(index, 'number', e.target.value)} />
                          <input type="text" className="input" placeholder="Instructions (optionnel)" aria-label="Instructions" value={method.instructions} onChange={(e) => updateInvitationPaymentMethod(index, 'instructions', e.target.value)} />
                          <button type="button" onClick={() => removeInvitationPaymentMethod(index)} className="flex items-center justify-center text-red-500 hover:text-red-700 px-2 h-10" title="Supprimer" aria-label="Supprimer">
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Section>
            </>
          )}

          {/* ============================== EMAIL */}
          {activeTab === 'email' && (
            <Section title="Serveur SMTP" description="Utilisé pour les emails de confirmation, reçus et réinitialisation de mot de passe." icon={EnvelopeIcon}>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-[1fr_140px] gap-4">
                  <Field id="smtpHost" label="Serveur SMTP">
                    <input id="smtpHost" type="text" className="input" placeholder="smtp.example.com" value={formData.smtpHost} onChange={(e) => updateField('smtpHost', e.target.value)} />
                  </Field>
                  <Field id="smtpPort" label="Port">
                    <input id="smtpPort" type="text" inputMode="numeric" className="input" placeholder="587" value={formData.smtpPort} onChange={(e) => updateField('smtpPort', e.target.value)} />
                  </Field>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field id="smtpUser" label="Utilisateur">
                    <input id="smtpUser" type="text" autoComplete="off" className="input" value={formData.smtpUser} onChange={(e) => updateField('smtpUser', e.target.value)} />
                  </Field>
                  <Field id="smtpPassword" label="Mot de passe">
                    <SecretInput id="smtpPassword" value={formData.smtpPassword} onChange={(v) => updateField('smtpPassword', v)} />
                  </Field>
                </div>
                <Field id="emailFrom" label="Email d'expéditeur">
                  <input id="emailFrom" type="email" className="input" placeholder="noreply@winvite.pro" value={formData.emailFrom} onChange={(e) => updateField('emailFrom', e.target.value)} />
                </Field>
              </div>
            </Section>
          )}

          {/* ============================== NOTIFICATIONS */}
          {activeTab === 'notifications' && (
            <>
              <Section title="Préférences de notification" icon={BellIcon}>
                <div className="divide-y divide-gray-100">
                  <SettingRow title="Emails aux utilisateurs" description="Emails de confirmation et de suivi.">
                    <Toggle id="emailNotifToggle" label="Emails aux utilisateurs" checked={formData.enableEmailNotifications} onChange={(v) => updateField('enableEmailNotifications', v)} />
                  </SettingRow>
                  <SettingRow title="Notifications admin" description="Alertes pour les nouveaux paiements et inscriptions.">
                    <Toggle id="adminNotifToggle" label="Notifications admin" checked={formData.enableAdminNotifications} onChange={(v) => updateField('enableAdminNotifications', v)} />
                  </SettingRow>
                </div>
              </Section>

              <Section
                title="Bot Telegram"
                description="Alerte Telegram dès qu'un client soumet une commande d'invitations."
                icon={BellIcon}
                aside={<Toggle id="telegramEnabledToggle" label="Activer Telegram" checked={formData.telegramNotificationsEnabled} onChange={(v) => updateField('telegramNotificationsEnabled', v)} />}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <Field id="telegramBotToken" label="Bot Token">
                    <SecretInput id="telegramBotToken" value={formData.telegramBotToken} onChange={(v) => updateField('telegramBotToken', v)} placeholder="123456789:ABC-DEF..." />
                  </Field>
                  <Field id="telegramChatId" label="Chat ID">
                    <input id="telegramChatId" type="text" className="input font-mono" placeholder="-1001234567890" value={formData.telegramChatId} onChange={(e) => updateField('telegramChatId', e.target.value)} />
                  </Field>
                </div>
                <button
                  type="button"
                  onClick={() => testTelegramMutation.mutate()}
                  disabled={testTelegramMutation.isLoading || !formData.telegramBotToken || !formData.telegramChatId}
                  className="btn-outline text-sm"
                >
                  {testTelegramMutation.isLoading ? 'Envoi…' : 'Envoyer un test'}
                </button>
              </Section>
            </>
          )}

          {/* Sticky save bar — always reachable, and loud when something is unsaved */}
          <div className="sticky bottom-4 z-20">
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-lg transition-colors ${
              isDirty ? 'bg-gray-900 border-gray-900 text-white' : 'bg-white/95 backdrop-blur border-gray-200 text-gray-500'
            }`}>
              <p className="text-sm flex items-center gap-2">
                {isDirty
                  ? <><span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" /> Modifications non enregistrées</>
                  : <><CheckCircleIcon className="h-4 w-4 text-green-600" /> Tous les paramètres sont enregistrés</>}
              </p>
              <div className="flex gap-2">
                {isDirty && (
                  <button type="button" onClick={discardChanges} className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10">
                    Annuler
                  </button>
                )}
                <button type="submit" disabled={!isDirty || updateMutation.isLoading} className="btn-primary text-sm disabled:opacity-50">
                  {updateMutation.isLoading ? 'Enregistrement…' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
