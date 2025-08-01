import React, { useState, useEffect } from 'react';
import ipTrackingService from '../../services/ipTracking.service';

const IPMonitoring = () => {
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [blockedIPs, setBlockedIPs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [ipToBlock, setIpToBlock] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [selectedIP, setSelectedIP] = useState(null);
  const [ipDetails, setIPDetails] = useState(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [statsData, recentData, blockedData] = await Promise.all([
        ipTrackingService.getIPStats(),
        ipTrackingService.getRecentActivity(20),
        ipTrackingService.getBlockedIPs()
      ]);

      setStats(statsData.data);
      setRecentActivity(recentData.data);
      setBlockedIPs(blockedData.data);
      setError(null);
    } catch (err) {
      setError('Failed to load IP tracking data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockIP = async () => {
    if (!ipToBlock.trim()) return;

    try {
      await ipTrackingService.blockIP(ipToBlock.trim(), blockReason);
      setIpToBlock('');
      setBlockReason('');
      fetchAllData();
    } catch (err) {
      console.error('Error blocking IP:', err);
    }
  };

  const handleUnblockIP = async (ip) => {
    try {
      await ipTrackingService.unblockIP(ip);
      fetchAllData();
    } catch (err) {
      console.error('Error unblocking IP:', err);
    }
  };

  const handleIPDetails = async (ip) => {
    try {
      const details = await ipTrackingService.getIPDetails(ip);
      setSelectedIP(ip);
      setIPDetails(details.data);
    } catch (err) {
      console.error('Error fetching IP details:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">IP Monitoring Dashboard</h1>
        <button
          onClick={fetchAllData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Refresh Data
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Requests</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.totalRequests}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Unique IPs</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.uniqueIPs}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Blocked IPs</h3>
            <p className="text-2xl font-bold text-gray-900">{blockedIPs.length}</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Top Endpoint</h3>
            <p className="text-sm font-bold text-gray-900">
              {stats.topEndpoints?.[0]?.[0] || 'N/A'}
            </p>
            <p className="text-xs text-gray-500">
              {stats.topEndpoints?.[0]?.[1] || 0} requests
            </p>
          </div>
        </div>
      )}

      {/* Block IP Form */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Block IP Address</h2>
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Enter IP address"
            value={ipToBlock}
            onChange={(e) => setIpToBlock(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Reason (optional)"
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleBlockIP}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            Block
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  URL
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {recentActivity.map((activity, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(activity.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                    {activity.ip}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activity.method}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {activity.url}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleIPDetails(activity.ip)}
                      className="text-blue-600 hover:text-blue-900 mr-2"
                    >
                      Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Blocked IPs */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Blocked IPs</h2>
        {blockedIPs.length === 0 ? (
          <p className="text-gray-500">No IPs are currently blocked</p>
        ) : (
          <div className="space-y-2">
            {blockedIPs.map((ip) => (
              <div key={ip} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span className="font-mono">{ip}</span>
                <button
                  onClick={() => handleUnblockIP(ip)}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                >
                  Unblock
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* IP Details Modal */}
      {selectedIP && ipDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">IP Details: {selectedIP}</h3>
            <div className="space-y-2">
              <p><strong>Total Requests:</strong> {ipDetails.totalRequests}</p>
              <p><strong>Unique IPs:</strong> {ipDetails.uniqueIPs}</p>
              <p><strong>Top Endpoints:</strong></p>
              <ul className="text-sm">
                {ipDetails.topEndpoints?.slice(0, 3).map(([endpoint, count]) => (
                  <li key={endpoint}>{endpoint}: {count}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => setSelectedIP(null)}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPMonitoring;
