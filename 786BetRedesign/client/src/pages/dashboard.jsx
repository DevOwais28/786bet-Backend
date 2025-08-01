/* Dashboard.jsx  –  786Bet user dashboard
   Full single-file component:
   • Overview, Wallet, History, Referral
   • Responsive sidebar (desktop + mobile)
   • Deposit / Withdraw forms
   • Profile modal (Formik + Yup + avatar upload)
   • IP tracking & toast feedback
--------------------------------------------------------------------*/
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Wallet,
  TrendingUp,
  Gamepad2,
  Copy,
  Plus,
  Minus,
  Menu,
  X,
  Shield,
  Loader2,
  LogOut,
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useToast } from '../hooks/use-toast';
import { apiService } from '../services/api.service';
import { useAuth } from '@/contexts/AuthContext';
import ipTrackingService from '@/services/ipTracking.service';


export default function Dashboard() {
  /* ------------------------------- STATE -------------------------- */
  const [location, setLocation] = useLocation();
  const [isSidebarOpen, setSidebarOpen]   = useState(false);
  const [isProfileModalOpen, setProfileModalOpen] = useState(false);
  
  // Parse section from URL
  const getSectionFromPath = () => {
    const path = location.split('/').pop() || 'overview';
    return ['overview', 'wallet', 'history', 'referral'].includes(path) ? path : 'overview';
  };
  
  const activeSection = getSectionFromPath();

  /* Wallet form state */
  const [depositAmount, setDepositAmount]     = useState('');
  const [depositMethod, setDepositMethod]     = useState('');
  const [withdrawalAmount, setWithdrawalAmount] = useState('');
  const [withdrawalMethod, setWithdrawalMethod] = useState('');
  const [accountDetails, setAccountDetails]     = useState('');

  /* ------------------------------ HOOKS ---------------------------- */
  const { toast } = useToast();
  const { user, logout } = useAuth();

  /* ---------------------------- QUERIES ---------------------------- */
  const { data: userProfile } = useQuery({
    queryKey: ['userProfile'],
    queryFn:   () => apiService.getUserProfile(),
    enabled:   !!user,
  });

  const { data: currentIP } = useQuery({
    queryKey: ['currentIP'],
    queryFn:  () => ipTrackingService.getCurrentIPInfo(),
    enabled:  !!user,
  });

  const { data: transactions } = useQuery({
    queryKey: ['userTransactions'],
    queryFn:  () => apiService.getTransactionHistory(),
    enabled:  !!user,
  });

  const { data: gameHistory } = useQuery({
    queryKey: ['gameHistory'],
    queryFn:  () => apiService.getGameHistory(),
    enabled:  !!user,
  });

  const { data: paymentMethods = [], isLoading: paymentMethodsLoading } = useQuery({
    queryKey: ['paymentMethods'],
    queryFn:  async () => {
      try {
        const response = await apiService.getPaymentMethods();
        return Array.isArray(response) ? response : response.methods || [];
      } catch (error) {
        console.error('Failed to load payment methods:', error);
        return [{
          id: 'usdt',
          name: 'USDT (TRX)',
          type: 'crypto',
          network: 'TRX',
          status: 'active',
          minAmount: 10,
          minWithdrawal: 10,
        }];
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: walletBalance } = useQuery({
    queryKey: ['walletBalance'],
    queryFn: () => apiService.getWalletBalance(),
    enabled: !!user,
  });

  /* ----------------------- EFFECTS / HELPERS ------------------------ */
  useEffect(() => {
    const active = Array.isArray(paymentMethods) ? paymentMethods.filter((m) => m.status === 'active') : [];
    if (active.length) {
      if (!depositMethod) setDepositMethod(active[0].id);
      if (!withdrawalMethod) setWithdrawalMethod(active[0].id);
    }
  }, [paymentMethods]);

  const activePaymentMethods = Array.isArray(paymentMethods) ? paymentMethods.filter((m) => m.status === 'active') : [];
  
  // Ensure we always have at least the default payment method
  const displayPaymentMethods = activePaymentMethods.length > 0 ? activePaymentMethods : [
    {
      id: 'usdt',
      name: 'USDT (TRX)',
      type: 'crypto',
      network: 'TRX',
      status: 'active',
      minAmount: 10,
      minWithdrawal: 10,
    }
  ];

  const toggleSidebar = () => setSidebarOpen((s) => !s);
  
  const navigateToSection = (section) => {
    setLocation(`/dashboard/${section}`);
    setSidebarOpen(false);
  };

  const copyReferralCode = () => {
    if (userProfile?.referralCode) {
      navigator.clipboard.writeText(userProfile.referralCode);
      toast({ title: 'Copied!', description: 'Referral code copied to clipboard' });
    }
  };

  /* ------------------------------------------------------------------ */
  /* ------------------------- SECTION RENDERS ------------------------ */
  /* ------------------------------------------------------------------ */
  const renderOverview = () => (
    <div className="space-y-8 sm:space-y-12">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black mb-3">
          Welcome back,{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-amber-600">
            {user?.username || 'Player'}
          </span>
          !
        </h1>
        <p className="text-gray-400 text-base sm:text-lg">
          Here's what's happening with your account today.
        </p>
      </div>

      {/* Balance widgets */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <BalanceCard
          icon={<Wallet />}
          title="Current Balance"
          value={`$${(walletBalance?.profile?.balance || 0).toFixed(2)}`}
          loading={!walletBalance}
        />
        <BalanceCard
          icon={<TrendingUp />}
          title="Total Wagered"
          value={`$${(walletBalance?.stats?.totalWagered || 0).toFixed(2)}`}
          loading={!walletBalance}
          gradient="from-emerald-400 to-green-500"
        />
        <BalanceCard
          icon={<Gamepad2 />}
          title="Games Played"
          value={userProfile?.gamesPlayed || 0}
          loading={!userProfile}
          gradient="from-blue-400 to-indigo-500"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QuickActions />
        <RecentActivity gameHistory={gameHistory} />
      </div>

      <RecentTransactions transactions={transactions} />
      <SecurityInfo currentIP={currentIP} />
    </div>
  );

  const renderWallet = () => (
    <div className="space-y-8 sm:space-y-12">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black mb-3">Wallet Management</h1>
        <p className="text-gray-400 text-base sm:text-lg">
          Manage your deposits and withdrawals
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <DepositForm
          amount={depositAmount}
          setAmount={setDepositAmount}
          method={depositMethod}
          setMethod={setDepositMethod}
          methods={displayPaymentMethods}
        />
        <WithdrawalForm
          amount={withdrawalAmount}
          setAmount={setWithdrawalAmount}
          method={withdrawalMethod}
          setMethod={setWithdrawalMethod}
          accountDetails={accountDetails}
          setAccountDetails={setAccountDetails}
          methods={displayPaymentMethods}
        />
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="space-y-8 sm:space-y-12">
      <h1 className="text-3xl sm:text-4xl font-black">Game History</h1>
      <GameHistoryTable data={gameHistory} />
    </div>
  );

  const renderReferral = () => (
    <div className="space-y-8 sm:space-y-12">
      <div>
        <h1 className="text-3xl sm:text-4xl font-black mb-3">Referral Program</h1>
        <p className="text-gray-400 text-base sm:text-lg">
          Earn bonuses by inviting friends
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="bg-gray-800 p-6 rounded-2xl">
          <h3 className="text-xl sm:text-2xl font-bold mb-6">Your Referral Code</h3>
          <div className="bg-gray-700/50 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-xl sm:text-2xl font-bold text-yellow-400">
              {userProfile?.referralCode || 'LOADING...'}
            </span>
            <Button onClick={copyReferralCode} className="w-full sm:w-auto">
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </Button>
          </div>
          <p className="text-gray-400 text-xs sm:text-sm mt-4">
            Share this code with friends to earn 10% of their first deposit!
          </p>
        </div>

        <div className="bg-gray-800 p-6 rounded-2xl">
          <h3 className="text-xl sm:text-2xl font-bold mb-6">Referral Stats</h3>
          <div className="space-y-3 text-sm sm:text-base">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Referrals</span>
              <span>{userProfile?.totalReferrals || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Active Referrals</span>
              <span>{userProfile?.activeReferrals || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Total Earned</span>
              <span className="text-emerald-400 font-medium">
                ${(userProfile?.referralEarnings || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  /* ------------------------------------------------------------------ */
  /* ---------------------------- LAYOUT ------------------------------ */
  /* ------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block lg:w-64 h-screen sticky top-0">
          <div className="bg-gray-900 h-screen p-4 flex flex-col">
            <h2 className="text-xl font-bold mb-6">Dashboard</h2>
            <nav className="flex-1 space-y-2">
              {['overview', 'wallet', 'history', 'referral'].map((s) => (
                <Button
                  key={s}
                  variant={activeSection === s ? 'default' : 'ghost'}
                  onClick={() => navigateToSection(s)}
                  className="w-full justify-start capitalize"
                >
                  {s}
                </Button>
              ))}
              <Link href="/game-room">
                <Button variant="ghost" className="w-full justify-start">
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Aviator Game
                </Button>
              </Link>
            </nav>

            <div className="space-y-2 mt-4">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => setProfileModalOpen(true)}
              >
                Profile
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-400"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Mobile overlay & drawer */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 z-40 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-gray-900 z-50 transform transition-transform duration-300 lg:hidden ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="h-full p-4 flex flex-col">
            <h2 className="text-xl font-bold mb-6">Dashboard</h2>
            <nav className="flex-1 space-y-2">
              {['overview', 'wallet', 'history', 'referral'].map((s) => (
                <Button
                  key={s}
                  variant={activeSection === s ? 'default' : 'ghost'}
                  onClick={() => navigateToSection(s)}
                  className="w-full justify-start capitalize"
                >
                  {s}
                </Button>
              ))}
              <Link href="/game-room">
                <Button variant="ghost" className="w-full justify-start">
                  <Gamepad2 className="w-4 h-4 mr-2" />
                  Aviator Game
                </Button>
              </Link>
            </nav>

            <div className="space-y-2 mt-4">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => {
                  setProfileModalOpen(true);
                  toggleSidebar();
                }}
              >
                Profile
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start text-red-400"
                onClick={() => {
                  logout();
                  toggleSidebar();
                }}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 w-full">
          {/* Mobile header */}
          <header className="lg:hidden sticky top-0 bg-gray-900/80 backdrop-blur-sm z-30 p-4 flex items-center justify-between border-b border-gray-800">
            <span className="text-xl font-bold text-yellow-400">786Bet</span>
            <button onClick={toggleSidebar}>
              <Menu className="w-6 h-6" />
            </button>
          </header>

          <main className="p-4 sm:p-8">
            {(() => {
              switch (activeSection) {
                case 'overview': return renderOverview();
                case 'wallet': return renderWallet();
                case 'history': return renderHistory();
                case 'referral': return renderReferral();
                default: return renderOverview();
              }
            })()}
          </main>
        </div>
      </div>

      {/* Profile Modal */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">Profile Settings</h3>
              <button onClick={() => setProfileModalOpen(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <ProfileForm user={user} close={() => setProfileModalOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================== */
/* =======================  SUB-COMPONENTS  ========================== */
/* ================================================================== */

function BalanceCard({ icon, title, value, loading, gradient = 'from-yellow-400 to-amber-500' }) {
  return (
    <div
      className={`bg-gradient-to-br ${gradient} p-6 rounded-2xl text-black shadow-xl transform hover:scale-105 transition-transform`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-black/70 text-sm font-semibold uppercase">{title}</div>
          <div className="text-3xl font-black">
            {loading ? <div className="h-8 w-24 bg-black/20 rounded animate-pulse" /> : value}
          </div>
        </div>
        <div className="w-12 h-12 bg-black/20 rounded-2xl flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

function QuickActions() {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4">Quick Actions</h3>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" className="bg-gray-700">$50</Button>
          <Button variant="outline" className="bg-gray-700">$100</Button>
          <Button variant="outline" className="bg-gray-700">$250</Button>
        </div>
        <div className="flex space-x-2">
          <Link href="/deposit" className="flex-1">
            <Button className="w-full bg-yellow-400 text-black font-bold">
              <Plus className="w-4 h-4 mr-2" /> Deposit
            </Button>
          </Link>
          <Link href="/withdraw" className="flex-1">
            <Button variant="outline" className="w-full">
              <Minus className="w-4 h-4 mr-2" /> Withdraw
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function RecentActivity({ gameHistory }) {
  return (
    <div className="bg-gray-800 p-6 rounded-2xl">
      <h3 className="text-xl font-bold mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {Array.isArray(gameHistory) && gameHistory.length > 0 ? (
          gameHistory.slice(0, 3).map((g, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span className="text-gray-400">Aviator</span>
              <span className={g.payout > 0 ? 'text-emerald-400' : 'text-red-400'}>
                {g.payout > 0 ? '+' : ''}${g.payout.toFixed(2)}
              </span>
            </div>
          ))
        ) : (
          <div className="text-gray-500 text-center py-4">No recent activity</div>
        )}
      </div>
    </div>
  );
}

function RecentTransactions({ transactions }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Recent Transactions</h3>
      <div className="space-y-2">
        {(Array.isArray(transactions) ? transactions : [])?.slice(0, 5).map((tx, i) => (
          <div key={i} className="flex justify-between text-sm">
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${tx.type === 'deposit' ? 'bg-green-500' : 'bg-red-500'
                  }`}
              />
              <span className="text-gray-300">{tx.type}</span>
            </div>
            <span className="text-white font-medium">${tx.amount}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecurityInfo({ currentIP }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6">
      <div className="flex items-center space-x-2 mb-4">
        <Shield className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold">Security Information</h3>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-300">Current IP:</span>
          <span className="font-mono">{currentIP?.data?.clientIP || '…'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Location:</span>
          <span>{currentIP?.data?.country || 'Unknown'}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-300">Device:</span>
          <span className="truncate max-w-[150px] text-xs">
            {currentIP?.data?.userAgent || navigator.userAgent}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ------------------ Deposit / Withdrawal Forms -------------------- */
function DepositForm({ amount, setAmount, method, setMethod, methods }) {
  const { toast } = useToast();
  const [walletAddress, setWalletAddress] = useState('');
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [qrCodeUrl, setQrCodeUrl] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(amount);
    const m = methods.find((x) => x.id === method);
    if (!m || amt < m.minAmount) {
      toast({
        title: 'Invalid amount',
        description: `Minimum deposit is $${m?.minAmount || 10}`,
        variant: 'destructive',
      });
      return;
    }
    try {
      const res = await apiService.createDeposit({
        amount: amt,
        method: m.id,
        network: m.network || 'TRX',
        walletAddress: walletAddress.trim() || undefined,
      });
      const isCrypto = m.type === 'crypto';
      
      console.log('Deposit response:', res);
      
      console.log('Deposit response:', res);
      
      // Extract platform recipient address from backend response
      const responseData = res.data || res;
      const paymentInfo = responseData.data?.paymentDetails || responseData.paymentDetails || responseData;
      
      // Ensure we get the platform's recipient address, not user's
      const recipientAddress = paymentInfo.address || 
                             (paymentInfo.$__parent?.paymentDetails?.address) ||
                             paymentInfo.paymentDetails?.address;
      
      const details = {
        address: recipientAddress,
        qrCode: paymentInfo.qrCode || (paymentInfo.$__parent?.paymentDetails?.qrCode),
        network: paymentInfo.network || (paymentInfo.$__parent?.paymentDetails?.network),
        amount: amt,
        currency: m.name,
        isCrypto,
        instructions: paymentInfo.instructions || responseData.message || `Send ${amt} ${m.name} to the address below`
      };
      
      console.log('Parsed payment details:', details);
      setPaymentDetails(details);
      setShowPaymentDetails(true);
      
      // Use backend QR code if provided, otherwise generate
      if (details.qrCode) {
        setQrCodeUrl(details.qrCode);
      } else if (isCrypto && details.address) {
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(details.address)}`;
        setQrCodeUrl(qrUrl);
      }
      
      toast({
        title: 'Deposit Created Successfully',
        description: isCrypto 
          ? 'Payment details and QR code generated below'
          : 'Payment instructions provided below',
        duration: 5000,
      });
      setAmount('');
      setWalletAddress('');
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-2xl space-y-4">
      <h3 className="text-xl font-bold text-white">Deposit Funds</h3>
      <div>
        <Label className="text-gray-200">Amount (USD)</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="10"
          required
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
          placeholder="Enter amount"
        />
      </div>
      <div>
        <Label className="text-gray-200">Payment Method</Label>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white focus:border-yellow-500 focus:ring-yellow-500">
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            {methods.map((m) => (
              <SelectItem key={m.id} value={m.id} className="text-white hover:bg-gray-600">
                {m.name} {m.network && `(${m.network})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {method && (
        <div className="bg-gray-700 p-4 rounded-lg">
          <p className="text-sm text-gray-300 mb-2">
            {methods.find(m => m.id === method)?.type === 'crypto' ? (
              <>
                <span className="text-yellow-400 font-medium">QR Code Payment:</span> After creating the deposit, you'll receive a wallet address and QR code to scan for payment.
                <br />
                <span className="text-xs text-gray-400">Wallet address (optional): Only provide if you want to track your sending address</span>
              </>
            ) : (
              <>
                <span className="text-blue-400 font-medium">Traditional Payment:</span> Follow the provided instructions for bank transfer or other payment methods.
              </>
            )}
          </p>
          <div>
            <Label className="text-gray-200 text-sm">Your Wallet Address (Optional)</Label>
            <Input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="bg-gray-600 border-gray-500 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500 mt-1"
              placeholder="TRX wallet address (for tracking only)"
            />
          </div>
        </div>
      )}
      <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold" disabled={!amount || !method}>
        Deposit Now
      </Button>
      
      {showPaymentDetails && paymentDetails && (
        <div className="border-t border-gray-600 pt-4 mt-4">
          <h4 className="text-lg font-bold text-white mb-3">Payment Details</h4>
          <div className="bg-gray-700 p-4 rounded-lg">
            <div className="space-y-4">
              <div>
                <span className="text-gray-300">Amount:</span>
                <span className="text-white font-bold ml-2">${paymentDetails.amount} {paymentDetails.currency}</span>
              </div>
              
              {paymentDetails.isCrypto && (
                <>
                  <div>
                    <span className="text-gray-300">Network:</span>
                    <span className="text-white font-bold ml-2">{paymentDetails.network}</span>
                  </div>
                  
                  <div>
                    <span className="text-gray-300">Send payment to this Platform Address:</span>
                    <div className="bg-gray-800 p-3 rounded text-sm font-mono text-yellow-400 mt-1 break-all">
                      {paymentDetails.address}
                    </div>
                  </div>
                  
                  {(paymentDetails.qrCode || qrCodeUrl) && (
                    <div>
                      <span className="text-gray-300">QR Code (Scan to copy address):</span>
                      <div className="bg-white p-4 rounded mt-2 flex justify-center border">
                        <img src={paymentDetails.qrCode || qrCodeUrl} alt="Platform Wallet Address QR Code" className="w-48 h-48" />
                      </div>
                      <p className="text-xs text-gray-400 mt-2">
                        Scan this QR code with your wallet app to copy the platform address, then send the exact amount shown above
                      </p>
                    </div>
                  )}
                  
                  <div className="text-sm text-gray-400">
                    <p>📱 Scan the QR code or copy the wallet address above</p>
                    <p>⏱️ Complete payment within 15 minutes</p>
                  </div>
                </>
              )}
              
              {!paymentDetails.isCrypto && (
                <div className="text-gray-300">
                  <p>Follow these instructions to complete your payment:</p>
                  <div className="bg-gray-800 p-3 rounded mt-2">
                    <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(paymentDetails.instructions || paymentDetails, null, 2)}</pre>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    navigator.clipboard.writeText(paymentDetails.address || '');
                  }}
                  className="flex-1"
                >
                  Copy Address
                </Button>
                <Button 
                  onClick={() => {
                    setShowPaymentDetails(false);
                    setPaymentDetails(null);
                  }}
                  className="flex-1"
                >
                  Close
                </Button>
              </div>
              <div className="text-xs text-gray-400 text-center mt-2">
                After sending payment, check your transaction history for confirmation
              </div>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function WithdrawalForm({
  amount,
  setAmount,
  method,
  setMethod,
  accountDetails,
  setAccountDetails,
  methods,
}) {
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const m = methods.find((x) => x.id === method);
    const amt = parseFloat(amount);
    if (!m || amt < m.minWithdrawal) {
      toast({
        title: 'Invalid amount',
        description: `Minimum withdrawal is $${m?.minWithdrawal || 10}`,
        variant: 'destructive',
      });
      return;
    }
    if (!accountDetails.trim()) {
      toast({ title: 'Wallet address required', variant: 'destructive' });
      return;
    }
    try {
      await apiService.createWithdrawal({
        amount: amt,
        method: m.id,
        network: m.network || 'TRX',
        address: accountDetails.trim(),
      });
      toast({ title: 'Withdrawal requested' });
      setAmount('');
      setAccountDetails('');
    } catch (err) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-2xl space-y-4">
      <h3 className="text-xl font-bold text-white">Withdraw Funds</h3>
      <div>
        <Label className="text-gray-200">Amount (USD)</Label>
        <Input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="10"
          required
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
          placeholder="Enter amount"
        />
      </div>
      <div>
        <Label className="text-gray-200">Payment Method</Label>
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="bg-gray-700 border-gray-600 text-white focus:border-yellow-500 focus:ring-yellow-500">
            <SelectValue placeholder="Select payment method" />
          </SelectTrigger>
          <SelectContent className="bg-gray-700 border-gray-600">
            {methods.map((m) => (
              <SelectItem key={`w-${m.id}`} value={m.id} className="text-white hover:bg-gray-600">
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-gray-200">Wallet Address / Account</Label>
        <Input
          value={accountDetails}
          onChange={(e) => setAccountDetails(e.target.value)}
          placeholder="Enter wallet address"
          required
          className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-yellow-500 focus:ring-yellow-500"
        />
      </div>
      <Button type="submit" className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold" disabled={!amount || !method || !accountDetails}>
        Withdraw Now
      </Button>
    </form>
  );
}

/* ------------------------- Game History Table --------------------- */
function GameHistoryTable({ data }) {
  const gameData = Array.isArray(data) ? data : [];
  
  if (gameData.length === 0) {
    return (
      <div className="bg-gray-800/50 rounded-2xl border border-white/10 p-8 text-center">
        <p className="text-gray-400">No game history available</p>
      </div>
    );
  }
  
  return (
    <div className="bg-gray-800/50 rounded-2xl overflow-auto border border-white/10">
      <table className="w-full text-sm">
        <thead className="bg-gray-700/50">
          <tr>
            <th className="p-4 text-left">Game</th>
            <th className="p-4 text-left">Bet</th>
            <th className="p-4 text-left">Multiplier</th>
            <th className="p-4 text-left">Payout</th>
            <th className="p-4 text-left">Time</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700/50">
          {gameData.map((g, i) => (
            <tr key={i} className="hover:bg-gray-700/40">
              <td className="p-4">Aviator</td>
              <td className="p-4">${g.betAmount?.toFixed(2) || '0.00'}</td>
              <td className={`p-4 ${g.multiplier >= 1 ? 'text-emerald-400' : 'text-red-400'}`}>
                {(g.multiplier || 0).toFixed(2)}x
              </td>
              <td className={`p-4 ${g.payout > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {g.payout > 0 ? '+' : ''}${g.payout?.toFixed(2) || '0.00'}
              </td>
              <td className="p-4 text-gray-400">{g.timeAgo || 'Unknown'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------- Profile Form --------------------------- */
function ProfileForm({ user, close }) {
  const { toast } = useToast();
  return (
    <Formik
      initialValues={{
        username: user?.username || '',
        email: user?.email || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
        avatar: null,
      }}
      validationSchema={Yup.object({
        username: Yup.string()
          .min(3, 'Username must be at least 3 characters')
          .max(20, 'Username must be at most 20 characters')
          .required('Username is required'),
        currentPassword: Yup.string()
          .min(6, 'Password must be at least 6 characters')
          .when('newPassword', {
            is: (val) => val && val.length > 0,
            then: (schema) => schema.required('Current password required'),
            otherwise: (schema) => schema.notRequired()
          }),
        newPassword: Yup.string()
          .min(6, 'New password must be at least 6 characters')
          .notOneOf([Yup.ref('currentPassword'), null], 'New password must be different from current'),
        confirmPassword: Yup.string()
          .when('newPassword', {
            is: (val) => val && val.length > 0,
            then: (schema) => schema.oneOf([Yup.ref('newPassword')], 'Passwords must match').required('Please confirm your new password'),
            otherwise: (schema) => schema.notRequired()
          }),
      })}
      onSubmit={async (values, { setSubmitting, resetForm }) => {
        try {
          console.log('Profile update started with values:', values);
          const changed = {};
          
          // Always include username
          changed.username = values.username;
          
          // Include password fields if new password is provided
          if (values.newPassword) {
            changed.currentPassword = values.currentPassword;
            changed.newPassword = values.newPassword;
          }
          
          // Always attempt update since username is required
          await apiService.updateUserProfile(changed);
          console.log('Profile update successful');
          
          if (values.avatar) {
            console.log('Uploading avatar...');
            const fd = new FormData();
            fd.append('avatar', values.avatar);
            await apiService.uploadAvatar(fd);
            console.log('Avatar upload successful');
          }
          
          toast({ title: 'Profile updated successfully' });
          close();
          resetForm();
        } catch (err) {
          console.error('Profile update error:', err);
          const errorMessage = err.response?.data?.message || err.message || 'Failed to update profile';
          toast({ 
            title: 'Update Failed', 
            description: errorMessage, 
            variant: 'destructive',
            duration: 5000
          });
        } finally {
          setSubmitting(false);
        }
      }}
    >
      {({ isSubmitting, dirty }) => (
        <Form className="space-y-4">
          <div>
            <Label>Username</Label>
            <Field
              name="username"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
            />
            <ErrorMessage name="username" component="div" className="text-red-400 text-xs" />
          </div>
          <div>
            <Label>Email (Read-only)</Label>
            <div className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-gray-400">
              {user?.email || 'No email provided'}
            </div>
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <Label>Avatar</Label>
            <input
              type="file"
              name="avatar"
              accept="image/*"
              onChange={(event) => {
                const file = event.currentTarget.files[0];
                if (file) {
                  // This will be handled by Formik's setFieldValue in a more complete implementation
                  // For now, we'll use the direct approach in onSubmit
                }
              }}
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-sm"
            />
            <p className="text-xs text-gray-400 mt-1">Upload a profile picture (optional)</p>
          </div>

          <div className="border-t border-gray-700 pt-4">
            <h4 className="text-sm font-medium mb-2">Change Password</h4>
            <Field
              name="currentPassword"
              type="password"
              placeholder="Current password"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-2"
            />
            <Field
              name="newPassword"
              type="password"
              placeholder="New password"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-2"
            />
            <Field
              name="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 mb-2"
            />
          </div>

          <div className="flex space-x-2">
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : 'Save'}
            </Button>
            <Button type="button" variant="outline" onClick={close} className="flex-1">
              Cancel
            </Button>
          </div>
        </Form>
      )}
    </Formik>
  );
}