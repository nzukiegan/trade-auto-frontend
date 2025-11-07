import React, { useEffect, useState } from "react";
import { TonConnect } from "@tonconnect/sdk";
import { TonClient, Address } from "@ton/ton";
import apiService from "../services/api.js";

import BEAR from "../assets/grey bear.png";
import tonIcon from "../assets/ton.jpeg";
import usdIcon from "../assets/usdt.png";
import { TonConnectUI } from "@tonconnect/ui";
import { TON_RPC_URL, TON_MANIFEST_URL} from "../config/env.js";

export default function TapxWallet() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [tonConnect, setTonConnect] = useState(null);
  const [depositInfo, setDepositInfo] = useState(null);
  const [withdrawModal, setWithdrawModal] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [activeTab, setActiveTab] = useState("Withdrawals");
  const [withdrawals, setWithdrawals] = useState([]);
  const [airdropInfo, setAirdropInfo] = useState(null);
  const [claiming, setClaiming] = useState(false);

  const iconMap = { TON: tonIcon, USDt: usdIcon };
  const client = new TonClient({ endpoint: TON_RPC_URL });


  const connector = new TonConnectUI({
    manifestUrl: TON_MANIFEST_URL,
  });

  const handleConnectWallet = async () => {
    await connector.connectWallet();
  };


  const loadStoredWallet = async () => {
    const savedAddress = localStorage.getItem("my_wallet_address");
    if (savedAddress) {
      setWalletAddress(savedAddress);
      setWalletConnected(true);
    }
  };

  const loadAssets = async () => {
    try {
      if (!walletAddress) return;
      setLoading(true);
      setError(null);

      const address = Address.parse(walletAddress);
      const tonBalanceNano = await client.getBalance(address);
      const tonBalance = Number(tonBalanceNano) / 1e9;

      const response = await fetch(`https://tonapi.io/v2/accounts/${walletAddress}/jettons`);
      const data = await response.json();
      const jettons =
        data.balances?.map((j) => ({
          symbol: j.jetton.symbol || "Unknown",
          amount: (Number(j.balance) / 10 ** (j.jetton.decimals || 9)).toFixed(2),
        })) || [];

      const allAssets = [{ symbol: "TON", amount: tonBalance.toFixed(3) }, ...jettons];
      setAssets(allAssets);
    } catch (err) {
      console.error("Failed to load assets:", err);
      setError("Failed to load assets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const loadWithdrawals = async () => {
    if (!walletAddress) return;
    try {
      const res = await apiService.get(`/withdrawals/${walletAddress}`);
      setWithdrawals(res.data || []);
    } catch (err) {
      console.error("Failed to load withdrawals:", err);
    }
  };

  const loadAirdropInfo = async () => {
    if (!walletAddress) return;
    try {
      const data = await apiService.loadAirdropInfo()
      setAirdropInfo(data);
    } catch (err) {
      console.error("Failed to load airdrop info:", err);
    }
  };

  /** ========================
   *  CLAIM AIRDROP
   * ======================== */
  const handleClaimAirdrop = async () => {
    try {
      if (!walletConnected) return alert("Connect your wallet first.");
      if (!airdropInfo?.claimable || airdropInfo.claimable <= 0) {
        return alert("No claimable tokens available.");
      }

      setClaiming(true);
      const res = await apiService.post(`/airdrop/claim`, { walletAddress });
      alert(`🎉 Claimed ${res.data.claimed} JP18 tokens successfully!`);
      loadAirdropInfo();
    } catch (err) {
      console.error("Airdrop claim failed:", err);
      alert("❌ Claim failed. Please try again.");
    } finally {
      setClaiming(false);
    }
  };

  /** ========================
   *  WITHDRAW HANDLERS
   * ======================== */
  const handleWithdraw = (asset) => {
    if (!walletConnected) {
      alert("Connect your wallet first.");
      return;
    }
    setWithdrawModal(asset);
  };

  const handleSendWithdraw = async () => {
    try {
      if (!withdrawAmount || !withdrawTo) {
        alert("Please enter amount and wallet address.");
        return;
      }

      const res = await apiService.post(`/withdraw`, {
        walletAddress,
        asset: withdrawModal.symbol,
        amount: parseFloat(withdrawAmount),
        to: withdrawTo,
      });

      alert(`✅ Withdraw request sent: ${res.data.status}`);
      setWithdrawModal(null);
      setWithdrawAmount("");
      setWithdrawTo("");
      loadWithdrawals();
    } catch (err) {
      console.error("Withdraw failed:", err);
      alert("❌ Withdraw failed.");
    }
  };
  
  useEffect(() => {
    loadStoredWallet();
  }, []);

  useEffect(() => {
    if (walletConnected) {
      loadAssets();
      loadWithdrawals();
      loadAirdropInfo();
    }
  }, [walletConnected, walletAddress]);

  return (
    <div className="bg-white min-h-screen font-sans text-gray-800 px-2 py-6 flex justify-center">
      <div className="w-full max-w-sm">
        {/* HEADER */}
        <div className="text-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Your Wallet</h2>
        </div>

        {/* WALLET CARD */}
        <div className="bg-[#001F0C] rounded-2xl p-5 text-white mb-5 flex items-center gap-4 shadow-md">
          <img src={BEAR} alt="Wallet Mascot" className="w-20 h-17 object-contain" />
          <div className="flex-1">
            {walletConnected ? (
              <>
                <h2 className="font-bold text-lg leading-tight">Wallet Connected ✅</h2>
                <p className="text-xs break-all opacity-90 mt-1">{walletAddress}</p>
              </>
            ) : (
              <>
                <h2 className="font-bold text-lg leading-tight">Connect Your Wallet</h2>
                <p className="text-sm opacity-80 mt-1">
                  Secure your assets with a trusted wallet connection.
                </p>
                <button
                  onClick={handleConnectWallet}
                  className="bg-[#29a847] mt-3 px-6 py-2 rounded-full font-semibold text-sm hover:bg-[#24923f] transition"
                >
                  Connect Wallet
                </button>
              </>
            )}
          </div>
        </div>

        {/* ASSETS */}
        <h2 className="text-lg font-semibold mt-6 mb-3">My Assets</h2>
        {loading ? (
          <p className="text-center text-gray-500 mt-4">Loading assets...</p>
        ) : error ? (
          <p className="text-center text-red-500 mt-4">{error}</p>
        ) : assets.length === 0 ? (
          <p className="text-center text-gray-400 mt-4">No assets found.</p>
        ) : (
          <div className="space-y-3">
            {assets.map((asset, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-2">
                    <img
                      src={iconMap[asset.symbol] || tonIcon}
                      alt={asset.symbol}
                      className="w-6 h-6 object-contain"
                    />
                    <span className="font-semibold text-gray-700">{asset.symbol}</span>
                  </div>
                  <span className="font-bold text-gray-800 text-lg">
                    {Number(asset.amount).toLocaleString()}
                  </span>
                </div>
                <div className="flex space-x-3 mt-3">
                  <button
                    onClick={() => handleWithdraw(asset)}
                    className="flex-1 bg-yellow-400 text-black py-2 rounded-md font-medium text-sm hover:bg-yellow-300"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* WITHDRAW MODAL */}
        {withdrawModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-[350px] text-center shadow-xl">
              <h2 className="text-lg font-semibold mb-2">
                Withdraw {withdrawModal.symbol}
              </h2>
              <input
                type="number"
                step="any"
                placeholder="Enter amount"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 mb-3 text-sm"
              />
              <input
                type="text"
                placeholder="Destination wallet address"
                value={withdrawTo}
                onChange={(e) => setWithdrawTo(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-2 mb-3 text-sm"
              />
              <div className="flex justify-between gap-3">
                <button
                  onClick={() => setWithdrawModal(null)}
                  className="flex-1 bg-gray-200 rounded-lg py-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendWithdraw}
                  className="flex-1 bg-blue-600 text-white rounded-lg py-2"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TABS SECTION */}
        <div className="mt-8">
          <div className="flex border-b border-gray-300 mb-3">
            {["Withdrawals", "Tokenomics", "Airdrop"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 font-semibold border rounded-t-lg ${
                  activeTab === tab
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="bg-[#001F0C] text-white rounded-b-xl p-4 shadow-inner">
            {activeTab === "Withdrawals" && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Withdrawal History</h3>
                {withdrawals.length === 0 ? (
                  <p className="text-sm text-gray-200">No withdrawals yet.</p>
                ) : (
                  <ul className="text-sm text-gray-200 space-y-2">
                    {withdrawals.map((w, i) => (
                      <li
                        key={i}
                        className="border-b border-gray-700 pb-2 flex justify-between"
                      >
                        <span>
                          {w.amount} {w.asset}
                        </span>
                        <span className="opacity-80">{w.status}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {activeTab === "Tokenomics" && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Tokenomics</h3>
                <p className="text-sm opacity-80">
                  18,000 points = 1 token. 50% total airdrop, 60% unlocked during TGE, 40%
                  vested.
                </p>
              </div>
            )}

            {activeTab === "Airdrop" && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Airdrop</h3>
                {!airdropInfo ? (
                  <p className="text-sm opacity-80">Loading airdrop info...</p>
                ) : (
                  <div className="space-y-2 text-sm">
                    <p>Total Eligible: {airdropInfo.totalEligible} JP18</p>
                    <p>Claimed: {airdropInfo.claimed} JP18</p>
                    <p>Claimable: {airdropInfo.claimable} JP18</p>
                    <button
                      onClick={handleClaimAirdrop}
                      disabled={claiming || airdropInfo.claimable <= 0}
                      className={`mt-3 w-full py-2 rounded-lg font-semibold ${
                        claiming || airdropInfo.claimable <= 0
                          ? "bg-gray-500 text-gray-200"
                          : "bg-yellow-400 text-black hover:bg-yellow-300"
                      }`}
                    >
                      {claiming ? "Claiming..." : "Claim Airdrop"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}