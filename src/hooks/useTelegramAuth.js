import { useEffect } from 'react';
import apiService from '../services/api.js';
import { useApp } from '../contexts/AppContext.jsx';

export function useTelegramAuth() {
  const { addNotification } = useApp();

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      
      tg.expand();
      
      const initTelegramUser = async () => {
        try {
          const user = tg.initDataUnsafe?.user;
          let referralCode = null;
          const pathParts = window.location.pathname.split("/");
          if (pathParts[1] === "referral" && pathParts[2]) {
            referralCode = pathParts[2];
          }
          if (user) {
            const authData = {
              telegramId: user.id.toString(),
              username: user.username,
              firstName: user.first_name,
              lastName: user.last_name,
              initData: tg.initData,
              referalCode: referralCode
            };
            
            const resp = await apiService.login(authData);
            console.log(resp);
            addNotification('Successfully logged in!', 'success');
          }
        } catch (error) {
          console.error('Telegram auth failed:', error);
        }
      };

      initTelegramUser();
    }
  }, []);
}