import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { apiService } from '@/services/api.service';

export function useApi(apiFunction, options = {}) {
  const [state, setState] = useState({
    data: null,
    loading: false,
    error: null,
  });

  const { toast } = useToast();

  const execute = async (...args) => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await apiFunction(...args);
      
      setState({ 
        data: result, 
        loading: false, 
        error: null 
      });
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      if (options.showToast && options.successMessage) {
        toast({
          title: 'Success',
          description: options.successMessage,
        });
      }
      
      return result;
    } catch (error) {
      const errorMessage = error?.message || 'An error occurred';
      
      setState({ 
        data: null, 
        loading: false, 
        error: errorMessage 
      });
      
      if (options.onError) {
        options.onError(error);
      }
      
      if (options.showToast) {
        toast({
          title: 'Error',
          description: options.errorMessage || errorMessage,
          variant: 'destructive',
        });
      }
      
      return null;
    }
  };

  const reset = () => {
    setState({ 
      data: null, 
      loading: false, 
      error: null 
    });
  };

  return {
    ...state,
    execute,
    reset,
  };
}

export function useUserProfile() {
  const getUserProfile = useApi(apiService.getUserProfile.bind(apiService), {
    showToast: false,
  });

  const setup2FA = useApi(apiService.setup2FA.bind(apiService), {
    showToast: true,
    successMessage: '2FA setup successful',
    errorMessage: 'Failed to setup 2FA',
  });

  const verify2FA = useApi(apiService.verify2FA.bind(apiService), {
    showToast: true,
    successMessage: '2FA verification successful',
    errorMessage: 'Failed to verify 2FA',
  });

  return { getUserProfile, setup2FA, verify2FA };
}

export function useCreateDeposit() {
  return useApi(apiService.createDeposit.bind(apiService), {
    showToast: true,
    successMessage: 'Deposit request created successfully',
    errorMessage: 'Failed to create deposit request',
  });
}

export function useCreateWithdrawal() {
  return useApi(apiService.createWithdrawal.bind(apiService), {
    showToast: true,
    successMessage: 'Withdrawal request created successfully',
    errorMessage: 'Failed to create withdrawal request',
  });
}

export function usePaymentDetails() {
  return useApi(apiService.getPaymentDetails.bind(apiService), {
    showToast: false,
  });
}

export function useGameHistory() {
  return useApi(apiService.getGameHistory.bind(apiService), {
    showToast: false,
  });
}

export function useWalletBalance() {
  return useApi(apiService.getWalletBalance.bind(apiService), {
    showToast: false,
  });
}
