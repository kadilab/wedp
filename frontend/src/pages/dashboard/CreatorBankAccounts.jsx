import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { api } from '../../services/api';
import toast from 'react-hot-toast';
import { TrashIcon, PencilIcon, PlusIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export default function CreatorBankAccounts() {
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    iban: '',
    swiftCode: '',
    accountType: 'checking',
    currency: 'USD',
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
        toast.success(editingId ? 'Bank account updated' : 'Bank account added');
        queryClient.invalidateQueries('bank-accounts');
        resetForm();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error saving bank account');
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
        toast.success('Bank account deleted');
        queryClient.invalidateQueries('bank-accounts');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error deleting bank account');
      }
    }
  );

  const resetForm = () => {
    setFormData({
      accountHolderName: '',
      bankName: '',
      accountNumber: '',
      routingNumber: '',
      iban: '',
      swiftCode: '',
      accountType: 'checking',
      currency: 'USD',
      isDefault: false
    });
    setIsAddingAccount(false);
    setEditingId(null);
  };

  const handleEdit = (account) => {
    setEditingId(account.id);
    setFormData({
      accountHolderName: account.accountHolderName,
      bankName: account.bankName,
      accountType: account.accountType,
      currency: account.currency,
      isDefault: account.isDefault,
      accountNumber: '',
      routingNumber: '',
      iban: '',
      swiftCode: ''
    });
    setIsAddingAccount(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  const handleDelete = (accountId) => {
    if (window.confirm('Are you sure you want to delete this bank account?')) {
      deleteMutation.mutate(accountId);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Bank Accounts</h1>
        <p className="text-gray-600 mt-1">Manage your bank accounts for payouts</p>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">Loading bank accounts...</p>
        </div>
      ) : (
        <>
          {/* Add/Edit Form */}
          {isAddingAccount && (
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-primary-600">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {editingId ? 'Edit Bank Account' : 'Add Bank Account'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.accountHolderName}
                      onChange={(e) => setFormData({ ...formData, accountHolderName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.bankName}
                      onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number / IBAN *
                    </label>
                    <input
                      type="text"
                      value={formData.accountNumber || formData.iban}
                      onChange={(e) => setFormData({ ...formData, accountNumber: e.target.value })}
                      placeholder="Last 4 digits hidden for security"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Routing Number (US only)
                    </label>
                    <input
                      type="text"
                      value={formData.routingNumber || ''}
                      onChange={(e) => setFormData({ ...formData, routingNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Type
                    </label>
                    <select
                      value={formData.accountType}
                      onChange={(e) => setFormData({ ...formData, accountType: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="checking">Checking</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={formData.isDefault}
                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Set as default account</span>
                </label>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={saveMutation.isLoading}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
                  >
                    {saveMutation.isLoading ? 'Saving...' : editingId ? 'Update Account' : 'Add Account'}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Bank Accounts List */}
          {bankAccounts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500 mb-4">No bank accounts added yet</p>
              {!isAddingAccount && (
                <button
                  onClick={() => setIsAddingAccount(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Bank Account
                </button>
              )}
            </div>
          ) : (
            <>
              {!isAddingAccount && (
                <button
                  onClick={() => setIsAddingAccount(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <PlusIcon className="w-5 h-5" />
                  Add Bank Account
                </button>
              )}

              <div className="space-y-3">
                {bankAccounts.map((account) => (
                  <div
                    key={account.id}
                    className={`bg-white rounded-lg shadow p-6 border-l-4 ${
                      account.isDefault ? 'border-l-green-500' : 'border-l-gray-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-semibold text-gray-900">{account.accountHolderName}</h3>
                          {account.isDefault && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                              <CheckCircleIcon className="w-4 h-4" />
                              Default
                            </span>
                          )}
                          {account.isVerified && (
                            <span className="inline-flex px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                              Verified
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          {account.bankName} • {account.accountNumber} • {account.accountType}
                        </p>
                        <p className="text-sm text-gray-500">
                          {account.currency} • Added {new Date(account.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(account)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(account.id)}
                          disabled={deleteMutation.isLoading}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Security Note:</strong> Bank account numbers are partially masked for your security. You must verify your bank account before requesting payouts.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
