import React, { useEffect, useState } from "react";
import { TonConnect } from "@tonconnect/sdk";
import { TonClient, WalletContractV4, Address} from "@ton/ton";
import { toNano } from "@ton/core";
import apiService from "../services/api.js";
import { useApp } from "../contexts/AppContext.jsx";
import BEAR from "../assets/grey bear.png";
import tonIcon from "../assets/ton.jpeg";
import usdIcon from "../assets/usdt.png";
import { TonConnectUI } from "@tonconnect/ui";
import { Copy, X } from "lucide-react";
import { TON_RPC_URL, TON_MANIFEST_URL} from "../config/env.js";
import { QRCodeCanvas } from "qrcode.react";

export default function TapxWallet() {
  const { user } = useApp();
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [tonConnect, setTonConnect] = useState(null);
  const [depositInfo, setDepositInfo] = useState(null);
  const [depositModal, setDepositModal] = useState(null);
  const [withdrawModal, setWithdrawModal] = useState(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawTo, setWithdrawTo] = useState("");
  const [activeTab, setActiveTab] = useState("Withdrawals");
  const [withdrawals, setWithdrawals] = useState([]);
  const [airdropInfo, setAirdropInfo] = useState(null);
  const [tonPriceUSD, setTonPriceUSD] = useState(null);
  const [tetherPriceUSD, setTetherPriceUSD] = useState(null);
  const [withdrawUSD, setWithdrawUSD] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const iconMap = { TON: tonIcon, USDt: usdIcon };
  const client = new TonClient({ endpoint: TON_RPC_URL });

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
      console.log("Wallet ", wallet);
      if (wallet) {
        setWalletAddress(wallet.address);
        setWalletConnected(true);
        await apiService.connectWallet(wallet.address);
        await loadAssets();
        await loadWithdrawals();
        await loadAirdropInfo();
      } else {
        setWalletConnected(false);
      }
    };

    initTonConnect();
  }, []);

  useEffect(() => {
    const fetchTonPrice = async () => {
      try {
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=the-open-network,tether&vs_currencies=usd"
        );
        const data = await res.json();
        const tonPriceUSD = data["the-open-network"]?.usd;
        const tetherPriceUSD =  data["tether"]?.usd;
        console.log("Price results ", data)
        setTonPriceUSD(tonPriceUSD);
        setTetherPriceUSD(tetherPriceUSD);
      } catch (err) {
        console.error("Failed to fetch TON price:", err);
      }
    };
    fetchTonPrice();
  }, []);


  const handleDeposit = (asset) => {
    if (!walletConnected) { alert("Connect your wallet first."); return; }
    setDepositModal(asset);
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    alert("Wallet address copied!");
  };

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

    const interval = setInterval(checkConnection, 2000);

    return () => clearInterval(interval);
  }, [tonConnect, walletConnected]);

  const handleConnectWallet = async () => {
    try {
      await tonConnect.disconnect();
      setWalletAddress(null);
      setWalletConnected(false);
      await tonConnect.connectWallet();
      const wallet = tonConnect.account;
      console.log("Connected wallet ", wallet);
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
        const amount = (Number(j.balance) / 10 ** decimals);
        return {
          symbol: j.jetton?.symbol || "Unknown",
          contract: j.jetton?.address || null,
          decimals,
          amount,
        };
      }) || [];

    const tokenSymbolToCoingeckoId = {
      TON: "toncoin",
      USDT: "tether",
      USDC: "usd-coin",
      // add known mappings: "JP18": "your-coingecko-id-if-exists"
    };

    const symbols = Array.from(new Set([ "TON", ...jettons.map(j => j.symbol) ]));
    const ids = symbols
      .map(s => tokenSymbolToCoingeckoId[s] || null)
      .filter(Boolean)
      .join(",");

    let prices = {};
    if (ids.length > 0) {
      try {
        const priceResp = await fetch(
          `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`
        );
        const priceJson = await priceResp.json();
        for (const [sym, cgId] of Object.entries(tokenSymbolToCoingeckoId)) {
          if (priceJson[cgId]) prices[sym] = priceJson[cgId].usd;
        }
      } catch (err) {
        console.warn("Failed to fetch prices from CoinGecko:", err);
      }
    }

    const tonAsset = {
      symbol: "TON",
      amount: tonAmount,
      contract: null,
      decimals: 9,
      priceUSD: prices["TON"] ?? null,
      valueUSD: prices["TON"] ? tonAmount * prices["TON"] : null,
    };

    const jettonAssets = jettons.map((j) => ({
      symbol: j.symbol,
      amount: Number(j.amount.toFixed(6)), // keep precision reasonable
      contract: j.contract,
      decimals: j.decimals,
      priceUSD: prices[j.symbol] ?? null,
      valueUSD: prices[j.symbol] ? Number((j.amount * prices[j.symbol]).toFixed(6)) : null,
    }));

    const allAssets = [tonAsset, ...jettonAssets];
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
      console.log("Withdrawal response ", res)
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

  const handleWithdraw = (asset) => {
    if (!walletConnected) {
      alert("Connect your wallet first.");
      return;
    }
    setWithdrawModal(asset);
  };


const parseAddress = (addr) => {
  try {
    if (!addr) return null;
    if (addr.startsWith("0:")) {
      return Address.parseRaw(addr);
    } else {
      return Address.parse(addr);
    }
  } catch (err) {
    console.error("Invalid address:", addr, err);
    return null;
  }
};

const handleSendWithdraw = async () => {
  try {
    if (!withdrawAmount || !withdrawTo) {
      alert("Enter amount and wallet address");
      return;
    }

    console.log("Wallet address ", walletAddress, "Withdraw to ", withdrawTo);

    const recipient = parseAddress(withdrawTo);

    const amountNano = toNano(withdrawAmount);

    const tx = {
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [
        {
          address: recipient.toString(),
          amount: amountNano.toString(),
        },
      ],
    };

    await tonConnect.sendTransaction(tx);

    await apiService.withdrawUSDT(withdrawAmount, withdrawTo, walletAddress, 'TON')

    alert("✅ Transaction sent successfully!");
    setWithdrawModal(null);
    setWithdrawAmount("");
    setWithdrawTo("");
    loadAssets();
  } catch (err) {
    console.error("Withdraw failed:", err);
    alert("❌ Withdraw failed");
  }
};

  const handleConvert = async () => {

  }

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
                <h2 className="font-bold text-lg leading-tight">Wallet Connected</h2>
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

                  <button
                    onClick={() => handleConvert(asset)}
                    className="flex-1 bg-yellow-400 text-black py-2 rounded-md font-medium text-sm hover:bg-yellow-300"
                  >
                    Convert
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

          {depositModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
              <div className="bg-white rounded-xl p-6 w-[350px] flex flex-col items-center text-center shadow-xl relative">
                <button
                  onClick={() => setDepositModal(null)}
                  className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
                >
                  <X size={20} />
                </button>
                <h2 className="text-lg font-semibold mb-4">Deposit {depositModal.symbol}</h2>
                <QRCodeCanvas value={walletAddress} size={200} />
                <div className="mt-4 flex items-center break-all w-full justify-center">
                  <button onClick={handleCopyAddress} className="mr-2 text-gray-600 hover:text-gray-800">
                    <Copy size={18} />
                  </button>
                  <span>{walletAddress}</span>
                </div>
              </div>
            </div>
          )}

        {withdrawModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-[350px] text-center shadow-xl relative">
            <button
              onClick={() => setWithdrawModal(null)}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-800"
            >
              <X size={20} />
            </button>
            <h2 className="text-lg font-semibold mb-4">Withdraw {withdrawModal.symbol}</h2>

            <input
              type="number"
              step="any"
              placeholder="Enter amount"
              value={withdrawAmount}
              onChange={(e) => {
                const value = e.target.value;
                setWithdrawAmount(value);
                setWithdrawUSD(value * (tonPriceUSD || 0));
                console.log("Value ", value, "ton price usd", tonPriceUSD, "widthdraw usd ", withdrawUSD);
              }}
              className="w-full border border-gray-300 rounded-lg p-2 mb-1 text-sm"
            />
            <p className="text-xs text-gray-500 mb-3">
              ≈ ${withdrawUSD.toFixed(2)} USD
            </p>

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
                Confirm
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