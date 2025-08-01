import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentService} from '@/services/payment.service';
import { useToast } from '@/hooks/use-toast';

export const useAdminDeposits = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState('pending');

  // Query to fetch deposit proofs
  const {
    data: depositProofs = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['adminDepositProofs', statusFilter],
    queryFn: () => {
      const status = statusFilter === 'all' ? undefined : statusFilter;
      return paymentService.getDepositProofs(status);
    },
  });

  // Mutation to update proof status
  const updateStatusMutation = useMutation({
    mutationFn: ({ proofId, data }) =>
      paymentService.updateDepositProofStatus(proofId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDepositProofs'] });
      toast({
        title: 'Success',
        description: 'Deposit status updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update deposit status',
        variant: 'destructive',
      });
    },
  });

  // Function to approve a deposit
  const approveDeposit = (proofId, reason) => {
    updateStatusMutation.mutate({
      proofId,
      data: { status: 'approved', reason },
    });
  };

  // Function to reject a deposit
  const rejectDeposit = (proofId, reason) => {
    if (!reason) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive',
      });
      return;
    }
    updateStatusMutation.mutate({
      proofId,
      data: { status: 'rejected', reason },
    });
  };

  return {
    depositProofs,
    isLoading,
    error,
    statusFilter,
    setStatusFilter,
    approveDeposit,
    rejectDeposit,
    isUpdating: updateStatusMutation.isPending,
  };
};
