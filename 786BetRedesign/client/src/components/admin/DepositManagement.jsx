import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export function DepositManagement() {
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDeposits();
  }, []);

  const fetchDeposits = async () => {
    try {
      const response = await api.get('/admin/deposits');
      setDeposits(response.data.deposits);
    } catch (error) {
      console.error('Failed to fetch deposits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (depositId) => {
    try {
      await api.post(`/admin/deposits/${depositId}/approve`);
      fetchDeposits();
    } catch (error) {
      console.error('Failed to approve deposit:', error);
    }
  };

  const handleReject = async (depositId) => {
    try {
      await api.post(`/admin/deposits/${depositId}/reject`);
      fetchDeposits();
    } catch (error) {
      console.error('Failed to reject deposit:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-500/10 text-yellow-400', icon: Clock },
      approved: { color: 'bg-green-500/10 text-green-400', icon: CheckCircle },
      rejected: { color: 'bg-red-500/10 text-red-400', icon: XCircle }
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon size={12} className="mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">Deposit Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-zinc-400">Loading deposits...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">Deposit Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 text-zinc-400">User</th>
                <th className="text-left py-3 text-zinc-400">Amount</th>
                <th className="text-left py-3 text-zinc-400">Method</th>
                <th className="text-left py-3 text-zinc-400">Status</th>
                <th className="text-left py-3 text-zinc-400">Date</th>
                <th className="text-left py-3 text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deposits.map((deposit) => (
                <tr key={deposit._id} className="border-b border-zinc-800">
                  <td className="py-3 text-white">{deposit.user?.username || 'N/A'}</td>
                  <td className="py-3 text-white">${deposit.amount}</td>
                  <td className="py-3 text-zinc-400">{deposit.method}</td>
                  <td className="py-3">{getStatusBadge(deposit.status)}</td>
                  <td className="py-3 text-zinc-400">
                    {new Date(deposit.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    {deposit.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(deposit._id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReject(deposit._id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          Reject
                        </Button>
                      </div>
                    )}
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
