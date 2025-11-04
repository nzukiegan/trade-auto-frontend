import React from 'react';
import { useApp } from '../contexts/AppContext.jsx';

const NotificationContainer = () => {
  const { notifications } = useApp();

  if (!notifications.length) return null;

  return (
    <div className="notification-container">
      {notifications.map(notification => (
        <div
          key={notification.id}
          className={`notification ${notification.type}`}
        >
          <div className="notification-content">
            {notification.message}
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;