import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Shield, ShieldOff, UserX, UserCheck } from 'lucide-react';

export function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/admin/users');
      setUsers(response.data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/block`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to block user:', error);
    }
  };

  const handleUnblockUser = async (userId) => {
    try {
      await api.post(`/admin/users/${userId}/unblock`);
      fetchUsers();
    } catch (error) {
      console.error('Failed to unblock user:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-500/10 text-green-400', text: 'Active' },
      blocked: { color: 'bg-red-500/10 text-red-400', text: 'Blocked' },
      pending: { color: 'bg-yellow-500/10 text-yellow-400', text: 'Pending' }
    };

    const config = statusConfig[status] || statusConfig.active;
    return <Badge className={config.color}>{config.text}</Badge>;
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-800">
        <CardHeader>
          <CardTitle className="text-white">User Management</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-zinc-400">Loading users...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardHeader>
        <CardTitle className="text-white">User Management</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-zinc-800">
                <th className="text-left py-3 text-zinc-400">Username</th>
                <th className="text-left py-3 text-zinc-400">Email</th>
                <th className="text-left py-3 text-zinc-400">Balance</th>
                <th className="text-left py-3 text-zinc-400">Role</th>
                <th className="text-left py-3 text-zinc-400">Status</th>
                <th className="text-left py-3 text-zinc-400">Registered</th>
                <th className="text-left py-3 text-zinc-400">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="border-b border-zinc-800">
                  <td className="py-3 text-white">{user.username}</td>
                  <td className="py-3 text-zinc-400">{user.email}</td>
                  <td className="py-3 text-white">${user.balance.toFixed(2)}</td>
                  <td className="py-3">
                    <Badge className="bg-blue-500/10 text-blue-400">
                      {user.role}
                    </Badge>
                  </td>
                  <td className="py-3">{getStatusBadge(user.status)}</td>
                  <td className="py-3 text-zinc-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3">
                    <div className="flex gap-2">
                      {user.status === 'active' ? (
                        <Button
                          size="sm"
                          onClick={() => handleBlockUser(user._id)}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          <UserX size={14} className="mr-1" />
                          Block
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleUnblockUser(user._id)}
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <UserCheck size={14} className="mr-1" />
                          Unblock
                        </Button>
                      )}
                    </div>
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
