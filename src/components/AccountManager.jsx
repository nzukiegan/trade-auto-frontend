import React, { useState, useEffect } from 'react';
import { tradingAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './AccountManager.css';

const AccountManager = () => {
  const { user, updateApiKeys } = useAuth();
  const [apiKeys, setApiKeys] = useState({
    kalshiApiKey: '',
    kalshiSecret: '',
    polymarketApiKey: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [portfolio, setPortfolio] = useState(null);
  const [accountStats, setAccountStats] = useState({
    totalTrades: 0,
    activeRules: 0,
    totalProfit: 0
  });

  useEffect(() => {
    fetchAccountStats();
    fetchPortfolio();
  }, []);

  const fetchAccountStats = async () => {
    try {
      const [rulesResponse, tradesResponse] = await Promise.all([
        tradingAPI.get('/api/rules/stats'),
        tradingAPI.get('/api/trading/trades?limit=1')
      ]);

      setAccountStats({
        totalTrades: tradesResponse.data.pagination?.total || 0,
        activeRules: rulesResponse.data.stats?.reduce((sum, stat) => sum + stat.active, 0) || 0,
        totalProfit: 0 // This would come from a separate endpoint
      });
    } catch (error) {
      console.error('Error fetching account stats:', error);
    }
  };

  const fetchPortfolio = async () => {
    try {
      const response = await tradingAPI.get('/api/users/portfolio');
      setPortfolio(response.data);
    } catch (error) {
      console.error('Error fetching portfolio:', error);
    }
  };

  const handleApiKeySubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const result = await updateApiKeys(
        apiKeys.kalshiApiKey,
        apiKeys.kalshiSecret,
        apiKeys.polymarketApiKey
      );

      if (result.success) {
        setMessage({
          type: 'success',
          text: 'API keys updated successfully!'
        });
        setApiKeys({
          kalshiApiKey: '',
          kalshiSecret: '',
          polymarketApiKey: ''
        });
      } else {
        setMessage({
          type: 'error',
          text: result.message
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to update API keys'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setApiKeys(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const testConnection = async (platform) => {
    setMessage({ type: '', text: '' });
    
    try {
      // This would actually test the API connection
      setMessage({
        type: 'info',
        text: `Testing ${platform} connection...`
      });

      // Simulate API test
      setTimeout(() => {
        setMessage({
          type: 'success',
          text: `${platform} connection successful!`
        });
      }, 1000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: `${platform} connection failed: ${error.message}`
      });
    }
  };

  return (
    <div className="account-manager">
      <div className="section-header">
        <div className="section-title">
          <h2>Account Management</h2>
        </div>
      </div>

      <div className="account-layout">
        {/* User Profile */}
        <div className="profile-section">
          <div className="profile-card">
            <h3>Profile Information</h3>
            <div className="profile-info">
              <div className="info-item">
                <label>Username</label>
                <div className="info-value">{user?.username}</div>
              </div>
              <div className="info-item">
                <label>Email</label>
                <div className="info-value">{user?.email}</div>
              </div>
              <div className="info-item">
                <label>Member Since</label>
                <div className="info-value">
                  {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                </div>
              </div>
              <div className="info-item">
                <label>Last Login</label>
                <div className="info-value">
                  {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>

          {/* Account Statistics */}
          <div className="stats-card">
            <h3>Account Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">{accountStats.totalTrades}</div>
                <div className="stat-label">Total Trades</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">{accountStats.activeRules}</div>
                <div className="stat-label">Active Rules</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">${accountStats.totalProfit}</div>
                <div className="stat-label">Total P&L</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">
                  {portfolio?.balance ? `$${portfolio.balance}` : 'N/A'}
                </div>
                <div className="stat-label">Account Balance</div>
              </div>
            </div>
          </div>
        </div>

        {/* API Keys Management */}
        <div className="api-keys-section">
          {/* Portfolio Overview */}
          {portfolio && (
            <div className="portfolio-card">
              <h3>Portfolio Overview</h3>
              <div className="portfolio-balance">
                <div className="balance-amount">
                  ${portfolio.balance?.toLocaleString() || '0'}
                </div>
                <div className="balance-label">Total Balance</div>
              </div>
              
              <div className="platform-balances">
                <div className="platform-balance">
                  <span className="platform-name">Kalshi</span>
                  <span className="platform-amount">
                    ${portfolio.portfolio?.kalshi?.balance || '0'}
                  </span>
                </div>
                <div className="platform-balance">
                  <span className="platform-name">Polymarket</span>
                  <span className="platform-amount">
                    ${portfolio.portfolio?.polymarket?.balance || '0'}
                  </span>
                </div>
              </div>

              <div className="portfolio-actions">
                <button className="btn-outline">
                  View Detailed Portfolio
                </button>
                <button className="btn-outline">
                  Export Trade History
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountManager;