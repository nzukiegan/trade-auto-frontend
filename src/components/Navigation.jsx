import React from 'react';
import { Home, RotateCw, Activity, Trophy, Wallet } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Navigation.css';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: 'Home', icon: <Home size={22} />, path: '/' },
    { name: 'Earn', icon: <RotateCw size={22} />, path: '/earn' },
    { name: 'Predict', icon: <Activity size={22} />, path: '/predict' },
    { name: 'Ranking', icon: <Trophy size={22} />, path: '/ranking' },
    { name: 'Wallet', icon: <Wallet size={22} />, path: '/wallet' },
  ];

  return (
    <div className="navigation-container">
      <div className="navigation">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.name}
              onClick={() => navigate(item.path)}
              className={`nav-button ${isActive ? 'active' : ''}`}
            >
              <div className="nav-icon">{item.icon}</div>
              <span className="nav-label">{item.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}