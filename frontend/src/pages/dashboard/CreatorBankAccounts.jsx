import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import { confirmDialog } from '../../components/common/confirm';
import toast from 'react-hot-toast';
import { TrashIcon, PencilIcon, PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function CreatorBankAccounts() {
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    accountHolderName: '',
    phoneNumber: '',
    mobileMoneyProvider: 'airtel',
    isDefault: false
  });
  const queryClient = useQueryClient();

  // Fetch bank accounts
  const { data, isLoading, error } = useQuery(
    ['bank-accounts'],
    async () => {
      const response = await api.get('/creators/me/bank-accounts');
      return response.data;
    }
  );

  const bankAccounts = data?.bankAccounts || [];

  // Add/Update mutation
  const saveMutation = useMutation(
    async (payload) => {
      if (editingId) {
        return api.put(`/creators/me/bank-accounts/${editingId}`, payload);
      } else {
        return api.post('/creators/me/bank-accounts', payload);
      }
    },
    {
      onSuccess: () => {
        toast.success(editingId ? 'Compte mobile money mis à jour' : 'Compte mobile money ajouté');
        queryClient.invalidateQueries('bank-accounts');
        resetForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erreur lors de la sauvegarde');
      }
    }
  );

  // Delete mutation
  const deleteMutation = useMutation(
    async (accountId) => {
      return api.delete(`/creators/me/bank-accounts/${accountId}`);
    },
    {
      onSuccess: () => {
        toast.success('Compte supprimé');
        queryClient.invalidateQueries('bank-accounts');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Erreur lors de la suppression');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      accountHolderName: '',
      phoneNumber: '',
      mobileMoneyProvider: 'airtel',
      isDefault: false
    });
    setIsAddingAccount(false);
    setEditingId(null);
  };

  const handleEdit = (account) => {
    setEditingId(account.id);
    setFormData({
      accountHolderName: account.accountHolderName,
      phoneNumber: account.accountNumber || '',
      mobileMoneyProvider: providerFor(account.bankName).value,
      isDefault: account.isDefault
    });
    setIsAddingAccount(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate phone number format
    if (!formData.phoneNumber.match(/^\+?[0-9]{7,15}$/)) {
      toast.error('Veuillez entrer un numéro de téléphone valide');
      return;
    }

    saveMutation.mutate({
      accountHolderName: formData.accountHolderName,
      bankName: formData.mobileMoneyProvider.toUpperCase(),
      accountNumber: formData.phoneNumber,
      accountType: 'mobile_money',
      currency: 'CDF',
      isDefault: formData.isDefault
    });
  };

  const handleDelete = async (accountId) => {
    const ok = await confirmDialog({
      title: 'Supprimer ce compte',
      message: 'Êtes-vous sûr de vouloir supprimer ce compte ?',
      confirmText: 'Supprimer'
    });
    if (ok) deleteMutation.mutate(accountId);
  };

  const mobileMoneyProviders = [
    { value: 'airtel', label: 'Airtel Money', logo: '/providers/airtel.png' },
    { value: 'orange', label: 'Orange Money', logo: '/providers/orange.png' },
    { value: 'mpesa', label: 'M-Pesa', logo: '/providers/mpesa.png' }
  ];
  const providerFor = (v) => {
    const k = String(v || '').toLowerCase();
    return mobileMoneyProviders.find((p) => k.includes(p.value)) || mobileMoneyProviders.find((p) => p.value === 'airtel');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Comptes Mobile Money</h1>
        <p className="text-gray-600 mt-1">Gérez vos comptes de paiement Mobile Money pour les retraits</p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Chargement des comptes...</p>
        </div>
      ) : (
        <>
          {/* Add/Edit Form */}
          {isAddingAccount && (
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-primary-600">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingId ? 'Modifier le Compte' : 'Ajouter un Compte Mobile Money'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Intitulé du Compte *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mon Compte Airtel"
                    value={formData.accountHolderName}
                    onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">Nom d'affichage de ce compte</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Opérateur Mobile Money *
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {mobileMoneyProviders.map(provider => {
                      const active = formData.mobileMoneyProvider === provider.value;
                      return (
                        <button
                          key={provider.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, mobileMoneyProvider: provider.value })}
                          className={`flex flex-col items-center gap-1.5 px-2 py-3 rounded-xl border-2 transition ${active ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-gray-200 bg-white hover:border-primary-300'}`}
                        >
                          <img src={provider.logo} alt={provider.label} className="h-9 w-9 object-contain" />
                          <span className={`text-[11px] font-medium ${active ? 'text-primary-700' : 'text-gray-600'}`}>{provider.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Numéro de Téléphone *
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="Ex: 0970000000 ou 243970000000"
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                  />
                  <p className="text-xs text-gray-500 mt-1">Le numéro Mobile Money qui recevra vos retraits.</p>
                </div>

                <label className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Définir comme compte par défaut</span>
                </label>

                <div className="flex gap-2 pt-4">
                  <button
                    type="submit"
                    disabled={saveMutation.isLoading}
                    className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 font-medium transition-colors"
                  >
                    {saveMutation.isLoading ? 'Enregistrement...' : editingId ? 'Mettre à Jour' : 'Ajouter'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  >
                    Annuler
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Add Button */}
          {!isAddingAccount && (
            <button
              onClick={() => setIsAddingAccount(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              Ajouter un Compte
            </button>
          )}

          {/* Accounts List */}
          {bankAccounts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-12 text-center">
              <p className="text-gray-500 mb-4">Aucun compte mobile money configuré</p>
              <button
                onClick={() => setIsAddingAccount(true)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
              >
                <PlusIcon className="w-5 h-5" />
                Ajouter un Compte
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {bankAccounts.map((account) => (
                <div
                  key={account.id}
                  className="bg-white rounded-lg shadow p-6 border border-gray-200 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {account.accountHolderName}
                        </h3>
                        {account.isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                            <CheckCircleIcon className="w-3 h-3" />
                            Par défaut
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Opérateur</p>
                          <div className="flex items-center gap-2 mt-1">
                            <img src={providerFor(account.bankName).logo} alt="" className="h-6 w-6 object-contain" />
                            <p className="text-sm text-gray-900">{providerFor(account.bankName).label}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-medium">Numéro de Téléphone</p>
                          <p className="text-sm text-gray-900 mt-1 font-mono">
                            {account.accountNumber ? account.accountNumber.replace(/(\d)(?=\d{2})/g, '*') : 'Non spécifié'}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mt-4">
                        Ajouté le {new Date(account.createdAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(account)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <PencilIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        disabled={deleteMutation.isLoading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Supprimer"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
