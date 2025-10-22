import React, { useState, useEffect, useRef } from 'react';
import { wsService } from '../services/api';
import './LiveDataFeed.css';

const LiveDataFeed = ({ marketData }) => {
  const [subscriptions, setSubscriptions] = useState(new Set());
  const [feedMessages, setFeedMessages] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [activeMarket, setActiveMarket] = useState(null);
  const feedEndRef = useRef(null);

  useEffect(() => {
    const checkConnection = () => {
      setIsConnected(true); // In a real app, this would check actual connection status
    };

    checkConnection();

    // Subscribe to all market updates
    const handleMarketData = (data) => {
      if (data.type === 'market_data') {
        setFeedMessages(prev => [
          ...prev.slice(-99), // Keep last 100 messages
          {
            id: Date.now() + Math.random(),
            type: 'market_update',
            marketId: data.data.marketId,
            yesPrice: data.data.yesPrice,
            noPrice: data.data.noPrice,
            timestamp: new Date(data.timestamp),
            message: `Market update: ${data.data.marketId} - YES: $${data.data.yesPrice.toFixed(3)} NO: $${data.data.noPrice.toFixed(3)}`
          }
        ]);
      } else if (data.type === 'rule_triggered') {
        setFeedMessages(prev => [
          ...prev.slice(-99),
          {
            id: Date.now() + Math.random(),
            type: 'rule_trigger',
            ruleId: data.ruleId,
            ruleName: data.ruleName,
            marketId: data.marketId,
            action: data.action,
            timestamp: new Date(data.timestamp),
            message: `🚀 Rule "${data.ruleName}" triggered: ${data.action.type.toUpperCase()} $${data.action.amount} on ${data.action.side.toUpperCase()}`
          }
        ]);
      }
    };

    wsService.subscribe('all', handleMarketData);

    return () => {
      wsService.unsubscribe('all', handleMarketData);
    };
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [feedMessages]);

  const subscribeToMarket = (marketId) => {
    if (!subscriptions.has(marketId)) {
      const newSubscriptions = new Set(subscriptions);
      newSubscriptions.add(marketId);
      setSubscriptions(newSubscriptions);
      
      // In a real app, this would send a WebSocket subscription message
      wsService.subscribe(marketId, (data) => {
        console.log(`Market ${marketId} update:`, data);
      });
    }
  };

  const unsubscribeFromMarket = (marketId) => {
    const newSubscriptions = new Set(subscriptions);
    newSubscriptions.delete(marketId);
    setSubscriptions(newSubscriptions);
    
    // In a real app, this would send a WebSocket unsubscribe message
    wsService.unsubscribe(marketId, () => {});
  };

  const clearFeed = () => {
    setFeedMessages([]);
  };

  const getMessageIcon = (type) => {
    switch (type) {
      case 'market_update':
        return '📊';
      case 'rule_trigger':
        return '⚡';
      case 'trade_executed':
        return '💹';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getMessageClass = (type) => {
    switch (type) {
      case 'rule_trigger':
        return 'message-rule';
      case 'trade_executed':
        return 'message-trade';
      case 'error':
        return 'message-error';
      default:
        return 'message-info';
    }
  };

  const marketEntries = Object.entries(marketData);

  return (
    <div className="live-data-feed">
      <div className="section-header">
        <div className="section-title">
          <h2>Live Data Feed</h2>
          <p>Real-time market updates and trading activity</p>
        </div>
        <div className="feed-controls">
          <div className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            <div className="status-dot"></div>
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
          <button 
            className="btn-outline"
            onClick={clearFeed}
          >
            Clear Feed
          </button>
        </div>
      </div>

      <div className="feed-layout">
        {/* Live Markets Sidebar */}
        <div className="markets-sidebar">
          <h3>Live Markets</h3>
          <div className="markets-list">
            {marketEntries.length === 0 ? (
              <div className="empty-markets">
                <div className="empty-icon">🔍</div>
                <p>No live market data</p>
                <small>Markets will appear here as data arrives</small>
              </div>
            ) : (
              marketEntries.map(([marketId, data]) => (
                <div 
                  key={marketId}
                  className={`market-item ${activeMarket === marketId ? 'active' : ''}`}
                  onClick={() => setActiveMarket(marketId)}
                >
                  <div className="market-header">
                    <div className="market-id">{marketId}</div>
                    <div className="market-status">
                      <div className="live-indicator"></div>
                      LIVE
                    </div>
                  </div>
                  <div className="market-prices">
                    <div className="price-row">
                      <span>YES:</span>
                      <span className="price-value">${data.yesPrice.toFixed(3)}</span>
                    </div>
                    <div className="price-row">
                      <span>NO:</span>
                      <span className="price-value">${data.noPrice.toFixed(3)}</span>
                    </div>
                  </div>
                  <div className="market-actions">
                    {subscriptions.has(marketId) ? (
                      <button 
                        className="btn-unsubscribe"
                        onClick={(e) => {
                          e.stopPropagation();
                          unsubscribeFromMarket(marketId);
                        }}
                      >
                        Unsubscribe
                      </button>
                    ) : (
                      <button 
                        className="btn-subscribe"
                        onClick={(e) => {
                          e.stopPropagation();
                          subscribeToMarket(marketId);
                        }}
                      >
                        Subscribe
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Subscription Summary */}
          <div className="subscriptions-summary">
            <h4>Subscriptions</h4>
            <div className="subscription-stats">
              <div className="stat">
                <span className="stat-value">{marketEntries.length}</span>
                <span className="stat-label">Live Markets</span>
              </div>
              <div className="stat">
                <span className="stat-value">{subscriptions.size}</span>
                <span className="stat-label">Subscribed</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Feed */}
        <div className="feed-main">
          <div className="feed-header">
            <h3>Live Events</h3>
            <div className="feed-stats">
              <span>{feedMessages.length} events</span>
              <span>•</span>
              <span>{subscriptions.size} subscriptions</span>
            </div>
          </div>

          <div className="feed-messages">
            {feedMessages.length === 0 ? (
              <div className="empty-feed">
                <div className="empty-icon">📡</div>
                <h4>No Live Events</h4>
                <p>Market updates and rule triggers will appear here in real-time</p>
                <div className="feed-tips">
                  <div className="tip">
                    <strong>💡 Tip:</strong> Subscribe to markets to see detailed updates
                  </div>
                  <div className="tip">
                    <strong>💡 Tip:</strong> Create trading rules to see automated triggers
                  </div>
                </div>
              </div>
            ) : (
              feedMessages.map(message => (
                <div 
                  key={message.id}
                  className={`feed-message ${getMessageClass(message.type)}`}
                >
                  <div className="message-icon">
                    {getMessageIcon(message.type)}
                  </div>
                  <div className="message-content">
                    <div className="message-text">
                      {message.message}
                    </div>
                    <div className="message-meta">
                      <span className="message-time">
                        {message.timestamp.toLocaleTimeString()}
                      </span>
                      {message.marketId && (
                        <span className="message-market">
                          {message.marketId}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={feedEndRef} />
          </div>

          {/* Quick Actions */}
          <div className="feed-actions">
            <button className="btn-outline">
              Export Feed Data
            </button>
            <button className="btn-outline">
              Filter Events
            </button>
            <button className="btn-outline">
              Pause Feed
            </button>
          </div>
        </div>

        {/* Active Market Details */}
        {activeMarket && marketData[activeMarket] && (
          <div className="market-details">
            <h3>Market Details</h3>
            <div className="details-content">
              <div className="detail-section">
                <h4>Current Prices</h4>
                <div className="price-details">
                  <div className="price-detail">
                    <span className="price-label">YES Price:</span>
                    <span className="price-value">
                      ${marketData[activeMarket].yesPrice.toFixed(3)}
                    </span>
                    <span className="price-percentage">
                      ({(marketData[activeMarket].yesPrice * 100).toFixed(1)}%)
                    </span>
                  </div>
                  <div className="price-detail">
                    <span className="price-label">NO Price:</span>
                    <span className="price-value">
                      ${marketData[activeMarket].noPrice.toFixed(3)}
                    </span>
                    <span className="price-percentage">
                      ({(marketData[activeMarket].noPrice * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>

              <div className="detail-section">
                <h4>Market Info</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Market ID:</span>
                    <span className="info-value">{activeMarket}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Last Update:</span>
                    <span className="info-value">
                      {new Date().toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Status:</span>
                    <span className="info-value status-live">Live</span>
                  </div>
                </div>
              </div>

              <div className="detail-actions">
                <button className="btn-primary">
                  Create Rule
                </button>
                <button className="btn-outline">
                  Trade This Market
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveDataFeed;