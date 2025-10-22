import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { wsService, tradingAPI } from "../services/api";
import RuleManager from "../components/RuleManager";
import MarketData from "../components/MarketData";
import TradingPanel from "../components/TradingPanel";
import AccountManager from "../components/AccountManager";
import LiveDataFeed from "../components/LiveDataFeed";
import "./Dashboard.css";

function Dashboard() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState("rules");
  const [marketData, setMarketData] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("connecting");

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        const response = await tradingAPI.get("/markets");
        setMarketData(response.data.markets || []);
      } catch (error) {
        console.error("❌ Error fetching markets:", error);
      }
    };
    fetchMarkets();
  }, []);

  const extractClobJsonString = (clob) => {
    if (clob == null) return null;

    if (Array.isArray(clob)) {
      if (clob.length === 0) return null;

      if (clob.length === 1 && typeof clob[0] === 'string') {
        const s = clob[0].trim();
        if (s.startsWith('[')) {
          return s;
        }
      }

      const allStrings = clob.every(i => typeof i === 'string');
      if (allStrings) {
        return JSON.stringify(clob);
      }

      for (const item of clob) {
        if (typeof item === 'string' && item.trim().startsWith('[')) {
          return item.trim();
        }
      }
      return JSON.stringify(clob.map(String));
    }

    if (typeof clob === 'string') {
      const s = clob.trim();
      if (s.startsWith('[')) {
        return s;
      }
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return JSON.stringify(parsed);
      } catch (e) {
      }
      return JSON.stringify([s]);
    }
    try {
      return JSON.stringify(clob);
    } catch (e) {
      return null;
    }
  }

  const handleMarketData = useCallback((msg) => {
    if (!msg || !msg.type) return;
    if (msg.type === "connection_status") {
      setConnectionStatus(msg.status);
      return;
    }

    if (msg.type === "pdata") {
      const { data } = msg
      if (!data || !data.event_type) return;

      setMarketData((prev) => {
        const eps = 1e-9;
        const parseTokenIds = (raw) => {
          if (!raw && raw !== 0) return [];
          if (Array.isArray(raw)) {
            if (raw.length === 1 && typeof raw[0] === "string" && raw[0].trim().startsWith("[")) {
              try {
                return JSON.parse(raw[0]);
              } catch {

              }
            }
            return raw;
          }
          if (typeof raw === "string") {
            const s = raw.trim();
            if (s.startsWith("[")) {
              try {
                return JSON.parse(s);
              } catch {
                return [];
              }
            }
            return [s];
          }
          return [];
        };
        
        const updatedList = prev.map((m) => {
          const updated = { ...m };
          let didUpdate = false;

          let oldPrices = [];
          try {
            oldPrices = Array.isArray(updated.outcomePrices)
              ? updated.outcomePrices.map((v) => parseFloat(v) || 0)
              : JSON.parse(updated.outcomePrices || "[]").map((v) => parseFloat(v) || 0);
          } catch {
            oldPrices = [];
          }

          const newPrices = oldPrices.slice();


          if (data.event_type === "price_change" && Array.isArray(data.price_changes)) {
            const tokenIds = parseTokenIds(updated.clobTokenIds);

            for (const change of data.price_changes) {
              const { asset_id, price, best_bid, best_ask } = change;
              let s = String(asset_id);
              const idx = tokenIds.indexOf(s);
              if (idx === -1) continue;
              
              const newPrice = parseFloat(price);
              if (!isNaN(newPrice) && Math.abs(newPrice - oldPrices[idx]) > eps) {
                updated.priceChange = ((newPrice - oldPrices[idx]) / (oldPrices[idx] || 1)) * 100;
                newPrices[idx] = newPrice;
                didUpdate = true;
              }

              const bid = parseFloat(best_bid ?? updated.bestBid ?? 0);
              const ask = parseFloat(best_ask ?? updated.bestAsk ?? 0);
              if (!isNaN(bid)) updated.bestBid = bid;
              if (!isNaN(ask)) updated.bestAsk = ask;
              updated.spread = Math.abs((updated.bestAsk || 0) - (updated.bestBid || 0));
            }

            if (didUpdate) {
              console.log("updated", newPrices)
              updated.outcomePrices = newPrices;
              updated.lastUpdated = new Date().toISOString();
            }
          }

          return didUpdate ? { ...updated, _wasUpdated: true } : updated;
        });

        return updatedList.map(({ _wasUpdated, ...rest }) => rest);
      });

      return;
    }

    if (msg.type === "ticker") {
      const { data } = msg;
      if (!data || !data.market_ticker) return;

      setMarketData((prev) =>
        prev.map((m) => {
          if (!m.marketId || m.platform !== "kalshi") return m;
          if (m.marketId !== data.market_ticker) return m;

          const updated = { ...m };
          const eps = 1e-9;
          let didUpdate = false;

          const bid = parseFloat(data.bid ?? 0);
          const ask = parseFloat(data.ask ?? 0);
          const last = parseFloat(data.last_price ?? 0);

          if (Math.abs((updated.bestBid || 0) - bid) > eps) {
            updated.bestBid = bid;
            didUpdate = true;
          }
          if (Math.abs((updated.bestAsk || 0) - ask) > eps) {
            updated.bestAsk = ask;
            didUpdate = true;
          }
          updated.outcomePrices = [last, 1 - last]
          updated.lastPriceYes = last;
          updated.lastPriceNo = 1 - last;
          updated.bestBidNo = 1 - ask;
          updated.bestAskNo = 1 - bid;
          updated.spread = Math.abs((ask || 0) - (bid || 0));
          updated.lastUpdated = new Date(data.ts * 1000).toISOString();

          return didUpdate ? { ...updated, _wasUpdated: true } : updated;
        })
      );
    }
  }, []);


useEffect(() => {
  wsService.connect();

  wsService.subscribe("all", handleMarketData);
  setConnectionStatus("connected");

  return () => {
    wsService.unsubscribe("all", handleMarketData);
    wsService.disconnect();
  };
}, [handleMarketData]);

  const tabs = [
    { id: "markets", label: "Market Data", icon: "📊" },
    { id: "rules", label: "Trading Rules", icon: "⚡" },
    { id: "accounts", label: "Accounts", icon: "👤" },
    { id: "trades", label: "Trades", icon: "🦸‍♀️" },
  ];

  return (
    <div className="dashboard">
      {/* ===== Header ===== */}
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo-section">
            <h1>TradeAuto</h1>
            <div className="connection-status">
              <div className={`status-dot ${connectionStatus}`} />
              <span>{connectionStatus === "connected" ? "Live" : "Offline"}</span>
            </div>
          </div>

          <div className="user-section">
            <div className="user-info">
              <span className="welcome-text">Welcome,</span>
              <span className="username">{user?.username || "Guest"}</span>
            </div>
            <button onClick={logout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ===== Navigation ===== */}
      <nav className="dashboard-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`nav-btn ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="nav-icon">{tab.icon}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      {/* ===== Main Content ===== */}
      <main className="dashboard-main">
        <div className="main-content">
          {activeTab === "rules" && <RuleManager marketData={marketData} />}
          {activeTab === "markets" && <MarketData marketData={marketData} />}
          {activeTab === "trades" && <TradingPanel marketData={marketData}/>}
          {activeTab === "accounts" && <AccountManager />}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;