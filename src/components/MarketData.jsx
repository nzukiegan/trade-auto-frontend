import React, { useState, useEffect } from 'react';
import './MarketData.css';

const MarketData = ({ marketData }) => {
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const truncateText = (text, wordLimit) => {
    const words = text.split(' ');
    if (words.length <= wordLimit) return text;
    return words.slice(0, wordLimit).join(' ') + '...';
  };

  const [filter, setFilter] = useState({
    platform: 'all',
    category: 'all',
    search: ''
  });

  const filteredMarkets = (marketData || [])
    .filter(market => market && typeof market === 'object')
    .filter(market => {
      const matchesPlatform = filter.platform === 'all' || market.platform === filter.platform;
      const matchesCategory = filter.category === 'all' || market.category === filter.category;
      const matchesSearch =
        market.title.toLowerCase().includes(filter.search.toLowerCase()) ||
        market.description.toLowerCase().includes(filter.search.toLowerCase());
      return matchesPlatform && matchesCategory && matchesSearch;
    });

  const getOutcomePrices = (market) => {
    try {
      const outcomes = typeof market.outcomes === 'string' ? JSON.parse(market.outcomes || '[]') : market.outcomes || [];
      const prices = Array.isArray(market.outcomePrices) ? market.outcomePrices : JSON.parse(market.outcomePrices || '[]');
      return outcomes.map((name, i) => ({
        name,
        price: prices[i] ?? 0
      }));
    } catch {
      return [];
    }
  };

  const formatPrice = (price) => {
    if (isNaN(price) || price == null) return '0';
    const value = Number(price);
    if (value === 0) return '0';
    if (value < 1) {
      const cents = Math.floor(value * 100);
      return `${cents}¢`;
    }
    const dollars = Math.floor(value * 100) / 100;
    return `$${dollars.toFixed(2)}`;
  };

  const renderOutcomePrices = (market) => {
    const outcomes = getOutcomePrices(market)
    return (
      <div className="market-prices multi-outcomes">
        {outcomes.map((outcome, i) => (
          <div key={i} className="price-section">
            <div className="price-label">{outcome.name}</div>
            <div className="price-value">{formatPrice((outcome.price * 100).toFixed(1))}</div>
            <div className="price-percentage">{(outcome.price * 100).toFixed(1)}%</div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="market-data">
        <div className="loading-section">
          <div className="spinner"></div>
          <p>Loading markets...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="market-data">
      <div className="section-header">
        <div className="section-title">
          <h2>Market Data</h2>
          <p>Real-time prices and market information</p>
        </div>
      </div>

      {/* Filters */}
      <div className="market-filters">
        <div className="filter-group">
          <label>Platform</label>
          <select
            value={filter.platform}
            onChange={(e) => setFilter({ ...filter, platform: e.target.value })}
          >
            <option value="all">All Platforms</option>
            <option value="kalshi">Kalshi</option>
            <option value="polymarket">Polymarket</option>
          </select>
        </div>
      </div>

      {/* Markets Grid */}
      <div className="markets-grid">
        {filteredMarkets.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No Markets Found</h3>
            <p>Try adjusting your filters or search terms</p>
          </div>
        ) : (
          filteredMarkets.map((market) => {
            const isLive = marketData?.[market.marketId];
            const priceChange = isNaN(market.priceChange) ? 0 : market.priceChange;
            return (
              <div key={market.marketId} className="market-card">
                <div className="market-header">
                  <img className="market-image" src={market.image ? market.image : 'kalshi.png'} alt={market.title} />
                  <div className="market-title">
                    <h4>{market.title}</h4>
                    <span className={`platform-badge ${market.platform}`}>
                      {market.platform}
                    </span>
                  </div>
                  <div className="market-status">
                    {isLive && <span className="live-indicator">LIVE</span>}
                    <span className={`price-change ${priceChange >= 0 ? 'positive' : 'negative'}`}>
                    <span className="arrow" aria-hidden>
                      {priceChange >= 0 ? '↗' : '↘'}
                    </span>
                    <span className="pct">{Math.abs(priceChange).toFixed(1)}%</span>
                  </span>

                  </div>
                </div>

                <p className={`market-description ${expanded ? 'expanded' : ''}`}>
                  {expanded
                    ? market.description
                    : truncateText(market.description, 20)}
                </p>

                {market.description.split(' ').length > 20 && (
                  <button
                    className="toggle-description"
                    onClick={() => setExpanded(!expanded)}
                  >
                    {expanded ? 'Show less' : 'Show more'}
                  </button>
                )}

                {renderOutcomePrices(market)}

                <div className="market-meta">
                  <div className="meta-item">
                    <span className="meta-label">Volume: </span>
                    <span className="meta-value">
                      ${market.volume?.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="meta-item">
                    <span className="meta-label">Liquidity: </span>
                    <span className="meta-value">
                      ${market.liquidity?.toLocaleString() || '0'}
                    </span>
                  </div>
                  {market.endDate && (
                    <div className="meta-item">
                      <span className="meta-label">Ends: </span>
                      <span className="meta-value">
                        {new Date(market.endDate).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Market Stats */}
      <div className="market-stats">
        <div className="stat-card">
          <div className="stat-value">
            {Array.isArray(marketData) ? marketData.length : 0}
          </div>
          <div className="stat-label">Total Markets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {marketData?.filter((m) => m.platform === 'kalshi').length}
          </div>
          <div className="stat-label">Kalshi Markets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {marketData?.filter((m) => m.platform === 'polymarket').length}
          </div>
          <div className="stat-label">Polymarket Markets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{Object.keys(marketData).length}</div>
          <div className="stat-label">Live Feeds</div>
        </div>
      </div>
    </div>
  );
};

export default MarketData;