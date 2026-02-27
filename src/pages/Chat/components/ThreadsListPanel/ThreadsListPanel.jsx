import React, { useState, useEffect, useRef } from 'react';
import { FaTimes, FaComments, FaSpinner, FaSearch, FaArrowLeft } from 'react-icons/fa';
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
  const [searchTerm, setSearchTerm] = useState('');
  const searchTimeoutRef = useRef(null);

  // Estados de paginación
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadMore, setIsLoadMore] = useState(false);

  // Efecto para cargar hilos iniciales y cuando cambia el término de búsqueda
  useEffect(() => {
    if (isOpen) {
      // Resetear paginación al buscar o abrir
      setPage(1);
      setHasMore(true);
      // Clear any pending timeout to avoid loading old search terms
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      // Debounce search term
      searchTimeoutRef.current = setTimeout(() => {
        loadThreads(1, false, searchTerm);
      }, 300); // 300ms debounce
    }
    // Cleanup timeout on unmount or if isOpen becomes false
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isOpen, isGroup, roomCode, to, searchTerm]); // Added searchTerm to dependencies

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    // The useEffect with dependency [searchTerm] will handle the actual loading
  };

  const loadThreads = async (pageNum = 1, append = false, search = '') => {
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
        response = await apiService.getRoomThreads(roomCode, pageNum, limit, search);
      } else if (!isGroup && currentUsername && to) {
        response = await apiService.getUserThreads(currentUsername, to, pageNum, limit, search);
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
      loadThreads(nextPage, true, searchTerm);
    }
  };

  const handleThreadClick = (thread) => {
    if (onOpenThread) {
      const senderDisplayName = getDisplayName(thread.from || thread.sender, thread.fullName);
      // Adaptar el thread al formato que espera ThreadPanel
      const threadMessage = {
        ...thread,
        id: thread.id,
        text: thread.message,
        message: thread.message,
        sender: thread.from,
        from: thread.from,
        fullName: senderDisplayName,
        displayName: senderDisplayName,
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

  const getDisplayName = (from, fullName) => {
    // 1. Si el API ya devuelve fullName, usarlo
    if (fullName) return fullName;
    // 2. Buscar en roomUsers por username (DNI)
    if (from && roomUsers && roomUsers.length > 0) {
      const user = roomUsers.find(u => u && typeof u === 'object' && u.username === from);
      if (user && user.nombre && user.apellido) {
        return `${user.nombre} ${user.apellido}`.trim();
      }
    }
    // 3. Fallback al valor original
    return from || '?';
  };

  if (!isOpen) return null;

  return (
    <div className="threads-list-panel">
      <div className="threads-list-header">
        <button onClick={onClose} className="threads-back-btn" title="Cerrar">
          <FaArrowLeft />
        </button>
        <div className="threads-list-title">
          <span>Hilos de conversación</span>
        </div>
        <button onClick={onClose} className="threads-close-btn" title="Cerrar">
          <FaTimes />
        </button>
      </div>

      <div className="threads-search-container">
        <div className="threads-search-input-wrapper">
          <input
            type="text"
            placeholder="Buscar en hilos..."
            className="search-input"
            value={searchTerm}
            onChange={handleSearchChange}
            style={{ fontSize: '13px', padding: '10px 10px 10px 35px' }}
          />
          <FaSearch className="search-icon" style={{ left: '12px', width: '14px', height: '14px' }} />
        </div>
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
                        <span>{(getDisplayName(thread.from || thread.sender, thread.fullName) || '?')[0].toUpperCase()}</span>
                      )}
                    </div>
                    <div className="thread-item-content">
                      <div className="thread-item-header">
                        <span className="thread-item-sender">{getDisplayName(thread.from || thread.sender, thread.fullName)}</span>
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

