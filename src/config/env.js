// src/config/env.js
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';
export const TON_RPC_URL = import.meta.env.VITE_TON_RPC_URL || 'https://toncenter.com/api/v2/jsonRPC';
export const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
export const TON_MANIFEST_URL = import.meta.env.VITE_TON_MANIFEST_URL;
export const TREASURY_WALLET_ADDRESS = import.meta.env.VITE_TREASURY_WALLET_ADDRESS;
export const COINGECKO_PRICE_URL = import.meta.env.VITE_COINGECKO_PRICE_URL;
export const ADSONAR_APP_ID = import.meta.env.VITE_ADSONAR_APP_ID;
export const ADSONAR_URL = import.meta.env.VITE_ADSONAR_URL;