import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  DollarSign, 
  BarChart2, 
  Settings, 
  Shield, 
  Activity,
  CreditCard,
  Gamepad2,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Home,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';
import { DepositManagement } from '@/components/admin/DepositManagement';
import { UserManagement } from '@/components/admin/UserManagement';
import { TransactionManagement } from '@/components/admin/TransactionManagement';
import { GameSettings } from '@/components/admin/GameSettings';
import { OverviewDashboard } from '@/components/admin/OverviewDashboard';
import IPMonitoring from '@/pages/admin/IPMonitoring';

export default function AdminDashboard() {
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch admin stats
  const { data: stats, isLoading: isLoadingStats } = useQuery<AdminStats>({
    queryKey: ['adminStats'],
    queryFn: async () => {
      const response = await fetch('/api/admin/users');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'deposits', label: 'Deposits', icon: ArrowDownCircle },
    { id: 'withdrawals', label: 'Withdrawals', icon: ArrowUpCircle },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'transactions', label: 'Transactions', icon: Activity },
    { id: 'game', label: 'Game', icon: Gamepad2 },
    { id: 'verification', label: 'Verification', icon: UserCheck },
    { id: 'ip-monitoring', label: 'IP Monitoring', icon: Shield },
  ];

  if (isLoadingStats || !stats) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gold"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 text-white p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm rounded-3xl p-6 mb-6 border border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gold to-yellow-500 bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-emerald/20 text-emerald px-3 py-1 rounded-full text-sm font-medium flex items-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></div>
                {stats.activeUsers} Active Users
              </div>
              <div className="bg-blue-500/20 text-blue-500 px-3 py-1 rounded-full text-sm font-medium">
                {stats.activeGames} Active Games
              </div>
              <Button 
                variant="outline" 
                className="text-red-500 border-red-500 hover:bg-red-500/10 hover:text-red-400"
                onClick={() => {
                  // Handle logout
                  window.location.href = '/logout';
                }}
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-2">
            <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border-white/10 rounded-3xl p-4">
              <Tabs 
                value={selectedTab} 
                onValueChange={setSelectedTab}
                className="space-y-4"
                orientation="vertical"
              >
                <TabsList className="grid grid-cols-1 gap-2 w-full bg-transparent">
                  {tabs.map((tab) => (
                    <TabsTrigger 
                      key={tab.id}
                      value={tab.id}
                      className={`justify-start h-12 ${selectedTab === tab.id ? 'bg-white/10' : 'hover:bg-white/5'}`}
                    >
                      <tab.icon className="mr-2 h-4 w-4" />
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-10">
            {selectedTab === 'overview' && <OverviewDashboard stats={stats} />}
            
            {selectedTab === 'deposits' && (
              <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border-white/10 rounded-3xl p-6">
                <DepositManagement />
              </Card>
            )}
            
            {selectedTab === 'withdrawals' && (
              <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border-white/10 rounded-3xl p-6">
                <h2 className="text-2xl font-bold mb-6">Withdrawal Management</h2>
                <p className="text-muted-foreground">Withdrawal management coming soon</p>
              </Card>
            )}
            
            {selectedTab === 'users' && (
              <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border-white/10 rounded-3xl p-6">
                <UserManagement />
              </Card>
            )}
            
            {selectedTab === 'transactions' && (
              <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border-white/10 rounded-3xl p-6">
                <TransactionManagement />
              </Card>
            )}
            
            {selectedTab === 'game' && (
              <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border-white/10 rounded-3xl p-6">
                <GameSettings />
              </Card>
            )}
            
            {selectedTab === 'verification' && (
              <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border-white/10 rounded-3xl p-6">
                <div className="p-6">
                  <h2 className="text-xl font-semibold mb-4">User Verification</h2>
                  <p className="text-gray-600">User verification management coming soon...</p>
                </div>
              </Card>
            )}
            
            {selectedTab === 'ip-monitoring' && (
              <Card className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-sm border-white/10 rounded-3xl p-6">
                <IPMonitoring />
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
