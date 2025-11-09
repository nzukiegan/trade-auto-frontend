import React, { createContext, useContext, useState, useEffect } from "react";
import { TonConnectUI } from "@tonconnect/ui";
import { TON_MANIFEST_URL } from "../config/env.js";

const TonConnectContext = createContext();

export function TonConnectProvider({ children }) {
  const [tonConnect, setTonConnect] = useState(null);
  const [walletAddress, setWalletAddress] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);

  useEffect(() => {
    const initTonConnect = async () => {
      const connector = new TonConnectUI({ manifestUrl: TON_MANIFEST_URL });
      setTonConnect(connector);

      const wallet = connector.account;
      if (wallet) {
        setWalletAddress(wallet.address);
        setWalletConnected(true);
      }

      connector.onStatusChange((wallet) => {
        if (wallet) {
          setWalletAddress(wallet.address);
          setWalletConnected(true);
        } else {
          setWalletAddress(null);
          setWalletConnected(false);
        }
      });
    };

    initTonConnect();
  }, []);

  return (
    <TonConnectContext.Provider
      value={{
        tonConnect,
        walletAddress,
        walletConnected,
        setTonConnect,
        setWalletAddress,
        setWalletConnected,
      }}
    >
      {children}
    </TonConnectContext.Provider>
  );
}

export function useTonConnect() {
  return useContext(TonConnectContext);
}