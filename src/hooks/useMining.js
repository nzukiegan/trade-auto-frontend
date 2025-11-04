// src/hooks/useMining.js
import { useState } from 'react';
import apiService from '../services/api.js';
import { useApp } from '../contexts/AppContext.jsx';

export function useMining() {
  const { miningData, updateMinerData, addNotification } = useApp();
  const [loading, setLoading] = useState(false);

  const claimDailyPoints = async () => {
    setLoading(true);
    try {
      const result = await apiService.claimDailyPoints();
      updateMinerData({
        points: miningData.points + result.points,
        totalPoints: miningData.totalPoints + result.points
      });
      addNotification(`Claimed ${result.points} daily points! Streak: ${result.streak}`, 'success');
      return result;
    } catch (error) {
      addNotification(error.message, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const upgradeLevel = async () => {
    setLoading(true);
    try {
      const result = await apiService.upgradeMiningLevel();
      updateMinerData({
        level: result.newLevel,
        energy: miningData.energy - result.energyUsed
      });
      addNotification(`Upgraded to level ${result.newLevel}!`, 'success');
      return result;
    } catch (error) {
      addNotification(error.message, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const watchAd = async (adId, network = 'adsgram') => {
    setLoading(true);
    try {
      const result = await apiService.watchAd(adId, network);
      updateMinerData({
        points: miningData.points + result.points,
        totalPoints: miningData.totalPoints + result.points,
        energy: miningData.energy + result.energy,
        usdtPoints: miningData.usdtPoints + result.usdtPoints
      });
      addNotification(`Earned ${result.points} points from ad!`, 'success');
      return result;
    } catch (error) {
      addNotification(error.message, 'error');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    miningData,
    loading,
    claimDailyPoints,
    upgradeLevel,
    watchAd
  };
}