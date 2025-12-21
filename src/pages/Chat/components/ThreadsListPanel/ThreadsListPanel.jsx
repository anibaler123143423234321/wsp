import React, { useState, useEffect } from 'react';
import { FaTimes, FaComments, FaSpinner } from 'react-icons/fa';
import apiService from '../../../../apiService';
import './ThreadsListPanel.css';

const ThreadsListPanel = ({
  isOpen,
  onClose,
  isGroup,
  roomCode,
  currentUsername,
  to,
  onOpenThread,
  roomUsers = [],
  roomName
}) => {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      loadThreads();
    }
  }, [isOpen, isGroup, roomCode, to]);

  const loadThreads = async () => {
    setLoading(true);
    setError(null);
    try {
      let response;
      if (isGroup && roomCode) {
        response = await apiService.getRoomThreads(roomCode);
      } else if (!isGroup && currentUsername && to) {
        response = await apiService.getUserThreads(currentUsername, to);
      } else {
        setError('No se puede cargar los hilos');
        setLoading(false);
        return;
      }
      // El backend devuelve { data: [...], total, hasMore }
      const threadsData = response?.data || response || [];
      setThreads(threadsData);
    } catch (err) {
      console.error('Error al cargar hilos:', err);
      setError('Error al cargar los hilos');
    } finally {
      setLoading(false);
    }
  };

  const handleThreadClick = (thread) => {
    if (onOpenThread) {
      // Adaptar el thread al formato que espera ThreadPanel
      const threadMessage = {
        ...thread,
        id: thread.id,
        text: thread.message,
        message: thread.message,
        sender: thread.from,
        from: thread.from,
        realSender: thread.from,
        receiver: isGroup ? (roomName || to) : to,
        to: isGroup ? (roomName || to) : to,
        isGroup: isGroup,
        roomCode: isGroup ? (thread.roomCode || roomCode) : undefined,
        threadCount: thread.threadCount || 0
      };
      onOpenThread(threadMessage);
    }
    onClose();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Ayer';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('es-ES', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
    }
  };

  const getUserPicture = (username) => {
    const user = roomUsers.find(u => u.username === username || 
      `${u.nombre} ${u.apellido}` === username);
    return user?.picture;
  };

  if (!isOpen) return null;

  return (
    <div className="threads-list-panel">
      <div className="threads-list-header">
        <div className="threads-list-title">
          <FaComments />
          <span>Hilos</span>
        </div>
        <button className="threads-list-close" onClick={onClose}>
          <FaTimes />
        </button>
      </div>

      <div className="threads-list-content">
        {loading && (
          <div className="threads-list-loading">
            <FaSpinner className="spinner" />
            <span>Cargando hilos...</span>
          </div>
        )}

        {error && (
          <div className="threads-list-error">
            <span>{error}</span>
            <button onClick={loadThreads}>Reintentar</button>
          </div>
        )}

        {!loading && !error && threads.length === 0 && (
          <div className="threads-list-empty">
            <FaComments size={40} />
            <p>No hay hilos en este chat</p>
          </div>
        )}

        {!loading && !error && threads.length > 0 && (
          <div className="threads-list-items">
            {threads.map((thread) => {
              const senderPicture = getUserPicture(thread.from || thread.sender);
              return (
                <div
                  key={thread.id}
                  className="thread-list-item"
                  onClick={() => handleThreadClick(thread)}
                >
                  <div className="thread-item-avatar">
                    {senderPicture ? (
                      <img src={senderPicture} alt="" />
                    ) : (
                      <span>{(thread.from || thread.sender || '?')[0].toUpperCase()}</span>
                    )}
                  </div>
                  <div className="thread-item-content">
                    <div className="thread-item-header">
                      <span className="thread-item-sender">{thread.from || thread.sender}</span>
                      <span className="thread-item-date">{formatDate(thread.sentAt)}</span>
                    </div>
                    <div className="thread-item-message">
                      {thread.message || thread.text || '📎 Archivo adjunto'}
                    </div>
                    <div className="thread-item-count">
                      <FaComments size={12} />
                      <span>{thread.threadCount || 0} respuestas</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ThreadsListPanel;

