import React from 'react';
import homeIcon from "../assets/home.png";
import earnIcon from "../assets/earn.png";
import predictIcon from "../assets/predict.png";
import rankingIcon from "..assets/ranking.png";
import { Wallet } from "lucide-react"
import { useLocation, useNavigate } from 'react-router-dom';
import './Navigation.css';

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { name: 'Home', icon: <homeIcon size={22} />, path: '/' },
    { name: 'Earn', icon: <earnIcon size={22} />, path: '/earn' },
    { name: 'Predict', icon: <predictIcon size={22} />, path: '/predict' },
    { name: 'Ranking', icon: <rankingIcon size={22} />, path: '/ranking' },
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