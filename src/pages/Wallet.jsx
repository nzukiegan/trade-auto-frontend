import React, { useEffect, useState } from "react";
import { TonClient, Address } from "@ton/ton";
import apiService from "../services/api.js";
import { useApp } from "../contexts/AppContext.jsx";
import BEAR from "../assets/grey bear.png";
import tonIcon from "../assets/ton.jpeg";
import usdIcon from "../assets/usdt.png";
import { TonConnectUI } from "@tonconnect/ui";
import { TON_RPC_URL, TON_MANIFEST_URL } from "../config/env.js";
import { QRCodeCanvas } from "qrcode.react";

export default function TapxWallet() {
  const { user } = useApp();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [tonConnect, setTonConnect] = useState(null);
  const [withdrawModal, setWithdrawModal] = useState(null);
  const [depositModal, setDepositModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [activeTab, setActiveTab] = useState("Withdrawals");
  const [withdrawals, setWithdrawals] = useState([]);
  const [airdropInfo, setAirdropInfo] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const iconMap = { TON: tonIcon, USDt: usdIcon };
  const client = new TonClient({ endpoint: TON_RPC_URL });

  /** ========================
   * TONCONNECT INIT
   * ======================== */
  useEffect(() => {
    const initTonConnect = async () => {
      const connector = new TonConnectUI({ manifestUrl: TON_MANIFEST_URL });
      setTonConnect(connector);

      try {
        if (user?.walletAddress) {
          setWalletAddress(user.walletAddress);
          setWalletConnected(true);
          await loadAssets();
          await loadWithdrawals();
          await loadAirdropInfo();
          return;
        }
      } catch (err) {
        console.error("Failed to fetch user wallet from backend:", err);
      }

      const wallet = connector.account;
      if (wallet) {
        setWalletAddress(wallet.address);
        setWalletConnected(true);
        await apiService.connectWallet(wallet.address);
        await loadAssets();
        await loadWithdrawals();
        await loadAirdropInfo();
      }
    };

    initTonConnect();
  }, []);

  /** ========================
   * CHECK TONCONNECT STATUS PERIODICALLY
   * ======================== */
  useEffect(() => {
    if (!tonConnect) return;

    const checkConnection = async () => {
      const wallet = tonConnect.account;

      if (wallet && !walletConnected) {
        setWalletAddress(wallet.address);
        setWalletConnected(true);
        await apiService.connectWallet(wallet.address);
        await loadAssets();
        await loadWithdrawals();
        await loadAirdropInfo();
      }

      if (!wallet && walletConnected) {
        setWalletConnected(false);
        setWalletAddress("");
      }
    };

    const interval = setInterval(checkConnection, 5000);
    return () => clearInterval(interval);
  }, [tonConnect, walletConnected]);

  /** ========================
   * CONNECT WALLET
   * ======================== */
  const handleConnectWallet = async () => {
    try {
      await tonConnect.disconnect();
      setWalletAddress(null);
      setWalletConnected(false);
      await tonConnect.connectWallet();
      const wallet = tonConnect.account;
      if (wallet) {
        setWalletAddress(wallet.address);
        setWalletConnected(true);
        await apiService.connectWallet(wallet.address);
        await loadAssets();
        await loadWithdrawals();
        await loadAirdropInfo();
      }
    } catch (error) {
      console.error("Wallet connection failed:", error);
    }
  };

  /** ========================
   * LOAD ASSETS
   * ======================== */
  const loadAssets = async () => {
    try {
      if (!walletAddress) return;
      setLoading(true);
      setError(null);

      const address = Address.parse(walletAddress);
      const tonBalanceNano = await client.getBalance(address);
      const tonAmount = Number(tonBalanceNano) / 1e9;

      const resp = await fetch(`https://tonapi.io/v2/accounts/${walletAddress}/jettons`);
      const data = await resp.json();

      const jettons =
        (data.balances || []).map((j) => {
          const decimals = j.jetton?.decimals ?? 9;
          const amount = Number(j.balance) / 10 ** decimals;
          return {
            symbol: j.jetton?.symbol || "Unknown",
            contract: j.jetton?.address || null,
            decimals,
            amount,
          };
        }) || [];

      const allAssets = [{ symbol: "TON", amount: tonAmount }, ...jettons];
      setAssets(allAssets);
    } catch (err) {
      console.error("Failed to load assets:", err);
      setError("Failed to load assets. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  /** ========================
   * LOAD WITHDRAWALS
   * ======================== */
  const loadWithdrawals = async () => {
    if (!walletAddress) return;
    try {
      const res = await apiService.get(`/withdrawals/${walletAddress}`);
      setWithdrawals(res.data || []);
    } catch (err) {
      console.error("Failed to load withdrawals:", err);
    }
  };

  /** ========================
   * LOAD AIRDROP INFO
   * ======================== */
  const loadAirdropInfo = async () => {
    if (!walletAddress) return;
    try {
      const data = await apiService.loadAirdropInfo();
      setAirdropInfo(data);
    } catch (err) {
      console.error("Failed to load airdrop info:", err);
    }
  };

  /** ========================
   * HANDLE CLAIM AIRDROP
   * ======================== */
  const handleClaimAirdrop = async () => {
    if (!walletConnected) return alert("Connect your wallet first.");
    if (!airdropInfo?.claimable || airdropInfo.claimable <= 0) {
      return alert("No claimable tokens available.");
    }

    try {
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
   * WITHDRAW HANDLERS
   * ======================== */
  const handleWithdraw = (asset) => {
    if (!walletConnected) return alert("Connect your wallet first.");
    setWithdrawModal(asset);
  };

  const handleSendWithdraw = async () => {
    if (!withdrawAmount || !withdrawTo) return alert("Enter amount & address.");

    try {
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

  /** ========================
   * DEPOSIT HANDLER
   * ======================== */
  const handleDeposit = (asset) => {
    if (!walletConnected) return alert("Connect your wallet first.");
    setDepositModal(true); // open deposit modal
  };

  /** ========================
   * COPY WALLET TO CLIPBOARD
   * ======================== */
  const copyToClipboard = () => {
    navigator.clipboard.writeText(walletAddress);
    alert("Wallet address copied!");
  };

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
                    onClick={() => handleDeposit(asset)}
                    className="flex-1 bg-yellow-400 text-black py-2 rounded-md font-medium text-sm hover:bg-yellow-300"
                  >
                    Deposit
                  </button>
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

        {/* DEPOSIT MODAL */}
        {depositModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-[350px] text-center shadow-xl">
              <h2 className="text-lg font-semibold mb-4">Deposit TON</h2>
              <QRCodeCanvas value={walletAddress} size={200} />
              <p className="mt-3 font-mono break-all">{walletAddress}</p>
              <button
                onClick={copyToClipboard}
                className="mt-3 w-full bg-blue-600 text-white py-2 rounded-lg font-semibold"
              >
                Copy Address
              </button>
              <button
                onClick={() => setDepositModal(false)}
                className="mt-2 w-full bg-gray-200 text-black py-2 rounded-lg font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}