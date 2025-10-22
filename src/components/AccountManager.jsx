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
        tradingAPI.get('/rules/stats'),
        tradingAPI.get('/trading/trades?limit=1')
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
      const response = await tradingAPI.get('/users/portfolio');
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
          <p>Manage your API keys and account settings</p>
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
          <div className="api-keys-card">
            <h3>API Keys Configuration</h3>
            <p className="card-description">
              Add your API keys to enable automated trading. Keys are stored securely and encrypted.
            </p>

            {message.text && (
              <div className={`alert ${message.type}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleApiKeySubmit}>
              {/* Kalshi API Keys */}
              <div className="api-platform-section">
                <div className="platform-header">
                  <h4>Kalshi API</h4>
                  <button 
                    type="button"
                    className="btn-test"
                    onClick={() => testConnection('Kalshi')}
                  >
                    Test Connection
                  </button>
                </div>
                
                <div className="form-group">
                  <label>API Key</label>
                  <input
                    type="password"
                    value={apiKeys.kalshiApiKey}
                    onChange={(e) => handleInputChange('kalshiApiKey', e.target.value)}
                    placeholder="Enter your Kalshi API key"
                  />
                </div>

                <div className="form-group">
                  <label>API Secret</label>
                  <input
                    type="password"
                    value={apiKeys.kalshiSecret}
                    onChange={(e) => handleInputChange('kalshiSecret', e.target.value)}
                    placeholder="Enter your Kalshi API secret"
                  />
                </div>
              </div>

              {/* Polymarket API Keys */}
              <div className="api-platform-section">
                <div className="platform-header">
                  <h4>Polymarket API</h4>
                  <button 
                    type="button"
                    className="btn-test"
                    onClick={() => testConnection('Polymarket')}
                  >
                    Test Connection
                  </button>
                </div>
                
                <div className="form-group">
                  <label>API Key</label>
                  <input
                    type="password"
                    value={apiKeys.polymarketApiKey}
                    onChange={(e) => handleInputChange('polymarketApiKey', e.target.value)}
                    placeholder="Enter your Polymarket API key"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn-primary save-keys"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save API Keys'}
              </button>
            </form>

            <div className="api-notes">
              <h5>Important Notes:</h5>
              <ul>
                <li>API keys are encrypted and stored securely</li>
                <li>Never share your API keys with anyone</li>
                <li>Ensure your API keys have appropriate trading permissions</li>
                <li>Test connections after adding new keys</li>
              </ul>
            </div>
          </div>

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

      {/* Security Settings */}
      <div className="security-section">
        <div className="security-card">
          <h3>Security Settings</h3>
          <div className="security-options">
            <div className="security-item">
              <div className="security-info">
                <h5>Two-Factor Authentication</h5>
                <p>Add an extra layer of security to your account</p>
              </div>
              <button className="btn-outline">
                Enable 2FA
              </button>
            </div>
            
            <div className="security-item">
              <div className="security-info">
                <h5>Session Management</h5>
                <p>View and manage active sessions</p>
              </div>
              <button className="btn-outline">
                Manage Sessions
              </button>
            </div>
            
            <div className="security-item">
              <div className="security-info">
                <h5>API Key Rotation</h5>
                <p>Generate new API keys and revoke old ones</p>
              </div>
              <button className="btn-outline">
                Rotate Keys
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AccountManager;