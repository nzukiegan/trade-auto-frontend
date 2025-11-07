import axios from 'axios';
import { API_BASE_URL } from '../config/env.js';
import axiosRetry from 'axios-retry';

class ApiService {
  constructor() {
  this.client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  });

  this.client.interceptors.request.use((config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  axiosRetry(this.client, {
    retries: 3,
    retryDelay: (retryCount, error) => {
      const retryAfter = error.response?.headers['retry-after'];
      return retryAfter ? retryAfter * 1000 : retryCount * 1000;
    },
    retryCondition: (error) => {
      return (
        error.response &&
        (error.response.status === 429 || error.code === 'ECONNABORTED')
      );
    },
  });

  this.client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('authToken');
        window.location.href = '/';
      }
      return Promise.reject(error);
    }
  );
}

  async getTodayEarnings(){
    const response = await this.client.get('/users/today-earnings');
    return response.data;
  }

  async recordAdView(){
    const response = await this.client.post('/tasks/record-complete');
    return response.data;
  }

  async handleEndTask(task) {
    try {
      const response = await this.client.post('/ads/task-complete', {
        taskId: task._id,
      });
      console.log('Ad view recorded:', response.data);
      return response.data;
    } catch (error) {
      console.error('Failed to record ad view:', error);
      throw error;
    }
  }


  async canUserWatchAd(){
    const response = await this.client.get('/ads/can-watch');
    return response.data;
  }

  async getAvailableTasks(){
    const response = await this.client.get('/tasks/today-tasks');
    console.log("Task response ", response);
    return response.data;
  }

  async login(telegramData) {
    const response = await this.client.post('/api/auth/telegram', telegramData);
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  }

  async loadMiningLevels(){
    const response = await this.client.get('/mining/levels');
    return response.data;
  }

  async getReferralsOfMonth(){
    const response = await this.client.get('/users/month-referrals');
    return response.data;
  }

  async getUserProfile() {
    const response = await this.client.get('/users/profile');
    return response.data;
  }

  async claimDailyPoints() {
    const response = await this.client.post('/users/daily-claim');
    return response.data;
  }

  async upgradeMiningLevel() {
    const response = await this.client.post('/users/upgrade-level');
    return response.data;
  }

  async watchAd(adId, network = 'adsgram') {
    const response = await this.client.post('/users/watch-ad', { adId, network });
    return response.data;
  }

  async getAvailableAds(network = 'adsgram') {
    const response = await this.client.get('/users/ads', { params: { network } });
    return response.data;
  }

  async createPrediction(predictionData) {
    const response = await this.client.post('/predictions/create', predictionData);
    console.log(response);
    return response.data;
  }

  async placeBet(predictionId, betType, amount, userAddress) {
    const response = await this.client.post('/predictions/bet', {
      predictionId,
      betType,
      amount,
      userAddress
    });
    return response.data;
  }

  async getMarketVolumeChange24hr(){
    const response = await this.client.get('/predictions/marketVolumeChange24hr')
    return response.data;
  }

  async loadAirdropInfo(walletAddress){
    const response = await this.client.get(`/airdrop/status/${walletAddress}`)
    return response.data;
  }

  async getActiveMarketsChange24hr(){
    const response = await this.client.get('/predictions/activeMarketsChange24hr')
    return response.data;
  }

  async getAllPredictions(page = 1, status = "all") {
    const response = await this.client.get('/predictions/all', {
      params: { status }
    });
    return response.data;
  }

  async getTrendingPredictions(page = 1, category = "all"){
    const response = await this.client.get('/predictions/trending', {
      params: { page, category }
    });
    return response.data;
  }

  async getActivePredictions(page = 1, limit = 10) {
    const response = await this.client.get('/predictions/active', {
      params: { page, limit }
    });
    return response.data;
  }

  async getUserPredictions(page = 1, limit = 10) {
    const response = await this.client.get('/predictions/my-predictions', {
      params: { page, limit }
    });
    return response.data;
  }

  async connectWallet(walletAddress) {
    const response = await this.client.post('/wallet/connect', { walletAddress });
    return response.data;
  }

  async getWalletInfo() {
    const response = await this.client.get('/wallet/info');
    return response.data;
  }

  async withdrawUSDT(amount) {
    const response = await this.client.post('/wallet/withdraw', { amount });
    return response.data;
  }

  async getLeaderboard(page = 1, limit = 20) {
    const response = await this.client.get('/leaderboard', {
      params: { page, limit }
    });
    return response.data;
  }
}

export default new ApiService();