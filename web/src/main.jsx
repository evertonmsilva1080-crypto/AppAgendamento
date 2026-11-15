import React from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/ubuntu/400.css'
import '@fontsource/ubuntu/500.css'
import '@fontsource/ubuntu/700.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
