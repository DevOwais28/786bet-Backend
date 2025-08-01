import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useCreateDeposit, useCreateWithdrawal, usePaymentDetails } from '@/hooks/useApi';
import { ArrowDownCircle, ArrowUpCircle, Copy, DollarSign } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'easypaisa', label: 'EasyPaisa' },
  { value: 'jazzcash', label: 'JazzCash' },
  { value: 'binance', label: 'Binance' },
  { value: 'usdt', label: 'USDT' },
];

export function TransactionModal({ isOpen, onClose, defaultTab = 'deposit' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [depositAmount, setDepositAmount] = useState('');
  const [depositMethod, setDepositMethod] = useState('');
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawMethod, setWithdrawMethod] = useState('');
  const [withdrawAccount, setWithdrawAccount] = useState('');
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [copiedAddress, setCopiedAddress] = useState(null);

  const { toast } = useToast();
  const paymentDetails = usePaymentDetails();
  const createDeposit = useCreateDeposit();
  const createWithdrawal = useCreateWithdrawal();

  useEffect(() => {
    if (isOpen) {
      paymentDetails.execute();
      // Reset form when opening
      setDepositAmount('');
      setDepositMethod('');
      setWithdrawAmount('');
      setWithdrawMethod('');
      setWithdrawAccount('');
      setShowPaymentDetails(false);
    }
  }, [isOpen]);

  const handleDeposit = async () => {
    if (!depositAmount || !depositMethod) {
      toast({
        title: 'Missing Information',
        description: 'Please enter amount and select payment method',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createDeposit.execute({
        amount,
        method: depositMethod,
      });

      if (result?.success) {
        setShowPaymentDetails(true);
      }
    } catch (error) {
      toast({
        title: 'Deposit Failed',
        description: error instanceof Error ? error.message : 'Failed to process deposit',
        variant: 'destructive',
      });
    }
  };

  const handleWithdraw = async () => {
    if (!withdrawAmount || !withdrawMethod || !withdrawAccount) {
      toast({
        title: 'Missing Information',
        description: 'Please fill all required fields',
        variant: 'destructive',
      });
      return;
    }

    const amount = parseFloat(withdrawAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: 'Invalid Amount',
        description: 'Please enter a valid amount',
        variant: 'destructive',
      });
      return;
    }

    try {
      const result = await createWithdrawal.execute({
        amount,
        method: withdrawMethod,
        accountDetails: withdrawAccount,
      });

      if (result?.success) {
        toast({
          title: 'Success',
          description: 'Withdrawal request submitted successfully',
          variant: 'default',
        });
        onClose();
      }
    } catch (error) {
      toast({
        title: 'Withdrawal Failed',
        description: error instanceof Error ? error.message : 'Failed to process withdrawal',
        variant: 'destructive',
      });
    }
  };

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(type);
    setTimeout(() => setCopiedAddress(null), 2000);
    toast({
      title: 'Copied!',
      description: `${type} copied to clipboard`,
    });
  };

  const renderPaymentInstructions = () => {
    if (paymentDetails.loading) return <div className="text-center py-4">Loading payment details...</div>;
    if (paymentDetails.error || !paymentDetails.data) return <div className="text-center py-4 text-red-500">Error loading payment details</div>;
    if (!depositMethod) return <div className="text-center py-4 text-red-500">No payment method selected</div>;
  
    const details = paymentDetails.data[depositMethod];
    if (!details) return <div className="text-center py-4 text-red-500">Invalid payment method</div>;
  
    // Type guard for bank transfer methods
    const isBankTransfer = ['easypaisa', 'jazzcash'].includes(depositMethod);
    // Type guard for crypto methods
    const isCrypto = ['binance', 'usdt'].includes(depositMethod);
  
    return (
      <div className="space-y-4">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-white mb-2">
            Send {depositAmount} to complete your deposit
          </h3>
          <p className="text-sm text-slate-400">
            After sending payment, upload proof to complete the deposit
          </p>
        </div>
  
        {isCrypto ? (
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">QR Code</Label>
              <div className="mt-2 flex justify-center">
                <img 
                  src={details.qrCode} 
                  alt="Payment QR Code" 
                  className="w-48 h-48 rounded-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Wallet Address</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  value={details.address} 
                  readOnly 
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(details.address, 'Address')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {copiedAddress === 'Address' ? 'Copied!' : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Network</Label>
              <Input 
                value={details.network} 
                readOnly 
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        ) : isBankTransfer ? (
          <div className="space-y-4">
            <div>
              <Label className="text-slate-300">Account Number</Label>
              <div className="flex gap-2 mt-1">
                <Input 
                  value={details.accountNumber} 
                  readOnly 
                  className="bg-slate-700 border-slate-600 text-white"
                />
                <Button
                  size="sm"
                  onClick={() => copyToClipboard(details.accountNumber, 'Account Number')}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {copiedAddress === 'Account Number' ? 'Copied!' : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div>
              <Label className="text-slate-300">Account Name</Label>
              <Input 
                value={details.accountName} 
                readOnly 
                className="bg-slate-700 border-slate-600 text-white"
              />
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-slate-800 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-white">
            {activeTab === 'deposit' ? 'Deposit Funds' : 'Withdraw Funds'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {activeTab === 'deposit' 
              ? 'Add funds to your account to start trading' 
              : 'Withdraw your earnings to your preferred method'}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-slate-700">
            <TabsTrigger 
              value="deposit" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <ArrowDownCircle className="w-4 h-4 mr-2" />
              Deposit
            </TabsTrigger>
            <TabsTrigger 
              value="withdraw" 
              className="data-[state=active]:bg-blue-600 data-[state=active]:text-white"
            >
              <ArrowUpCircle className="w-4 h-4 mr-2" />
              Withdraw
            </TabsTrigger>
          </TabsList>

          <TabsContent value="deposit" className="mt-4">
            {showPaymentDetails ? (
              <>
                {renderPaymentInstructions()}
                <div className="mt-6 flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowPaymentDetails(false)}
                    className="flex-1 bg-transparent border-slate-600 text-white hover:bg-slate-700"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowPaymentDetails(false);
                      onClose();
                    }}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-slate-300">Amount</Label>
                  <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="0.00"
                      className="pl-10 bg-slate-700 border-slate-600 text-white"
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-slate-300">Payment Method</Label>
                  <Select 
                    value={depositMethod} 
                    onValueChange={setDepositMethod}
                  >
                    <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      {PAYMENT_METHODS.map((method) => (
                        <SelectItem 
                          key={method.value} 
                          value={method.value}
                          className="hover:bg-slate-700"
                        >
                          {method.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={handleDeposit}
                  disabled={createDeposit.loading}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                >
                  {createDeposit.loading ? 'Processing...' : 'Continue'}
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="withdraw" className="mt-4">
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Amount</Label>
                <div className="relative mt-1">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="0.00"
                    className="pl-10 bg-slate-700 border-slate-600 text-white"
                  />
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Withdrawal Method</Label>
                <Select 
                  value={withdrawMethod} 
                  onValueChange={setWithdrawMethod}
                >
                  <SelectTrigger className="mt-1 bg-slate-700 border-slate-600 text-white">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    {PAYMENT_METHODS.map((method) => (
                      <SelectItem 
                        key={method.value} 
                        value={method.value}
                        className="hover:bg-slate-700"
                      >
                        {method.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-300">Account Details</Label>
                <Input
                  value={withdrawAccount}
                  onChange={(e) => setWithdrawAccount(e.target.value)}
                  placeholder={
                    ['easypaisa', 'jazzcash'].includes(withdrawMethod) 
                      ? 'Phone number' 
                      : ['binance', 'usdt'].includes(withdrawMethod) 
                        ? 'Wallet address' 
                        : 'Account details'
                  }
                  className="mt-1 bg-slate-700 border-slate-600 text-white"
                />
              </div>
              <Button 
                onClick={handleWithdraw}
                disabled={createWithdrawal.loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {createWithdrawal.loading ? 'Processing...' : 'Withdraw'}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}