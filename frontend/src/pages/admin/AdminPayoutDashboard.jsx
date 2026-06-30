import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import { formatMoney } from '../../utils/currency';
import toast from 'react-hot-toast';
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function AdminPayoutDashboard() {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [selectedPayoutId, setSelectedPayoutId] = useState(null);
  const [approveData, setApproveData] = useState({ transactionId: '', proofUrl: '', adminNote: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch payouts
  const { data, isLoading } = useQuery(
    ['admin-payouts', { status, page }],
    async () => {
      const params = new URLSearchParams({ status, page, limit: 20 });
      const response = await api.get(`/admin/payouts?${params}`);
      return response.data;
    }
  );

  // Fetch payout detail
  const { data: payoutDetail } = useQuery(
    ['admin-payout-detail', selectedPayoutId],
    async () => {
      if (!selectedPayoutId) return null;
      const response = await api.get(`/admin/payouts/${selectedPayoutId}`);
      return response.data;
    },
    { enabled: !!selectedPayoutId }
  );

  // Approve mutation
  const approveMutation = useMutation(
    async () => {
      return api.put(`/admin/payouts/${selectedPayoutId}/approve`, approveData);
    },
    {
      onSuccess: () => {
        toast.success('Payout approved!');
        setSelectedPayoutId(null);
        setApproveData({ transactionId: '', proofUrl: '', adminNote: '' });
        queryClient.invalidateQueries('admin-payouts');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error approving payout');
      }
    }
  );

  // Reject mutation
  const rejectMutation = useMutation(
    async () => {
      return api.put(`/admin/payouts/${selectedPayoutId}/reject`, { reason: rejectReason });
    },
    {
      onSuccess: () => {
        toast.success('Payout rejected');
        setSelectedPayoutId(null);
        setRejectReason('');
        queryClient.invalidateQueries('admin-payouts');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Error rejecting payout');
      }
    }
  );

  const payouts = data?.payouts || [];
  const pagination = data?.pagination || {};

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING':
        return <ClockIcon className="w-5 h-5 text-amber-500" />;
      case 'PAID':
        return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'REJECTED':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING':
        return 'bg-amber-100 text-amber-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Payout Management</h1>
        <p className="text-gray-600 mt-1">Review and process creator payout requests</p>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 border-b border-gray-200">
        {['PENDING', 'PAID', 'REJECTED'].map((s) => (
          <button
            key={s}
            onClick={() => {
              setStatus(s);
              setPage(1);
            }}
            className={`px-4 py-2 font-medium border-b-2 transition-colors ${
              status === s
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Payouts List */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">Loading payouts...</p>
            </div>
          ) : payouts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <p className="text-gray-500">No {status.toLowerCase()} payouts</p>
            </div>
          ) : (
            <div className="space-y-3">
              {payouts.map((payout) => (
                <div
                  key={payout.id}
                  onClick={() => setSelectedPayoutId(payout.id)}
                  className={`bg-white rounded-lg shadow p-4 cursor-pointer transition-colors hover:bg-gray-50 border-l-4 ${
                    selectedPayoutId === payout.id
                      ? 'border-l-primary-600 ring-2 ring-primary-600'
                      : 'border-l-gray-300'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold text-gray-900">{payout.creator.displayName}</h3>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(payout.status)}
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded ${getStatusColor(payout.status)}`}>
                            {payout.status}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">{payout.email}</p>
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-gray-500">
                          {new Date(payout.requestedAt).toLocaleDateString()}
                        </p>
                        <p className="text-lg font-semibold text-gray-900">
                          {formatMoney(payout.totalAmount)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="mt-6 flex justify-center gap-2">
              {pagination.page > 1 && (
                <button
                  onClick={() => setPage(pagination.page - 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Previous
                </button>
              )}
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-3 py-2 rounded-lg ${
                    p === pagination.page
                      ? 'bg-primary-600 text-white'
                      : 'border border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              {pagination.page < pagination.totalPages && (
                <button
                  onClick={() => setPage(pagination.page + 1)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Next
                </button>
              )}
            </div>
          )}
        </div>

        {/* Payout Detail */}
        {selectedPayoutId && payoutDetail?.payout ? (
          <div className="bg-white rounded-lg shadow p-6 space-y-6">
            <h2 className="text-lg font-semibold text-gray-900">Payout Detail</h2>

            {/* Creator Info */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Creator</p>
              <p className="font-semibold text-gray-900">{payoutDetail.payout.creator.displayName}</p>
              <p className="text-sm text-gray-600">{payoutDetail.payout.user.email}</p>
            </div>

            {/* Amount */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Amount</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatMoney(payoutDetail.payout.totalAmount)}
              </p>
            </div>

            {/* Bank Details */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Bank Account</p>
              <p className="font-semibold text-gray-900">{payoutDetail.payout.paymentDetails.accountHolderName}</p>
              <p className="text-sm text-gray-600">{payoutDetail.payout.paymentDetails.bankName}</p>
            </div>

            {/* Dates */}
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">Requested</p>
              <p className="text-sm text-gray-900">{new Date(payoutDetail.payout.requestedAt).toLocaleString()}</p>
            </div>

            {/* Action Buttons */}
            {payoutDetail.payout.status === 'PENDING' && (
              <div className="border-t pt-4 space-y-4">
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Transaction ID *
                    </label>
                    <input
                      type="text"
                      value={approveData.transactionId}
                      onChange={(e) => setApproveData({ ...approveData, transactionId: e.target.value })}
                      placeholder="Enter transaction ID"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Proof URL
                    </label>
                    <input
                      type="url"
                      value={approveData.proofUrl}
                      onChange={(e) => setApproveData({ ...approveData, proofUrl: e.target.value })}
                      placeholder="Link to proof of payment"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-900 mb-1">
                      Admin Note
                    </label>
                    <textarea
                      value={approveData.adminNote}
                      onChange={(e) => setApproveData({ ...approveData, adminNote: e.target.value })}
                      rows="2"
                      placeholder="Optional notes"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => approveMutation.mutate()}
                    disabled={approveMutation.isLoading || !approveData.transactionId}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {approveMutation.isLoading ? 'Approving...' : '✓ Approve'}
                  </button>
                  <button
                    onClick={() => setIsRejecting(!isRejecting)}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    ✕ Reject
                  </button>
                </div>

                {isRejecting && (
                  <div className="space-y-2 border-t pt-4">
                    <label className="block text-sm font-medium text-gray-900">
                      Rejection Reason *
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      rows="3"
                      placeholder="Explain why this payout is being rejected..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => rejectMutation.mutate()}
                        disabled={rejectMutation.isLoading || !rejectReason}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                      >
                        {rejectMutation.isLoading ? 'Rejecting...' : 'Confirm Rejection'}
                      </button>
                      <button
                        onClick={() => setIsRejecting(false)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-6 text-center text-gray-500">
            {selectedPayoutId ? 'Loading details...' : 'Select a payout to view details'}
          </div>
        )}
      </div>
    </div>
  );
}
