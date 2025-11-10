import React, { useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext.jsx";
import { TonConnectUI } from "@tonconnect/ui";
import apiService from "../services/api.js";
import bear from "../assets/bluebear holding btc.png";
import avatars from "../assets/profile icons.png";
import chartImg from "../assets/chart.png";
import dollarImg from "../assets/dollar-sign.png";
import wierdStar from "../assets/wierdStar.svg";
import { TON_MANIFEST_URL, TREASURY_WALLET_ADDRESS, COINGECKO_PRICE_URL} from "../config/env.js";
import arrowUp from "../assets/arrow-up.png";
import arrowDown from "../assets/arrow-down.png";
import { useTonConnect } from "../contexts/TonConnectContext.jsx";


const Predict = () => {
    const {
    tonConnect,
    walletAddress,
    walletConnected,
    setWalletAddress,
    setWalletConnected,
  } = useTonConnect();
  const { miningData, predictions, addNotification, loadPredictions } = useApp();
  const [activeTab, setActiveTab] = useState("active");
  const [creatingPrediction, setCreatingPrediction] = useState(false);
  const [totalVolume, setTotalVolume] = useState(0);
  const [activeVolume, setActiveVolume] = useState(0);
  const [activeMarketsChange, setActiveMarketsChange] = useState(0);
  const [activeMarketsChangeDirection, setActiveMarketsChangeDirection] = useState("");
  const [marketVolumeChange24hr, setMarketVolumeChange24hr] = useState(0);
  const [marketVolumeDirection, setMarketVolumeDirection] = useState("");
  const [newPrediction, setNewPrediction] = useState({
    question: "",
    description: ""
  });
  const [bettingAmount, setBettingAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [bettingPrediction, setBettingPrediction] = useState(null);
  const [tempBetAmount, setTempBetAmount] = useState(bettingAmount);

  const openBetModal = (prediction) => {
    setBettingPrediction(prediction);
    setTempBetAmount(bettingAmount);
  };

  useEffect(() => {
    if (!Array.isArray(predictions)) return;

    const { totalVolume, activeVolume } = predictions.reduce(
      (acc, item) => {
        const poolYes = item.totalPool?.yes || 0;
        const poolNo = item.totalPool?.no || 0;
        const vol = poolYes + poolNo;

        acc.totalVolume += vol;
        if (item.status === "active") acc.activeVolume += vol;

        return acc;
      },
      { totalVolume: 0, activeVolume: 0 }
    );
    console.log("Total volume ", totalVolume)
    setTotalVolume(totalVolume);
    setActiveVolume(activeVolume);
  }, [predictions]);


  const getActiveMarketsChange = async () => {
    const m = await apiService.getActiveMarketsChange24hr();
    setActiveMarketsChange(m.change24hr);
    setActiveMarketsChangeDirection(m.direction);
  };

  async function usdToTon(usdAmount) {
    const res = await fetch(
      COINGECKO_PRICE_URL
    );
    const data = await res.json();
    const tonPrice = data["the-open-network"].usd; // USD price per 1 TON

    const tonAmount = usdAmount / tonPrice;
    return tonAmount;
  }

  async function toNano(amount) {
    if (amount === undefined || amount === null || isNaN(amount))
      throw new Error("Invalid TON amount");
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    const nano = Math.round(num * 1e9);
    return BigInt(nano);
  }

  const getMarketVolumeChange = async () => {
    const m = await apiService.getMarketVolumeChange24hr();
    setMarketVolumeChange24hr(m.change24hr);
    setMarketVolumeDirection(m.direction);
  };

  useEffect(() => {
    getActiveMarketsChange();
    getMarketVolumeChange();
  }, [predictions]);

  const handleCreatePrediction = async (e) => {
    e.preventDefault();
    if (!tonConnect) {
      tonConnect.openModal()
      return;
    }

    setLoading(true);
    try {
      const userWalletAddress = tonConnect.wallet.account.address;
      const predictionPayload = {
        ...newPrediction,
        walletAddress: userWalletAddress,
      };

      await apiService.createPrediction(predictionPayload);

      setNewPrediction({
        question: "",
        description: ""
      });
      setCreatingPrediction(false);
      loadPredictions();
    } catch (error) {
      console.error(error);
      addNotification(error.message || "Failed to create prediction", "error");
    } finally {
      setLoading(false);
    }
  };


  const handlePlaceBet = async (predictionId, betType) => {
    const userWalletAddress = tonConnect.wallet.account.address;
    const tonamount = await usdToTon(bettingAmount)
    const amountNano = toNano(tonamount);

    const transferMessage = {
      to: TREASURY_WALLET_ADDRESS,
      value: amountNano.toString(),
      body: "Payment for bet placement",
    };

    await tonConnect.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 60,
      messages: [transferMessage],
    });

    setLoading(true);
    try {
      const result = await apiService.placeBet(
        predictionId,
        betType,
        tonamount,
        userWalletAddress
      );
      addNotification(
        `Bet placed successfully! Potential payout: ${result.potentialPayout} points`,
        "success"
      );
      loadPredictions();
    } catch (error) {
      addNotification(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  const calculateOdds = (prediction) => {
    const yesPool = prediction.totalPool?.yes || 0;
    const noPool = prediction.totalPool?.no || 0;
    const totalPool = yesPool + noPool;

    const platformFee = prediction.platformFee || 0;
    const creatorFee = prediction.creatorFee || 0;

    if (totalPool === 0) {
      return { yes: 1.0, no: 1.0 };
    }

    const feeAmount = totalPool * (platformFee + creatorFee);
    const winningPool = totalPool - feeAmount;

    return {
      yes: yesPool > 0 ? +(winningPool / yesPool).toFixed(2) : "N/A",
      no: noPool > 0 ? +(winningPool / noPool).toFixed(2) : "N/A",
    };
  };

  const getProgressPercentage = (prediction, type) => {
    const total = prediction.totalPool.yes + prediction.totalPool.no;
    if (total === 0) return 0;
    return (prediction.totalPool[type] / total) * 100;
  };

  const filteredPredictions = predictions.filter((p) => {
    if (activeTab === "active") return p.status === "active";
    if (activeTab === "trending") return p.isTrending;
    return true;
  });

  console.log("Filtered prediction ", filteredPredictions)

  return (
    <div className="bg-gray-100 flex justify-center min-h-screen">
      <div className="bg-white w-full max-w-sm rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 sticky top-0 bg-white z-10">
          <img src={wierdStar} alt="Logo" className="w-8 h-8" />

          {walletConnected ? (
            <button
              className="bg-red-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-red-600 transition"
              onClick={async () => {
                try {
                  await tonConnect.disconnect();
                  setWalletConnected(false);
                  setWalletAddress(null);
                  alert("Wallet disconnected");
                } catch (err) {
                  console.error("Disconnect error:", err);
                  alert("Failed to disconnect wallet");
                }
              }}
            >
              Disconnect
            </button>
          ) : (
            <button
              className="bg-green-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-green-600 transition"
              onClick={async () => {
                try {
                  await tonConnect.connectWallet();
                } catch (err) {
                  console.error("Connect error:", err);
                  alert("Failed to connect wallet");
                }
              }}
            >
              Connect Wallet
            </button>
          )}
        </div>

        {/* Hero Section */}
        <div className="text-center p-6">
          <div className="flex justify-center mb-3">
            <div className="bg-green-500 p-3 rounded-full flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-6 h-6 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 4v16h16" />
                <path d="M8 14l4-4 4 2 4-6" />
              </svg>
            </div>
          </div>
          <h2 className="text-xl font-semibold mb-2">
            Predict the Future, Earn <br /> Rewards
          </h2>
          <p className="text-gray-500 text-sm">
            Join the world of decentralized prediction markets and put your
            knowledge to the test.
          </p>
        </div>

        {/* Market Overview */}
        <span className="flex items-center gap-5 font-semibold text-lg ml-4">
          Market Overview
        </span>

        <div className="grid grid-cols-2 gap-4 px-4 mt-3">
          {/* Total Volume */}
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center">
              <img src={chartImg} alt="chart" />
              <div className="text-gray-800 text-sm ml-[6px]">Total Volume</div>
            </div>

            <h3 className="text-lg font-semibold mt-1">{totalVolume}</h3>

            <div className="flex items-center justify-center gap-1 mt-1">
              {marketVolumeDirection === "increase" && (
                <img src={arrowUp} alt="Up" className="w-3 h-3" />
              )}
              {marketVolumeDirection === "decrease" && (
                <img src={arrowDown} alt="Down" className="w-3 h-3" />
              )}
              <span
                className={`text-xs font-medium ${
                  marketVolumeDirection === "increase"
                    ? "text-green-500"
                    : marketVolumeDirection === "decrease"
                    ? "text-red-500"
                    : "text-gray-500"
                }`}
              >
                {marketVolumeChange24hr}%
              </span>
            </div>
          </div>

          {/* Active Markets */}
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <div className="flex items-center justify-center">
              <img src={dollarImg} alt="dollar" />
              <div className="text-gray-800 text-sm ml-[6px]">Active Markets</div>
            </div>

            <h3 className="text-lg font-semibold mt-1">{activeVolume}</h3>

            <div className="flex items-center justify-center gap-1 mt-1">
              {activeMarketsChangeDirection === "increase" && (
                <img src={arrowUp} alt="Up" className="w-3 h-3" />
              )}
              {activeMarketsChangeDirection === "decrease" && (
                <img src={arrowDown} alt="Down" className="w-3 h-3" />
              )}
              <span
                className={`text-xs font-medium ${
                  activeMarketsChangeDirection === "increase"
                    ? "text-green-500"
                    : activeMarketsChangeDirection === "decrease"
                    ? "text-red-500"
                    : "text-gray-500"
                }`}
              >
                {activeMarketsChange}%
              </span>
            </div>
          </div>
        </div>

        {/* Create Button */}
        <div className="p-4 text-center">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded-lg font-medium"
            onClick={() => setCreatingPrediction(true)}
          >
            Create New Prediction
          </button>
        </div>

        {/* Create Prediction Modal */}
        {creatingPrediction && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-80 shadow-lg">
              <h3 className="font-semibold text-lg mb-1">
                Create New Prediction
              </h3>
              <form onSubmit={handleCreatePrediction} className="space-y-3">
                <input
                  type="text"
                  value={newPrediction.question}
                  onChange={(e) =>
                    setNewPrediction({
                      ...newPrediction,
                      question: e.target.value,
                    })
                  }
                  placeholder="Will Bitcoin reach $100k?"
                  className="border w-full p-2 rounded"
                  required
                />
                <textarea
                  value={newPrediction.description}
                  onChange={(e) =>
                    setNewPrediction({
                      ...newPrediction,
                      description: e.target.value,
                    })
                  }
                  placeholder="Description"
                  className="border w-full p-2 rounded"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setCreatingPrediction(false)}
                    className="px-3 py-1 border rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-3 py-1 bg-green-500 text-white rounded"
                  >
                    {loading ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bet Modal */}
        {bettingPrediction && (
          <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-80 shadow-lg">
              <h3 className="font-semibold text-lg mb-2">
                Place Bet: {bettingPrediction.question}
              </h3>

              <input
                type="number"
                value={tempBetAmount}
                onChange={(e) => setTempBetAmount(Number(e.target.value))}
                className="border w-full p-2 rounded mb-3"
              />

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setBettingPrediction(null)}
                  className="px-3 py-1 border rounded"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="px-3 py-1 bg-green-500 text-white rounded"
                  onClick={async () => {
                    setBettingAmount(tempBetAmount);
                    await handlePlaceBet(bettingPrediction._id, bettingPrediction.choice || "yes"); // you can pass choice from button
                    setBettingPrediction(null);
                  }}
                >
                  Confirm Bet
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Explore Markets */}
        <div className="px-4 mb-20">
          <h3 className="font-semibold mb-3">Explore Markets</h3>
          <div className="flex gap-2 mb-4">
            {["All", "Active", "Trending"].map((tab) => (
              <button
                key={tab}
                className={`px-3 py-1 rounded-full text-sm ${
                  activeTab === tab.toLowerCase()
                    ? "bg-green-500 text-white"
                    : "border"
                }`}
                onClick={() => setActiveTab(tab.toLowerCase())}
              >
                {tab}
              </button>
            ))}
          </div>

          {filteredPredictions.length > 0 ? (
            filteredPredictions.map((prediction) => {
              const odds = calculateOdds(prediction);
              const yesPercent = getProgressPercentage(prediction, "yes");

              return (
                <div
                  key={prediction._id}
                  className="bg-gray-50 p-4 rounded-xl mb-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex gap-3">
                      <img src={bear} alt="bear" className="w-10 h-10" />
                      <div>
                        <p className="text-sm font-medium leading-tight">
                          {prediction.question}
                        </p>
                        <img
                          src={avatars}
                          alt="avatars"
                          className="w-16 h-5 mt-2 object-contain"
                        />
                        <div className="text-gray-500 text-xs mt-1">
                          {prediction.participants.length} Participants
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full">
                        {prediction.status}
                      </span>
                      <span className="text-gray-500 text-xs mt-2">
                        Volume: $
                        {(
                          (prediction.totalPool.yes +
                            prediction.totalPool.no)
                        ).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="bg-gray-200 h-2 rounded-full mt-3 overflow-hidden">
                    <div
                      className="bg-yellow-400 h-full"
                      style={{ width: `${yesPercent}%` }}
                    ></div>
                  </div>

                  <div className="flex gap-3 mt-3">
                    <button
                      onClick={() => openBetModal({ ...prediction, choice: "yes" })}
                      disabled={loading}
                      className="bg-green-500 text-white flex-1 py-2 rounded-lg text-sm font-medium"
                    >
                      Predict Yes ({odds.yes}x)
                    </button>
                    <button
                      onClick={() => openBetModal({ ...prediction, choice: "no" })}
                      disabled={loading}
                      className="bg-gray-200 flex-1 py-2 rounded-lg text-sm font-medium"
                    >
                      Predict No ({odds.no}x)
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-center text-gray-500 text-sm">
              No predictions available.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Predict;