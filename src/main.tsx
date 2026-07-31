import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { App } from './App'
import { AuthProvider } from './auth/AuthContext'
import './styles.css'

const Router = import.meta.env.VITE_STATIC_DEMO === 'true' ? HashRouter : BrowserRouter

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><Router><AuthProvider><App /></AuthProvider></Router></React.StrictMode>,
)
