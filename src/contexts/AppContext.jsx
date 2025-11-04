import React, { createContext, useContext, useReducer, useEffect } from 'react';
import apiService from '../services/api.js';

const AppContext = createContext();

const initialState = {
  user: null,
  loading: true,
  miningData: {
    level: 4,
    energy: 0,
    points: 0,
    totalPoints: 0,
    usdtPoints: 0
  },
  predictions: [],
  wallet: null,
  leaderboard: [],
  notifications: []
};

function appReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload,
        miningData: {
          level: action.payload.miningLevel,
          energy: action.payload.energy,
          points: action.payload.points,
          totalPoints: action.payload.totalPoints,
          usdtPoints: action.payload.usdtPoints
        }
      };
    
    case 'UPDATE_MINER_DATA':
      return {
        ...state,
        miningData: { ...state.miningData, ...action.payload }
      };
    
    case 'SET_PREDICTIONS':
      return { ...state, predictions: action.payload };
    
    case 'SET_WALLET':
      return { ...state, wallet: action.payload };
    
    case 'SET_LEADERBOARD':
      return { ...state, leaderboard: action.payload };
    
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload]
      };
    
    case 'CLEAR_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload)
      };
    
    default:
      return state;
  }
}

export function AppProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const userData = await apiService.getUserProfile();
        dispatch({ type: 'SET_USER', payload: userData.user });
        
        await loadWalletInfo();
        await loadPredictions();
        await loadLeaderboard();
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      localStorage.removeItem('authToken');
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const loadWalletInfo = async () => {
    try {
      const walletData = await apiService.getWalletInfo();
      dispatch({ type: 'SET_WALLET', payload: walletData });
    } catch (error) {
      console.error('Failed to load wallet info:', error);
    }
  };

  const loadPredictions = async () => {
    try {
      const predictionsData = await apiService.getAllPredictions();
      dispatch({ type: 'SET_PREDICTIONS', payload: predictionsData.predictions });
    } catch (error) {
      console.error('Failed to load predictions:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      const leaderboardData = await apiService.getLeaderboard();
      dispatch({ type: 'SET_LEADERBOARD', payload: leaderboardData.users });
    } catch (error) {
      console.error('Failed to load leaderboard:', error);
    }
  };

  const updateMinerData = (newData) => {
    dispatch({ type: 'UPDATE_MINER_DATA', payload: newData });
  };

  const addNotification = (message, type = 'info') => {
    const id = Date.now();
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { id, message, type }
    });
    
    setTimeout(() => {
      dispatch({ type: 'CLEAR_NOTIFICATION', payload: id });
    }, 5000);
  };

  const value = {
    ...state,
    initializeApp,
    updateMinerData,
    addNotification,
    refreshData: initializeApp,
    loadPredictions
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within AppProvider');
  }
  return context;
};