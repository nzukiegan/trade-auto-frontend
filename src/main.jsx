// src/main.jsx
import { Buffer } from 'buffer';
import process from 'process';
window.Buffer = window.Buffer || Buffer;
window.process = window.process || process;
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)