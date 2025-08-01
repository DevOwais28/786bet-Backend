import { api } from '../utils/api';

export const paymentService = {
  /**
   * Fetches payment details for all available payment methods
   */
  async getPaymentDetails() {
    const response = await api.get('/api/payment-details');
    return response.data;
  },

  /**
   * Creates a new deposit request
   */
  async createDeposit(amount, method, referenceNumber) {
    const response = await api.post('/api/user/deposit', {
      amount,
      method,
      referenceNumber
    });
    return response.data;
  },

  /**
   * Uploads payment proof for a deposit
   */
  async uploadPaymentProof(txId, file, referenceNumber) {
    const formData = new FormData();
    formData.append('screenshot', file);
    if (referenceNumber) {
      formData.append('referenceNumber', referenceNumber);
    }

    const response = await api.post(`/api/deposits/${txId}/proof`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * Fetches all deposit proofs (admin only)
   */
  async getDepositProofs(status) {
    const response = await api.get('/api/admin/deposits/proofs', {
      params: status ? { status } : {},
    });
    return response.data;
  },

  /**
   * Updates the status of a deposit proof (admin only)
   */
  async updateProofStatus(proofId, data) {
    const response = await api.patch(
      `/api/admin/deposits/proofs/${proofId}/status`,
      data
    );
    return response.data;
  }
};