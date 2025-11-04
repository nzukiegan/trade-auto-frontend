import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="loading-spinner"></div>
        <h2 style={{color: 'white', marginTop: '20px'}}>JustPlay 18</h2>
        <p style={{color: 'white', opacity: 0.8}}>Loading your mining adventure...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;