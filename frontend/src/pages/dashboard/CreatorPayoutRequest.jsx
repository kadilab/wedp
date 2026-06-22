import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { CurrencyDollarIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

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

  // Fetch earnings details for available balance
  const { data: earningsData, isLoading: earningsLoading } = useQuery(
    ['creator-earnings', { status: 'APPROVED' }],
    async () => {
      const params = new URLSearchParams({ status: 'APPROVED', limit: 1000 });
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
  const earnings = earningsData?.earnings || [];

  const availableAmount = earnings.reduce((sum, e) => sum + parseFloat(e.commissionAmount), 0);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedBankAccount) {
      toast.error('Please select a bank account');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount');
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
        <h1 className="text-3xl font-serif font-bold text-gray-900">Request Payout</h1>
        <p className="text-gray-600 mt-1">Withdraw your approved earnings to your bank account</p>
      </div>

      {/* Available Balance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg shadow p-6 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CurrencyDollarIcon className="w-5 h-5 text-green-600" />
            <h3 className="font-medium text-gray-700">Available to Withdraw</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">${availableAmount.toFixed(2)}</p>
          <p className="text-xs text-gray-600 mt-2">From {earnings.length} transactions</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg shadow p-6 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircleIcon className="w-5 h-5 text-blue-600" />
            <h3 className="font-medium text-gray-700">Minimum Payout</h3>
          </div>
          <p className="text-3xl font-bold text-blue-600">$10.00</p>
          <p className="text-xs text-gray-600 mt-2">No maximum limit</p>
        </div>
      </div>

      {/* Form */}
      {bankAccounts.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-amber-800 text-sm">
            You need to add and verify a bank account before requesting a payout.
            <a href="/creator-bank-accounts" className="ml-2 font-semibold text-amber-900 hover:underline">
              Add Bank Account
            </a>
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Bank Account Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Bank Account *
            </label>
            <select
              value={selectedBankAccount}
              onChange={(e) => setSelectedBankAccount(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Select a bank account</option>
              {bankAccounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.accountHolderName} - {account.bankName} ({account.accountNumber})
                  {!account.isVerified && ' - UNVERIFIED'}
                </option>
              ))}
            </select>
            {selectedBankAccount && (() => {
              const selectedAcct = bankAccounts.find(a => a.id === selectedBankAccount);
              return !selectedAcct?.isVerified && (
                <p className="mt-2 text-sm text-amber-600">
                  ⚠️ This bank account is not verified. Please verify it before requesting a payout.
                </p>
              );
            })()}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Amount to Withdraw *
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">$</span>
              <input
                type="number"
                step="0.01"
                min="10"
                max={availableAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                className="w-full pl-6 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                placeholder="0.00"
              />
            </div>
            {amount && parseFloat(amount) > availableAmount && (
              <p className="mt-1 text-sm text-red-600">
                Amount exceeds available balance (${availableAmount.toFixed(2)})
              </p>
            )}
            {amount && parseFloat(amount) < 10 && (
              <p className="mt-1 text-sm text-amber-600">
                Minimum payout amount is $10.00
              </p>
            )}
          </div>

          {/* Processing Time */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-900">
              <strong>Processing:</strong> Payout requests are typically processed within 5-7 business days after admin approval.
            </p>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows="3"
              placeholder="Any special notes or instructions..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={payoutMutation.isLoading || availableAmount <= 0 || !selectedBankAccount}
            className="w-full px-4 py-3 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {payoutMutation.isLoading ? 'Submitting...' : 'Submit Payout Request'}
          </button>
        </form>
      )}
    </div>
  );
}
