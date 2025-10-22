import axios from 'axios';

const BASE_URL = import.meta.env.VITE_BACKEND_URL

export const authAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const tradingAPI = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

tradingAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

authAPI.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function generateUUID() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
      (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
  }

export class WebSocketService {
  constructor() {
    this.ws = null;
    this.subscribers = new Map();
    this.userId = generateUUID();
  }

    connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this._shouldReconnect = true;
    let wsUrl = import.meta.env.VITE_BACKEND_WS
    console.log("ws url", wsUrl)
    this.ws = new WebSocket(`${wsUrl}?userId=${this.userId}`);

    this.ws.onopen = () => {
      console.log('WebSocket connected with userId:', this.userId);

      this._emit({ type: 'ws_open' });
    };

    this.ws.onmessage = (event) => {
      let data;
      try {
        data = JSON.parse(event.data);
      } catch (e) {
        console.error('Invalid JSON from websocket:', event.data);
        return;
      }

      this._emit(data);
    };

    this.ws.onclose = () => {
      console.log('WebSocket disconnected');
      this._emit({ type: 'ws_close' });
      if (this._shouldReconnect) {
        setTimeout(() => this.connect(), this.reconnectTimeout);
      }
    };

    this.ws.onerror = (err) => {
      console.error('WebSocket error:', err);
      this._emit({ type: 'ws_error', error: err });
    };
  }

  disconnect() {
    this._shouldReconnect = false;
    if (this.ws) this.ws.close();
  }

  subscribe(key = 'all', callback) {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }
    this.subscribers.get(key).add(callback);
  }

  unsubscribe(key = 'all', callback) {
    if (!this.subscribers.has(key)) return;
    this.subscribers.get(key).delete(callback);
    if (this.subscribers.get(key).size === 0) this.subscribers.delete(key);
  }

  _emit(payload) {
    const allSubs = this.subscribers.get('all');
    if (allSubs) {
      allSubs.forEach(cb => {
        try { cb(payload); } catch (e) { console.error('subscriber error', e); }
      });
    }
    const marketId = payload.marketId || payload.market || null;
    if (marketId && this.subscribers.has(marketId)) {
      this.subscribers.get(marketId).forEach(cb => {
        try { cb(payload); } catch (e) { console.error('subscriber error', e); }
      });
    }
  }
}

export const wsService = new WebSocketService();