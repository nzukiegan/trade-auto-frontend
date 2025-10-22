import React, { useState, useEffect } from 'react';
import { tradingAPI } from '../services/api';
import './RuleManager.css';

function RuleManager({ marketData, portfolioData }) {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedMarket, setSelectedMarket] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    platform: 'kalshi',
    marketId: '',
    triggerType: 'probability',
    condition: {
      field: 'probability',
      operator: '<',
      value: '',
      threshold: '',
      cooldown: 0,
      outcome: 'yes'
    },
    action: {
      type: 'buy',
      amount: '',
      side: 'yes',
      percentage: 100
    }
  });

  useEffect(() => {
    fetchRules();
    fetchMarkets();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await tradingAPI.get('/rules');
      const data = response.data;
      const ruleList = Array.isArray(data) ? data : data.rules || [];
      setRules(ruleList);
    } catch (error) {
      console.error('Error fetching rules:', error);
      setRules([]);
    }
  };

  const fetchMarkets = async () => {
    try {
      const response = await tradingAPI.get('/markets');
      console
      setMarkets(response.data);
    } catch (error) {
      console.error('Error fetching markets:', error);
    }
  };

  const handleMarketSelect = (marketId) => {
    const market = marketData.find(m => m.marketId === marketId);
    setSelectedMarket(market);
    setFormData((prev) => {
      let outcomes = [];

      try {
        outcomes = Array.isArray(market?.outcomes)
          ? market.outcomes
          : JSON.parse(market?.outcomes || '[]');
      } catch (error) {
        console.error('Error parsing market outcomes:', error);
        outcomes = [];
      }

      const firstOutcome = outcomes[0] || 'yes';

      return {
        ...prev,
        marketId: market?.marketId,
        platform: market?.platform || 'kalshi',
        condition: {
          ...prev.condition,
          outcome: firstOutcome,
        },
        action: {
          ...prev.action,
          side: firstOutcome,
        },
      };
    });
  };

  const handleTriggerTypeChange = (triggerType) => {
    const defaultConditions = {
      probability: { 
        field: 'probability', 
        operator: '<', 
        value: '', 
        threshold: '', 
        cooldown: 0,
        outcome: selectedMarket?.outcomes?.[0] || 'yes'
      },
      roi: { field: 'roi', operator: '>', value: '', threshold: '', cooldown: 0 },
      price: { 
        field: 'price', 
        operator: '<', 
        value: '', 
        threshold: '', 
        cooldown: 0,
        outcome: selectedMarket?.outcomes?.[0] || 'yes'
      },
      time: { field: 'time', operator: '==', value: '', threshold: '', cooldown: 0 }
    };

    setFormData(prev => ({
      ...prev,
      triggerType,
      condition: defaultConditions[triggerType] || prev.condition
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await tradingAPI.post('/rules', formData);
      setShowForm(false);
      setFormData({
        name: '',
        platform: 'polymarket',
        marketId: '',
        triggerType: 'probability',
        condition: {
          field: 'probability',
          operator: '<',
          value: '',
          threshold: '',
          cooldown: 0,
          outcome: 'yes'
        },
        action: {
          type: 'buy',
          amount: '',
          side: 'yes',
          percentage: 100
        }
      });
      setSelectedMarket(null);
      fetchRules();
    } catch (error) {
      console.error('Error creating rule:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleRule = async (ruleId, isActive) => {
    try {
      await tradingAPI.patch(`/rules/${ruleId}`, {
        isActive: !isActive
      });
      fetchRules();
    } catch (error) {
      console.error('Error updating rule:', error);
    }
  };

  const deleteRule = async (ruleId) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;
    
    try {
      await tradingAPI.delete(`/rules/${ruleId}`);
      fetchRules();
    } catch (error) {
      console.error('Error deleting rule:', error);
    }
  };

  const getCurrentMarketValue = (marketId) => {
    const market = marketData.find(m => m.marketId === marketId);
    if (!market) return [];

    let outcomes = [];
    let prices = [];

    try {
      outcomes = Array.isArray(market.outcomes) ? market.outcomes : JSON.parse(market.outcomes || '[]');
    } catch {
      outcomes = [];
    }

    try {
      prices = Array.isArray(market.outcomePrices) ? market.outcomePrices : JSON.parse(market.outcomePrices || '[]');
    } catch {
      prices = [];
    }

    if (!outcomes.length || !prices.length) return [];

    const total = prices.reduce((sum, p) => sum + (parseFloat(p) || 0), 0) || 1;

    return outcomes.map((outcome, i) => {
      const price = parseFloat(prices[i]) || 0;
      const percentage = ((price / total) * 100).toFixed(1);
      return {
        outcome,
        price: price.toFixed(3),
        percentage: `${percentage}%`
      };
    });
  };


  const getActionDescription = (action, marketOutcomes = ['yes', 'no']) => {
    const sideDisplay = marketOutcomes.includes(action.side) 
      ? action.side.toUpperCase() 
      : 'YES';
    
    switch (action.type) {
      case 'buy':
        return `BUY $${action.amount} on ${sideDisplay}`;
      case 'sell':
        return `SELL $${action.amount} on ${sideDisplay}`;
      case 'close_position':
        return `CLOSE ENTIRE POSITION`;
      case 'partial_close':
        return `CLOSE ${action.percentage}% OF POSITION`;
      default:
        return `${action.type.toUpperCase()} $${action.amount}`;
    }
  };

  const getConditionDescription = (condition, triggerType, marketOutcomes = ['yes', 'no']) => {
    const valueSuffix = triggerType === 'probability' ? '%' : 
                       triggerType === 'roi' ? '%' : 
                       triggerType === 'price' ? '$' : '';
    
    const outcomeDisplay = marketOutcomes.includes(condition.outcome) 
      ? condition.outcome.toUpperCase() 
      : 'YES';
    
    let baseCondition = '';
    
    if (triggerType === 'probability' || triggerType === 'price') {
      baseCondition = `${outcomeDisplay} ${condition.field} ${condition.operator} ${condition.value}${valueSuffix}`;
    } else {
      baseCondition = `${condition.field} ${condition.operator} ${condition.value}${valueSuffix}`;
    }
    
    if (condition.threshold) {
      baseCondition += ` (threshold: ${condition.threshold}${valueSuffix})`;
    }
    
    if (condition.cooldown > 0) {
      baseCondition += `, cooldown: ${condition.cooldown}min`;
    }
    
    return baseCondition;
  };

  return (
    <div className="rule-manager">
      <div className="section-header">
        <div className="section-title">
          <h2>Advanced Trading Rules</h2>
          <p>Create sophisticated rules to automatically manage your positions</p>
        </div>
        <button 
          className="btn-primary"
          onClick={() => setShowForm(true)}
        >
          + New Rule
        </button>
      </div>

      {/* Rule Creation Modal */}
      {showForm && (
        <div className="modal">
          <div className="modal-content advanced-rule-form">
            <div className="modal-header">
              <h3>Create Advanced Trading Rule</h3>
              <button 
                className="close-btn"
                onClick={() => {
                  setShowForm(false);
                  setSelectedMarket(null);
                }}
              >
                ×
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Rule Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    placeholder="e.g., Team A Low Probability Buy"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Trigger Type</label>
                  <select
                    value={formData.triggerType}
                    onChange={(e) => handleTriggerTypeChange(e.target.value)}
                  >
                    <option value="probability">Probability Trigger</option>
                    <option value="roi">ROI Trigger</option>
                    <option value="price">Price Trigger</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label>Market</label>
                <select
                  value={formData.marketId}
                  onChange={(e) => handleMarketSelect(e.target.value)}
                  required
                >
                  <option value="">Select a market</option>
                  {marketData.map(market => (
                    <option key={market.marketId} value={market.marketId}>
                      {market.title} ({market.platform})
                    </option>
                  ))}
                </select>
                {selectedMarket && (
                  <div className="market-info">
                    <small>
                      {selectedMarket?.outcomes &&
                        (() => {
                          const outcomes = Array.isArray(selectedMarket?.outcomes) ? selectedMarket.outcomes : JSON.parse(selectedMarket?.outcomes || "[]");
                          const prices = Array.isArray(selectedMarket?.outcomePrices) ? selectedMarket.outcomePrices : JSON.parse(selectedMarket?.outcomePrices || "[]");
                          return outcomes.map((outcome, i) => (
                            <span key={outcome}>
                              {outcome.toUpperCase()}: ${(Number(prices[i]) || 1).toFixed(3)} |
                            </span>
                          ));
                        })()}
                    </small>
                  </div>
                )}
              </div>

              <div className="condition-section">
                <h4>Trigger Condition</h4>
                
                {formData.triggerType === 'probability' && (
                  <div className="condition-fields">
                    <div className="form-group">
                      <label>Outcome</label>
                      <select
                        value={formData.condition.outcome}
                        onChange={(e) => setFormData({
                          ...formData, 
                          condition: {...formData.condition, outcome: e.target.value}
                        })}
                      >
                        {selectedMarket?.outcomes && JSON.parse(selectedMarket.outcomes).map(outcome => (
                          <option key={outcome} value={outcome}>
                            {outcome.toUpperCase()}
                          </option>
                        )) || (
                          <option value="yes">YES</option>
                        )}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Probability</label>
                      <select
                        value={formData.condition.operator}
                        onChange={(e) => setFormData({
                          ...formData, 
                          condition: {...formData.condition, operator: e.target.value}
                        })}
                      >
                        <option value="<">Less Than</option>
                        <option value=">">Greater Than</option>
                        <option value="==">Equals</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label> % Probability</label>
                      <input
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={formData.condition.value}
                        onChange={(e) => setFormData({
                          ...formData, 
                          condition: {...formData.condition, value: e.target.value}
                        })}
                        placeholder="15"
                        required
                      />
                    </div>
                  </div>
                )}

                {formData.triggerType === 'roi' && (
                  <div className="condition-fields">
                    <div className="form-group">
                      <label>ROI Condition</label>
                      <select
                        value={formData.condition.operator}
                        onChange={(e) => setFormData({
                          ...formData, 
                          condition: {...formData.condition, operator: e.target.value}
                        })}
                      >
                        <option value=">">Greater Than</option>
                        <option value="<">Less Than</option>
                        <option value="==">Equals</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>ROI %</label>
                      <input
                        type="number"
                        step="1"
                        value={formData.condition.value}
                        onChange={(e) => setFormData({
                          ...formData, 
                          condition: {...formData.condition, value: e.target.value}
                        })}
                        placeholder="30"
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label>Minimum ROI Threshold %</label>
                      <input
                        type="number"
                        step="1"
                        value={formData.condition.threshold}
                        onChange={(e) => setFormData({
                          ...formData, 
                          condition: {...formData.condition, threshold: e.target.value}
                        })}
                        placeholder="10"
                      />
                    </div>
                  </div>
                )}

                {formData.triggerType === 'price' && (
                  <div className="condition-fields">
                    <div className="form-group">
                      <label>Outcome</label>
                      <select
                        value={formData.condition.outcome}
                        onChange={(e) => setFormData({
                          ...formData, 
                          condition: {...formData.condition, outcome: e.target.value}
                        })}
                      >
                        {selectedMarket?.outcomes && JSON.parse(selectedMarket.outcomes).map(outcome => (
                          <option key={outcome} value={outcome}>
                            {outcome.toUpperCase()}
                          </option>
                        )) || (
                          <option value="yes">YES</option>
                        )}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Price Condition</label>
                      <select
                        value={formData.condition.operator}
                        onChange={(e) => setFormData({
                          ...formData, 
                          condition: {...formData.condition, operator: e.target.value}
                        })}
                      >
                        <option value="<">Less Than</option>
                        <option value=">">Greater Than</option>
                        <option value="==">Equals</option>
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>Price $</label>
                      <input
                        type="number"
                        step="0.001"
                        min="0"
                        max="1"
                        value={formData.condition.value}
                        onChange={(e) => setFormData({
                          ...formData, 
                          condition: {...formData.condition, value: e.target.value}
                        })}
                        placeholder="0.50"
                        required
                      />
                    </div>
                  </div>
                )}

                {formData.triggerType === 'time' && (
                  <div className="condition-fields">
                    <div className="form-group">
                      <label>Time Condition</label>
                      <select
                        value={formData.condition.operator}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            condition: { ...formData.condition, operator: e.target.value },
                          })
                        }
                      >
                        <option value="==">At Specific Time</option>
                        <option value="<">Before Time</option>
                        <option value=">">After Time</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Time</label>
                      <input
                        type="datetime-local"
                        value={formData.condition.value}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            condition: { ...formData.condition, value: e.target.value },
                          })
                        }
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="form-group cooldown-field">
                  <label>Cooldown Period (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={formData.condition.cooldown}
                    onChange={(e) => setFormData({
                      ...formData, 
                      condition: {...formData.condition, cooldown: parseInt(e.target.value) || 0}
                    })}
                    placeholder="0"
                  />
                  <small>Prevent rule from triggering too frequently</small>
                </div>
              </div>

              <div className="action-section">
                <h4>Trade Action</h4>
                <div className="action-fields">
                  <div className="form-group">
                    <label>Action Type</label>
                    <select
                      value={formData.action.type}
                      onChange={(e) => setFormData({
                        ...formData, 
                        action: {...formData.action, type: e.target.value}
                      })}
                    >
                      <option value="buy">Buy</option>
                      <option value="sell">Sell</option>
                      <option value="close_position">Close Entire Position</option>
                      <option value="partial_close">Close Partial Position</option>
                    </select>
                  </div>
                  
                  {formData.action.type !== 'close_position' && (
                    <>
                      <div className="form-group">
                        <label>Side</label>
                        <select
                          value={formData.action.side}
                          onChange={(e) => setFormData({
                            ...formData, 
                            action: {...formData.action, side: e.target.value}
                          })}
                        >
                          {selectedMarket?.outcomes && JSON.parse(selectedMarket.outcomes).map(outcome => (
                            <option key={outcome} value={outcome}>
                              {outcome.toUpperCase()}
                            </option>
                          )) || (
                            <>
                              <option value="yes">YES</option>
                              <option value="no">NO</option>
                            </>
                          )}
                        </select>
                      </div>
                      
                      {formData.action.type === 'partial_close' ? (
                        <div className="form-group">
                          <label>Close Percentage %</label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            step="1"
                            value={formData.action.percentage}
                            onChange={(e) => setFormData({
                              ...formData, 
                              action: {...formData.action, percentage: parseInt(e.target.value) || 50}
                            })}
                            placeholder="50"
                            required
                          />
                        </div>
                      ) : (
                        <div className="form-group">
                          <label>Amount ($)</label>
                          <input
                            type="number"
                            value={formData.action.amount}
                            onChange={(e) => setFormData({
                              ...formData, 
                              action: {...formData.action, amount: e.target.value}
                            })}
                            placeholder="100"
                            required
                          />
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              <div className="rule-preview">
                <h4>Rule Preview</h4>
                <div className="preview-content">
                  <strong>WHEN</strong> {getConditionDescription(formData.condition, formData.triggerType, selectedMarket?.outcomes)}
                  <br />
                  <strong>THEN</strong> {getActionDescription(formData.action, selectedMarket?.outcomes)}
                </div>
              </div>

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn-secondary"
                  onClick={() => {
                    setShowForm(false);
                    setSelectedMarket(null);
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Rule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="rules-grid">
        {rules.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⚡</div>
            <h3>No Rules Created</h3>
            <p>Create your first trading rule to start automating your trades</p>
            <button 
              className="btn-primary"
              onClick={() => setShowForm(true)}
            >
              Create Your First Rule
            </button>
          </div>
        ) : (
          rules.map(rule => {
            const market = marketData.find(m => m.id === rule.marketId);
            return (
              <div key={rule._id} className="rule-card">
                <div className="rule-header">
                  <div className="rule-title">
                    <h4>{rule.name}</h4>
                    <div className="rule-tags">
                      <span className={`platform-tag ${rule.platform}`}>
                        {rule.platform}
                      </span>
                      <span className="trigger-tag">
                        {rule.triggerType}
                      </span>
                    </div>
                  </div>
                  <div className="rule-actions">
                    <button 
                      className={rule.isActive ? 'btn-active' : 'btn-inactive'}
                      onClick={() => toggleRule(rule._id, rule.isActive)}
                    >
                      {rule.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button 
                      className="btn-danger"
                      onClick={() => deleteRule(rule._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                
                <div className="rule-content">
                  <div className="rule-condition">
                    <strong>WHEN</strong> {getConditionDescription(rule.condition, rule.triggerType, rule.condition.outcome)}
                    <div className="current-value">
                      {getCurrentMarketValue(rule.marketId)?.map((item, i) => (
                        <span key={i}>
                          {item.outcome.toUpperCase()}: ${item.price} ({item.percentage})
                          {i < getCurrentMarketValue(rule.marketId).length - 1 && ' | '}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="rule-action">
                    <strong>THEN</strong> {getActionDescription(rule.action, market?.outcomes)}
                  </div>
                  
                  <div className="rule-meta">
                    <span>Market: {rule.marketId}</span>
                    {rule.lastTriggered && (
                      <span>Last Triggered: {new Date(rule.lastTriggered).toLocaleString()}</span>
                    )}
                    {rule.condition.cooldown > 0 && (
                      <span>Cooldown: {rule.condition.cooldown}min</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default RuleManager;