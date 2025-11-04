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
            
            await apiService.login(authData);
            addNotification('Successfully logged in!', 'success');
          }else {
            const fakeData = {
              telegramId: '343434-234234-3434',
              username: 'Egan',
              firstName: 'Nzuki',
              lastName: 'Ndolo',
              // Example of initData Telegram provides in Mini Apps
              initData:
                'user=%7B%22id%22%3A123456789%2C%22first_name%22%3A%22Egan%22%2C%22last_name%22%3A%22Nzuki%22%2C%22username%22%3A%22egan_nzuki%22%7D&auth_date=1730381456&hash=3b8c4ae69acbfa723defe9a723fa21f9b56c79da5e6e7d4234f2cf0a1b8e8b2f',
            };
            
            await apiService.login(fakeData);
          }
        } catch (error) {
          //console.error('Telegram auth failed:', error);
          //('Authentication failed', 'error');
        }
      };

      initTelegramUser();
    }
  }, [addNotification]);
}