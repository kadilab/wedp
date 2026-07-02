import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import api from '../../services/api';
import { formatMoney } from '../../utils/currency';
import toast from 'react-hot-toast';
import {
  CheckCircleIcon, XCircleIcon, ClockIcon, BanknotesIcon,
  CalendarDaysIcon, DevicePhoneMobileIcon, UserCircleIcon
} from '@heroicons/react/24/outline';

const STATUS_TABS = [
  { value: 'PENDING', label: 'En attente' },
  { value: 'PAID', label: 'Payés' },
  { value: 'REJECTED', label: 'Rejetés' }
];
const STATUS_LABEL = { PENDING: 'En attente', PAID: 'Payé', REJECTED: 'Rejeté' };

const initials = (name = '') =>
  name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?';

function StatusBadge({ status }) {
  const map = {
    PENDING: 'bg-amber-100 text-amber-800',
    PAID: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800'
  };
  const icon = {
    PENDING: <ClockIcon className="w-3.5 h-3.5" />,
    PAID: <CheckCircleIcon className="w-3.5 h-3.5" />,
    REJECTED: <XCircleIcon className="w-3.5 h-3.5" />
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${map[status] || 'bg-gray-100 text-gray-700'}`}>
      {icon[status]} {STATUS_LABEL[status] || status}
    </span>
  );
}

export default function AdminPayoutDashboard() {
  const [status, setStatus] = useState('PENDING');
  const [page, setPage] = useState(1);
  const [selectedPayoutId, setSelectedPayoutId] = useState(null);
  const [approveData, setApproveData] = useState({ transactionId: '', proofUrl: '', adminNote: '' });
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery(
    ['admin-payouts', { status, page }],
    async () => {
      const params = new URLSearchParams({ status, page, limit: 20 });
      const response = await api.get(`/admin/payouts?${params}`);
      return response.data;
    }
  );

  const { data: payoutDetail } = useQuery(
    ['admin-payout-detail', selectedPayoutId],
    async () => {
      if (!selectedPayoutId) return null;
      const response = await api.get(`/admin/payouts/${selectedPayoutId}`);
      return response.data;
    },
    { enabled: !!selectedPayoutId }
  );

  const approveMutation = useMutation(
    async () => api.put(`/admin/payouts/${selectedPayoutId}/approve`, approveData),
    {
      onSuccess: () => {
        toast.success('Retrait approuvé !');
        setSelectedPayoutId(null);
        setApproveData({ transactionId: '', proofUrl: '', adminNote: '' });
        queryClient.invalidateQueries('admin-payouts');
      },
      onError: (error) => toast.error(error.response?.data?.message || "Erreur lors de l'approbation")
    }
  );

  const rejectMutation = useMutation(
    async () => api.put(`/admin/payouts/${selectedPayoutId}/reject`, { reason: rejectReason }),
    {
      onSuccess: () => {
        toast.success('Retrait rejeté');
        setSelectedPayoutId(null);
        setRejectReason('');
        setIsRejecting(false);
        queryClient.invalidateQueries('admin-payouts');
      },
      onError: (error) => toast.error(error.response?.data?.message || 'Erreur lors du rejet')
    }
  );

  const payouts = data?.payouts || [];
  const pagination = data?.pagination || {};
  const total = pagination.total ?? payouts.length;
  const pageSum = payouts.reduce((s, p) => s + Number(p.totalAmount || 0), 0);
  const detail = payoutDetail?.payout;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-serif font-bold text-gray-900">Gestion des retraits</h1>
        <p className="text-gray-500 mt-1">Examinez et traitez les demandes de retrait des créateurs.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <ClockIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{total}</p>
            <p className="text-xs text-gray-500 truncate">Demandes ({STATUS_LABEL[status]?.toLowerCase()})</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <BanknotesIcon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-xl font-bold text-gray-900 leading-tight">{formatMoney(pageSum)}</p>
            <p className="text-xs text-gray-500 truncate">Montant (cette page)</p>
          </div>
        </div>
      </div>

      {/* Status Tabs */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((s) => (
          <button
            key={s.value}
            onClick={() => { setStatus(s.value); setPage(1); setSelectedPayoutId(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-full transition-colors ${
              status === s.value
                ? 'bg-primary-600 text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Payouts List */}
        <div className="lg:col-span-2 space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse">
                <div className="h-4 w-40 bg-gray-100 rounded mb-3" />
                <div className="h-3 w-56 bg-gray-100 rounded" />
              </div>
            ))
          ) : payouts.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
              <BanknotesIcon className="h-10 w-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun retrait « {STATUS_LABEL[status]?.toLowerCase()} ».</p>
            </div>
          ) : (
            payouts.map((payout) => {
              const active = selectedPayoutId === payout.id;
              return (
                <button
                  key={payout.id}
                  onClick={() => { setSelectedPayoutId(payout.id); setIsRejecting(false); }}
                  className={`w-full text-left bg-white rounded-2xl border shadow-sm p-4 transition-all hover:shadow-md ${
                    active ? 'border-primary-400 ring-2 ring-primary-200' : 'border-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm shrink-0">
                      {initials(payout.creator?.displayName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900 truncate">{payout.creator?.displayName}</h3>
                        <StatusBadge status={payout.status} />
                      </div>
                      <p className="text-sm text-gray-500 truncate">{payout.email}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-gray-900">{formatMoney(payout.totalAmount)}</p>
                      <p className="text-xs text-gray-400 flex items-center justify-end gap-1">
                        <CalendarDaysIcon className="h-3.5 w-3.5" />
                        {new Date(payout.requestedAt).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                  </div>
                </button>
              );
            })
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex flex-wrap justify-center gap-1.5 pt-2">
              <button
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-lg text-sm font-medium ${
                    p === pagination.page ? 'bg-primary-600 text-white' : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          )}
        </div>

        {/* Payout Detail */}
        <div className="lg:sticky lg:top-6">
          {selectedPayoutId && detail ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Amount header */}
              <div className="bg-gradient-to-br from-primary-600 to-primary-500 text-white p-5">
                <p className="text-primary-100 text-sm">Montant du retrait</p>
                <p className="text-3xl font-bold tracking-tight">{formatMoney(detail.totalAmount)}</p>
                <div className="mt-2"><StatusBadge status={detail.status} /></div>
              </div>

              <div className="p-5 space-y-4 text-sm">
                {/* Creator */}
                <div className="flex items-start gap-2.5">
                  <UserCircleIcon className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-gray-400 text-xs">Créateur</p>
                    <p className="font-medium text-gray-900">{detail.creator?.displayName}</p>
                    <p className="text-gray-500 break-words">{detail.user?.email}</p>
                  </div>
                </div>
                {/* Mobile Money account */}
                <div className="flex items-start gap-2.5">
                  <DevicePhoneMobileIcon className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-gray-400 text-xs">Compte Mobile Money</p>
                    <p className="font-medium text-gray-900">{detail.paymentDetails?.accountHolderName || '—'}</p>
                    <p className="text-gray-500">
                      {detail.paymentDetails?.bankName}
                      {detail.paymentDetails?.accountNumber ? ` · ${detail.paymentDetails.accountNumber}` : ''}
                    </p>
                  </div>
                </div>
                {/* Requested */}
                <div className="flex items-start gap-2.5">
                  <CalendarDaysIcon className="h-5 w-5 text-gray-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-gray-400 text-xs">Demandé le</p>
                    <p className="text-gray-900">{new Date(detail.requestedAt).toLocaleString('fr-FR')}</p>
                  </div>
                </div>

                {/* Actions (only for pending) */}
                {detail.status === 'PENDING' && (
                  <div className="border-t pt-4 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">ID de transaction *</label>
                      <input
                        type="text"
                        value={approveData.transactionId}
                        onChange={(e) => setApproveData({ ...approveData, transactionId: e.target.value })}
                        placeholder="Réf. du paiement effectué"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Preuve de paiement (URL)</label>
                      <input
                        type="url"
                        value={approveData.proofUrl}
                        onChange={(e) => setApproveData({ ...approveData, proofUrl: e.target.value })}
                        placeholder="Lien vers la preuve"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Note admin</label>
                      <textarea
                        value={approveData.adminNote}
                        onChange={(e) => setApproveData({ ...approveData, adminNote: e.target.value })}
                        rows="2"
                        placeholder="Notes (optionnel)"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                      />
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => approveMutation.mutate()}
                        disabled={approveMutation.isLoading || !approveData.transactionId}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircleIcon className="h-5 w-5" />
                        {approveMutation.isLoading ? 'Approbation…' : 'Approuver'}
                      </button>
                      <button
                        onClick={() => setIsRejecting((v) => !v)}
                        className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                      >
                        <XCircleIcon className="h-5 w-5" />
                        Rejeter
                      </button>
                    </div>

                    {isRejecting && (
                      <div className="space-y-2 border-t pt-3">
                        <label className="block text-xs font-medium text-gray-700">Motif du rejet *</label>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          rows="3"
                          placeholder="Expliquez pourquoi ce retrait est rejeté…"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => rejectMutation.mutate()}
                            disabled={rejectMutation.isLoading || !rejectReason}
                            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                          >
                            {rejectMutation.isLoading ? 'Rejet…' : 'Confirmer le rejet'}
                          </button>
                          <button
                            onClick={() => setIsRejecting(false)}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-500">
              {selectedPayoutId ? 'Chargement des détails…' : 'Sélectionnez un retrait pour voir les détails.'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
