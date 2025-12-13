import React from 'react';
import ChatPage from './pages/Chat/ChatPage';
import VideoCallRoom from './pages/Chat/components/VideoCallRoom/VideoCallRoom'; //  NUEVO: Importar componente de videollamada
import './App.css';

function App() {
  //  NUEVO: Verificar si estamos en la ruta de videollamada
  const isVideoCallRoute = window.location.pathname === '/video-call';

  //  Si es ruta de videollamada, renderizar VideoCallRoom
  if (isVideoCallRoute) {
    return (
      <div className="App" style={{ width: '100vw', height: '100vh', margin: 0, padding: 0 }}>
        <VideoCallRoom />
      </div>
    );
  }

  // De lo contrario, renderizar la aplicación de chat normal
  return (
    <div className="App">
      <ChatPage />
    </div>
  );
}

export default App;
