const handleMarketData = useCallback((msg) => {
  if (!msg || !msg.type) return;

  if (msg.type === "connection_status") {
    setConnectionStatus(msg.status);
    return;
  }

  if (msg.type === "market_data") {
    const { data } = msg;
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
            const idx = tokenIds.indexOf(asset_id);
            if (idx === -1) continue;

            const newPrice = parseFloat(price);
            if (!isNaN(newPrice) && Math.abs(newPrice - oldPrices[idx]) > eps) {
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
