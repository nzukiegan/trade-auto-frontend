import React, { useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext.jsx";
import { useMining } from "../hooks/useMining.js";
import apiService from "../services/api.js";
import Navigation from "../components/Navigation.jsx";
import greybear from "../assets/grey bear.png";
import goldenbear from "../assets/goldenbear.png";
import brownbear from "../assets/brown bear holding btc.png";
import { ADSONAR_APP_ID, ADSONAR_URL } from "../config/env.js";

const Earn = () => {
  const { user, miningData, initializeApp } = useApp();
  const { watchAd, loading } = useMining();
  const [availableTasks, setAvailableTasks] = useState([]);
  const [todayEarnings, setTodayEarnings] = useState([]);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [monthReferrals, setMonthReferrals] = useState(0);
  const [progress, setProgress] = useState(75);
  const [adTasks, setAdTasks] = useState([]);
  const [completedAds, setCompletedAds] = useState(0);
  const [totalAds, setTotalAds] = useState(0);
  const [nextAdTask, setNextAdTask] = useState(null);
  console.log(user)
  useEffect(() => {
    loadAvailableTasks();
    loadTodayEarnings();
    loadMonthReferrals();
  }, []);

  useEffect(() => {
    setTotalEarnings((user?.totalPoints ?? 0) / 10000);
  }, [user?.totalPoints]);

  useEffect(() => {
  if (!availableTasks || availableTasks.length === 0) {
    setAdTasks([]);
    setCompletedAds(0);
    setTotalAds(0);
    setNextAdTask(null);
    return;
  }

  const filtered = availableTasks
    .filter(task => task.category === "ads")
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  setAdTasks(filtered);
  setCompletedAds(filtered.filter(t => t.completed).length);
  setTotalAds(filtered.length);

  const firstUncompleted = filtered.find(t => !t.completed) || null;
  console.log("FIrst uncomplete ", firstUncompleted)
  setNextAdTask(firstUncompleted);
}, [availableTasks]);


  const loadAvailableTasks = async () => {
    try {
      const tasks = await apiService.getAvailableTasks();
      setAvailableTasks(tasks.tasks);
    } catch (error) {
      console.error("Failed to load ads:", error);
    }
  };

  function useAdSonar() {
    useEffect(() => {
      if (!ADSONAR_APP_ID) {
        console.warn("AdSonar APP_ID not set");
        return;
      }

      const script = document.createElement("script");
      script.src = `${ADSONAR_URL}appId=${ADSONAR_APP_ID}`;
      script.async = true;
      document.body.appendChild(script);

      return () => {
        document.body.removeChild(script);
      };
    }, []);
  }

  useAdSonar();

  const loadTodayEarnings = async () => {
    const earnings = await apiService.getTodayEarnings();
    setTodayEarnings(earnings);
  };

  const loadMonthReferrals = async () => {
    try {
      const response = await apiService.getReferralsOfMonth();
      console.log("Month referrals response ", response)
      setMonthReferrals(response.monthlyReferrals);
    } catch (error) {
      console.error("Failed to load referrals:", error);
    }
  };

  const handleStartTask = async (task) => {
    if (task.type === 'ad') {
      const canWatchAd = await apiService.canUserWatchAd();
      if (canWatchAd.canWatch) {
        showRewardedAd(task);
      }
    }
  };

  const showRewardedAd = (task) => {
    window.Sonar.show({
      adUnit: REWARDED_AD_UNIT,
      loader: true,
      onReward: async () => {
        try {
          const result = await apiService.handleEndTask(task);
          setAvailableTasks(prev =>
            prev.map(t =>
              t._id === task._id ? { ...t, completed: true } : t
            )
          ); // Mark task as completed instead of removing
          console.log("Task completed:", result);
        } catch (err) {
          console.error("Failed to record task completion:", err);
        }
        initializeApp();
      },
    }).then((result) => {
      if (result.status === 'error') {
        console.error('Ad failed to show:', result.message);
      } else {
        console.log('Ad status:', result.status);
      }
    });
  };

  return (
    <div className="bg-white min-h-screen font-sans text-gray-800 px-4 py-6 flex justify-center">
      <div className="w-full max-w-sm">
        <h1 className="text-center text-2xl font-extrabold mb-4">
          Welcome Back
        </h1>

        <div className="bg-[#001F0C] rounded-2xl p-5 text-white mb-5 flex items-center gap-4">
          <img src={greybear} alt="Bear" className="w-20 h-17" />
          <div>
            <h2 className="font-bold text-lg leading-tight">
              Boost Your Earnings Today!
            </h2>
            <p className="text-sm opacity-90">
              Engage, earn, and grow your crypto portfolio.
            </p>
            <span className="block mt-1 text-xs bg-white/20 px-2 py-1 rounded-md inline-block">
              {user?.subscription?.type
                ? `🎉 Premium Member (${user.subscription.type})`
                : "⚡ Standard Member"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="relative border rounded-xl p-4 shadow-sm overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1 bg-green-500 rounded-l-xl"></div>
            <div className="text-xs font-semibold text-gray-800 mb-1">Total Earned</div>
            <div className="text-lg font-bold">{totalEarnings} USDT</div>
            <div className="text-xs text-center text-white mt-1 bg-green-800 rounded-full p-1 pl-2">
              +{user?.pointsChangeThisMonth || 0}% this month
            </div>
          </div>

          <div className="relative border rounded-xl p-4 shadow-sm overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1 bg-yellow-400 rounded-l-xl"></div>
            <div className="text-xs font-semibold text-gray-800 mb-1">Referral Bonus</div>
            <div className="text-lg font-bold">
              {Number(user?.referralStats?.referralBonusUsdt || 0).toFixed(0)} USDT
            </div>
            <div className="text-xs text-center text-white mt-1 bg-yellow-400 rounded-full p-1 pl-2">
               +{monthReferrals ?? 0} new
            </div>
          </div>
        </div>

        <div className="border border-gray-200 border-l-4 border-l-green-500 rounded-xl p-4 mb-5 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            USDT Rewards Progress
          </h3>

          <input
            type="range"
            min="0"
            max="100"
            value={user?.progress ?? 0}
            readOnly
            className="w-full accent-green-500"
          />
          <div className="text-xs text-gray-600 mt-2 mb-1">
            {(user?.progress ?? 0)} / 100 USDT
          </div>
          <div className="text-xs text-gray-400">
            {100 - user?.progress} USDT left for next bonus!
          </div>
        </div>

        <div className="border rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3 mb-3">
            <img src={brownbear} alt="Brown Bear" className="w-40 h-40 object-contain" />
            <h3 className="text-base font-semibold text-gray-800">
              Today’s Earnings
            </h3>
          </div>

          <div className="space-y-2">
            {Object.entries(todayEarnings.sources || {})
              .filter(([_, amount]) => amount > 0) // ✅ Only show earnings > 0
              .map(([name, amount], index) => (
                <div key={index} className="flex justify-between border border-gray-200 rounded-lg p-2">
                  <span className="text-sm text-gray-700 capitalize">
                    {name.replace(/_/g, ' ')}
                  </span>
                  <span className="text-sm text-green-500 font-medium">
                    +{amount / 10000} USDT
                  </span>
                </div>
            ))}
          </div>

        </div>

        <div className="mb-6">
          <h3 className="text-base font-semibold text-gray-800 mb-3">Available Tasks</h3>

          {nextAdTask && (
            <div className="border rounded-xl p-4 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {nextAdTask.icon && (
                  <img src={nextAdTask.icon} alt={nextAdTask.title} className="w-10 h-10 object-contain" />
                )}
                <div>
                  <div className="font-semibold text-sm text-gray-900">{nextAdTask.title}</div>
                  <div className="text-xs text-gray-500">{nextAdTask.description}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    Reward: <span className="text-green-600 font-semibold">{nextAdTask.rewardPoints} pts</span> | Energy: <span className="text-yellow-600 font-semibold">{nextAdTask.rewardEnergy}</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleStartTask(nextAdTask)}
                disabled={loading || nextAdTask.completed}
                className="bg-yellow-400 text-gray-800 font-semibold text-sm px-4 py-1.5 rounded-lg w-28 text-center disabled:opacity-60"
              >
                {loading ? "Loading..." : `Watch Ad 1/${totalAds}`}
              </button>
            </div>
          )}
        </div>

        <div className="bg-gray-900 text-white rounded-xl p-5 text-center mb-10">
          <div className="text-2xl mb-1">💡</div>
          <h4 className="text-yellow-400 font-semibold mb-2">Earning Tips</h4>
          <p className="text-xs opacity-90">
            Complete daily check-ins and refer friends to maximize your USDT earnings. Always watch out for new high-paying tasks!
          </p>
        </div>

        <Navigation active="Earn" />
      </div>
    </div>
  );
};

export default Earn;