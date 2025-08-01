import { useState } from 'react';
import { toast } from './use-toast';
import { paymentService } from '@/services/payment.service';

// export  PaymentMethod = 'easypaisa' | 'jazzcash' | 'binance' | 'usdt';

export const usePayment = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [txId, setTxId] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Fetch payment details when the hook is used
  const fetchPaymentDetails = async () => {
    try {
      setIsLoading(true);
      const details = await paymentService.getPaymentDetails();
      setPaymentDetails(details);
      return details;
    } catch (error) {
      console.error('Failed to fetch payment details:', error);
      toast({
        title: 'Error',
        description: 'Failed to load payment methods. Please try again later.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle deposit creation
  const createDeposit = async (amount, method, referenceNumber) => {
    try {
      if (!method) {
        throw new Error('Please select a payment method');
      }

      setIsLoading(true);
      const response = await paymentService.createDeposit(
        amount,
        method,
        referenceNumber
      );
      
      setTxId(response.txId);
      setSelectedMethod(method);
      toast({
        title: 'Deposit Request Created',
        description: response.message,
      });
      
      return response;
    } catch (error) {
      console.error('Deposit creation failed:', error);
      toast({
        title: 'Deposit Failed',
        description: error.message || 'Failed to create deposit. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Handle file upload for payment proof
  const uploadPaymentProof = async (file, referenceNumber) => {
    if (!txId || !selectedMethod) {
      throw new Error('No active transaction found. Please create a deposit first.');
    }
    
    if (!file) {
      throw new Error('No file selected');
    }

    try {
      setIsLoading(true);
      setUploadProgress(0);
      
      // Simulate upload progress (in a real app, you'd use axios with onUploadProgress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          const next = prev + 10;
          if (next >= 90) clearInterval(progressInterval);
          return next > 90 ? 90 : next;
        });
      }, 200);

      const response = await paymentService.uploadPaymentProof(txId, file, referenceNumber);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      toast({
        title: 'Upload Successful',
        description: response.message || 'Payment proof uploaded successfully!',
      });
      
      // Reset form after successful upload
      setTimeout(() => {
        setSelectedMethod(null);
        setTxId(null);
        setUploadProgress(0);
      }, 2000);
      
      return response;
    } catch (error) {
      console.error('Proof upload failed:', error);
      toast({
        title: 'Upload Failed',
        description: error.message || 'Failed to upload payment proof. Please try again.',
        variant: 'destructive',
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Reset the payment process
  const resetPayment = () => {
    setSelectedMethod(null);
    setTxId(null);
    setUploadProgress(0);
  };

  return {
    isLoading,
    paymentDetails,
    selectedMethod,
    setSelectedMethod,
    txId,
    uploadProgress,
    fetchPaymentDetails,
    createDeposit,
    uploadPaymentProof,
    resetPayment,
  };
};

