import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App'; // 👈 replace with your main component
import reportWebVitals from './reportWebVitals';

// Create the root and render the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Performance monitoring (optional)
reportWebVitals();
