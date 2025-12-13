// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  //  StrictMode deshabilitado temporalmente para evitar renderizados duplicados
  // <StrictMode>
  <App />
  // </StrictMode>,
)
