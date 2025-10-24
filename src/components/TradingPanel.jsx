import React, { useState, useEffect } from 'react';
import { tradingAPI } from '../services/api';
import './TradingPanel.css';

const TradingPanel = ({ marketData }) => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    platform: '',
    marketId: '',
    status: '',
    type: '',
    side: '',
    startDate: '',
    endDate: '',
    page: 1,
    limit: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [performance, setPerformance] = useState({
    totalVolume: 0,
    totalTrades: 0,
    avgTradeSize: 0,
    successfulTrades: 0
  });
  const [markets, setMarkets] = useState([]);

  useEffect(() => {
    fetchTrades();
  }, [filters]);

  const fetchTrades = async () => {
    console.log("Fetching trades")
    setLoading(true);
    try {
      const response = await tradingAPI.get('/api/trading/trades', { params: filters });
      console.log(response)
      const data = response.data;
      
      setTrades(data.trades || []);
      console.log(data.trades)
      setPagination(data.pagination || {});
      setPerformance(data.performance || {});
    } catch (error) {
      console.error('Error fetching trades:', error);
      setTrades([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filters change
    }));
  };

  const handleDateChange = (type, value) => {
    setFilters(prev => ({
      ...prev,
      [type]: value,
      page: 1
    }));
  };

  const handleSort = (sortBy) => {
    setFilters(prev => ({
      ...prev,
      sortBy,
      sortOrder: prev.sortBy === sortBy && prev.sortOrder === 'desc' ? 'asc' : 'desc'
    }));
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const clearFilters = () => {
    setFilters({
      platform: '',
      marketId: '',
      status: '',
      type: '',
      side: '',
      startDate: '',
      endDate: '',
      page: 1,
      limit: 20,
      sortBy: 'createdAt',
      sortOrder: 'desc'
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      executed: { class: 'status-executed', label: 'Executed' },
      pending: { class: 'status-pending', label: 'Pending' },
      cancelled: { class: 'status-cancelled', label: 'Cancelled' },
      failed: { class: 'status-failed', label: 'Failed' }
    };
    
    const config = statusConfig[status] || { class: 'status-unknown', label: status };
    return <span className={`status-badge ${config.class}`}>{config.label}</span>;
  };

  const getTypeBadge = (type) => {
    const typeConfig = {
      manual: { class: 'type-manual', label: 'Manual' },
      rule: { class: 'type-rule', label: 'Auto' },
      stop_loss: { class: 'type-stop-loss', label: 'Stop Loss' },
      take_profit: { class: 'type-take-profit', label: 'Take Profit' }
    };
    
    const config = typeConfig[type] || { class: 'type-unknown', label: type };
    return <span className={`type-badge ${config.class}`}>{config.label}</span>;
  };

  const getSideBadge = (side) => {
    const sideConfig = {
      yes: { class: 'side-yes', label: 'YES' },
      no: { class: 'side-no', label: 'NO' },
      buy: { class: 'side-buy', label: 'BUY' },
      sell: { class: 'side-sell', label: 'SELL' }
    };
    
    const config = sideConfig[side] || { class: 'side-unknown', label: side };
    return <span className={`side-badge ${config.class}`}>{config.label}</span>;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getMarketName = (marketId) => {
    const market = marketData.find(m => m.id === marketId);
    return market ? market.title : marketId;
  };

  return (
    <div className="trade-history">
      <div className="section-header">
        <div className="section-title">
          <h1>Trade History</h1>
          <p>View and analyze your trading activity</p>
        </div>
        <button 
          className="btn-secondary"
          onClick={fetchTrades}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {/* Performance Metrics */}
      <div className="performance-metrics">
        <div className="metric-card">
          <div className="metric-value">{formatCurrency(performance.totalVolume)}</div>
          <div className="metric-label">Total Volume</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{performance.totalTrades}</div>
          <div className="metric-label">Total Trades</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{formatCurrency(performance.avgTradeSize)}</div>
          <div className="metric-label">Avg Trade Size</div>
        </div>
        <div className="metric-card">
          <div className="metric-value">{performance.successfulTrades}</div>
          <div className="metric-label">Successful Trades</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="filters-header">
          <h3>Filters</h3>
          <button 
            className="btn-clear"
            onClick={clearFilters}
          >
            Clear All
          </button>
        </div>
        
        <div className="filters-grid">
          <div className="filter-group">
            <label>Platform</label>
            <select
              value={filters.platform}
              onChange={(e) => handleFilterChange('platform', e.target.value)}
            >
              <option value="">All Platforms</option>
              <option value="kalshi">Kalshi</option>
              <option value="polymarket">Polymarket</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Market</label>
            <select
              value={filters.marketId}
              onChange={(e) => handleFilterChange('marketId', e.target.value)}
            >
              <option value="">All Markets</option>
              {marketData.map(market => (
                <option key={market.id} value={market.id}>
                  {market.title}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Status</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="executed">Executed</option>
              <option value="pending">Pending</option>
              <option value="cancelled">Cancelled</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Type</label>
            <select
              value={filters.type}
              onChange={(e) => handleFilterChange('type', e.target.value)}
            >
              <option value="">All Types</option>
              <option value="manual">Manual</option>
              <option value="rule">Automated</option>
              <option value="stop_loss">Stop Loss</option>
              <option value="take_profit">Take Profit</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Side</label>
            <select
              value={filters.side}
              onChange={(e) => handleFilterChange('side', e.target.value)}
            >
              <option value="">All Sides</option>
              <option value="yes">YES</option>
              <option value="no">NO</option>
              <option value="buy">BUY</option>
              <option value="sell">SELL</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Trades Table */}
      <div className="trades-table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading trades...</p>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="trades-table">
                <thead>
                  <tr>
                    <th 
                      className="sortable"
                      onClick={() => handleSort('createdAt')}
                    >
                      Date & Time
                      {filters.sortBy === 'createdAt' && (
                        <span className="sort-indicator">
                          {filters.sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th>Market</th>
                    <th>Platform</th>
                    <th 
                      className="sortable"
                      onClick={() => handleSort('amount')}
                    >
                      Amount
                      {filters.sortBy === 'amount' && (
                        <span className="sort-indicator">
                          {filters.sortOrder === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </th>
                    <th>Side</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Rule</th>
                    <th>Price</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="no-trades">
                        <div className="empty-trades">
                          <div className="empty-icon">📊</div>
                          <h3>No trades found</h3>
                          <p>Try adjusting your filters or make your first trade!</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    trades.map(trade => (
                      <tr key={trade._id} className="trade-row">
                        <td className="datetime-cell">
                          {formatDate(trade.createdAt)}
                        </td>
                        <td className="market-cell">
                          <div className="market-info">
                            <div className="market-name">
                              {getMarketName(trade.marketId)}
                            </div>
                            <div className="market-id">
                              {trade.marketId}
                            </div>
                          </div>
                        </td>
                        <td className="platform-cell">
                          <span className={`platform-tag ${trade.platform}`}>
                            {trade.platform}
                          </span>
                        </td>
                        <td className="amount-cell">
                          {formatCurrency(trade.amount)}
                        </td>
                        <td className="side-cell">
                          {getSideBadge(trade.side)}
                        </td>
                        <td className="type-cell">
                          {getTypeBadge(trade.type)}
                          {trade.ruleId && (
                            <div className="rule-indicator" title="Automated by rule">
                              ⚡
                            </div>
                          )}
                        </td>
                        <td className="status-cell">
                          {getStatusBadge(trade.status)}
                        </td>
                        <td className="rule-cell">
                          {trade.ruleId ? (
                            <div className="rule-info">
                              <div className="rule-name">{trade.ruleId.name}</div>
                              {trade.ruleId.condition && (
                                <div className="rule-condition">
                                  {trade.ruleId.condition.field} {trade.ruleId.condition.operator} {trade.ruleId.condition.value}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="no-rule">Manual</span>
                          )}
                        </td>
                        <td className="price-cell">
                          {trade.price ? `$${trade.price.toFixed(3)}` : 'N/A'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page <= 1}
                >
                  Previous
                </button>
                
                <div className="pagination-info">
                  Page {filters.page} of {pagination.pages}
                  <span className="total-items">({pagination.total} total trades)</span>
                </div>

                <button
                  className="pagination-btn"
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page >= pagination.pages}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default TradingPanel;