import { useState } from 'react';
import { useQuery } from 'react-query';
import api from '../../services/api';
import { formatMoney } from '../../utils/currency';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { ArrowTrendingUpIcon, CurrencyDollarIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

export default function CreatorEarnings() {
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [templateFilter, setTemplateFilter] = useState('');

  // Fetch earnings details
  const { data, isLoading, error } = useQuery(
    ['creator-earnings', { page, status, templateFilter }],
    async () => {
      const params = new URLSearchParams({
        page,
        limit: 20,
        ...(status && { status }),
        ...(templateFilter && { templateId: templateFilter })
      });
      const response = await api.get(`/creators/me/earnings-details?${params}`);
      return response.data;
    }
  );

  const earnings = data?.earnings || [];
  const revenueByDate = data?.revenueByDate || {};
  const pagination = data?.pagination || {};
  const summary = data?.summary || { pending: 0, approved: 0, paid: 0, available: 0 };

  // Prepare chart data
  const chartData = Object.entries(revenueByDate)
    .sort(([dateA], [dateB]) => new Date(dateA) - new Date(dateB))
    .map(([date, amount]) => ({
      date,
      revenue: amount
    }))
    .slice(-30); // Last 30 days

  // Group by status for pie chart
  const statusCounts = {
    PENDING: earnings.filter(e => e.status === 'PENDING').length,
    APPROVED: earnings.filter(e => e.status === 'APPROVED').length,
    PAID: earnings.filter(e => e.status === 'PAID').length
  };

  const pieData = [
    { name: 'Pending', value: statusCounts.PENDING, color: '#F59E0B' },
    { name: 'Approved', value: statusCounts.APPROVED, color: '#3B82F6' },
    { name: 'Paid', value: statusCounts.PAID, color: '#10B981' }
  ];

  // Totals come from the server-side summary (all transactions, not just this page)
  const totalPending = summary.pending;
  const totalApproved = summary.approved;
  const totalPaid = summary.paid;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-gray-900">Earnings Breakdown</h1>
        <p className="text-gray-600 mt-1">Track all your template usage and commissions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-600">Pending Earnings</h3>
            <ClockIcon className="w-5 h-5 text-amber-500" />
          </div>
          <p className="text-3xl font-bold text-amber-600">{formatMoney(totalPending)}</p>
          <p className="text-xs text-gray-500 mt-1">{statusCounts.PENDING} transactions</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-600">Available to Withdraw</h3>
            <CheckCircleIcon className="w-5 h-5 text-blue-500" />
          </div>
          <p className="text-3xl font-bold text-blue-600">{formatMoney(summary.available || 0)}</p>
          <p className="text-xs text-gray-500 mt-1">approuvé non retiré</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-600">Total Withdrawn</h3>
            <CurrencyDollarIcon className="w-5 h-5 text-green-500" />
          </div>
          <p className="text-3xl font-bold text-green-600">{formatMoney(totalPaid)}</p>
          <p className="text-xs text-gray-500 mt-1">{statusCounts.PAID} transactions</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Revenue Trend (Last 30 Days)</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  angle={-45}
                  textAnchor="end"
                  height={60}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => formatMoney(value)} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No revenue data available</p>
          )}
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
          {Object.values(statusCounts).some(v => v > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData.filter(p => p.value > 0)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No transactions yet</p>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Filter by Status
            </label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Earnings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">Loading earnings...</p>
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <p className="text-red-500">Error loading earnings</p>
          </div>
        ) : earnings.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">No earnings yet. Start by publishing templates!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Template</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Commission %</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {earnings.map(earning => (
                  <tr key={earning.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {earning.templateName}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {earning.commissionPercentage}%
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      {formatMoney(earning.commissionAmount)}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                          earning.status === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : earning.status === 'APPROVED'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {earning.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {new Date(earning.usedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-6 border-t border-gray-200 flex justify-center gap-2">
            {pagination.page > 1 && (
              <button
                onClick={() => setPage(pagination.page - 1)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Previous
              </button>
            )}
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(p => (
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
    </div>
  );
}
