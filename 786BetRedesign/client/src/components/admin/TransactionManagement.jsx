import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';

export function TransactionManagement() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, [filter]);

  const fetchTransactions = async () => {
    try {
      const response = await api.get(`/admin/transactions?filter=${filter}`);
      setTransactions(response.data.transactions);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: 'bg-yellow-500/10 text-yellow-400',
      completed: 'bg-green-500/10 text-green-400',
      failed: 'bg-red-500/10 text-red-400',
      cancelled: 'bg-gray-500/10 text-gray-400'
    };

    return statusConfig[status] || statusConfig.pending;
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      deposit: 'bg-blue-500/10 text-blue-400',
      withdrawal: 'bg-purple-500/10 text-purple-400',
      game_win: 'bg-green-500/10 text-green-400',
      game_loss: 'bg-red-500/10 text-red-400'
    };

    return typeConfig[type] || typeConfig.deposit;
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Transaction Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-zinc-400">Loading transactions...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Transaction Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-zinc-800 border-zinc-700 text-white rounded-lg px-3 py-2"
          >
            <option value="all">All Transactions</option>
            <option value="deposits">Deposits</option>
            <option value="withdrawals">Withdrawals</option>
            <option value="games">Game Transactions</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 text-zinc-400">User</th>
                <th className="text-left py-3 text-zinc-400">Type</th>
                <th className="text-left py-3 text-zinc-400">Amount</th>
                <th className="text-left py-3 text-zinc-400">Status</th>
                <th className="text-left py-3 text-zinc-400">Date</th>
                <th className="text-left py-3 text-zinc-400">Details</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => (
                <tr key={transaction._id} className="border-b border-zinc-800">
                  <td className="py-3 text-white">{transaction.user?.username || 'N/A'}</td>
                  <td className="py-3">
                    <Badge className={getTypeBadge(transaction.type)}>
                      {transaction.type.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3 text-white">${transaction.amount}</td>
                  <td className="py-3">
                    <Badge className={getStatusBadge(transaction.status)}>
                      {transaction.status}
                    </Badge>
                  </td>
                  <td className="py-3 text-zinc-400">
                    {new Date(transaction.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-zinc-400 text-sm">
                    {transaction.method || 'N/A'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
