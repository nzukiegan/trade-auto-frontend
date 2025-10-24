import React, { useState, useEffect } from 'react';
import { tradingAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './AccountManager.css';

const AccountManager = () => {
  const { user, updateApiKeys } = useAuth();
  const [apiKeys, setApiKeys] = useState({
    kalshiApiKey: '',
    kalshiPrivateKeyPath: '',
    polymarketWalletKey: ''
  })
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [portfolio, setPortfolio] = useState(null);
  const [accountStats, setAccountStats] = useState({
    totalTrades: 0,
    activeRules: 0,
    totalProfit: 0
  });
  const [connectionStatus, setConnectionStatus] = useState({
    kalshi: 'disconnected',
    polymarket: 'disconnected'
  });

  useEffect(() => {
    fetchAccountStats();
    fetchPortfolio();
    checkConnectionStatus();
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
        totalProfit: 0
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

  const checkConnectionStatus = async () => {
    try {
      // Check Kalshi connection
      const kalshiResponse = await tradingAPI.get('/api/trading/kalshi/status');
      setConnectionStatus(prev => ({
        ...prev,
        kalshi: kalshiResponse.data.connected ? 'connected' : 'disconnected'
      }));

      // Check Polymarket connection
      const polyResponse = await tradingAPI.get('/api/trading/polymarket/status');
      setConnectionStatus(prev => ({
        ...prev,
        polymarket: polyResponse.data.connected ? 'connected' : 'disconnected'
      }));
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const handleApiKeySubmit = async (platform) => {
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        [platform]: {
          ...(platform === 'kalshi' && {
            apiKey: apiKeys.kalshiApiKey,
            privateKeyPath: apiKeys.kalshiPrivateKeyPath
          }),
          ...(platform === 'polymarket' && {
            walletKey: apiKeys.polymarketWalletKey
          })
        }
      };

      

      const result = await updateApiKeys(payload);

      if (result.success) {
        setMessage({
          type: 'success',
          text: `${platform.charAt(0).toUpperCase() + platform.slice(1)} API keys updated successfully!`
        });
        
        // Clear only the submitted platform's fields
        if (platform === 'kalshi') {
          setApiKeys(prev => ({
            ...prev,
            kalshiApiKey: '',
            kalshiPrivateKeyPath: ''
          }));
        } else if (platform === 'polymarket') {
          setApiKeys(prev => ({
            ...prev,
            polymarketWalletKey: ''
          }));
        }

        // Re-check connection status
        await checkConnectionStatus();
      } else {
        setMessage({
          type: 'error',
          text: result.message
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `Failed to update ${platform} API keys: ${error.message}`
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
      setMessage({
        type: 'info',
        text: `Testing ${platform} connection...`
      });

      const response = await tradingAPI.get(`/api/trading/${platform}/test`);
      
      if (response.data.connected) {
        setMessage({
          type: 'success',
          text: `${platform.charAt(0).toUpperCase() + platform.slice(1)} connection successful!`
        });
        setConnectionStatus(prev => ({
          ...prev,
          [platform]: 'connected'
        }));
      } else {
        setMessage({
          type: 'error',
          text: `${platform.charAt(0).toUpperCase() + platform.slice(1)} connection failed: ${response.data.message}`
        });
        setConnectionStatus(prev => ({
          ...prev,
          [platform]: 'disconnected'
        }));
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `${platform.charAt(0).toUpperCase() + platform.slice(1)} connection failed: ${error.message}`
      });
      setConnectionStatus(prev => ({
        ...prev,
        [platform]: 'disconnected'
      }));
    }
  };

  const connectMetamask = async () => {
    setMessage({ type: '', text: '' });
    
    try {
      if (typeof window.ethereum !== 'undefined') {
        setMessage({
          type: 'info',
          text: 'Please connect your MetaMask wallet...'
        });

        // Request account access
        const accounts = await window.ethereum.request({
          method: 'eth_requestAccounts'
        });

        const account = accounts[0];
        
        setMessage({
          type: 'success',
          text: `MetaMask connected: ${account.substring(0, 8)}...`
        });

        // Auto-fill the wallet key field
        setApiKeys(prev => ({
          ...prev,
          polymarketWalletKey: account
        }));

      } else {
        setMessage({
          type: 'error',
          text: 'MetaMask not detected. Please install MetaMask first.'
        });
      }
    } catch (error) {
      setMessage({
        type: 'error',
        text: `MetaMask connection failed: ${error.message}`
      });
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      connected: { class: 'status-connected', label: 'Connected' },
      disconnected: { class: 'status-disconnected', label: 'Disconnected' },
      connecting: { class: 'status-connecting', label: 'Connecting' }
    };
    
    const config = statusConfig[status] || statusConfig.disconnected;
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  return (
    <div className="account-manager">
      <div className="section-header">
        <div className="section-title">
          <h2>Account Management</h2>
        </div>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <div className="account-layout">
        {/* Left Column - Profile and Stats */}
        <div className="left-column">
          {/* User Profile */}
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

        {/* Right Column - API Configuration */}
        <div className="right-column">
          <div className="api-config-card">
            <div className="api-config-header">
              <h3>Kalshi API Configuration</h3>
            </div>
            
            <div className="api-config-content">
              <div className="form-group">
                <label htmlFor="kalshiApiKey">Kalshi API Key ID</label>
                <input
                  id="kalshiApiKey"
                  type="text"
                  value={apiKeys.kalshiApiKey}
                  onChange={(e) => handleInputChange('kalshiApiKey', e.target.value)}
                  placeholder="Enter your Kalshi API Key ID"
                  className="form-input"
                />
                <small className="form-help">
                  Find this in your Kalshi account settings under API Keys
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="kalshiPrivateKeyPath">Kalshi Private Key Path</label>
                <input
                  id="kalshiPrivateKeyPath"
                  type="text"
                  value={apiKeys.kalshiPrivateKeyPath}
                  onChange={(e) => handleInputChange('kalshiPrivateKeyPath', e.target.value)}
                  placeholder="/path/to/your/private/key.pem"
                  className="form-input"
                />
                <small className="form-help">
                  Absolute path to your Kalshi private key file on the server
                </small>
              </div>

              <div className="api-actions">
                <button
                  className="btn-primary"
                  onClick={() => handleApiKeySubmit('kalshi')}
                  disabled={loading || !apiKeys.kalshiApiKey || !apiKeys.kalshiPrivateKeyPath}
                >
                  {loading ? 'Saving...' : 'Save Kalshi Keys'}
                </button>
              </div>
            </div>
          </div>

          {/* Polymarket API Configuration */}
          <div className="api-config-card">
            <div className="api-config-header">
              <h3>Polymarket Configuration</h3>
            </div>
            
            <div className="api-config-content">
              <div className="form-group">
                <label htmlFor="polymarketWalletKey">Wallet Private Key</label>
                <div className="wallet-input-group">
                  <input
                    id="polymarketWalletKey"
                    type="password"
                    value={apiKeys.polymarketWalletKey}
                    onChange={(e) => handleInputChange('polymarketWalletKey', e.target.value)}
                    placeholder="Enter your wallet private key"
                    className="form-input"
                  />
                </div>
                <small className="form-help warning">
                  ⚠️ Never share your private key. This should be from a dedicated trading wallet.
                </small>
              </div>

              <div className="security-notice">
                <h4>Security Recommendations</h4>
                <ul>
                  <li>Use a dedicated wallet for trading with limited funds</li>
                  <li>Never use your main wallet's private key</li>
                  <li>Consider using a hardware wallet for maximum security</li>
                  <li>Regularly monitor your connected wallets</li>
                </ul>
              </div>

              <div className="api-actions">
                <button
                  className="btn-primary"
                  onClick={() => handleApiKeySubmit('polymarket')}
                  disabled={loading || !apiKeys.polymarketWalletKey}
                >
                  {loading ? 'Saving...' : 'Save Wallet Key'}
                </button>
              </div>
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
    </div>
  );
};

export default AccountManager;