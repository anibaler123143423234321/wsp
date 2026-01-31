// import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.jsx'

// Registrar Service Worker para PWA y manejo de tokens
// immediate: true fuerza la actualización en cuanto está disponible (útil en dev)
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('🔄 Nueva versión disponible. Recargando...');
    updateSW(true); // Actualizar automáticamente
  },
  onOfflineReady() {
    console.log('✅ App lista para trabajar offline');
  },
})

createRoot(document.getElementById('root')).render(
  //  StrictMode deshabilitado temporalmente para evitar renderizados duplicados
  // <StrictMode>
  <App />
  // </StrictMode>,
)
