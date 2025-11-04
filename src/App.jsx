// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from './contexts/AppContext.jsx';
import { useTelegramAuth } from './hooks/useTelegramAuth.js';
import Home from './pages/Home.jsx';
import Earn from './pages/earn.jsx';
import Predict from './pages/predict.jsx';
import Ranking from './pages/Ranking.jsx';
import Wallet from './pages/Wallet.jsx';
import Navigation from './components/Navigation.jsx';
import NotificationContainer from './components/NotificationContainer.jsx';
import LoadingScreen from './components/LoadingScreen.jsx';

import './App.css';

function AppContent() {
  const { loading } = useApp();
  useTelegramAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="app">
      <NotificationContainer />

      <div className="page-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/earn" element={<Earn />} />
          <Route path="/predict" element={<Predict />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/wallet" element={<Wallet />} />
        </Routes>
      </div>

      <Navigation />
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </Router>
  );
}