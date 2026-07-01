import { useEffect, useState } from 'react';
import { useCreatorStore } from '../../stores/creatorStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { templateAPI } from '../../services/api';
import { confirmDialog } from '../../components/common/confirm';
import { formatMoney } from '../../utils/currency';
import { resolveAssetUrl } from '../../utils/assets';
import CreatorOnboarding from '../../components/CreatorOnboarding';
import TemplatePreview from '../../components/templates/TemplatePreview';
import toast from 'react-hot-toast';
import {
  SparklesIcon,
  ChartBarIcon,
  BanknotesIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckBadgeIcon,
  ArrowTrendingUpIcon,
  ClockIcon,
  WalletIcon,
  BuildingLibraryIcon,
  ArrowRightIcon,
  DocumentDuplicateIcon,
  UsersIcon,
  GlobeAltIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

const TABS = [
  { id: 'overview', label: 'Aperçu', icon: SparklesIcon },
  { id: 'templates', label: 'Mes Templates', icon: PlusIcon },
  { id: 'earnings', label: 'Gains', icon: ChartBarIcon },
  { id: 'payouts', label: 'Retraits', icon: BanknotesIcon },
];

function StatCard({ label, value, icon: Icon, accent = 'gray', hint }) {
  const accents = {
    primary: { text: 'text-primary-600', bg: 'bg-primary-50', ring: 'ring-primary-100' },
    amber: { text: 'text-amber-600', bg: 'bg-amber-50', ring: 'ring-amber-100' },
    emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50', ring: 'ring-emerald-100' },
    gray: { text: 'text-gray-900', bg: 'bg-gray-50', ring: 'ring-gray-100' },
  };
  const a = accents[accent] || accents.gray;
  return (
    <div className="group bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wide">{label}</p>
          <p className={`mt-2 text-2xl lg:text-3xl font-bold ${a.text} truncate`}>{value}</p>
          {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
        </div>
        <div className={`shrink-0 w-11 h-11 rounded-xl ${a.bg} ring-1 ${a.ring} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${a.text}`} />
        </div>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
        <div className="h-9 w-72 bg-gray-200 rounded-lg mb-3" />
        <div className="h-4 w-48 bg-gray-100 rounded mb-8" />
        <div className="h-12 w-full bg-gray-100 rounded-xl mb-8" />
        <div className="h-32 w-full bg-gray-100 rounded-2xl mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 bg-gray-100 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, refreshUser, updateUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const {
    creatorProfile,
    earnings,
    statistics,
    loading,
    error: creatorError,
    fetchCreatorProfile
  } = useCreatorStore();

  const { data: templatesData, refetch: refetchTemplates } = useQuery('creatorTemplates', templateAPI.getMyTemplates);
  const templates = templatesData?.data?.templates || [];

  const deleteTemplateMutation = useMutation(
    (templateId) => templateAPI.delete(templateId),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('creatorTemplates');
        toast.success('Template supprimé');
        refetchTemplates();
      },
      onError: (err) =>
        toast.error(err.response?.data?.message || 'Erreur lors de la suppression')
    }
  );

  const handleDeleteTemplate = async (templateId) => {
    const ok = await confirmDialog({
      title: 'Supprimer ce template',
      message: 'Êtes-vous sûr de vouloir supprimer ce template ?',
      confirmText: 'Supprimer'
    });
    if (!ok) return;
    deleteTemplateMutation.mutate(templateId);
  };

  const isCreator = user?.role === 'CREATOR' || user?.isCreator;

  useEffect(() => {
    if (!isCreator) {
      // Wait a moment then redirect
      const timer = setTimeout(() => {
        navigate('/dashboard');
      }, 2000);
      return () => clearTimeout(timer);
    }
    fetchCreatorProfile();
  }, [isCreator, navigate, fetchCreatorProfile]);

  const handleOnboardingSuccess = () => {
    updateUser({ isCreator: true });
    fetchCreatorProfile();
    setShowOnboarding(false);
  };

  if (!isCreator) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-primary-50 to-white px-4">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 ring-1 ring-primary-100 flex items-center justify-center mx-auto">
            <SparklesIcon className="w-8 h-8 text-primary-500" />
          </div>
          <p className="text-gray-900 font-semibold text-lg">Accès créateur requis</p>
          <p className="text-gray-600 text-sm">
            Vous n'êtes pas enregistré comme créateur. <br />
            L'administrateur doit activer votre rôle de créateur.
          </p>
          <p className="text-xs text-gray-500">
            Redirection vers le dashboard dans 2 secondes...
          </p>
          <button
            onClick={() => refreshUser()}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          >
            <ArrowPathIcon className="w-4 h-4" />
            Rafraîchir
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!creatorProfile && !loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-primary-50 to-white px-4">
        <div className="text-center space-y-5 max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-primary-50 ring-1 ring-primary-100 flex items-center justify-center mx-auto">
            <SparklesIcon className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-gray-900">Complétez votre profil créateur</h2>
          <p className="text-gray-600">
            Créez votre profil créateur pour commencer à partager vos templates et gagner des commissions.
          </p>
          <div className="space-y-2">
            <button
              onClick={() => setShowOnboarding(true)}
              className="w-full px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Créer mon profil créateur
            </button>
            <button
              onClick={() => refreshUser()}
              className="w-full px-6 py-3 border border-primary-200 text-primary-600 hover:bg-primary-50 rounded-xl font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Rafraîchir le profil
            </button>
          </div>
        </div>

        {/* Creator Onboarding Modal */}
        <CreatorOnboarding
          isOpen={showOnboarding}
          onClose={() => setShowOnboarding(false)}
          onSuccess={handleOnboardingSuccess}
        />
      </div>
    );
  }

  const totalEarnings = earnings.pending + earnings.approved + earnings.paid;
  const initials = (creatorProfile.displayName || '?')
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl lg:text-4xl font-serif font-bold text-gray-900">Tableau de Bord Créateur</h1>
          <p className="text-gray-600 mt-1">Gérez vos templates et vos gains</p>
        </div>

        {/* Tabs */}
        <div className="sticky top-16 z-20 -mx-4 px-4 bg-gradient-to-b from-primary-50/95 to-primary-50/80 backdrop-blur-sm">
          <div
            role="tablist"
            aria-label="Sections du tableau de bord"
            className="flex gap-1 border-b border-gray-200 mb-6 overflow-x-auto scrollbar-hide"
          >
            {TABS.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 lg:px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 -mb-px focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-400 focus-visible:ring-offset-1 rounded-t-md ${
                    active
                      ? 'text-primary-600 border-primary-600'
                      : 'text-gray-500 border-transparent hover:text-gray-900 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="animate-fade-in space-y-6">
          {/* Creator Profile Card */}
          <div className="relative overflow-hidden bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="h-20 bg-gradient-to-r from-primary-500 to-primary-700" />
            <div className="px-6 pb-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {creatorProfile.profileImage ? (
                  <img
                    src={resolveAssetUrl(creatorProfile.profileImage)}
                    alt={creatorProfile.displayName}
                    className="w-20 h-20 rounded-2xl object-cover ring-4 ring-white shadow-md shrink-0 -mt-14 sm:-mt-16"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-primary-100 ring-4 ring-white shadow-md flex items-center justify-center shrink-0 -mt-14 sm:-mt-16">
                    <span className="text-2xl font-bold text-primary-600">{initials}</span>
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl lg:text-2xl font-bold text-gray-900 truncate">{creatorProfile.displayName}</h2>
                    {creatorProfile.verificationStatus === 'VERIFIED' && (
                      <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full text-xs font-medium">
                        <CheckBadgeIcon className="w-4 h-4" />
                        Vérifié
                      </span>
                    )}
                  </div>
                  {creatorProfile.bio && (
                    <p className="text-gray-600 text-sm mt-1 line-clamp-2">{creatorProfile.bio}</p>
                  )}
                  {creatorProfile.website && (
                    <a
                      href={creatorProfile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-700 text-sm mt-1"
                    >
                      <GlobeAltIcon className="w-4 h-4" />
                      {creatorProfile.website}
                    </a>
                  )}
                </div>
                <button
                  onClick={() => navigate('/creator-settings')}
                  className="shrink-0 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-sm font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
                >
                  <PencilIcon className="w-4 h-4" />
                  Modifier Profil
                </button>
              </div>
            </div>
          </div>
          {/* Earnings Summary */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Vos gains</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Gains Totaux" value={formatMoney(totalEarnings)} icon={WalletIcon} accent="primary" />
              <StatCard label="En Attente" value={formatMoney(earnings.pending)} icon={ClockIcon} accent="amber" hint="En cours de validation" />
              <StatCard label="Disponible" value={formatMoney(earnings.approved)} icon={ArrowTrendingUpIcon} accent="emerald" hint="Prêt au retrait" />
              <StatCard label="Versé" value={formatMoney(earnings.paid)} icon={BanknotesIcon} accent="primary" />
            </div>
          </div>

          {/* Statistics */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Vos statistiques</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard label="Templates Publiés" value={statistics.templateCount} icon={DocumentDuplicateIcon} accent="gray" />
              <StatCard label="Utilisations Totales" value={statistics.totalUsages} icon={UsersIcon} accent="gray" />
              <StatCard label="Versements Totaux" value={statistics.totalPayouts} icon={BanknotesIcon} accent="gray" />
            </div>
          </div>
        </div>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6 animate-fade-in">
          {/* Create Template Button */}
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Mes Templates</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {templates.length} {templates.length > 1 ? 'templates' : 'template'}
              </p>
            </div>
            <button
              onClick={() => navigate('/creator-templates')}
              className="flex items-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              <PlusIcon className="w-5 h-5" />
              Créer un Template
            </button>
          </div>

          {/* Templates List */}
          {templates.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-primary-50 ring-1 ring-primary-100 flex items-center justify-center mx-auto mb-4">
                <SparklesIcon className="w-8 h-8 text-primary-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun Template Encore</h3>
              <p className="text-gray-600 mb-6 max-w-sm mx-auto">
                Dupliquez un template existant de la galerie pour créer votre propre design.
              </p>
              <button
                onClick={() => navigate('/creator-templates')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                <PlusIcon className="w-5 h-5" />
                Créer un Template
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group flex flex-col"
                >
                  {/* Template Preview */}
                  <div className="aspect-[3/4] bg-gray-100 overflow-hidden">
                    <TemplatePreview
                      template={template}
                      fit="cover"
                      className="group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  <div className="p-4 flex flex-col flex-1">
                    <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-1">{template.name}</h3>
                    <p className="text-gray-500 text-sm mb-4 line-clamp-2 flex-1">{template.description}</p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/templates/${template.id}/design?wedding=null`)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                        title="Modifier le template"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Designer
                      </button>
                      <button
                        onClick={() => navigate(`/templates/${template.id}/publish`)}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 border border-primary-200 text-primary-600 hover:bg-primary-50 rounded-lg text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
                        title="Publier sur la marketplace"
                      >
                        <SparklesIcon className="w-4 h-4" />
                        Publier
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        disabled={deleteTemplateMutation.isLoading}
                        className="px-2.5 py-2 border border-red-100 text-red-500 hover:bg-red-50 hover:border-red-200 rounded-lg transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-1"
                        title="Supprimer le template"
                        aria-label="Supprimer le template"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Earnings Tab */}
      {activeTab === 'earnings' && (
        <div className="animate-fade-in space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Gains Totaux" value={formatMoney(totalEarnings)} icon={WalletIcon} accent="primary" />
            <StatCard label="En Attente" value={formatMoney(earnings.pending)} icon={ClockIcon} accent="amber" />
            <StatCard label="Disponible" value={formatMoney(earnings.approved)} icon={ArrowTrendingUpIcon} accent="emerald" />
            <StatCard label="Versé" value={formatMoney(earnings.paid)} icon={BanknotesIcon} accent="primary" />
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8 flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="w-14 h-14 rounded-2xl bg-primary-50 ring-1 ring-primary-100 flex items-center justify-center shrink-0">
              <ChartBarIcon className="w-7 h-7 text-primary-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">Détail complet de vos gains</h3>
              <p className="text-gray-600 text-sm mt-1">
                Consultez vos graphiques et l'historique complet de vos transactions.
              </p>
            </div>
            <Link
              to="/creator-earnings"
              className="shrink-0 inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
            >
              Voir les Gains
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="space-y-5 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Bank Accounts Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-primary-50 ring-1 ring-primary-100 flex items-center justify-center mb-4">
                <BuildingLibraryIcon className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Comptes Bancaires</h3>
              <p className="text-sm text-gray-600 mt-1 mb-5 flex-1">Gérez vos comptes bancaires pour les retraits</p>
              <Link
                to="/creator-bank-accounts"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Gérer les Comptes
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>

            {/* Request Payout Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 ring-1 ring-emerald-100 flex items-center justify-center mb-4">
                <BanknotesIcon className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">Demander un Retrait</h3>
              <p className="text-sm text-gray-600 mt-1 mb-1">Retirez vos gains approuvés vers votre compte bancaire</p>
              <p className="text-sm font-semibold text-emerald-600 mb-5 flex-1">
                Disponible : {formatMoney(earnings.approved)}
              </p>
              <Link
                to="/creator-request-payout"
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-medium transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
              >
                Demander un Retrait
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Payout Process */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-5">Processus de Retrait</h3>
            <ol className="space-y-4">
              {[
                'Ajoutez et vérifiez votre compte bancaire',
                'Les gains approuvés deviennent disponibles (après activation du mariage)',
                'Demandez un retrait une fois le montant minimum atteint',
                "L'admin examine et traite votre demande (5-7 jours ouvrables)",
                'Les fonds sont transférés vers votre compte bancaire',
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="shrink-0 w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-sm font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      {/* Creator Onboarding Modal */}
      <CreatorOnboarding
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onSuccess={handleOnboardingSuccess}
      />
      </div>
    </div>
  );
}
