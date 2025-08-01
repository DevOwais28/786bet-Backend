import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '../../services/api.service';
import { 
  Users, 
  DollarSign, 
  Gamepad2, 
  TrendingUp, 
  Shield, 
  Settings,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  Unlock,
  UserX,
  UserCheck
} from 'lucide-react';

const SuperAdminPanel = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [balanceModalData, setBalanceModalData] = useState({ user: null, amount: 0, type: 'add' });
  const [passwordModalData, setPasswordModalData] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch dashboard stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => apiService.getAdminStats(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch all users
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiService.getAllUsers(),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  // Fetch pending transactions
  const { data: pendingTransactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['pending-transactions'],
    queryFn: () => apiService.getPendingTransactions(),
    staleTime: 60 * 1000, // 1 minute
  });

  // Mutations
  const updateBalanceMutation = useMutation({
    mutationFn: ({ userId, amount, type }) => apiService.updateUserBalance(userId, amount, type),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-users']);
      setBalanceModalData({ user: null, amount: 0, type: 'add' });
    },
  });

  const banUserMutation = useMutation({
    mutationFn: (userId) => apiService.banUser(userId),
    onSuccess: () => queryClient.invalidateQueries(['admin-users']),
  });

  const approveTransactionMutation = useMutation({
    mutationFn: (transactionId) => apiService.approveTransaction(transactionId),
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-transactions']);
      queryClient.invalidateQueries(['admin-stats']);
    },
  });

  const rejectTransactionMutation = useMutation({
    mutationFn: ({ transactionId, reason }) => apiService.rejectTransaction(transactionId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries(['pending-transactions']);
      queryClient.invalidateQueries(['admin-stats']);
    },
  });

  const changePasswordMutation = useMutation({
    mutationFn: ({ currentPassword, newPassword }) => apiService.changeAdminPassword(currentPassword, newPassword),
    onSuccess: () => {
      setShowPasswordModal(false);
      setPasswordModalData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    },
  });

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (passwordModalData.newPassword !== passwordModalData.confirmPassword) {
      alert('New passwords do not match');
      return;
    }
    changePasswordMutation.mutate(passwordModalData);
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: DollarSign },
    { id: 'games', label: 'Games', icon: Gamepad2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-white">{stats?.totalUsers || 0}</p>
            </div>
            <Users className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Active Users</p>
              <p className="text-2xl font-bold text-white">{stats?.activeUsers || 0}</p>
            </div>
            <UserCheck className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Balance</p>
              <p className="text-2xl font-bold text-white">${stats?.totalBalance?.[0]?.total?.toFixed(2) || 0}</p>
            </div>
            <DollarSign className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Pending Transactions</p>
              <p className="text-2xl font-bold text-white">{stats?.pendingDeposits + stats?.pendingWithdrawals || 0}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-orange-400" />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 p-6 rounded-lg">
        <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
        <div className="space-y-3">
          {pendingTransactions?.slice(0, 5).map(transaction => (
            <div key={transaction._id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
              <div>
                <p className="text-white">{transaction.user.username}</p>
                <p className="text-gray-400 text-sm">{transaction.type} - ${transaction.amount}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => approveTransactionMutation.mutate(transaction._id)}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => rejectTransactionMutation.mutate({ transactionId: transaction._id, reason: 'Rejected by admin' })}
                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold text-white">User Management</h3>
        <button
          onClick={() => setShowPasswordModal(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Change Password
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-gray-800 rounded-lg">
          <thead>
            <tr className="bg-gray-700">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Email</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Balance</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {users?.map(user => (
              <tr key={user._id} className="hover:bg-gray-700">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-white">{user.username}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{user.email}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-white">${user.balance.toFixed(2)}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.isBanned ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                  }`}>
                    {user.isBanned ? 'Banned' : 'Active'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedUser(user);
                        setShowUserModal(true);
                      }}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setBalanceModalData({ user, amount: 0, type: 'add' })}
                      className="text-green-400 hover:text-green-300"
                    >
                      <DollarSign className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => banUserMutation.mutate(user._id)}
                      className={`${user.isBanned ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}`}
                    >
                      {user.isBanned ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">Super Admin Panel</h1>
          <p className="text-gray-400 mt-2">Complete system management and oversight</p>
        </div>

        <div className="border-b border-gray-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-500'
                    : 'border-transparent text-gray-500 hover:text-gray-300 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-5 h-5 inline-block mr-2" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div>
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'users' && renderUsers()}
          {activeTab === 'transactions' && (
            <div className="bg-gray-800 p-6 rounded-lg">
              <h3 className="text-xl font-semibold text-white mb-4">Transaction Management</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr className="bg-gray-700">
                      <th className="px-6 py-3 text-left">User</th>
                      <th className="px-6 py-3 text-left">Type</th>
                      <th className="px-6 py-3 text-left">Amount</th>
                      <th className="px-6 py-3 text-left">Status</th>
                      <th className="px-6 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTransactions?.map(tx => (
                      <tr key={tx._id} className="border-b border-gray-700">
                        <td className="px-6 py-4">{tx.user.username}</td>
                        <td className="px-6 py-4">{tx.type}</td>
                        <td className="px-6 py-4">${tx.amount}</td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 text-xs bg-yellow-600 rounded">{tx.status}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            <button
                              onClick={() => approveTransactionMutation.mutate(tx._id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-sm"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectTransactionMutation.mutate({ transactionId: tx._id, reason: 'Rejected' })}
                              className="px-3 py-1 bg-red-600 text-white rounded text-sm"
                            >
                              Reject
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Change Password Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg w-96">
              <h3 className="text-lg font-semibold mb-4">Change Password</h3>
              <form onSubmit={handleChangePassword}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Current Password</label>
                    <input
                      type="password"
                      value={passwordModalData.currentPassword}
                      onChange={(e) => setPasswordModalData(prev => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">New Password</label>
                    <input
                      type="password"
                      value={passwordModalData.newPassword}
                      onChange={(e) => setPasswordModalData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordModalData.confirmPassword}
                      onChange={(e) => setPasswordModalData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded"
                      required
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Change Password
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SuperAdminPanel;
