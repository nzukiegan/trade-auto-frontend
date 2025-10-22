import React, { useState, useEffect } from 'react';
import { tradingAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import './TradingPanel.css';

const TradingPanel = ({ marketData }) => {
  const { user } = useAuth();
  const [markets, setMarkets] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [orderStatus, setOrderStatus] = useState('');
  
  const [orderForm, setOrderForm] = useState({
    platform: 'kalshi',
    marketId: '',
    type: 'buy',
    side: 'yes',
    amount: '',
    price: '',
    orderType: 'limit' // 'limit' or 'market'
  });

  useEffect(() => {
    fetchMarkets();
    fetchOrders();
  }, []);

  const fetchMarkets = async () => {
    try {
      const response = await tradingAPI.get('/markets?limit=50');
      setMarkets(response.data.markets);
    } catch (error) {
      console.error('Error fetching markets:', error);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await tradingAPI.get('/trading/trades?limit=10');
      setOrders(response.data.trades);
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setOrderStatus('');

    try {
      const orderData = {
        platform: orderForm.platform,
        marketId: orderForm.marketId,
        type: orderForm.type,
        side: orderForm.side,
        amount: parseFloat(orderForm.amount),
        price: orderForm.orderType === 'limit' ? parseFloat(orderForm.price) : null
      };

      const response = await tradingAPI.post('/trading/order', orderData);
      
      setOrderStatus('success');
      setOrderForm({
        platform: 'kalshi',
        marketId: '',
        type: 'buy',
        side: 'yes',
        amount: '',
        price: '',
        orderType: 'limit'
      });
      
      fetchOrders(); // Refresh orders list
    } catch (error) {
      console.error('Order error:', error);
      setOrderStatus('error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    try {
      await tradingAPI.delete(`/trading/orders/${orderId}`);
      fetchOrders(); // Refresh orders list
    } catch (error) {
      console.error('Cancel order error:', error);
    }
  };

  const getCurrentPrice = (marketId) => {
    const data = marketData[marketId];
    if (!data) return { yes: 0, no: 0 };
    return { yes: data.yesPrice, no: data.noPrice };
  };

  const calculateTotal = () => {
    if (!orderForm.amount || !orderForm.price) return 0;
    return parseFloat(orderForm.amount) * parseFloat(orderForm.price);
  };

  const selectedMarket = markets.find(m => m.marketId === orderForm.marketId);
  const currentPrices = selectedMarket ? getCurrentPrice(selectedMarket.marketId) : { yes: 0, no: 0 };

  return (
    <div className="trading-panel">
      <div className="section-header">
        <div className="section-title">
          <h2>Manual Trading</h2>
          <p>Execute trades instantly on Kalshi and Polymarket</p>
        </div>
      </div>

      <div className="trading-layout">
        {/* Order Form */}
        <div className="order-form-section">
          <div className="form-card">
            <h3>Place New Order</h3>
            
            {orderStatus === 'success' && (
              <div className="alert success">
                ✅ Order placed successfully!
              </div>
            )}
            
            {orderStatus === 'error' && (
              <div className="alert error">
                ❌ Failed to place order. Please check your API keys and try again.
              </div>
            )}

            <form onSubmit={handleOrderSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Platform</label>
                  <select
                    value={orderForm.platform}
                    onChange={(e) => setOrderForm({...orderForm, platform: e.target.value})}
                  >
                    <option value="kalshi">Kalshi</option>
                    <option value="polymarket">Polymarket</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Order Type</label>
                  <select
                    value={orderForm.orderType}
                    onChange={(e) => setOrderForm({...orderForm, orderType: e.target.value})}
                  >
                    <option value="limit">Limit Order</option>
                    <option value="market">Market Order</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Market</label>
                <select
                  value={orderForm.marketId}
                  onChange={(e) => setOrderForm({...orderForm, marketId: e.target.value})}
                  required
                >
                  <option value="">Select a market</option>
                  {markets
                    .filter(m => m.platform === orderForm.platform)
                    .map(market => (
                      <option key={market._id} value={market.marketId}>
                        {market.title}
                      </option>
                    ))
                  }
                </select>
              </div>

              {selectedMarket && (
                <div className="market-info">
                  <div className="current-prices">
                    <span>YES: ${currentPrices.yes.toFixed(3)}</span>
                    <span>NO: ${currentPrices.no.toFixed(3)}</span>
                  </div>
                </div>
              )}

              <div className="form-row">
                <div className="form-group">
                  <label>Action</label>
                  <select
                    value={orderForm.type}
                    onChange={(e) => setOrderForm({...orderForm, type: e.target.value})}
                  >
                    <option value="buy">Buy</option>
                    <option value="sell">Sell</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Side</label>
                  <select
                    value={orderForm.side}
                    onChange={(e) => setOrderForm({...orderForm, side: e.target.value})}
                  >
                    <option value="yes">YES</option>
                    <option value="no">NO</option>
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={orderForm.amount}
                    onChange={(e) => setOrderForm({...orderForm, amount: e.target.value})}
                    placeholder="100.00"
                    required
                  />
                </div>

                {orderForm.orderType === 'limit' && (
                  <div className="form-group">
                    <label>Price</label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      max="1.000"
                      value={orderForm.price}
                      onChange={(e) => setOrderForm({...orderForm, price: e.target.value})}
                      placeholder="0.500"
                      required
                    />
                  </div>
                )}
              </div>

              {orderForm.orderType === 'limit' && orderForm.amount && orderForm.price && (
                <div className="order-summary">
                  <div className="summary-item">
                    <span>Total Cost:</span>
                    <span>${calculateTotal().toFixed(2)}</span>
                  </div>
                  <div className="summary-item">
                    <span>Contracts:</span>
                    <span>{orderForm.amount}</span>
                  </div>
                </div>
              )}

              <button 
                type="submit" 
                className="btn-primary submit-order"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="spinner"></div>
                    Placing Order...
                  </>
                ) : (
                  `Place ${orderForm.type.toUpperCase()} Order`
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Recent Orders */}
        <div className="orders-section">
          <div className="orders-card">
            <div className="orders-header">
              <h3>Recent Orders</h3>
              <button 
                className="btn-outline"
                onClick={fetchOrders}
              >
                Refresh
              </button>
            </div>

            <div className="orders-list">
              {orders.length === 0 ? (
                <div className="empty-orders">
                  <div className="empty-icon">💹</div>
                  <p>No recent orders</p>
                </div>
              ) : (
                orders.map(order => (
                  <div key={order._id} className="order-item">
                    <div className="order-main">
                      <div className="order-type">
                        <span className={`type-badge ${order.type}`}>
                          {order.type.toUpperCase()}
                        </span>
                        <span className={`side-badge ${order.side}`}>
                          {order.side.toUpperCase()}
                        </span>
                      </div>
                      <div className="order-details">
                        <div className="order-amount">
                          ${order.amount} @ ${order.price?.toFixed(3) || 'MKT'}
                        </div>
                        <div className="order-market">
                          {order.marketId}
                        </div>
                      </div>
                    </div>
                    <div className="order-meta">
                      <div className={`status-badge ${order.status}`}>
                        {order.status}
                      </div>
                      <div className="order-time">
                        {new Date(order.createdAt).toLocaleTimeString()}
                      </div>
                      {order.status === 'pending' && (
                        <button 
                          className="btn-cancel"
                          onClick={() => handleCancelOrder(order._id)}
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="quick-actions">
            <h4>Quick Actions</h4>
            <div className="action-buttons">
              <button className="btn-outline">
                View Portfolio
              </button>
              <button className="btn-outline">
                Order History
              </button>
              <button className="btn-outline">
                API Settings
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TradingPanel;