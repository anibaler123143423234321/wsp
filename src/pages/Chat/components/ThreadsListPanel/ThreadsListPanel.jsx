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

  // Estados de paginación
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadMore, setIsLoadMore] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPage(1);
      setHasMore(true);
      loadThreads(1, false);
    }
  }, [isOpen, isGroup, roomCode, to]);

  const loadThreads = async (pageNum = 1, append = false) => {
    if (append) {
      setIsLoadMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      let response;
      const limit = 20; // Límite por página

      if (isGroup && roomCode) {
        response = await apiService.getRoomThreads(roomCode, pageNum, limit);
      } else if (!isGroup && currentUsername && to) {
        response = await apiService.getUserThreads(currentUsername, to, pageNum, limit);
      } else {
        setError('No se puede cargar los hilos');
        setLoading(false);
        setIsLoadMore(false);
        return;
      }

      // El backend devuelve { data: [...], total, hasMore, page, totalPages }
      // Aseguramos compatibilidad si devuelve array directo (aunque no debería con la actualización)
      const threadsData = response?.data || (Array.isArray(response) ? response : []) || [];
      const backendHasMore = response?.hasMore;
      const totalPages = response?.totalPages;

      console.log('🧵 loadThreads response:', {
        pageNum,
        limit,
        total: response?.total,
        hasMore: backendHasMore,
        dataLength: threadsData.length,
        firstId: threadsData[0]?.id
      });

      if (append) {
        setThreads(prev => {
          // Evitar duplicados por ID
          const existingIds = new Set(prev.map(t => t.id));
          const newThreads = threadsData.filter(t => !existingIds.has(t.id));

          console.log('🧵 Appending threads:', {
            prevLength: prev.length,
            received: threadsData.length,
            newUnique: newThreads.length
          });

          return [...prev, ...newThreads];
        });
      } else {
        setThreads(threadsData);
      }

      // Determinar si hay más páginas
      if (backendHasMore !== undefined) {
        setHasMore(backendHasMore);
      } else {
        // Fallback: si devolvió menos del límite, asumimos que no hay más
        setHasMore(threadsData.length === limit);
      }

    } catch (err) {
      console.error('Error al cargar hilos:', err);
      setError('Error al cargar los hilos');
    } finally {
      setLoading(false);
      setIsLoadMore(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading && !isLoadMore && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      loadThreads(nextPage, true);
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
    // IMPORTANTE: NO cerrar el panel al abrir un hilo, para poder volver
    // onClose(); 
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';

    // Extraer fecha y hora directamente del string ISO sin conversión de zona horaria
    const match = dateString.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
    if (!match) return '';

    const [, year, month, day, hour, minute] = match;
    const messageDate = new Date(year, month - 1, day); // Solo para comparar días
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    if (messageDate >= today) {
      return `${hour}:${minute}`;
    } else if (messageDate >= yesterday) {
      return 'Ayer';
    } else if (messageDate >= weekAgo) {
      const dayNames = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
      return dayNames[messageDate.getDay()];
    } else {
      return `${day}/${month}`;
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
            <button onClick={() => loadThreads(1, false)}>Reintentar</button>
          </div>
        )}

        {!loading && !error && threads.length === 0 && (
          <div className="threads-list-empty">
            <FaComments size={40} />
            <p>No hay hilos en este chat</p>
          </div>
        )}

        {(!loading || isLoadMore) && !error && threads.length > 0 && (
          <>
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

            {/* BOTÓN CARGAR MÁS */}
            {hasMore && (
              <div className="threads-list-load-more">
                <button
                  onClick={handleLoadMore}
                  disabled={isLoadMore}
                  className="threads-load-more-btn"
                >
                  {isLoadMore ? (
                    <>
                      <FaSpinner className="spinner" /> Cargando...
                    </>
                  ) : (
                    'Cargar más hilos'
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ThreadsListPanel;

