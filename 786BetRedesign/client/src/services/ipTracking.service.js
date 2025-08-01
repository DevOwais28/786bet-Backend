import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '786bet-backend-production-2302.up.railway.app/';

class IPTrackingService {
  constructor() {
    this.baseURL = `${API_URL}/ip-tracking`;
  }

  // Get IP tracking statistics
  async getIPStats() {
    try {
      const response = await axios.get(`${this.baseURL}/stats`);
      return response.data;
    } catch (error) {
      console.error('Error fetching IP stats:', error);
      throw error;
    }
  }

  // Get specific IP details
  async getIPDetails(ip) {
    try {
      const response = await axios.get(`${this.baseURL}/ip/${ip}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching IP details:', error);
      throw error;
    }
  }

  // Get blocked IPs
  async getBlockedIPs() {
    try {
      const response = await axios.get(`${this.baseURL}/blocked`);
      return response.data;
    } catch (error) {
      console.error('Error fetching blocked IPs:', error);
      throw error;
    }
  }

  // Get recent IP activity
  async getRecentActivity(limit = 50) {
    try {
      const response = await axios.get(`${this.baseURL}/recent`, {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      throw error;
    }
  }

  // Get current IP information
  async getCurrentIPInfo() {
    try {
      const response = await axios.get(`${this.baseURL}/current`);
      return response.data;
    } catch (error) {
      console.error('Error fetching current IP info:', error);
      throw error;
    }
  }

  // Block an IP address
  async blockIP(ip, reason = 'manual_block') {
    try {
      const response = await axios.post(`${this.baseURL}/block`, {
        ip,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('Error blocking IP:', error);
      throw error;
    }
  }

  // Unblock an IP address
  async unblockIP(ip) {
    try {
      const response = await axios.post(`${this.baseURL}/unblock`, {
        ip
      });
      return response.data;
    } catch (error) {
      console.error('Error unblocking IP:', error);
      throw error;
    }
  }
}

const ipTrackingService = new IPTrackingService();
export default ipTrackingService;
