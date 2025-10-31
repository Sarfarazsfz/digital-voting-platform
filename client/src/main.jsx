import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/globals.css'
import axios from 'axios'

console.log('Environment mode:', import.meta.env.MODE);

if (import.meta.env.MODE === 'development') {
  axios.defaults.baseURL = 'http://localhost:5000';
  console.log('Set baseURL to', axios.defaults.baseURL);
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)