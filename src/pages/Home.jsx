import React, { useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext.jsx";
import { useMining } from "../hooks/useMining.js";
import apiService from "../services/api.js";
import miner from "../assets/grey bear.png";
import energyCoin from "../assets/energy.png";
import cryptCoin from "../assets/cryptcoin.png";
import blueBear from "../assets/bluebear holding btc.png";
import goldBear from "../assets/goldenbear.png";
import greyBear from "../assets/grey bear.png";
import WebApp from "@twa-dev/sdk";
import { TonConnectUI } from "@tonconnect/ui";
import { API_BASE_URL } from '../config/env.js';
import { Copy } from "lucide-react";
import { TREASURY_WALLET_ADDRESS } from "../config/env.js"

export default function Home() {
  const [telegramId, setTelegramId] = useState(null);
  const { user, miningData } = useApp();
  const { claimDailyPoints, upgradeLevel, loading } = useMining();
  const [miningLevels, setMiningLevels] = useState([]);
  const [username, setUsername] = useState('');
  const [nextRank, setNextRank] = useState(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [balance, setBalance] = useState(0);
  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    const user = WebApp.initDataUnsafe?.user;
    if (user) {
      setTelegramId(user.id);
      setUsername(user.username || `${user.first_name} ${user.last_name || ""}`);
      console.log("Telegram User:", user);
    } else {
      console.warn("No Telegram user data found. Are you in a mini app?");
    }

  }, []);

  const tonConnectUI = new TonConnectUI({
    manifestUrl: "http://localhost/tonconnect-manifest.json"
  });

  useEffect(() => {
    loadMiningLevels();
  }, []);

  async function convertTonToUsd(tonAmount = 1) {
    try {
      const url = "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network&vs_currencies=usd";
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      const tonPriceUsd = data["the-open-network"]?.usd;

      console.log("ton price usd ", tonPriceUsd)

      if (!tonPriceUsd) throw new Error("TON price not found in API response");

      const usdValue = tonPriceUsd * tonAmount;
      return Number(usdValue.toFixed(2));
    } catch (err) {
      console.error("Error converting TON to USD:", err.message);
      return null;
    }
  }

  async function handleSubscribe(planType, usdAmount) {
    try {
      setIsSubscribing(true);
      const tonAmount = convertTonToUsd(usdAmount);
      const connectedWallet = await tonConnectUI.connectWallet();
      if (!connectedWallet) {
        alert("Please connect your TON wallet to continue.");
        return;
      }

      const walletAddress = connectedWallet.account.address;

      localStorage.setItem("my_wallet_address", walletAddress);

      const tx = {
        validUntil: Math.floor(Date.now() / 1000) + 300,
        messages: [
          {
            address: TREASURY_WALLET_ADDRESS,
            amount: (parseFloat(tonAmount) * 1e9).toString(), // nanoTONs
          },
        ],
      };

      await tonConnectUI.sendTransaction(tx);
      alert(`✅ Payment of ${tonAmount} TON sent successfully!`);

      await apiService.verifySubscription({
        plan: planType,
        amount: tonAmount,
        walletAddress: connectedWallet.account.address,
      });

      setShowSubscriptionModal(false);
    } catch (err) {
      console.error("Subscription error:", err);
      alert("Subscription failed. Please try again.");
    } finally {
      setIsSubscribing(false);
    }
  }

  const calculateNextRank = () => {
    const currentLevel = miningData.level;
    if (currentLevel < 18 && Array.isArray(miningLevels) && miningLevels.length > 0) {
      console.log(miningLevels)
      const nextLevel = miningLevels.find((lvl) => lvl.level === currentLevel + 1);
      setNextRank(nextLevel);
    } else {
      setNextRank(null);
    }
  };

  const openSubscriptionModal = async () => {
    const userBalance = 0;
    setBalance(userBalance);
    setShowSubscriptionModal(true);
  };

  const handleShareReferral = async () => {
    if (!user?.referralCode) {
      alert("Referral code not found.");
      return;
    }

    const referralLink = `${API_BASE_URL}/?ref=${user.referralCode}`;

    if (WebApp && WebApp.openTelegramLink) {
      const message = `🎉 Join me on Digital Miner! Use my referral link to get rewards: ${referralLink}`;
      WebApp.openTelegramLink(`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(message)}`);
      return;
    }

    try {
      await navigator.clipboard.writeText(referralLink);
      alert("Referral link copied to clipboard!");
    } catch (err) {
      console.error("Clipboard copy failed:", err);
      alert("Could not copy link. Please try again.");
    }
  };

  useEffect(() => {
    calculateNextRank();
  }, [miningLevels, miningData.level]);

  const loadMiningLevels = async () => {
    const m = await apiService.loadMiningLevels();
    console.log(m)
    setMiningLevels(m);
  };

  const getCollectorRank = (level) => {
    const ranks = [
      "Beginner", "Novice", "Apprentice", "Adept", "Expert",
      "Master", "Grandmaster", "Elite", "Epic", "Legendary",
      "Mythic", "Divine", "Immortal", "Celestial", "Titan",
      "Demi-God", "God", "Omnipotent"
    ];
    return ranks[level - 1] || "Unknown";
  };

  const getProgressPercentage = () => {
    if (!nextRank || miningLevels.length === 0) return 0;
    const currentEnergy = miningData.energy;
    const energyForNextLevel = nextRank.energyRequired || 1;
    return Math.min((currentEnergy / energyForNextLevel) * 100, 100);
  };

  const filledBars = Math.round(getProgressPercentage() / 6);
  const emptyBars = 18 - filledBars;

  return (
    <div className="bg-white min-h-screen font-sans text-gray-800 px-4 py-6 flex justify-center">
       <div className="w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Welcome Back
          </h2>
        </div>

        {/* Rank Card */}
        <div className="bg-[#001F0C] rounded-2xl p-5 text-white mb-5 flex items-center gap-4 shadow-md">
          <img src={greyBear} alt="Miner Icon" className="w-20 h-17 object-contain" />
          <div>
            <h2 className="font-bold text-lg leading-tight">Digital Miner</h2>
            <p className="text-sm opacity-90">
              Welcome back miner! Your crystals look ready.
            </p>
            <span className="block mt-1 text-xs bg-[#CFB53B] px-2 py-1 rounded-full inline-block text-black">
              ⭐level {miningData.level}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white border rounded-2xl py-7 px-5 shadow-sm flex">
            <img src={energyCoin} className="w-[30px] h-[30px] mr-[5px]"></img>
            <div> 
              <div className="text-lg font-semibold text-gray-800">Energy Brick</div>
              <div className="text-xs font-semibold text-gray-800">
                {miningData.energy}
              </div>
            </div>
          </div>
          <div className="bg-white border rounded-lg p-5 shadow-sm flex">
            <img src={cryptCoin} className="w-[30px] h-[30px] mr-[5px]"></img>
            <div>
              <div className="text-lg font-semibold text-gray-800">Total Coins</div>
              <div className="text-xs font-semibold text-gray-800">
                {miningData.totalPoints.toLocaleString()}
              </div>
            </div>
          </div>
        </div>

        {/* Collector Progress */}
        <div className="my-6 bg-white p-3 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-medium text-gray-700">Collector Progress</div>
            <button className="text-xs text-white bg-[#29a847] px-4 py-1 rounded-full font-medium hover:bg-[#24923f] transition">
              {getCollectorRank(miningData.level)} Collector
            </button>
          </div>
            <div className="mt-4 border rounded-lg p-3 shadow-sm">
              <div className="flex flex-col gap-2">
                {/* Progress bar section */}
                <div className="flex items-center gap-2">
                  <div className="text-xs text-gray-500">Progress:</div>

                  {(() => {
                    const totalBars = 18; // total possible ranks
                    const filledBars = Math.min(miningData.level, totalBars);
                    const emptyBars = totalBars - filledBars;

                    return (
                      <div className="flex items-center gap-1">
                        {[...Array(filledBars)].map((_, i) => (
                          <div
                            key={`filled-${i}`}
                            className="h-6 w-1.5 bg-yellow-400 rounded-full"
                          ></div>
                        ))}
                        {[...Array(emptyBars)].map((_, i) => (
                          <div
                            key={`empty-${i}`}
                            className="h-6 w-1.5 bg-gray-300 rounded-full"
                          ></div>
                        ))}
                      </div>
                    );
                  })()}
                </div>

                {/* Rank label */}
                <div className="text-xs text-gray-500 ml-12">
                  • Current Rank{" "}
                  <span className="font-semibold text-gray-700">
                    {miningData.level} / 18
                  </span>
                </div>
              </div>
            </div>
        </div>

        {/* Next Rank */}
        {nextRank && (
          <>
            <div className="text-lg font-medium text-gray-700 my-3">
              Next Rank: {getCollectorRank(nextRank.level)} Collector
            </div>

            <div className="mt-5 bg-white border rounded-xl p-4 shadow-sm">
              <ul className="text-sm text-gray-600 space-y-2 mb-4">
                <li>Collect {nextRank.energyRequired} Energy Bricks</li>
                <li>Earn {nextRank.pointsPerDay} points daily</li>
                <li>Upgrade mining equipment</li>
              </ul>
              <button
                className="w-full bg-[#29a847] text-white py-2 rounded-lg font-semibold disabled:opacity-50"
                onClick={() => upgradeLevel()}
                disabled={loading || miningData.energy < nextRank.energyRequired}
              >
                Upgrade {nextRank.energyRequired} Energy
              </button>
            </div>
          </>
        )}

        {/* Invite / Share Card */}
        <div className="mt-5 bg-white border rounded-xl p-4 shadow-sm text-center">
          <div className="mb-3">
            <img src={blueBear} className="w-28 h-38 mx-auto"></img>
          </div>
          <div className="text-sm font-medium text-gray-700">Bring More Collectors!</div>
          <div className="text-xs text-gray-500 mt-2 mb-3">
            Invite friends and earn bonus rewards
          </div>
          <button
            onClick={handleShareReferral}
            className="bg-[#29a847] text-white px-4 py-2 rounded-full font-semibold"
          >
            Share Collection Link
          </button>
          {user?.referralCode && (
            <p className="text-xs text-gray-500 mt-2">
              Your code: <strong>{user.referralCode}</strong>
            </p>
          )}
        </div>

        {/* Premium Upgrade Section */}
        <div className="mt-5 bg-white border rounded-xl p-4 shadow-sm text-center mb-20">
          <div className="mb-3">
            <img src={goldBear} className="w-28 h-38 mx-auto"></img>
          </div>
          <div className="text-sm font-medium text-gray-700">Premium Upgrade</div>
          <div className="text-xs text-gray-500 mt-2 mb-3">
            Up to 2x more collector rewards
          </div>
          <button
            className="bg-[#29a847] text-white px-8 py-2 rounded-full font-semibold"
            onClick={openSubscriptionModal}
          >
            {user?.subscription?.type === "none"
              ? "Upgrade to Premium"
              : "Manage Subscription"}
          </button>
          {user?.subscription?.type !== "none" && (
            <p className="text-xs text-gray-500 mt-2">
              Current: {user?.subscription.type} plan{" "}
              {user?.subscription.expiresAt && (
                <span>
                  - Expires:{" "}
                  {new Date(user?.subscription.expiresAt).toLocaleDateString()}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* ✅ Subscription Modal */}
      {showSubscriptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-80 shadow-lg text-center">
            <h2 className="font-bold text-lg mb-2">Choose Your Subscription</h2>

            <div className="space-y-3">
              <button
                disabled={isSubscribing}
                onClick={() => handleSubscribe("monthly", 1)}
                className="w-full bg-green-500 text-white py-2 rounded-md font-semibold hover:bg-green-600 disabled:opacity-50"
              >
                Subscribe Monthly - $1
              </button>
              <button
                disabled={isSubscribing}
                onClick={() => handleSubscribe("lifetime", 5)}
                className="w-full bg-yellow-500 text-black py-2 rounded-md font-semibold hover:bg-yellow-400 disabled:opacity-50"
              >
                Lifetime Access - $5
              </button>
              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="w-full mt-2 text-gray-600 border border-gray-300 py-2 rounded-md"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}