import { useState, useRef, useCallback, useEffect } from 'react';
import { FaBars, FaStar, FaRegStar, FaChevronDown, FaChevronRight, FaChevronLeft } from 'react-icons/fa';
import { MessageSquare, Home, Users } from 'lucide-react';
import clsx from 'clsx';
import apiService from '../../../../apiService';
import './ConversationList.css';

// --- ICONOS PERSONALIZADOS ---

const CommunityIcon = ({ size = 16, className, style }) => (
  <svg viewBox="0 0 30 30" height={size} width={size} fill="none" className={className} style={{ minWidth: `${size}px`, flexShrink: 0, ...style }}>
    <path d="M7.85445 17.0075C7.73851 17.0026 7.62033 17 7.50003 17C6.60797 17 5.83268 17.1426 5.22106 17.3148C4.69554 17.4627 4.0988 17.7054 3.5974 18.0919C3.08634 18.4858 2.62143 19.0755 2.52966 19.8877C2.48679 20.2672 2.50003 21.0796 2.51038 21.5399C2.52882 22.3601 3.20095 23 4.00656 23H7.35217C7.15258 22.5784 7.03459 22.1084 7.01993 21.6087C7.01572 21.4651 7.00943 21.25 7.00505 21H4.50165C4.49773 20.6191 4.50034 20.2599 4.51702 20.1123C4.5308 19.9903 4.59776 19.846 4.81844 19.6759C5.04878 19.4983 5.38363 19.3468 5.7631 19.2399C6.12883 19.137 6.57191 19.0478 7.07407 19.0142C7.12499 18.6798 7.20695 18.3652 7.31207 18.0721C7.45559 17.6719 7.64219 17.3186 7.85445 17.0075Z" fill="currentColor" />
    <path d="M24.6478 23H27.9935C28.7991 23 29.4712 22.3601 29.4897 21.5399C29.5 21.0796 29.5133 20.2672 29.4704 19.8877C29.3786 19.0755 28.9137 18.4858 28.4027 18.0919C27.9013 17.7054 27.3045 17.4627 26.779 17.3148C26.1674 17.1426 25.3921 17 24.5 17C24.3797 17 24.2615 17.0026 24.1456 17.0075C24.3578 17.3186 24.5444 17.6719 24.6879 18.0721C24.793 18.3652 24.875 18.6798 24.9259 19.0142C25.4281 19.0478 25.8712 19.1369 26.237 19.2399C26.6164 19.3468 26.9513 19.4983 27.1816 19.6759C27.4023 19.846 27.4693 19.9903 27.483 20.1123C27.4997 20.2599 27.5023 20.6191 27.4984 21H24.9949C24.9906 21.25 24.9843 21.4651 24.9801 21.6087C24.9654 22.1084 24.8474 22.5784 24.6478 23Z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M16 18C14.6099 18 13.4517 18.2363 12.6506 18.4683C12.2195 18.5931 11.8437 18.7329 11.5552 18.9105C11.275 19.0829 11.1382 19.2525 11.0772 19.4224C11.0547 19.4853 11.0366 19.5555 11.0259 19.6343C10.9955 19.8585 10.996 20.4459 11.0064 21H20.9936C21.004 20.4459 21.0045 19.8585 20.9741 19.6343C20.9634 19.5555 20.9453 19.4853 20.9228 19.4224C20.8618 19.2525 20.725 19.0829 20.4448 18.9105C20.1563 18.7329 19.7805 18.5931 19.3494 18.4683C18.5483 18.2363 17.3901 18 16 18ZM12.0944 16.5472C13.0378 16.274 14.3855 16 16 16C17.6145 16 18.9622 16.274 19.9056 16.5472C20.392 16.688 20.9732 16.8873 21.493 17.2071C22.0211 17.532 22.5438 18.0181 22.8053 18.7473C22.8735 18.9373 22.9259 19.1436 22.956 19.3657C23.0234 19.8633 22.9976 20.9826 22.9809 21.5501C22.957 22.3659 22.287 23 21.4851 23H10.5149C9.71301 23 9.043 22.3659 9.01907 21.5501C9.00243 20.9826 8.97657 19.8633 9.04404 19.3657C9.07414 19.1436 9.1265 18.9373 9.19466 18.7473C9.45616 18.0181 9.97894 17.532 10.507 17.2071C11.0268 16.8873 11.608 16.688 12.0944 16.5472Z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M24.5 12C23.9477 12 23.5 12.4477 23.5 13C23.5 13.5523 23.9477 14 24.5 14C25.0523 14 25.5 13.5523 25.5 13C25.5 12.4477 25.0523 12 24.5 12ZM21.5 13C21.5 11.3431 22.8431 10 24.5 10C26.1569 10 27.5 11.3431 27.5 13C27.5 14.6569 26.1569 16 24.5 16C22.8431 16 21.5 14.6569 21.5 13Z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M16 9C14.8954 9 14 9.89543 14 11C14 12.1046 14.8954 13 16 13C17.1046 13 18 12.1046 18 11C18 9.89543 17.1046 9 16 9ZM12 11C12 8.79086 13.7909 7 16 7C18.2091 7 20 8.79086 20 11C20 13.2091 18.2091 15 16 15C13.7909 15 12 13.2091 12 11Z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M7.5 12C6.94772 12 6.5 12.4477 6.5 13C6.5 13.5523 6.94772 14 7.5 14C8.05228 14 8.5 13.5523 8.5 13C8.5 12.4477 8.05228 12 7.5 12ZM4.5 13C4.5 11.3431 5.84315 10 7.5 10C9.15685 10 10.5 11.3431 10.5 13C10.5 14.6569 9.15685 16 7.5 16C5.84315 16 4.5 14.6569 4.5 13Z" fill="currentColor" />
  </svg>
);

const PinIcon = ({ size = 14, className, style }) => (
  <svg viewBox="0 0 20 20" height={size} width={size} fill="none" className={className} style={{ flexShrink: 0, ...style }}>
    <path d="M13.5 4.5V11L15.2708 12.7708C15.3403 12.8403 15.3958 12.9201 15.4375 13.0104C15.4792 13.1007 15.5 13.2014 15.5 13.3125V13.746C15.5 13.9597 15.4281 14.1388 15.2844 14.2833C15.1406 14.4278 14.9625 14.5 14.75 14.5H10.75V19.125C10.75 19.3375 10.6785 19.5156 10.5356 19.6594C10.3927 19.8031 10.2156 19.875 10.0044 19.875C9.79313 19.875 9.61458 19.8031 9.46875 19.6594C9.32292 19.5156 9.25 19.3375 9.25 19.125V14.5H5.25C5.0375 14.5 4.85938 14.4278 4.71563 14.2833C4.57188 14.1388 4.5 13.9597 4.5 13.746V13.3125C4.5 13.2014 4.52083 13.1007 4.5625 13.0104C4.60417 12.9201 4.65972 12.8403 4.72917 12.7708L6.5 11V4.5H6.25C6.0375 4.5 5.85938 4.42854 5.71563 4.28563C5.57188 4.14271 5.5 3.96563 5.5 3.75438C5.5 3.54313 5.57188 3.36458 5.71563 3.21875C5.85938 3.07292 6.0375 3 6.25 3H13.75C13.9625 3 14.1406 3.07146 14.2844 3.21437C14.4281 3.35729 14.5 3.53437 14.5 3.74562C14.5 3.95687 14.4281 4.13542 14.2844 4.28125C14.1406 4.42708 13.9625 4.5 13.75 4.5H13.5ZM6.625 13H13.375L12 11.625V4.5H8V11.625L6.625 13Z" fill="currentColor" />
  </svg>
);

const TabButton = ({ isActive, onClick, label, icon: Icon, notificationCount }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'relative flex items-center justify-center border-none cursor-pointer transition-all duration-200 whitespace-nowrap flex-shrink-0',
        {
          'bg-red-600 text-white font-semibold shadow-lg': isActive,
          'bg-white/90 text-gray-700 hover:bg-gray-100 hover:shadow-lg hover:scale-[1.02] font-medium': !isActive,
        },
        'max-[768px]:flex-1 max-[1280px]:!w-10 max-[1280px]:!h-10 max-[1280px]:!p-2'
      )}
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        borderRadius: '12px',
        boxShadow: isActive ? '0 4px 8px rgba(220, 38, 38, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.08)',
        height: '42px',
        padding: '8px 16px',
        gap: '8px',
        minWidth: 'fit-content'
      }}
    >
      <Icon size={16} strokeWidth={2} className="flex-shrink-0" style={{ minWidth: '16px' }} />
      <span className="font-medium whitespace-nowrap max-[768px]:block min-[769px]:max-[1280px]:hidden" style={{ fontSize: '13px', lineHeight: '100%', fontWeight: 500 }}>
        {label}
      </span>
      {notificationCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white shadow-md ring-2 ring-white">
          {notificationCount}
        </span>
      )}
    </button>
  );
};

// Componente colapsable optimizado para detección de scroll
const CollapsibleList = ({ title, icon: Icon, children, isOpen, onToggle, onLoadMore, hasMore, isLoading, className, contentClassName, defaultHeight = 356, maxHeight = 400 }) => {
  const [height, setHeight] = useState(defaultHeight);
  const listRef = useRef(null);
  const contentRef = useRef(null);
  const innerContentRef = useRef(null);
  const isResizing = useRef(false);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const lastCheckTime = useRef(0); // 🔥 Prevenir checks múltiples
  const hasMoreRef = useRef(hasMore);

  useEffect(() => {
    hasMoreRef.current = hasMore;
  }, [hasMore]);

  const startResizing = useCallback((e) => {
    e.preventDefault();
    isResizing.current = true;
    startY.current = e.clientY;
    startHeight.current = height;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', stopResizing);
  }, [height]);

  // 🔥 FUNCIÓN PARA VERIFICAR SI NECESITAMOS CARGAR MÁS DATOS (solo después de resize)
  const checkIfNeedsMoreData = useCallback(() => {
    if (!contentRef.current || !hasMoreRef.current || isLoading || !onLoadMore) return;

    // 🔥 Prevenir llamadas múltiples en corto tiempo
    const now = Date.now();
    if (now - lastCheckTime.current < 300) return;

    const { scrollTop, scrollHeight, clientHeight } = contentRef.current;

    // 🔥 Obtener altura actual del contenedor
    const containerHeight = listRef.current?.offsetHeight || clientHeight;
    const headerHeight = listRef.current?.querySelector('.mx_RoomSublist_header')?.offsetHeight || 36;
    const availableHeight = containerHeight - headerHeight;

    // 🔥 MEJORADO: Cargar más si hay espacio vacío o cerca del final
    const hasEmptySpace = scrollHeight < availableHeight;
    const isNearBottom = scrollHeight - scrollTop <= clientHeight + 80;

    if (hasEmptySpace || isNearBottom) {
      console.log(`🔄 Loading more for "${title}" (empty: ${hasEmptySpace}, nearBottom: ${isNearBottom})`);
      lastCheckTime.current = now;
      onLoadMore();
    }
  }, [hasMore, isLoading, onLoadMore, title]);

  const handleMouseMove = useCallback((e) => {
    if (!isResizing.current) return;
    const deltaY = e.clientY - startY.current;
    let newHeight = startHeight.current + deltaY;

    // 🔥 Permitir crecer un poco más para disparar carga de datos
    if (innerContentRef.current && listRef.current) {
      const contentHeight = innerContentRef.current.offsetHeight;
      const header = listRef.current.querySelector('.mx_RoomSublist_header');
      const headerHeight = header ? header.offsetHeight : 36;
      const maxAllowedHeight = contentHeight + headerHeight + 60; // +60px buffer

      if (newHeight > maxAllowedHeight) {
        newHeight = maxAllowedHeight;
      }
    }

    if (newHeight > 76 && newHeight < maxHeight) {
      setHeight(newHeight);
    }
  }, []);

  const stopResizing = useCallback(() => {
    isResizing.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', stopResizing);

    // 🔥 SIMPLE: Si hay más datos y no está cargando, cargar más
    if (hasMoreRef.current && onLoadMore && !isLoading) {
      console.log(`🔄 Loading more for "${title}" on resize release`);
      onLoadMore();
    }
  }, [handleMouseMove, onLoadMore, isLoading, title]);

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Detectar cuando estamos cerca del final del scroll (a 20px)
    if (scrollHeight - scrollTop <= clientHeight + 20) {
      if (hasMore && !isLoading && onLoadMore) {
        console.log("📜 Triggering load more for", title);
        onLoadMore();
      }
    }
  }, [hasMore, isLoading, onLoadMore, title]);

  return (
    <div className={`mx_RoomSublist ${className || ''}`} style={{ height: isOpen ? 'auto' : 'auto', maxHeight: isOpen ? '600px' : 'auto' }} ref={listRef}>
      <div className="mx_RoomSublist_header" onClick={onToggle}>
        <div className="flex items-center gap-2">
          {Icon && <Icon size={12} className="text-gray-400" />}
          <span>{title}</span>
        </div>
        {isOpen ? <FaChevronDown className="w-2.5 h-2.5 text-gray-400" /> : <FaChevronRight className="w-2.5 h-2.5 text-gray-400" />}
      </div>

      {isOpen && (
        <>
          <div
            ref={contentRef}
            className={`mx_RoomSublist_content ${contentClassName || ''}`}
            style={{ overflowY: 'auto' }}
            onScroll={handleScroll}
          >
            <div ref={innerContentRef}>
              {children}
              {/* Spinner de carga discreto al final de la lista */}
              {isLoading && (
                <div className="flex justify-center py-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
              )}
            </div>
          </div>
          {/* Botón Ver más - solo si hay más páginas */}
          {hasMore && !isLoading && (
            <div className="flex justify-center py-2 border-t border-gray-100">
              <button
                onClick={(e) => { e.stopPropagation(); onLoadMore && onLoadMore(); }}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium px-3 py-1 rounded hover:bg-blue-50 transition-colors"
              >
                Ver más
              </button>
            </div>
          )}
          <div className="mx_RoomSublist_resizerHandle" onMouseDown={startResizing}></div>
        </>
      )}
    </div>
  );
};

const ConversationList = ({
  user,
  userList,
  assignedConversations = [],
  monitoringConversations = [],
  monitoringPage = 1,
  monitoringTotal = 0,
  monitoringTotalPages = 0,
  monitoringLoading = false,
  onLoadMonitoringConversations,
  myActiveRooms = [],
  currentRoomCode,
  isGroup,
  onUserSelect,
  onRoomSelect,
  unreadMessages = {},
  onToggleSidebar,
  onShowJoinRoom,
  userListHasMore,
  userListLoading,
  onLoadMoreUsers,
  roomTypingUsers = {},
  assignedPage = 1,
  assignedTotal = 0,
  assignedTotalPages = 0,
  assignedLoading = false,
  onLoadAssignedConversations,
  roomsPage = 1,
  roomsTotal = 0,
  roomsTotalPages = 0,
  roomsLoading = false,
  onLoadUserRooms,
  onGoToRoomsPage,
  isCompact = false  // <- AGREGAR ESTA LÍNEA
}) => {
  const [activeModule, setActiveModule] = useState('chats');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignedSearchTerm, setAssignedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isSearching, setIsSearching] = useState(false);
  const conversationsListRef = useRef(null);
  const [favoriteRoomCodes, setFavoriteRoomCodes] = useState([]);
  const [favoriteRooms, setFavoriteRooms] = useState([]); // 🔥 NUEVO: Grupos favoritos con datos completos
  const [favoriteConversationIds, setFavoriteConversationIds] = useState([]);
  const [userCache, setUserCache] = useState({});
  const [messageSearchResults, setMessageSearchResults] = useState([]);
  const [showGroups, setShowGroups] = useState(true);
  const [showAssigned, setShowAssigned] = useState(true);
  const searchTimeoutRef = useRef(null);
  // 🔥 NUEVO: Estado para filtrar búsqueda por tipo
  const [searchFilter, setSearchFilter] = useState('select_option'); // 'select_option', 'groups', 'favorites', 'assigned', 'messages'
  // 🔥 NUEVO: Estados para resultados de búsqueda desde la API
  const [apiSearchResults, setApiSearchResults] = useState({ groups: [], assigned: [] });
  const [isApiSearching, setIsApiSearching] = useState(false);
  const apiSearchTimeoutRef = useRef(null);

  // 🔥 Estados locales para listas ordenadas (se actualizan automáticamente)
  const [sortedRooms, setSortedRooms] = useState([]);
  const [sortedAssignedConversations, setSortedAssignedConversations] = useState([]);

  const isAdmin = ['ADMIN', 'JEFEPISO'].includes(user?.role);
  const canViewMonitoring = ['SUPERADMIN', 'PROGRAMADOR'].includes(user?.role);

  const getDisplayName = () => {
    if (!user) return '';
    return user.nombre && user.apellido ? `${user.nombre} ${user.apellido}` : user.username;
  };

  const hasMentionToUser = useCallback((messageText) => {
    if (!messageText) return false;
    const currentUserName = getDisplayName();
    if (!currentUserName) return false;
    const mentionRegex = /@([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\s{2,}|$|[.,!?;:]|\n)/g;
    const mentions = [];
    let match;
    while ((match = mentionRegex.exec(messageText)) !== null) {
      mentions.push(match[1].trim().toUpperCase());
    }
    const userNameUpper = currentUserName.toUpperCase();
    return mentions.some(mention => userNameUpper.includes(mention) || mention.includes(userNameUpper));
  }, [user]);

  useEffect(() => {
    setUserCache(prevCache => {
      const newCache = { ...prevCache };
      if (userList && userList.length > 0) {
        userList.forEach(u => {
          const fullName = u.nombre && u.apellido ? `${u.nombre} ${u.apellido}` : u.username;
          const key = fullName?.toLowerCase().trim();
          if (key) {
            newCache[key] = {
              picture: u.picture,
              username: u.username,
              nombre: u.nombre,
              apellido: u.apellido,
              isOnline: u.isOnline !== undefined ? u.isOnline : false
            };
          }
        });
      }
      return newCache;
    });
  }, [userList]);

  // Cargar monitoreo al cambiar de pestaña
  useEffect(() => {
    if (activeModule === 'monitoring' && onLoadMonitoringConversations) {
      if (monitoringConversations.length === 0) {
        onLoadMonitoringConversations(1);
      }
    }
  }, [activeModule]);

  // Manejo de Favoritos
  useEffect(() => {
    let isMounted = true;
    const loadFavorites = async () => {
      const displayName = getDisplayName();
      if (!displayName || !isMounted) return;

      // 🔥 Siempre recargar favoritos para mantener sincronizado
      try {
        // console.log('🔥 Cargando favoritos para:', displayName);
        // Cargar grupos favoritos con datos completos
        const roomsWithData = await apiService.getUserFavoriteRoomsWithData(displayName);
        // console.log('🔥 Favoritos cargados:', roomsWithData);
        if (isMounted) {
          setFavoriteRooms(roomsWithData);
          setFavoriteRoomCodes(roomsWithData.map(r => r.roomCode));
        }

        // Cargar IDs de conversaciones favoritas
        const conversationIds = await apiService.getUserFavoriteConversationIds(displayName);
        if (isMounted) setFavoriteConversationIds(conversationIds);
      } catch (error) {
        console.error('Error al cargar favoritos:', error);
      }
    };
    loadFavorites();
    return () => { isMounted = false; };
  }, [user?.id]);

  const handleToggleFavorite = async (room, e) => {
    e.stopPropagation();
    const displayName = getDisplayName();
    if (!displayName) return;
    try {
      const result = await apiService.toggleRoomFavorite(displayName, room.roomCode, room.id);
      if (result.isFavorite) {
        // 🔥 Agregar a favoritos con datos completos
        setFavoriteRoomCodes(prev => [...prev, room.roomCode]);
        setFavoriteRooms(prev => [...prev, { ...room, isFavorite: true }]);
      } else {
        // 🔥 Quitar de favoritos
        setFavoriteRoomCodes(prev => prev.filter(code => code !== room.roomCode));
        setFavoriteRooms(prev => prev.filter(r => r.roomCode !== room.roomCode));
      }
    } catch (error) {
      console.error('Error al alternar favorito:', error);
    }
  };

  const handleToggleConversationFavorite = async (conversation, e) => {
    e.stopPropagation();
    const displayName = getDisplayName();
    if (!displayName) return;
    try {
      const result = await apiService.toggleConversationFavorite(displayName, conversation.id);
      if (result.isFavorite) {
        setFavoriteConversationIds(prev => [...prev, conversation.id]);
      } else {
        setFavoriteConversationIds(prev => prev.filter(id => id !== conversation.id));
      }
    } catch (error) {
      console.error('Error al alternar favorito de conversación:', error);
    }
  };

  const handleScroll = useCallback((e) => {
    if (!onLoadMoreUsers || !userListHasMore || userListLoading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    // Umbral de 50px
    if (scrollHeight - scrollTop <= clientHeight + 50) {
      onLoadMoreUsers();
    }
  }, [onLoadMoreUsers, userListHasMore, userListLoading]);

  const handleMessageSearch = useCallback(async (searchValue) => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (!searchValue || searchValue.trim().length === 0) {
      setMessageSearchResults([]);
      setIsSearching(false);
      return;
    }
    const userId = user?.id;
    if (!userId) {
      console.error('No se pudo obtener el ID del usuario');
      return;
    }
    searchTimeoutRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await apiService.searchMessagesByUserId(userId, searchValue);
        setMessageSearchResults(results || []);
      } catch (error) {
        console.error('Error al buscar mensajes:', error);
        setMessageSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, [user]);

  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (apiSearchTimeoutRef.current) {
        clearTimeout(apiSearchTimeoutRef.current);
      }
    };
  }, []);

  // 🔥 NUEVO: Función para buscar en la API según el filtro seleccionado
  const handleApiSearch = useCallback((searchValue, filterOverride = null) => {
    if (apiSearchTimeoutRef.current) {
      clearTimeout(apiSearchTimeoutRef.current);
    }

    // Si no hay término de búsqueda, limpiar resultados
    if (!searchValue || searchValue.trim().length === 0) {
      setApiSearchResults({ groups: [], assigned: [] });
      setIsApiSearching(false);
      return;
    }

    // Solo buscar si hay más de 2 caracteres
    if (searchValue.trim().length < 2) {
      return;
    }

    // Usar el filtro proporcionado o el estado actual
    const currentFilter = filterOverride || searchFilter;

    apiSearchTimeoutRef.current = setTimeout(async () => {
      setIsApiSearching(true);
      try {
        const results = { groups: [], assigned: [] };

        // Buscar grupos si el filtro es 'groups'
        if (currentFilter === 'groups') {
          try {
            // 🔥 Usar la API correcta según el rol del usuario
            const isPrivilegedUser = ['ADMIN', 'JEFEPISO', 'PROGRAMADOR', 'SUPERADMIN'].includes(user?.role);
            let groupsResult;
            if (isPrivilegedUser) {
              groupsResult = await apiService.getAdminRooms(1, 50, searchValue);
              results.groups = groupsResult?.data || [];
            } else {
              groupsResult = await apiService.getUserRoomsPaginated(1, 50, searchValue);
              results.groups = groupsResult?.rooms || [];
            }
          } catch (error) {
            console.error('Error al buscar grupos:', error);
          }
        }

        // Buscar asignados si el filtro es 'assigned'
        if (currentFilter === 'assigned') {
          try {
            const assignedResult = await apiService.getAssignedConversationsPaginated(1, 50, searchValue);
            results.assigned = assignedResult?.conversations || [];
          } catch (error) {
            console.error('Error al buscar asignados:', error);
          }
        }

        // 🔥 NUEVO: Buscar mensajes si el filtro es 'messages'
        if (currentFilter === 'messages') {
          try {
            console.log(`🔎 Buscando mensajes para: "${searchValue}"`);
            const messagesResult = await apiService.searchMessagesByUserId(user.id, searchValue);
            setMessageSearchResults(messagesResult || []);
          } catch (error) {
            console.error('Error al buscar mensajes:', error);
            setMessageSearchResults([]);
          }
        }

        setApiSearchResults(results);
      } catch (error) {
        console.error('Error al buscar:', error);
        setApiSearchResults({ groups: [], assigned: [] });
      } finally {
        setIsApiSearching(false);
      }
    }, 500);
  }, [searchFilter]);

  // --- FILTRADO DE CONVERSACIONES DIRECTAS (USUARIOS) ---
  const filteredConversations = userList?.filter(conversation => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    const displayName = conversation.nombre && conversation.apellido ? `${conversation.nombre} ${conversation.apellido}` : conversation.username;
    return (
      conversation.username?.toLowerCase().includes(searchLower) ||
      displayName?.toLowerCase().includes(searchLower) ||
      conversation.lastMessage?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // --- LÓGICA DE CONTADORES CORREGIDA ---
  // Filtramos las conversaciones asignadas que pertenecen al usuario actual
  const myAssignedConversations = assignedConversations.filter(conv => {
    const displayName = getDisplayName();
    return conv.participants?.includes(displayName);
  });

  // 🔥 CALCULO DE NO LEÍDOS PARA ASIGNADOS (Combinando prop interna + unreadMessages global)
  const unreadAssignedCount = myAssignedConversations.reduce((acc, conv) => {
    // Intentamos obtener el conteo real del socket (unreadMessages)
    // Usamos conv.id (si es por ID) o tratamos de buscar por username del otro participante si fuera necesario
    // Pero generalmente unreadMessages se indexa por ID de sala/conversación o username
    const realTimeCount = unreadMessages?.[conv.id];
    // Si existe en realtime, lo usamos. Si no, usamos el estático de la BD (conv.unreadCount)
    const count = (realTimeCount !== undefined) ? realTimeCount : (conv.unreadCount || 0);
    return acc + (count > 0 ? 1 : 0);
  }, 0);

  const unreadMonitoringCount = monitoringConversations.filter(conv => conv.unreadCount > 0).length;

  // 🔥 CALCULO DE NO LEÍDOS PARA GRUPOS
  const unreadRoomsCount = myActiveRooms?.filter(room => {
    const roomUnread = unreadMessages?.[room.roomCode];
    // Si viene del socket, usarlo. Si no, fallback a propiedad del objeto si existiera (room.unreadCount)
    const count = (roomUnread !== undefined) ? roomUnread : (room.unreadCount || 0);
    return count > 0;
  }).length || 0;

  // --- DEFINICIÓN DE PESTAÑAS (TABS) ---
  const tabs = [
    {
      id: 'chats',
      label: 'Chats',
      shortLabel: 'Chats',
      icon: Home,
      notificationCount: unreadAssignedCount + unreadRoomsCount,
      adminOnly: false,
    }
  ];

  // Solo agregamos la pestaña de monitoreo si el usuario tiene permiso explícito
  if (canViewMonitoring) {
    tabs.push({
      id: 'monitoring',
      label: 'Monitoreo',
      shortLabel: 'Monitoreo',
      icon: MessageSquare,
      notificationCount: unreadMonitoringCount,
      adminOnly: true,
    });
  }

  return (
    <div
      className={`flex flex-col bg-white max-[768px]:w-full max-[768px]:flex-1 conversation-list-responsive ${isCompact ? 'compact-mode' : ''}`}
      style={{
        borderRight: '1.3px solid #EEEEEE',
        overflowX: 'hidden',
        width: isCompact ? '80px' : '100%',
        maxWidth: isCompact ? '80px' : '100%',
        minWidth: isCompact ? '60px' : 'auto',
        flexShrink: 0,
        flexGrow: isCompact ? 0 : 1
      }}
    >
      {/* Botón de menú hamburguesa (Visible solo en móvil) */}
      <div className="flex items-center justify-between bg-white px-3 py-2 border-b border-gray-200 max-[768px]:flex min-[769px]:hidden">
        <button onClick={onToggleSidebar} className="flex items-center justify-center w-9 h-9 bg-[#13467A] text-white rounded-lg hover:bg-[#0f3660] transition-all duration-200 active:scale-95" title="Ver módulos">
          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5"><path d="M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z" fill="currentColor" /></svg>
        </button>
      </div>

      {/* --- RENDERIZADO DE LAS PESTAÑAS (TABS) --- */}
      {!isCompact && tabs.length > 1 && (
        <div className="tabs-container flex items-center justify-center gap-3 px-4 py-3 overflow-x-auto mx_AutoHideScrollbar max-[768px]:px-3 max-[768px]:gap-2">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              isActive={activeModule === tab.id}
              onClick={() => setActiveModule(tab.id)}
              label={tab.label}
              icon={tab.icon}
              notificationCount={tab.notificationCount}
            />
          ))}
        </div>
      )}
      {!isCompact && <div className="border-b border-gray-200 mx-4"></div>}

      {/* Barra de búsqueda */}
      {!isCompact && (
        <div className="bg-white flex flex-col max-[1280px]:!px-2 max-[1280px]:!py-1 max-[1024px]:!px-1.5 max-[1024px]:!py-0.5 max-[768px]:!px-3 max-[768px]:!py-1.5" style={{ paddingTop: '6px', paddingLeft: '12px', paddingRight: '12px', paddingBottom: '6px' }}>
          <div className="relative flex items-center bg-[#E8E8E8] overflow-hidden max-[1280px]:!w-full max-[1280px]:!h-9 max-[1280px]:!px-2.5 max-[1280px]:!py-1.5 max-[1280px]:!gap-1.5 max-[1024px]:!h-8 max-[1024px]:!px-2 max-[1024px]:!py-1 max-[1024px]:!gap-1 max-[768px]:!w-full max-[768px]:!h-9 max-[768px]:!px-2.5 max-[768px]:!py-1.5 max-[768px]:!gap-1.5" style={{ width: '100%', height: '34px', borderRadius: '10px', paddingTop: '6px', paddingRight: '10px', paddingBottom: '6px', paddingLeft: '10px', gap: '8px' }}>
            <span className="text-gray-500 flex-shrink-0" style={{ display: 'flex', alignItems: 'center' }}>
              <svg viewBox="0 0 24 24" height="18" width="18" fill="none" className="text-gray-500">
                <path d="M10.5 18C14.6421 18 18 14.6421 18 10.5C18 6.35786 14.6421 3 10.5 3C6.35786 3 3 6.35786 3 10.5C3 14.6421 6.35786 18 10.5 18Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M21 21L15.8 15.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
            <input
              type="text"
              disabled={searchFilter === 'select_option'}
              placeholder={searchFilter === 'select_option' ? "Seleccione un filtro para buscar" : "Buscar..."}
              className="flex-1 bg-transparent border-none text-gray-800 outline-none placeholder:text-gray-400 max-[1280px]:!text-sm max-[1280px]:placeholder:!text-xs max-[1024px]:!text-xs max-[1024px]:placeholder:!text-[11px] max-[768px]:!text-sm max-[768px]:placeholder:!text-xs"
              style={{ fontSize: '14px', lineHeight: '16px', fontWeight: 400 }}
              value={activeModule === 'chats' || activeModule === 'monitoring' ? assignedSearchTerm : searchTerm}
              onChange={(e) => {
                const value = e.target.value;
                if (activeModule === 'chats' || activeModule === 'monitoring') {
                  setAssignedSearchTerm(value);
                  handleMessageSearch(value);
                  handleApiSearch(value); // 🔥 NUEVO: Buscar en API
                } else {
                  setSearchTerm(value);
                  handleMessageSearch(value);
                  handleApiSearch(value); // 🔥 NUEVO: Buscar en API
                }
              }}
            />
            {((activeModule === 'conversations' && searchTerm) || (activeModule === 'chats' && assignedSearchTerm) || (activeModule === 'monitoring' && assignedSearchTerm)) && (
              <button className="bg-transparent border-none text-gray-400 cursor-pointer p-0.5 flex items-center justify-center rounded-full transition-all duration-200 hover:text-gray-600 active:scale-95"
                onClick={() => {
                  if (activeModule === 'chats' || activeModule === 'monitoring') {
                    setAssignedSearchTerm('');
                    setMessageSearchResults([]);
                    setApiSearchResults({ groups: [], assigned: [] });
                  }
                  else {
                    setSearchTerm('');
                    setMessageSearchResults([]);
                    setApiSearchResults({ groups: [], assigned: [] });
                  }
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                  <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
                  <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
          {(activeModule === 'conversations' || activeModule === 'chats' || activeModule === 'monitoring') && (
            <div className="flex items-center gap-2 flex-nowrap max-[1280px]:!gap-1 max-[1024px]:!gap-1" style={{ marginTop: '8px' }}>
              {/* Ordenar por */}
              <div className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" className="text-gray-500">
                  <path d="M4 6H20M4 12H14M4 18H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <select className="bg-transparent border-none text-[#33B8FF] cursor-pointer outline-none max-[1280px]:!text-sm max-[1024px]:!text-xs" style={{ fontWeight: 400, fontSize: '14px', lineHeight: '18px' }} value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="name">Name</option>
                </select>
              </div>
              {/* Separador */}
              <span className="text-gray-300">|</span>
              {/* Filtrar por */}
              <div className="flex items-center gap-1">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" className="text-gray-500">
                  <path d="M3 6H21M7 12H17M10 18H14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <select
                  className="bg-transparent border-none text-[#33B8FF] cursor-pointer outline-none max-[1280px]:!text-sm max-[1024px]:!text-xs"
                  style={{ fontWeight: 400, fontSize: '14px', lineHeight: '18px' }}
                  value={searchFilter}
                  onChange={(e) => {
                    const newFilter = e.target.value;
                    setSearchFilter(newFilter);
                    // 🔥 NUEVO: Re-ejecutar búsqueda con el nuevo filtro
                    if (assignedSearchTerm.trim().length >= 2) {
                      handleApiSearch(assignedSearchTerm, newFilter);
                    }
                  }}
                >
                  <option value="select_option" disabled>Seleccione filtro...</option>
                  <option value="groups">Grupos</option>
                  <option value="favorites">Favoritos</option>
                  <option value="assigned">Asignados</option>
                  <option value="messages">Mensajes</option>
                </select>
                {searchFilter !== 'select_option' && (
                  <button
                    className="bg-transparent border-none text-gray-500 cursor-pointer p-0.5 flex items-center justify-center rounded-full transition-all duration-200 hover:text-red-500 hover:bg-red-50 active:scale-95 flex-shrink-0"
                    onClick={() => {
                      setSearchFilter('select_option');
                      setSearchTerm('');
                      setAssignedSearchTerm('');
                      setMessageSearchResults([]);
                      setApiSearchResults({ groups: [], assigned: [] });
                    }}
                    title="Limpiar filtro"
                  >
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.3" />
                      <path d="M15 9L9 15M9 9L15 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
         MÓDULO: CHATS / CONVERSACIONES (Grupos + Asignados + Usuarios)
         ========================================================================= */}
      {(activeModule === 'chats' || activeModule === 'conversations') && (
        <div ref={conversationsListRef} className="flex-1 overflow-y-auto bg-white px-4" style={{ maxHeight: 'calc(100vh - 180px)' }} onScroll={handleScroll}>

          {/* Resultados de búsqueda de mensajes */}
          {assignedSearchTerm.trim() && messageSearchResults.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-gray-500 font-semibold mb-2 px-2" style={{}}>📝 Mensajes encontrados ({messageSearchResults.length})</div>
              {messageSearchResults.map((msg) => {
                const isGroupMsg = msg.isGroup;
                const conversationName = isGroupMsg ? msg.roomCode : msg.to;
                const messagePreview = msg.message || (msg.fileName ? `📎 ${msg.fileName}` : 'Archivo');
                return (
                  <div key={msg.id} className="flex items-start gap-3 p-3 mb-2 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors" onClick={() => {
                    if (isGroupMsg) {
                      const room = myActiveRooms?.find(r => r.roomCode === msg.roomCode);
                      if (room && onRoomSelect) onRoomSelect(room, msg.id);
                    } else {
                      onUserSelect(msg.to, null, msg.id);
                    }
                  }}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-lg">{isGroupMsg ? '👥' : '💬'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1"><span className="font-semibold text-sm text-gray-800" style={{}}>{conversationName}</span><span className="text-xs text-gray-500">{isGroupMsg ? 'Grupo' : 'Chat'}</span></div>
                      <p className="text-xs text-gray-700 truncate" style={{}}>{messagePreview}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(msg.sentAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-gray-200 my-3"></div>
            </div>
          )}

          {isSearching && <div className="flex items-center justify-center py-8"><div className="text-sm text-gray-500">Buscando mensajes...</div></div>}


          {/* 0. SECCIÓN DE FAVORITOS - Siempre fijos arriba */}
          {(searchFilter === 'select_option' || searchFilter === 'favorites') && (favoriteRooms.length > 0 || favoriteConversationIds.length > 0) && (
            <CollapsibleList
              title="FAVORITOS"
              icon={FaStar}
              isOpen={true}
              onToggle={() => { }}
              defaultHeight={130}
            >
              {/* Grupos favoritos - 🔥 Usando favoriteRooms con datos completos */}
              {favoriteRooms.map((room) => {
                const typingUsers = roomTypingUsers[room.roomCode] || [];
                const isTypingInRoom = typingUsers.length > 0;
                const roomUnreadCount = unreadMessages?.[room.roomCode] !== undefined ? unreadMessages[room.roomCode] : (room.unreadCount || 0);
                return (
                  <div key={`fav-room-${room.id}`} className={`flex items-center transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer ${currentRoomCode === room.roomCode ? 'bg-[#e7f3f0]' : ''}`} style={{ padding: '4px 12px', gap: '6px', minHeight: '40px' }} onClick={() => onRoomSelect && onRoomSelect(room)}>
                    <div className="relative flex-shrink-0" style={{ width: '32px', height: '32px' }}>
                      <div className="rounded-full overflow-hidden flex items-center justify-center text-white font-bold" style={{ width: '32px', height: '32px', border: '1.3px solid rgba(0, 0, 0, 0.1)', fontSize: '14px', backgroundColor: '#A50104' }}>
                        {room.description ? <img src={room.description} alt={room.name} className="w-full h-full object-cover" /> : "🏠"}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col" style={{ gap: '2px', display: isCompact ? 'none' : 'flex' }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <h3 className="font-semibold text-[#111] truncate flex-1" style={{ fontSize: '11.5px', fontWeight: 600 }}>{room.name}</h3>
                          {roomUnreadCount > 0 && <div className="flex-shrink-0 rounded-full bg-[#ff453a] text-white flex items-center justify-center ml-2" style={{ minWidth: '18px', height: '18px', fontSize: '10px', fontWeight: 'bold' }}>{roomUnreadCount > 99 ? '99+' : roomUnreadCount}</div>}
                        </div>
                        <button onClick={(e) => handleToggleFavorite(room, e)} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded-full transition-colors" style={{ color: '#ff453a' }}><FaStar /></button>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-green-600 italic truncate flex-1" style={{ fontSize: '11px' }}>{isTypingInRoom ? `${typingUsers[0]?.nombre || typingUsers[0]?.username} está escribiendo...` : ''}</p>
                        {(room.lastMessageAt || room.lastMessageTime || room.updatedAt) && <span className="text-gray-400 flex-shrink-0" style={{ fontSize: '10px' }}>{new Date(room.lastMessageAt || room.lastMessageTime || room.updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</span>}
                      </div>

                    </div>
                  </div>
                );
              })}
              {/* Conversaciones favoritas */}
              {myAssignedConversations.filter(conv => favoriteConversationIds.includes(conv.id)).map((conv) => {
                const participants = conv.participants || [];
                const currentUserFullName = user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : user?.username;
                const otherParticipant = participants.find(p => p?.toLowerCase() !== currentUserFullName?.toLowerCase()) || participants[0];
                const itemUnreadCount = unreadMessages?.[conv.id] !== undefined ? unreadMessages[conv.id] : (conv.unreadCount || 0);
                const getInitials = (name) => { const parts = name?.split(' ') || []; return parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}`.toUpperCase() : (name?.[0]?.toUpperCase() || 'U'); };
                return (
                  <div key={`fav-conv-${conv.id}`} className="flex transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer" style={{ padding: '4px 12px', gap: '6px', minHeight: '40px' }} onClick={() => onUserSelect && onUserSelect(otherParticipant, null, conv)}>
                    <div className="relative flex-shrink-0" style={{ width: '32px', height: '32px' }}>
                      <div className="rounded-full overflow-hidden flex items-center justify-center text-white font-bold" style={{ width: '32px', height: '32px', fontSize: '14px', backgroundColor: '#A50104' }}>{getInitials(otherParticipant)}</div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col" style={{ gap: '4px', display: isCompact ? 'none' : 'flex' }}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          <span className="flex-shrink-0 text-yellow-500 font-semibold flex items-center gap-1" style={{ fontSize: '9px' }}><FaStar size={10} /> CHAT</span>
                          <h3 className="font-semibold text-[#111] truncate" style={{ fontSize: '11.5px', fontWeight: 600 }}>{otherParticipant}</h3>
                        </div>
                        <button onClick={(e) => handleToggleConversationFavorite(conv, e)} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded-full transition-colors" style={{ color: '#ff453a' }}><FaStar /></button>
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <div className="flex items-center gap-1">
                          {(conv.lastMessageTime || conv.updatedAt) && <span className="text-gray-400" style={{ fontSize: '10px' }}>{new Date(conv.lastMessageTime || conv.updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</span>}
                          {itemUnreadCount > 0 && <div className="flex-shrink-0 rounded-full bg-[#ff453a] text-white flex items-center justify-center" style={{ minWidth: '18px', height: '18px', fontSize: '10px', fontWeight: 600 }}>{itemUnreadCount > 99 ? '99+' : itemUnreadCount}</div>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </CollapsibleList>
          )}

          {/* 1. SECCIÓN DE GRUPOS */}
          {(searchFilter === 'select_option' || searchFilter === 'groups') && (
            <CollapsibleList
              title="GRUPOS"
              icon={Users}
              isOpen={showGroups}
              onToggle={() => setShowGroups(prev => !prev)}
              defaultHeight={300}
              maxHeight={350}
              onLoadMore={() => {
                if (onLoadUserRooms && roomsPage < roomsTotalPages) {
                  onLoadUserRooms(roomsPage + 1);
                }
              }}
              hasMore={roomsPage < roomsTotalPages}
              isLoading={roomsLoading}
            >
              {(() => {
                // 🔥 NUEVO: Si hay búsqueda activa con resultados de API, usar esos resultados
                const hasApiSearch = assignedSearchTerm.trim().length >= 2 && apiSearchResults.groups.length > 0;

                if (!myActiveRooms || myActiveRooms.length === 0) {
                  if (!hasApiSearch) {
                    return (
                      <div className="flex flex-col items-center justify-center py-[60px] px-5 text-center">
                        <div className="text-5xl mb-4 opacity-50">👥</div>
                        <div className="text-sm text-gray-600 font-medium">No perteneces a un chat grupal aún</div>
                      </div>
                    );
                  }
                }

                // 🔥 El backend excluye favoritos, pero filtramos aquí también para
                // reactividad inmediata cuando marcas un nuevo favorito (myActiveRooms está cacheado)
                let filteredRooms;
                if (hasApiSearch) {
                  filteredRooms = apiSearchResults.groups.filter(room => !favoriteRoomCodes.includes(room.roomCode));
                } else {
                  filteredRooms = (myActiveRooms || [])
                    .filter(room => !favoriteRoomCodes.includes(room.roomCode)) // 🔥 Excluir favoritos
                    .filter(room => assignedSearchTerm.trim() === '' || room.name.toLowerCase().includes(assignedSearchTerm.toLowerCase()) || room.roomCode.toLowerCase().includes(assignedSearchTerm.toLowerCase()));
                }

                // Ordenar: grupos con mensajes no leídos primero
                filteredRooms = filteredRooms.sort((a, b) => {
                  const unreadA = unreadMessages?.[a.roomCode] ?? (a.unreadCount || 0);
                  const unreadB = unreadMessages?.[b.roomCode] ?? (b.unreadCount || 0);
                  // Los que tienen mensajes no leídos van primero
                  if (unreadA > 0 && unreadB === 0) return -1;
                  if (unreadA === 0 && unreadB > 0) return 1;
                  // Si ambos tienen o ambos no tienen, ordenar por cantidad (más mensajes primero)
                  return unreadB - unreadA;
                });

                // Mostrar indicador de búsqueda
                if (isApiSearching && assignedSearchTerm.trim().length >= 2) {
                  return (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-sm text-gray-500">Buscando grupos...</div>
                    </div>
                  );
                }

                // Mostrar mensaje si no hay resultados de búsqueda
                if (hasApiSearch && filteredRooms.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-[40px] px-5 text-center">
                      <div className="text-3xl mb-2 opacity-50">🔍</div>
                      <div className="text-sm text-gray-600 font-medium">No se encontraron grupos para "{assignedSearchTerm}"</div>
                    </div>
                  );
                }

                return (
                  <>
                    {filteredRooms.map((room) => {
                      const typingUsers = roomTypingUsers[room.roomCode] || [];
                      const isTypingInRoom = typingUsers.length > 0;
                      const isFavorite = favoriteRoomCodes.includes(room.roomCode);
                      const roomUnreadCount = unreadMessages?.[room.roomCode] !== undefined ? unreadMessages[room.roomCode] : (room.unreadCount || 0);

                      return (
                        <div key={room.id} className={`flex items-center transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer max-[1280px]:!py-1.5 max-[1280px]:!px-2 max-[1024px]:!py-1 max-[1024px]:!px-1.5 ${currentRoomCode === room.roomCode ? 'bg-[#e7f3f0]' : ''}`} style={{ padding: '4px 12px', gap: '6px', minHeight: '40px' }} onClick={() => onRoomSelect && onRoomSelect(room)}>
                          <div className="relative flex-shrink-0 max-[1280px]:!w-8 max-[1280px]:!h-8 max-[1024px]:!w-7 max-[1024px]:!h-7" style={{ width: '32px', height: '32px' }}>
                            <div className="rounded-full overflow-hidden flex items-center justify-center text-white font-bold max-[1280px]:!text-sm max-[1024px]:!text-xs" style={{ width: '32px', height: '32px', border: '1.3px solid rgba(0, 0, 0, 0.1)', fontSize: '14px', backgroundColor: '#A50104' }}>
                              {room.description ? (
                                <img src={room.description} alt={room.name} className="w-full h-full object-cover" />
                              ) : (
                                "🏠"
                              )}
                            </div>
                            {room.isActive && <div className="absolute bottom-0 right-0 rounded-full bg-white flex items-center justify-center" style={{ width: '12px', height: '12px', border: '2px solid white' }}><div className="rounded-full bg-green-500" style={{ width: '8px', height: '8px' }} /></div>}
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col" style={{ gap: '2px', display: isCompact ? 'none' : 'flex' }}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isFavorite && <span className="flex-shrink-0 text-red-500 font-semibold flex items-center gap-1" style={{ fontSize: '9px', lineHeight: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}><PinIcon size={10} className="text-red-500" /> Fijado</span>}
                                <h3 className="font-semibold text-[#111] truncate flex-1" style={{ fontSize: '11.5px', lineHeight: '14px', fontWeight: 600 }}>{room.name}</h3>
                                {roomUnreadCount > 0 && <div className="flex-shrink-0 rounded-full bg-[#ff453a] text-white flex items-center justify-center ml-2" style={{ minWidth: '18px', height: '18px', fontSize: '10px', fontWeight: 'bold', padding: roomUnreadCount > 99 ? '0 4px' : '0' }}>{roomUnreadCount > 99 ? '99+' : roomUnreadCount}</div>}
                              </div>
                              <button onClick={(e) => handleToggleFavorite(room, e)} className="flex-shrink-0 p-1 hover:bg-gray-200 rounded-full transition-colors" style={{ color: isFavorite ? '#ff453a' : '#9ca3af', fontSize: '16px' }}>{isFavorite ? <FaStar /> : <FaRegStar />}</button>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              {isTypingInRoom ? (
                                <p className="text-green-600 italic truncate flex items-center gap-1" style={{ fontSize: '11px', lineHeight: '14px', fontWeight: 400 }}>{typingUsers.length === 1 ? `${typingUsers[0].nombre && typingUsers[0].apellido ? `${typingUsers[0].nombre} ${typingUsers[0].apellido}` : (typingUsers[0].nombre || typingUsers[0].username)} está escribiendo...` : `${typingUsers.length} personas están escribiendo...`}</p>
                              ) : (
                                <p className="text-gray-600 truncate" style={{ fontSize: '11px', lineHeight: '14px', fontWeight: 400 }}>{isAdmin ? <>Código: {room.roomCode}</> : null}</p>)}
                              {(room.lastMessageAt || room.updatedAt) && <span className="text-gray-400 flex-shrink-0" style={{ fontSize: '10px' }}>{new Date(room.lastMessageAt || room.updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </>
                );
              })()}
            </CollapsibleList>
          )}

          {/* 2. SECCIÓN DE ASIGNADOS */}
          {(searchFilter === 'select_option' || searchFilter === 'assigned') && (
            <CollapsibleList
              title="ASIGNADOS"
              icon={CommunityIcon}
              isOpen={showAssigned}
              onToggle={() => setShowAssigned(prev => !prev)}
              onLoadMore={() => {
                if (onLoadAssignedConversations && assignedPage < assignedTotalPages) {
                  onLoadAssignedConversations(assignedPage + 1);
                }
              }}
              hasMore={assignedPage < assignedTotalPages}
              isLoading={assignedLoading}
              defaultHeight={250}
            >
              {(() => {
                // 🔥 NUEVO: Si hay búsqueda activa con resultados de API, usar esos resultados
                const hasApiSearch = assignedSearchTerm.trim().length >= 2 && apiSearchResults.assigned.length > 0;

                // Mostrar indicador de búsqueda
                if (isApiSearching && assignedSearchTerm.trim().length >= 2) {
                  return (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-sm text-gray-500">Buscando chats asignados...</div>
                    </div>
                  );
                }

                // 🔥 NUEVO: Usar resultados de API si hay búsqueda, sino filtrar localmente
                let myConversations;
                if (hasApiSearch) {
                  myConversations = apiSearchResults.assigned.filter(conv => !favoriteConversationIds.includes(conv.id));
                } else {
                  myConversations = myAssignedConversations.filter(conv => !favoriteConversationIds.includes(conv.id)).filter(conv => {
                    if (!assignedSearchTerm.trim()) return true;
                    const searchLower = assignedSearchTerm.toLowerCase();
                    const participants = conv.participants || [];
                    return (conv.name?.toLowerCase().includes(searchLower) || participants.some(p => p?.toLowerCase().includes(searchLower)) || conv.lastMessage?.toLowerCase().includes(searchLower));
                  });
                }

                // Mostrar mensaje si no hay resultados de búsqueda
                if (hasApiSearch && myConversations.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-[40px] px-5 text-center">
                      <div className="text-3xl mb-2 opacity-50">🔍</div>
                      <div className="text-sm text-gray-600 font-medium">No se encontraron chats asignados para "{assignedSearchTerm}"</div>
                    </div>
                  );
                }

                const sortedConversations = myConversations.sort((a, b) => {
                  const aIsFavorite = favoriteConversationIds.includes(a.id);
                  const bIsFavorite = favoriteConversationIds.includes(b.id);
                  if (aIsFavorite && !bIsFavorite) return -1;
                  if (!aIsFavorite && bIsFavorite) return 1;
                  if (sortBy === 'newest') return new Date(b.lastMessage?.sentAt || b.lastMessageTime || b.createdAt) - new Date(a.lastMessage?.sentAt || a.lastMessageTime || a.createdAt);
                  else if (sortBy === 'oldest') return new Date(a.lastMessage?.sentAt || a.lastMessageTime || a.createdAt) - new Date(b.lastMessage?.sentAt || b.lastMessageTime || b.createdAt);
                  else if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
                  return 0;
                });

                return myConversations.length > 0 ? (
                  <>
                    {sortedConversations.map((conv) => {
                      const participants = conv.participants || [];
                      const participant1Name = participants[0] || 'Usuario 1';
                      const participant2Name = participants[1] || 'Usuario 2';
                      const currentUserFullName = user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : user?.username;
                      let displayName = conv.name;
                      let otherParticipantName = null;
                      const currentUserNormalized = currentUserFullName?.toLowerCase().trim();
                      const participant1Normalized = participant1Name?.toLowerCase().trim();
                      const participant2Normalized = participant2Name?.toLowerCase().trim();

                      if (currentUserNormalized === participant1Normalized) { displayName = participant2Name; otherParticipantName = participant2Name; }
                      else if (currentUserNormalized === participant2Normalized) { displayName = participant1Name; otherParticipantName = participant1Name; }
                      else if (!conv.name) { displayName = `${participant1Name} ↔️ ${participant2Name}`; }

                      let otherParticipantPicture = null;
                      let isOtherParticipantOnline = false;
                      if (otherParticipantName) {
                        const otherParticipantNormalized = otherParticipantName?.toLowerCase().trim();
                        const otherUser = userList.find(u => {
                          const fullName = u.nombre && u.apellido ? `${u.nombre} ${u.apellido}` : u.username;
                          return fullName?.toLowerCase().trim() === otherParticipantNormalized;
                        });
                        if (otherUser) {
                          otherParticipantPicture = otherUser.picture || null;
                          isOtherParticipantOnline = otherUser.isOnline === true;
                        } else {
                          const cachedUser = userCache[otherParticipantNormalized];
                          if (cachedUser) {
                            otherParticipantPicture = cachedUser.picture || null;
                            isOtherParticipantOnline = cachedUser.isOnline === true;
                          }
                        }
                      }
                      const getInitials = (name) => { const parts = name.split(' '); if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase(); return name[0]?.toUpperCase() || 'U'; };
                      const isFavorite = favoriteConversationIds.includes(conv.id);

                      const itemUnreadCount = unreadMessages?.[conv.id] !== undefined ? unreadMessages[conv.id] : (conv.unreadCount || 0);

                      return (
                        <div key={conv.id} className="flex transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer group overflow-visible relative max-[1280px]:!py-1.5 max-[1280px]:!px-2 max-[1024px]:!py-1 max-[1024px]:!px-1.5" style={{ padding: '4px 12px', gap: '6px', minHeight: '40px', display: 'flex', alignItems: 'flex-start', width: '100%', minWidth: 0, position: 'relative' }} onClick={() => { if (onUserSelect) onUserSelect(displayName, null, conv); }}>
                          <div className="relative flex-shrink-0 max-[1280px]:!w-9 max-[1280px]:!h-9 max-[1024px]:!w-8 max-[1024px]:!h-8" style={{ width: '32px', height: '32px' }}>
                            <div className="rounded-full overflow-hidden flex items-center justify-center text-white font-bold max-[1280px]:!text-sm max-[1024px]:!text-xs" style={{ width: '32px', height: '32px', fontSize: '14px', backgroundColor: '#A50104' }}>
                              {otherParticipantPicture ? <img src={otherParticipantPicture} alt={displayName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = getInitials(displayName); }} /> : getInitials(displayName)}
                            </div>
                            <div className="absolute bottom-0 right-0 rounded-full border-2 border-white" style={{ width: '12px', height: '12px', backgroundColor: isOtherParticipantOnline ? '#10b981' : '#9ca3af' }} title={isOtherParticipantOnline ? 'En línea' : 'Desconectado'} />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col" style={{ gap: '2px', display: isCompact ? 'none' : 'flex' }}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                {isFavorite && <span className="flex-shrink-0 text-red-500 font-semibold flex items-center gap-1" style={{ fontSize: '9px' }}><PinIcon size={10} className="text-red-500" /> Fijado</span>}
                                <h3 className="font-semibold text-[#111] truncate flex-1" style={{ fontSize: '11.5px', fontWeight: 600 }}>{displayName}</h3>
                                {itemUnreadCount > 0 && <div className="flex-shrink-0 rounded-full bg-[#ff453a] text-white flex items-center justify-center ml-2" style={{ minWidth: '18px', height: '18px', fontSize: '10px', fontWeight: 'bold' }}>{itemUnreadCount > 99 ? '99+' : itemUnreadCount}</div>}
                              </div>
                              <button onClick={(e) => handleToggleConversationFavorite(conv, e)} className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 transition-all duration-200" style={{ color: isFavorite ? '#ff453a' : '#9ca3af' }}>{isFavorite ? <FaStar size={14} /> : <FaRegStar size={14} />}</button>
                            </div>
                            <div className="flex items-center justify-end mt-0.5">
                              {(conv.lastMessage?.sentAt || conv.updatedAt) && (
                                <span className="text-gray-400" style={{ fontSize: '10px' }}>
                                  {new Date(conv.lastMessage?.sentAt || conv.updatedAt).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}
                                </span>
                              )}
                            </div>
                          </div>

                        </div>
                      );
                    })}
                  </>
                ) : (<div className="flex flex-col items-center justify-center py-[60px] px-5 text-center"><div className="text-5xl mb-4 opacity-50">👁️</div><div className="text-sm text-gray-600 font-medium">{assignedSearchTerm ? `No se encontraron resultados para "${assignedSearchTerm}"` : 'No hay chats asignados'}</div></div>);
              })()}
            </CollapsibleList>
          )}

          {/* 3. SECCIÓN DE MENSAJES */}
          {searchFilter === 'messages' && (
            <CollapsibleList
              title="MENSAJES"
              icon={MessageSquare}
              isOpen={true}
              onToggle={() => { }}
              defaultHeight={400}
            >
              {(() => {
                if (isApiSearching) {
                  return (
                    <div className="flex items-center justify-center py-4">
                      <div className="text-sm text-gray-500">Buscando mensajes...</div>
                    </div>
                  );
                }

                if (messageSearchResults.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-[40px] px-5 text-center">
                      <div className="text-3xl mb-2 opacity-50">💬</div>
                      <div className="text-sm text-gray-600 font-medium">No se encontraron mensajes para "{assignedSearchTerm}"</div>
                    </div>
                  );
                }

                return messageSearchResults.map((msg) => (
                  <div
                    key={msg.id}
                    className="flex flex-col transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer border-b border-gray-100 pb-2"
                    style={{ padding: '8px 12px' }}
                    onClick={() => {
                      if (onRoomSelect) {
                        // Intentar construir el objeto room lo mejor posible
                        // El backend debe devolver isGroup, roomCode, roomName, to, etc.
                        const isGroup = msg.isGroup || !!msg.roomCode;
                        const roomName = msg.roomName || (isGroup ? msg.roomCode : (msg.senderName || 'Chat'));

                        onRoomSelect({
                          roomCode: msg.roomCode,
                          name: roomName,
                          isGroup: isGroup
                        }, msg.id);
                      }
                    }}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-semibold text-xs text-gray-800">{msg.roomName || (msg.isGroup ? 'Grupo' : 'Chat')}</span>
                      <span className="text-[10px] text-gray-400">{new Date(msg.createdAt || msg.sentAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2" style={{ fontSize: '11px' }}>
                      <span className="font-bold text-gray-700 mr-1">{msg.senderName}:</span>
                      {msg.content || msg.message}
                    </div>
                  </div>
                ));
              })()}
            </CollapsibleList>
          )}

        </div >
      )}

      {/* =========================================================================
         MÓDULO: MONITOREO (Solo para ADMIN)
         ========================================================================= */}
      {activeModule === 'monitoring' && canViewMonitoring && (
        <div className="flex-1 overflow-y-auto bg-white px-4 w-full min-w-0">
          {assignedSearchTerm.trim() && messageSearchResults.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-gray-500 font-semibold mb-2 px-2" style={{}}>📝 Mensajes encontrados ({messageSearchResults.length})</div>
              {messageSearchResults.map((msg) => {
                const isGroupMsg = msg.isGroup;
                const conversationName = isGroupMsg ? msg.roomCode : msg.to;
                const messagePreview = msg.message || (msg.fileName ? `📎 ${msg.fileName}` : 'Archivo');
                return (
                  <div key={msg.id} className="flex items-start gap-3 p-3 mb-2 bg-red-50 border border-red-200 rounded-lg cursor-pointer hover:bg-red-100 transition-colors" onClick={() => { if (isGroupMsg) { const room = myActiveRooms?.find(r => r.roomCode === msg.roomCode); if (room && onRoomSelect) onRoomSelect(room, msg.id); } else { onUserSelect(msg.to, null, msg.id); } }}>
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-200 flex items-center justify-center text-lg">{isGroupMsg ? '👥' : '💬'}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1"><span className="font-semibold text-sm text-gray-800" style={{}}>{conversationName}</span><span className="text-xs text-gray-500">{isGroupMsg ? 'Grupo' : 'Chat'}</span></div>
                      <p className="text-xs text-gray-700 truncate" style={{}}>{messagePreview}</p>
                      <p className="text-xs text-gray-500 mt-1">{new Date(msg.sentAt).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-gray-200 my-3"></div>
            </div>
          )}
          {isSearching && <div className="flex items-center justify-center py-8"><div className="text-sm text-gray-500">Buscando mensajes...</div></div>}
          {(() => {
            const filteredMonitoring = monitoringConversations.filter(conv => {
              if (!assignedSearchTerm.trim()) return true;
              const searchLower = assignedSearchTerm.toLowerCase();
              const participants = conv.participants || [];
              return (conv.name?.toLowerCase().includes(searchLower) || participants.some(p => p?.toLowerCase().includes(searchLower)) || conv.lastMessage?.toLowerCase().includes(searchLower));
            });
            return filteredMonitoring.length > 0 ? (
              <>
                {filteredMonitoring.sort((a, b) => {
                  const aIsFavorite = favoriteConversationIds.includes(a.id);
                  const bIsFavorite = favoriteConversationIds.includes(b.id);
                  if (aIsFavorite && !bIsFavorite) return -1;
                  if (!aIsFavorite && bIsFavorite) return 1;
                  if (sortBy === 'newest') return new Date(b.lastMessageTime || b.createdAt) - new Date(a.lastMessageTime || a.createdAt);
                  else if (sortBy === 'oldest') return new Date(a.lastMessageTime || a.createdAt) - new Date(b.lastMessageTime || b.createdAt);
                  else if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
                  return 0;
                }).map((conv) => {
                  const participants = conv.participants || [];
                  const participant1Name = participants[0] || 'Usuario 1';
                  const participant2Name = participants[1] || 'Usuario 2';
                  const getInitials = (name) => { const parts = name.split(' '); if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase(); return name[0]?.toUpperCase() || 'U'; };
                  const isFavorite = favoriteConversationIds.includes(conv.id);
                  return (
                    <div key={conv.id} className="flex transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer group relative" style={{ padding: '4px 12px', gap: '6px', minHeight: '40px', display: 'flex', alignItems: 'flex-start', width: '100%', minWidth: 0, position: 'relative' }} onClick={() => { if (onUserSelect) { const adminFullName = user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : user?.username; const otherParticipant = participants.find(p => p.toLowerCase().trim() !== adminFullName?.toLowerCase().trim()) || participant2Name; onUserSelect(otherParticipant, null, conv); } }}>
                      <div className="relative flex-shrink-0 cursor-pointer group" style={{ width: '32px', height: '32px' }} title={`${participant1Name} ↔️ ${participant2Name}`}>
                        <div className="relative" style={{ width: '32px', height: '32px' }}>
                          <div className="absolute rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold hover:ring-2 hover:ring-purple-400 transition-all" style={{ width: '20px', height: '20px', border: '1.3px solid rgba(0, 0, 0, 0.1)', fontSize: '9px', top: '0', left: '0', zIndex: 2, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); if (onUserSelect) onUserSelect(participant1Name, null, { ...conv, selectedParticipant: participant1Name }); }}>{getInitials(participant1Name)}</div>
                          <div className="absolute rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center text-white font-bold hover:ring-2 hover:ring-pink-400 transition-all" style={{ width: '20px', height: '20px', border: '1.3px solid rgba(0, 0, 0, 0.1)', fontSize: '9px', bottom: '0', right: '0', zIndex: 1, cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); if (onUserSelect) onUserSelect(participant2Name, null, { ...conv, selectedParticipant: participant2Name }); }}>{getInitials(participant2Name)}</div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col relative" style={{ gap: '2px', position: 'relative' }}>
                        <div className="flex items-start justify-between gap-2 w-full min-w-0 relative" style={{ position: 'relative' }}>
                          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                            {isFavorite && <span className="flex-shrink-0 text-red-500 font-semibold flex items-center gap-1" style={{ fontSize: '9px', lineHeight: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}><PinIcon size={10} className="text-red-500" /> Fijado</span>}
                            <div className="flex items-center gap-1 w-full min-w-0">
                              <div className="flex-1 min-w-0"><p className="font-semibold text-[#111]" style={{ fontSize: '11.5px', lineHeight: '14px', fontWeight: 600, width: '100%', minWidth: 0, maxWidth: '100%', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }} title={`${participant1Name} • ${participant2Name}`}>{participant1Name} • {participant2Name}</p></div>
                              <button onClick={(e) => handleToggleConversationFavorite(conv, e)} className="flex-shrink-0 p-0.5 rounded-full hover:bg-gray-200 transition-all duration-200 opacity-0 group-hover:opacity-100" style={{ opacity: isFavorite ? 1 : undefined, width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}>{isFavorite ? <FaStar className="text-red-500" size={10} /> : <FaRegStar className="text-gray-400" size={10} />}</button>
                            </div>
                          </div>
                          {conv.lastMessageTimestamp && <span className="conversation-timestamp" style={{ fontSize: '10px' }}>{conv.lastMessageTimestamp}</span>}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            {conv.lastMessage ? (
                              <>
                                {conv.lastMessageFrom && <span className="text-gray-500 font-medium" style={{ fontSize: '11px', lineHeight: '14px', fontWeight: 500 }}>{conv.lastMessageFrom.split(' ')[0]}:{' '}</span>}
                                <p className="text-gray-600" style={{ fontSize: '11px', lineHeight: '14px', fontWeight: 400, display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{conv.lastMessageMediaType ? <span className="flex items-center gap-1">{conv.lastMessageMediaType === 'image' && '📷 Imagen'}{conv.lastMessageMediaType === 'video' && '🎥 Video'}{conv.lastMessageMediaType === 'audio' && '🎵 Audio'}{conv.lastMessageMediaType === 'document' && '📄 Documento'}{!['image', 'video', 'audio', 'document'].includes(conv.lastMessageMediaType) && '📎 Archivo'}</span> : conv.lastMessageThreadCount > 0 ? <span className="flex items-center gap-1"><span className="text-gray-500">🧵</span><span className="font-semibold text-[ff453a]">{conv.lastMessageThreadCount} {conv.lastMessageThreadCount === 1 ? 'respuesta' : 'respuestas'}</span>{conv.lastMessageLastReplyFrom && <span className="text-gray-500"> • {conv.lastMessageLastReplyFrom}</span>}</span> : conv.lastMessage}</p>
                              </>
                            ) : <p className="text-gray-400 italic truncate" style={{ fontSize: '11px', lineHeight: '14px', fontWeight: 400 }}>Sin mensajes aún</p>}
                          </div>
                          {hasMentionToUser(conv.lastMessage) && <span aria-hidden="true" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: '4px' }}><svg viewBox="0 0 24 24" height="16" preserveAspectRatio="xMidYMid meet" fill="none"><path d="M12 21C10.75 21 9.6 20.75 8.5 20.3C7.4 19.8 6.5 19.2 5.6 18.4C4.8 17.5 4.2 16.6 3.7 15.5C3.2 14.4 3 13.2 3 12C3 10.7 3.2 9.6 3.7 8.5C4.2 7.4 4.8 6.5 5.6 5.6C6.5 4.8 7.4 4.2 8.5 3.7C9.6 3.2 10.8 3 12 3C13.2 3 14.4 3.2 15.5 3.7C16.6 4.2 17.5 4.8 18.4 5.6C19.2 6.5 19.8 7.4 20.3 8.5C20.8 9.6 21 10.7 21 12V13.3C21 14.2 20.7 14.9 20 15.5C19.4 16.2 18.6 16.5 17.7 16.5C17.2 16.5 16.7 16.3 16.3 16.1C15.8 15.8 15.4 15.5 15.1 15C14.8 15.5 14.3 15.8 13.7 16.1C13.2 16.3 12.6 16.5 12 16.5C10.8 16.5 9.7 16 8.8 15.2C7.9 14.3 7.5 13.2 7.5 12C7.5 10.7 7.9 9.7 8.8 8.8C9.7 7.9 10.8 7.5 12 7.5C13.2 7.5 14.3 7.9 15.2 8.8C16 9.7 16.5 10.8 16.5 12V13.2C16.5 13.6 16.6 13.9 16.8 14.1C17.1 14.4 17.4 14.5 17.7 14.5C18.1 14.5 18.4 14.4 18.6 14.1C18.9 13.9 19 13.6 19 13.2V12C19 10 18.3 8.4 16.9 7C15.6 5.7 13.9 5 12 5C10 5 8.4 5.7 7 7C5.7 8.4 5 10 5 12C5 13.9 5.7 15.6 7 16.9C8.4 18.3 10 19 12 19H15.3C15.6 19 15.8 19.1 16 19.3C16.2 19.5 16.3 19.7 16.3 20C16.3 20.3 16.2 20.5 16 20.7C15.8 20.9 15.6 21 15.3 21H12ZM12 14.5C12.7 14.5 13.3 14.2 13.8 13.8C14.2 13.3 14.5 12.7 14.5 12C14.5 11.3 14.2 10.7 13.8 10.2C13.3 9.8 12.7 9.5 12 9.5C11.3 9.5 10.7 9.8 10.2 10.2C9.8 10.7 9.5 11.3 9.5 12C9.5 12.7 9.8 13.3 10.2 13.8C10.7 14.2 11.3 14.5 12 14.5Z" fill="currentColor" style={{ color: 'ff453a' }}></path></svg></span>}
                          {conv.unreadCount > 0 && <div className="flex-shrink-0 rounded-full bg-[#ff453a] text-white flex items-center justify-center" style={{ minWidth: '18px', height: '18px', padding: '0 5px', fontSize: '10px', fontWeight: 600 }}>{conv.unreadCount > 99 ? '99+' : conv.unreadCount}</div>}
                        </div>
                      </div>
                    </div>
                  );
                })}
                {monitoringTotalPages > 1 && (
                  <div className="flex items-center justify-between gap-3 py-4 px-4 border-t border-gray-200" style={{}}>
                    <button onClick={() => onLoadMonitoringConversations(monitoringPage - 1)} disabled={monitoringPage === 1 || monitoringLoading} className="flex-1 px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200" style={{ color: monitoringPage === 1 || monitoringLoading ? '#9ca3af' : '#111', fontWeight: 600 }}>← Anterior</button>
                    <span className="text-xs text-gray-600 font-medium whitespace-nowrap" style={{ fontWeight: 500 }}>{monitoringPage} / {monitoringTotalPages}</span>
                    <button onClick={() => onLoadMonitoringConversations(monitoringPage + 1)} disabled={monitoringPage === monitoringTotalPages || monitoringLoading} className="flex-1 px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200" style={{ color: monitoringPage === monitoringTotalPages || monitoringLoading ? '#9ca3af' : '#111', fontWeight: 600 }}>Siguiente →</button>
                  </div>
                )}
              </>
            ) : (<div className="flex flex-col items-center justify-center py-[60px] px-5 text-center"><div className="text-5xl mb-4 opacity-50">👁️</div><div className="text-sm text-gray-600 font-medium">{assignedSearchTerm ? `No se encontraron resultados para "${assignedSearchTerm}"` : 'No hay chats para monitorear'}</div></div>);
          })()}
        </div >
      )}

    </div>
  );
};

export default ConversationList;