import { useEffect, useState } from 'react';
import { useCreatorStore } from '../../stores/creatorStore';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { templateAPI } from '../../services/api';
import {
  SparklesIcon,
  ChartBarIcon,
  BanknotesIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon
} from '@heroicons/react/24/outline';

export default function CreatorDashboard() {
  const navigate = useNavigate();
  const { user, refreshUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');
  const {
    creatorProfile,
    earnings,
    statistics,
    loading,
    fetchCreatorProfile
  } = useCreatorStore();

  const { data: templatesData } = useQuery('creatorTemplates', templateAPI.getMyTemplates);
  const templates = templatesData?.data?.templates || [];

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

  if (!isCreator) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-primary-50 to-white">
        <div className="text-center space-y-4">
          <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto" />
          <p className="text-gray-900 font-semibold">Accès créateur requis</p>
          <p className="text-gray-600 text-sm">
            Vous n'êtes pas enregistré comme créateur. <br />
            L'administrateur doit activer votre rôle de créateur.
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Redirection vers le dashboard dans 2 secondes...
          </p>
          <button
            onClick={() => refreshUser()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors text-sm mt-4"
          >
            Rafraîchir
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Chargement du profil créateur...</p>
      </div>
    );
  }

  if (!creatorProfile) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-600">Profil créateur non trouvé</p>
      </div>
    );
  }

  const totalEarnings = earnings.pending + earnings.approved + earnings.paid;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-serif font-bold text-gray-900 mb-2">Tableau de Bord Créateur</h1>
          <p className="text-gray-600">Gérez vos templates et vos gains</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b-2 border-gray-200 mb-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-6 py-3 font-medium whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 -mb-0.5 ${
              activeTab === 'overview'
                ? 'text-primary-600 border-primary-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <SparklesIcon className="w-5 h-5" />
            Aperçu
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-6 py-3 font-medium whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 -mb-0.5 ${
              activeTab === 'templates'
                ? 'text-primary-600 border-primary-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <PlusIcon className="w-5 h-5" />
            Mes Templates
          </button>
          <button
            onClick={() => setActiveTab('earnings')}
            className={`px-6 py-3 font-medium whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 -mb-0.5 ${
              activeTab === 'earnings'
                ? 'text-primary-600 border-primary-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <ChartBarIcon className="w-5 h-5" />
            Gains
          </button>
          <button
            onClick={() => setActiveTab('payouts')}
            className={`px-6 py-3 font-medium whitespace-nowrap transition-colors flex items-center gap-2 border-b-2 -mb-0.5 ${
              activeTab === 'payouts'
                ? 'text-primary-600 border-primary-600'
                : 'text-gray-600 border-transparent hover:text-gray-900'
            }`}
          >
            <BanknotesIcon className="w-5 h-5" />
            Retraits
          </button>
        </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <>
          {/* Creator Profile Card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex gap-6 items-start">
              {creatorProfile.profileImage && (
                <img
                  src={creatorProfile.profileImage}
                  alt={creatorProfile.displayName}
                  className="w-20 h-20 rounded-full object-cover"
                />
              )}

              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-gray-900">{creatorProfile.displayName}</h2>
                  {creatorProfile.verificationStatus === 'VERIFIED' && (
                    <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-medium">
                      Vérifié
                    </span>
                  )}
                </div>
                {creatorProfile.bio && (
                  <p className="text-gray-600 mb-2">{creatorProfile.bio}</p>
                )}
                {creatorProfile.website && (
                  <a
                    href={creatorProfile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-600 hover:text-primary-700 text-sm"
                  >
                    {creatorProfile.website}
                  </a>
                )}
              </div>

              <button
                onClick={() => navigate('/creator-settings')}
                className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                Modifier Profil
              </button>
            </div>
          </div>

          {/* Earnings Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">Gains Totaux</p>
              <p className="text-3xl font-bold text-primary-600">${totalEarnings.toFixed(2)}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">En Attente</p>
              <p className="text-3xl font-bold text-amber-600">${earnings.pending.toFixed(2)}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">Disponible</p>
              <p className="text-3xl font-bold text-emerald-600">${earnings.approved.toFixed(2)}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">Versé</p>
              <p className="text-3xl font-bold text-primary-600">${earnings.paid.toFixed(2)}</p>
            </div>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">Templates Publiés</p>
              <p className="text-3xl font-bold text-gray-900">{statistics.templateCount}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">Utilisations Totales</p>
              <p className="text-3xl font-bold text-gray-900">{statistics.totalUsages}</p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <p className="text-gray-600 text-sm font-medium mb-2">Versements Totaux</p>
              <p className="text-3xl font-bold text-gray-900">{statistics.totalPayouts}</p>
            </div>
          </div>
        </>
      )}

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Create Template Button */}
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold text-gray-900">Mes Templates</h2>
            <button
              onClick={() => navigate('/templates')}
              className="flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Créer un Template
            </button>
          </div>

          {/* Templates List */}
          {templates.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucun Template Encore</h3>
              <p className="text-gray-600 mb-6">
                Dupliquez un template existant de la galerie pour créer votre propre design.
              </p>
              <button
                onClick={() => navigate('/templates')}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Voir les Templates
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {template.config?.previewImage && (
                    <img
                      src={template.config.previewImage}
                      alt={template.name}
                      className="w-full h-40 object-cover"
                    />
                  )}
                  <div className="p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{template.name}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">{template.description}</p>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/templates/${template.id}/design?wedding=null`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
                      >
                        <PencilIcon className="w-4 h-4" />
                        Designer
                      </button>
                      <button
                        onClick={() => navigate(`/templates/${template.id}/publish`)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-primary-600 text-primary-600 hover:bg-primary-50 rounded-lg font-medium transition-colors"
                      >
                        <SparklesIcon className="w-4 h-4" />
                        Publier
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
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <p className="text-gray-600 mb-6">
            Cliquez sur le bouton ci-dessous pour voir un détail complet de vos gains avec des graphiques et l'historique des transactions.
          </p>
          <Link to="/creator-earnings">
            <button className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors">
              Voir les Gains Détaillés
            </button>
          </Link>
        </div>
      )}

      {/* Payouts Tab */}
      {activeTab === 'payouts' && (
        <div className="space-y-6">
          {/* Bank Accounts Section */}
          <div className="bg-white rounded-lg shadow-sm border-l-4 border-primary-600 border p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Comptes Bancaires</h3>
                <p className="text-sm text-gray-600 mt-1">Gérez vos comptes bancaires pour les retraits</p>
              </div>
            </div>
            <Link to="/creator-bank-accounts">
              <button className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors">
                Gérer les Comptes Bancaires
              </button>
            </Link>
          </div>

          {/* Request Payout Section */}
          <div className="bg-white rounded-lg shadow-sm border-l-4 border-emerald-600 border p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Demander un Retrait</h3>
                <p className="text-sm text-gray-600 mt-1">Retirez vos gains approuvés vers votre compte bancaire</p>
              </div>
            </div>
            <Link to="/creator-request-payout">
              <button className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-colors">
                Demander un Retrait
              </button>
            </Link>
          </div>

          {/* Payout Process */}
          <div className="bg-primary-50 border border-primary-200 rounded-lg p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Processus de Retrait</h3>
            <ol className="list-decimal list-inside space-y-3 text-sm text-gray-700">
              <li>Ajoutez et vérifiez votre compte bancaire</li>
              <li>Les gains approuvés deviennent disponibles (après activation du mariage)</li>
              <li>Demandez un retrait avec un minimum de 10 $</li>
              <li>L'admin examine et traite votre demande (5-7 jours ouvrables)</li>
              <li>Les fonds sont transférés vers votre compte bancaire</li>
            </ol>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
