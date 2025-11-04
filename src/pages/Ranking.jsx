import React, { useState, useEffect } from "react";
import { useApp } from "../contexts/AppContext.jsx";
import "../index.css";
import golden from "../assets/goldenbear.png";
import bluebear from "../assets/bluebear holding btc.png";
import greybear from "../assets/grey bear.png";

const Ranking = () => {
  const { user, miningData, leaderboard } = useApp();
  const [userRank, setUserRank] = useState(null);
  const [timeframe, setTimeframe] = useState("all-time");

  useEffect(() => {
    calculateUserRank();
  }, [leaderboard, miningData.totalPoints]);

  const calculateUserRank = () => {
    if (!leaderboard?.length) return;
    const userIndex = leaderboard.findIndex((u) => u._id === user?._id);
    setUserRank(userIndex !== -1 ? userIndex + 1 : leaderboard.length + 1);
  };

  return (
    <div className="bg-white min-h-screen font-sans text-gray-800 px-4 py-6 flex justify-center">
      <div className="w-full max-w-sm">
        {/* Title */}
        <h1 className="text-center text-2xl font-extrabold mb-4">
          Welcome Back
        </h1>

        {/* Leaderboard Banner */}
        <div className="bg-[#001F0C] rounded-2xl p-5 text-white mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={greybear} alt="Leaderboard Icon" className="w-14 h-14" />
            <div>
              <h2 className="font-bold text-lg leading-tight">
                Leaderboard Rankings
              </h2>
              <p className="text-sm opacity-90">
                See who’s dominating the leaderboard.
              </p>
            </div>
          </div>

          <select
            className="bg-yellow-400 text-gray-800 font-semibold text-xs px-3 py-1.5 rounded-full"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="all-time">All Time</option>
          </select>
        </div>

        {/* Your Rank Card */}
        {user && (
          <div className="border border-gray-200 border-l-4 border-l-green-500 rounded-xl p-4 mb-5 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs font-semibold text-gray-800 mb-1">
                  Your Current Rank
                </div>
                <div className="text-3xl font-extrabold text-yellow-500">
                  #{userRank || "-"}
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-gray-800">
                  {miningData.totalPoints?.toLocaleString() || 0}
                </div>
                <div className="text-xs text-gray-500">Total Points</div>
              </div>
            </div>
          </div>
        )}

        {/* Top 2 Users */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {leaderboard.slice(0, 2).map((topUser, i) => (
            <div
              key={topUser._id}
              className="border rounded-xl p-3 shadow-sm text-center"
            >
              <img
                src={topUser.avatar || golden}
                alt="avatar"
                className="w-20 h-20 mx-auto rounded-lg mb-2 object-contain"
              />
              <span className="bg-yellow-400 text-gray-800 font-semibold text-xs px-2 py-1 rounded-full mb-1 inline-block">
                Rank {i + 1}
              </span>
              <div className="font-semibold text-sm text-gray-800 mt-1">
                {topUser.firstName} {topUser.lastName}
              </div>
              <div className="text-sm text-yellow-600 font-bold">
                {topUser.totalPoints?.toLocaleString()} pts
              </div>
            </div>
          ))}
        </div>

        {/* Remaining Ranks */}
        <div className="space-y-3 mb-10">
          {leaderboard.slice(2, 10).map((rankUser, index) => (
            <div
              key={rankUser._id}
              className="border rounded-xl p-3 flex justify-between items-center shadow-sm"
            >
              <div className="flex items-center gap-3">
                <img
                  src={rankUser.avatar || bluebear}
                  alt="Avatar"
                  className="w-10 h-10 rounded-full border border-yellow-400 object-cover"
                />
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    {rankUser.firstName} {rankUser.lastName}
                  </div>
                  <div className="text-xs text-gray-500">
                    Level {rankUser.miningLevel}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-sm font-semibold text-green-600">
                  {rankUser.totalPoints?.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400">pts</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Ranking;