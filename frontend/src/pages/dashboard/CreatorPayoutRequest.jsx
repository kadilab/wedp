import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { formatMoney } from '../../utils/currency';
import { CurrencyDollarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

// Minimum payout amount (FC). Adjust to your real policy.
const MIN_PAYOUT = 10;

export default function CreatorPayoutRequest() {
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const queryClient = useQueryClient();

  // Fetch bank accounts
  const { data: bankAccountsData } = useQuery(
    ['bank-accounts'],
    async () => {
      const response = await api.get('/creators/me/bank-accounts');
      return response.data;
    }
  );

  // Fetch earnings summary for the available balance
  const { data: earningsData } = useQuery(
    ['creator-earnings', { status: 'APPROVED' }],
    async () => {
      const params = new URLSearchParams({ status: 'APPROVED', limit: 1 });
      const response = await api.get(`/creators/me/earnings-details?${params}`);
      return response.data;
    }
  );

  // Request payout mutation
  const payoutMutation = useMutation(
    async (payload) => {
      const response = await api.post('/creators/me/request-payout', payload);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('Payout request submitted successfully!');
        queryClient.invalidateQueries('creator-earnings');
        queryClient.invalidateQueries(['creator-earnings', { status: 'APPROVED' }]);
        setAmount('');
        setNote('');
        setSelectedBankAccount('');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error submitting payout request');
      }
    }
  );

  const bankAccounts = bankAccountsData?.bankAccounts || [];
  const availableAmount = earningsData?.summary?.available || 0;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedBankAccount) {
      toast.error('Veuillez sélectionner un compte mobile money');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    payoutMutation.mutate({
      bankAccountId: selectedBankAccount,
      amount: parseFloat(amount),
      note: note.trim() || null
    });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Demander un Retrait</h1>
        <p className="text-gray-600 mt-1">Retirez vos gains approuvés vers votre compte mobile money</p>
      </div>

      {/* Available Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-gray-700">Disponible pour Retrait</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">{formatMoney(availableAmount)}</p>
          <p className="text-xs text-gray-600 mt-2">Gains approuvés non encore retirés</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-700">Montant Minimum</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600">{formatMoney(MIN_PAYOUT)}</p>
          <p className="text-xs text-gray-600 mt-2">Pas de limite maximale</p>
        </div>
      </div>

      {/* Form */}
      {bankAccounts.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">
            Vous devez d'abord ajouter un compte mobile money avant de demander un retrait.
            <a href="/creator-bank-accounts" className="ml-2 font-semibold text-amber-900 hover:underline">
              Ajouter un Compte
            </a>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Bank Account Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Compte Mobile Money *
            </label>
            <select
              value={selectedBankAccount}
              onChange={(e) => setSelectedBankAccount(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
            >
              <option value="">Sélectionnez un compte</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountHolderName} - {account.bankName} ({account.accountNumber?.replace(/(\d)(?=\d{2})/g, '*')})
                  {!account.isVerified && ' - NON VÉRIFIÉ'}
                </option>
              ))}
            </select>
            {selectedBankAccount && (() => {
              const selectedAcct = bankAccounts.find(a => a.id === selectedBankAccount);
              return !selectedAcct?.isVerified && (
                <p className="mt-2 text-sm text-amber-600">
                  ⚠️ Ce compte n'est pas vérifié. Veuillez le vérifier avant de demander un retrait.
                </p>
              );
            })()}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Montant à Retirer *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500 text-sm font-medium">FC</span>
              <input
                type="number"
                step="1"
                min={MIN_PAYOUT}
                max={availableAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition"
                placeholder="0.00"
              />
            </div>
            {amount && parseFloat(amount) > availableAmount && (
              <p className="mt-1 text-sm text-red-600">
                Le montant dépasse le solde disponible ({formatMoney(availableAmount)})
              </p>
            )}
            {amount && parseFloat(amount) < MIN_PAYOUT && (
              <p className="mt-1 text-sm text-amber-600">
                Le montant minimum pour un retrait est {formatMoney(MIN_PAYOUT)}
              </p>
            )}
          </div>

          {/* Processing Time */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Traitement:</strong> Les demandes de retrait sont généralement traitées dans les 5-7 jours ouvrables après approbation de l'administrateur.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Notes (Optionnel)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="3"
              placeholder="Toute note ou instruction spéciale..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition resize-none"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={payoutMutation.isLoading || availableAmount <= 0 || !selectedBankAccount}
            className="w-full px-6 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {payoutMutation.isLoading ? 'Traitement...' : 'Demander le Retrait'}
          </button>
        </form>
      )}
    </div>
  );
}
