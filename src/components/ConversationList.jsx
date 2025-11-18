import { useState, useRef, useCallback, useEffect } from 'react';
import { FaTimes, FaBars, FaSignInAlt, FaStar, FaRegStar, FaChevronDown, FaChevronRight } from 'react-icons/fa';
import { MessageSquare, Home, Users } from 'lucide-react';
import clsx from 'clsx';
import apiService from '../apiService';
import './ConversationList.css';

// Componente SVG personalizado para el ícono de comunidad (Asignados)
const CommunityIcon = ({ size = 16, className, style, strokeWidth, ...props }) => (
  <svg
    viewBox="0 0 30 30"
    height={size}
    width={size}
    preserveAspectRatio="xMidYMid meet"
    fill="none"
    className={className}
    style={{ minWidth: `${size}px`, flexShrink: 0, ...style }}
  >
    <path d="M7.85445 17.0075C7.73851 17.0026 7.62033 17 7.50003 17C6.60797 17 5.83268 17.1426 5.22106 17.3148C4.69554 17.4627 4.0988 17.7054 3.5974 18.0919C3.08634 18.4858 2.62143 19.0755 2.52966 19.8877C2.48679 20.2672 2.50003 21.0796 2.51038 21.5399C2.52882 22.3601 3.20095 23 4.00656 23H7.35217C7.15258 22.5784 7.03459 22.1084 7.01993 21.6087C7.01572 21.4651 7.00943 21.25 7.00505 21H4.50165C4.49773 20.6191 4.50034 20.2599 4.51702 20.1123C4.5308 19.9903 4.59776 19.846 4.81844 19.6759C5.04878 19.4983 5.38363 19.3468 5.7631 19.2399C6.12883 19.137 6.57191 19.0478 7.07407 19.0142C7.12499 18.6798 7.20695 18.3652 7.31207 18.0721C7.45559 17.6719 7.64219 17.3186 7.85445 17.0075Z" fill="currentColor" />
    <path d="M24.6478 23H27.9935C28.7991 23 29.4712 22.3601 29.4897 21.5399C29.5 21.0796 29.5133 20.2672 29.4704 19.8877C29.3786 19.0755 28.9137 18.4858 28.4027 18.0919C27.9013 17.7054 27.3045 17.4627 26.779 17.3148C26.1674 17.1426 25.3921 17 24.5 17C24.3797 17 24.2615 17.0026 24.1456 17.0075C24.3578 17.3186 24.5444 17.6719 24.6879 18.0721C24.793 18.3652 24.875 18.6798 24.9259 19.0142C25.4281 19.0478 25.8712 19.1369 26.237 19.2399C26.6164 19.3468 26.9513 19.4983 27.1816 19.6759C27.4023 19.846 27.4693 19.9903 27.483 20.1123C27.4997 20.2599 27.5023 20.6191 27.4984 21H24.9949C24.9906 21.25 24.9843 21.4651 24.9801 21.6087C24.9654 22.1084 24.8474 22.5784 24.6478 23Z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M16 18C14.6099 18 13.4517 18.2363 12.6506 18.4683C12.2195 18.5931 11.8437 18.7329 11.5552 18.9105C11.275 19.0829 11.1382 19.2525 11.0772 19.4224C11.0547 19.4853 11.0366 19.5555 11.0259 19.6343C10.9955 19.8585 10.996 20.4459 11.0064 21H20.9936C21.004 20.4459 21.0045 19.8585 20.9741 19.6343C20.9634 19.5555 20.9453 19.4853 20.9228 19.4224C20.8618 19.2525 20.725 19.0829 20.4448 18.9105C20.1563 18.7329 19.7805 18.5931 19.3494 18.4683C18.5483 18.2363 17.3901 18 16 18ZM12.0944 16.5472C13.0378 16.274 14.3855 16 16 16C17.6145 16 18.9622 16.274 19.9056 16.5472C20.392 16.688 20.9732 16.8873 21.493 17.2071C22.0211 17.532 22.5438 18.0181 22.8053 18.7473C22.8735 18.9373 22.9259 19.1436 22.956 19.3657C23.0234 19.8633 22.9976 20.9826 22.9809 21.5501C22.957 22.3659 22.287 23 21.4851 23H10.5149C9.71301 23 9.043 22.3659 9.01907 21.5501C9.00243 20.9826 8.97657 19.8633 9.04404 19.3657C9.07414 19.1436 9.1265 18.9373 9.19466 18.7473C9.45616 18.0181 9.97894 17.532 10.507 17.2071C11.0268 16.8873 11.608 16.688 12.0944 16.5472Z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M24.5 12C23.9477 12 23.5 12.4477 23.5 13C23.5 13.5523 23.9477 14 24.5 14C25.0523 14 25.5 13.5523 25.5 13C25.5 12.4477 25.0523 12 24.5 12ZM21.5 13C21.5 11.3431 22.8431 10 24.5 10C26.1569 10 27.5 11.3431 27.5 13C27.5 14.6569 26.1569 16 24.5 16C22.8431 16 21.5 14.6569 21.5 13Z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M16 9C14.8954 9 14 9.89543 14 11C14 12.1046 14.8954 13 16 13C17.1046 13 18 12.1046 18 11C18 9.89543 17.1046 9 16 9ZM12 11C12 8.79086 13.7909 7 16 7C18.2091 7 20 8.79086 20 11C20 13.2091 18.2091 15 16 15C13.7909 15 12 13.2091 12 11Z" fill="currentColor" />
    <path fillRule="evenodd" clipRule="evenodd" d="M7.5 12C6.94772 12 6.5 12.4477 6.5 13C6.5 13.5523 6.94772 14 7.5 14C8.05228 14 8.5 13.5523 8.5 13C8.5 12.4477 8.05228 12 7.5 12ZM4.5 13C4.5 11.3431 5.84315 10 7.5 10C9.15685 10 10.5 11.3431 10.5 13C10.5 14.6569 9.15685 16 7.5 16C5.84315 16 4.5 14.6569 4.5 13Z" fill="currentColor" />
  </svg>
);

// Componente SVG personalizado para el ícono de pin (Fijado)
const PinIcon = ({ size = 14, className, style }) => (
  <svg
    viewBox="0 0 20 20"
    height={size}
    width={size}
    preserveAspectRatio="xMidYMid meet"
    fill="none"
    className={className}
    style={{ flexShrink: 0, ...style }}
  >
    <path d="M13.5 4.5V11L15.2708 12.7708C15.3403 12.8403 15.3958 12.9201 15.4375 13.0104C15.4792 13.1007 15.5 13.2014 15.5 13.3125V13.746C15.5 13.9597 15.4281 14.1388 15.2844 14.2833C15.1406 14.4278 14.9625 14.5 14.75 14.5H10.75V19.125C10.75 19.3375 10.6785 19.5156 10.5356 19.6594C10.3927 19.8031 10.2156 19.875 10.0044 19.875C9.79313 19.875 9.61458 19.8031 9.46875 19.6594C9.32292 19.5156 9.25 19.3375 9.25 19.125V14.5H5.25C5.0375 14.5 4.85938 14.4278 4.71563 14.2833C4.57188 14.1388 4.5 13.9597 4.5 13.746V13.3125C4.5 13.2014 4.52083 13.1007 4.5625 13.0104C4.60417 12.9201 4.65972 12.8403 4.72917 12.7708L6.5 11V4.5H6.25C6.0375 4.5 5.85938 4.42854 5.71563 4.28563C5.57188 4.14271 5.5 3.96563 5.5 3.75438C5.5 3.54313 5.57188 3.36458 5.71563 3.21875C5.85938 3.07292 6.0375 3 6.25 3H13.75C13.9625 3 14.1406 3.07146 14.2844 3.21437C14.4281 3.35729 14.5 3.53437 14.5 3.74562C14.5 3.95687 14.4281 4.13542 14.2844 4.28125C14.1406 4.42708 13.9625 4.5 13.75 4.5H13.5ZM6.625 13H13.375L12 11.625V4.5H8V11.625L6.625 13Z" fill="currentColor" />
  </svg>
);

// Componente reutilizable para cada pestaña (botón) - Estilo igual al LeftSidebar pero responsive
const TabButton = ({ isActive, onClick, label, shortLabel, icon: Icon, notificationCount }) => {
  return (
<button
      onClick={onClick}
      className={clsx(
        // Clases base - Mismo estilo que left-sidebar-button
        'relative flex items-center justify-center border-none cursor-pointer transition-all duration-200 whitespace-nowrap flex-shrink-0',
        // Clases condicionales
        {
          'bg-red-600 text-white font-semibold shadow-lg': isActive,
          'bg-white/90 text-gray-700 hover:bg-gray-100 hover:shadow-lg hover:scale-[1.02] font-medium': !isActive,
        },
        // Responsive
        'max-[768px]:flex-1 max-[1280px]:!w-10 max-[1280px]:!h-10 max-[1280px]:!p-2'
      )}
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        borderRadius: '10px',
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        height: '40px',
        padding: '8px 12px',
        gap: '8px',
        minWidth: 'fit-content'
      }}
    >
      {/* El componente Icono se pasa como prop */}
      <Icon
        size={16}
        strokeWidth={2}
        className="flex-shrink-0"
        style={{ minWidth: '16px' }}
      />
      {/* Texto del label */}
      <span
        className="font-medium whitespace-nowrap max-[1280px]:hidden"
        style={{
          fontSize: '13px',
          lineHeight: '100%',
          fontWeight: 500
        }}
      >
        {label}
      </span>

      {/* Badge de notificaciones */}
      {notificationCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white shadow-md ring-2 ring-white">
          {notificationCount}
        </span>
      )}
    </button>
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
  myActiveRooms,
  currentRoomCode,
  isGroup,
  onUserSelect,
  onRoomSelect,
  unreadMessages,
  onToggleSidebar,
  onShowJoinRoom,
  userListHasMore,
  userListLoading,
  onLoadMoreUsers,
  roomTypingUsers = {} // Nuevo prop: objeto con roomCode como key y array de usuarios escribiendo
}) => {
  // 🔥 Módulo activo por defecto: 'chats' (Asignados + Grupos fusionados)
  const [activeModule, setActiveModule] = useState('chats');
  const [searchTerm, setSearchTerm] = useState('');
  const [assignedSearchTerm, setAssignedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isSearching, setIsSearching] = useState(false);
  const conversationsListRef = useRef(null);
  const [favoriteRoomCodes, setFavoriteRoomCodes] = useState([]); // Códigos de salas favoritas
  const [favoriteConversationIds, setFavoriteConversationIds] = useState([]); // IDs de conversaciones favoritas
  const [userCache, setUserCache] = useState({}); // Cache de información de usuarios (incluyendo desconectados)
  const [messageSearchResults, setMessageSearchResults] = useState([]); // Resultados de búsqueda de mensajes
  const [showGroups, setShowGroups] = useState(true);
  const [showAssigned, setShowAssigned] = useState(true);
  const searchTimeoutRef = useRef(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'JEFEPISO';

  // Obtener el displayName del usuario
  const getDisplayName = () => {
    if (!user) return '';
    return user.nombre && user.apellido
      ? `${user.nombre} ${user.apellido}`
      : user.username;
  };

  // Función auxiliar para detectar menciones (más flexible)
  const hasMentionToUser = useCallback((messageText) => {
    if (!messageText) return false;
    const currentUserName = getDisplayName();
    if (!currentUserName) return false;

    // Buscar menciones con @ seguido del nombre del usuario
    // Usar regex para capturar menciones completas
    const mentionRegex = /@([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?=\s{2,}|$|[.,!?;:]|\n)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(messageText)) !== null) {
      mentions.push(match[1].trim().toUpperCase());
    }

    // Verificar si alguna mención coincide con el nombre del usuario (case-insensitive)
    const userNameUpper = currentUserName.toUpperCase();
    return mentions.some(mention =>
      userNameUpper.includes(mention) || mention.includes(userNameUpper)
    );
  }, [user]);

  // Actualizar cache de usuarios cuando cambie la lista
  useEffect(() => {
    setUserCache(prevCache => {
      const newCache = { ...prevCache };

      // Primero, marcar todos los usuarios del cache como offline
      Object.keys(newCache).forEach(key => {
        newCache[key].isOnline = false;
      });

      // Luego, actualizar con los usuarios de la lista (pueden estar online u offline)
      if (userList && userList.length > 0) {
        userList.forEach(u => {
          const fullName = u.nombre && u.apellido
            ? `${u.nombre} ${u.apellido}`
            : u.username;
          const key = fullName?.toLowerCase().trim();
          if (key) {
            newCache[key] = {
              picture: u.picture,
              username: u.username,
              nombre: u.nombre,
              apellido: u.apellido,
              isOnline: u.isOnline !== undefined ? u.isOnline : false // 🔥 Por defecto offline, no online
            };
          }
        });
      }

      return newCache;
    });
  }, [userList]);

  // Cargar favoritos al montar el componente
  useEffect(() => {
    let isMounted = true;

    const loadFavorites = async () => {
      const displayName = getDisplayName();
      if (!displayName || !isMounted) return;

      try {
        // Cargar favoritos de salas
        const roomCodes = await apiService.getUserFavoriteRoomCodes(displayName);
        if (isMounted) {
          setFavoriteRoomCodes(roomCodes);
        }

        // Cargar favoritos de conversaciones
        const conversationIds = await apiService.getUserFavoriteConversationIds(displayName);
        if (isMounted) {
          setFavoriteConversationIds(conversationIds);
        }
      } catch (error) {
        console.error('Error al cargar favoritos:', error);
      }
    };

    loadFavorites();

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Función para alternar favorito de sala
  const handleToggleFavorite = async (room, e) => {
    e.stopPropagation(); // Evitar que se seleccione la sala al hacer click en la estrella

    const displayName = getDisplayName();
    if (!displayName) return;

    try {
      const result = await apiService.toggleRoomFavorite(displayName, room.roomCode, room.id);

      // Actualizar la lista de favoritos
      if (result.isFavorite) {
        setFavoriteRoomCodes(prev => [...prev, room.roomCode]);
      } else {
        setFavoriteRoomCodes(prev => prev.filter(code => code !== room.roomCode));
      }
    } catch (error) {
      console.error('Error al alternar favorito:', error);
    }
  };

  // Función para alternar favorito de conversación asignada
  const handleToggleConversationFavorite = async (conversation, e) => {
    e.stopPropagation(); // Evitar que se seleccione la conversación al hacer click en la estrella

    const displayName = getDisplayName();
    if (!displayName) return;

    try {
      const result = await apiService.toggleConversationFavorite(displayName, conversation.id);

      // Actualizar la lista de favoritos
      if (result.isFavorite) {
        setFavoriteConversationIds(prev => [...prev, conversation.id]);
      } else {
        setFavoriteConversationIds(prev => prev.filter(id => id !== conversation.id));
      }
    } catch (error) {
      console.error('Error al alternar favorito de conversación:', error);
    }
  };

  // Manejar scroll infinito para cargar más usuarios
  const handleScroll = useCallback((e) => {
    if (!onLoadMoreUsers || !userListHasMore || userListLoading) return;

    const { scrollTop, scrollHeight, clientHeight } = e.target;
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;

    // Cargar más cuando llegue al 80% del scroll
    if (scrollPercentage > 0.8) {
      // console.log('📄 Cargando más usuarios...');
      onLoadMoreUsers();
    }
  }, [onLoadMoreUsers, userListHasMore, userListLoading]);

  // Función para buscar mensajes por contenido
  const handleMessageSearch = useCallback(async (searchValue) => {
    console.log('🔍 handleMessageSearch llamado con:', searchValue);

    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Si no hay búsqueda, limpiar resultados
    if (!searchValue || searchValue.trim().length === 0) {
      setMessageSearchResults([]);
      setIsSearching(false);
      return;
    }

    // Obtener userId del usuario actual
    const userId = user?.id;
    console.log('👤 User ID actual:', userId);

    if (!userId) {
      console.error('No se pudo obtener el ID del usuario');
      return;
    }

    // Esperar 500ms antes de buscar (debounce)
    searchTimeoutRef.current = setTimeout(async () => {
      console.log('⏱️ Ejecutando búsqueda después del debounce...');
      setIsSearching(true);
      try {
        const results = await apiService.searchMessagesByUserId(userId, searchValue);
        console.log('📝 Resultados de búsqueda:', results);
        setMessageSearchResults(results || []);
      } catch (error) {
        console.error('Error al buscar mensajes:', error);
        setMessageSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 500);
  }, [user]);

  // Limpiar timeout al desmontar el componente
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Filtrar conversaciones según búsqueda
  const filteredConversations = userList?.filter(conversation => {
    if (!searchTerm.trim()) return true;
    const searchLower = searchTerm.toLowerCase();
    const displayName = conversation.nombre && conversation.apellido
      ? `${conversation.nombre} ${conversation.apellido}`
      : conversation.username;
    return (
      conversation.username?.toLowerCase().includes(searchLower) ||
      displayName?.toLowerCase().includes(searchLower) ||
      conversation.lastMessage?.toLowerCase().includes(searchLower)
    );
  }) || [];

  // Filtrar conversaciones asignadas
  const filteredAssigned = assignedConversations.filter(conv => {
    if (!assignedSearchTerm.trim()) return true;
    const searchLower = assignedSearchTerm.toLowerCase();
    const participants = conv.participants || [];
    return (
      conv.name?.toLowerCase().includes(searchLower) ||
      participants.some(p => p?.toLowerCase().includes(searchLower)) ||
      conv.lastMessage?.toLowerCase().includes(searchLower)
    );
  });

  // Filtrar conversaciones asignadas donde el usuario es participante
  const myAssignedConversations = assignedConversations.filter(conv => {
    const displayName = getDisplayName();
    return conv.participants?.includes(displayName);
  });

  // 🔥 NOTA: monitoringConversations ahora viene como prop desde ChatPage (con paginación)

  // Contar solo conversaciones NO LEÍDAS para cada módulo
  const unreadAssignedCount = myAssignedConversations.filter(conv => conv.unreadCount > 0).length;
  const unreadMonitoringCount = monitoringConversations.filter(conv => conv.unreadCount > 0).length;
  const unreadRoomsCount = myActiveRooms?.filter(room => {
    // Contar mensajes no leídos en salas
    const roomUnread = unreadMessages?.[room.roomCode] || 0;
    return roomUnread > 0;
  }).length || 0;

  // Definimos las pestañas como un array de objetos
  // 🔥 Para ADMIN: Chats (Asignados + Grupos), Monitoreo
  // 🔥 Para usuarios normales: Chats (Asignados + Grupos)
  // 🔥 CONTADOR: Solo muestra conversaciones/grupos NO LEÍDOS
  const tabs = isAdmin ? [
    {
      id: 'chats',
      label: 'Chats',
      shortLabel: 'Chats',
      icon: Home,
      notificationCount: unreadAssignedCount + unreadRoomsCount, // Suma de asignados + grupos
      adminOnly: false,
    },
    {
      id: 'monitoring',
      label: 'Monitoreo',
      shortLabel: 'Monitoreo',
      icon: MessageSquare,
      notificationCount: unreadMonitoringCount, // Solo no leídos
      adminOnly: true,
    },
  ] : [
    {
      id: 'chats',
      label: 'Chats',
      shortLabel: 'Chats',
      icon: Home,
      notificationCount: unreadAssignedCount + unreadRoomsCount, // Suma de asignados + grupos
      adminOnly: false,
    },
  ];

  return (
    <div
      className="flex flex-col bg-white max-[768px]:w-full max-[768px]:flex-1 conversation-list-responsive"
      style={{
        borderRight: '1.3px solid #EEEEEE'
      }}
    >
      {/* Botón de menú hamburguesa para mobile - solo visible en mobile */}
      <div className="hidden max-[768px]:flex items-center justify-between bg-white px-3 py-2 border-b border-gray-200">
        <button
          onClick={onToggleSidebar}
          className="flex items-center justify-center w-10 h-10 bg-[#13467A] text-white rounded-lg hover:bg-[#0f3660] transition-all duration-200 active:scale-95"
          title="Ver módulos"
        >
          <FaBars className="text-lg" />
        </button>
        <span className="text-sm font-semibold text-gray-700">Chats</span>
        <div className="w-10"></div> {/* Spacer para centrar el título */}
      </div>

      {/* Pestañas de módulos - Estilo similar a LeftSidebar */}
      <div
        className="tabs-container bg-white flex-nowrap overflow-x-auto scrollbar-hide"
        style={{
          paddingLeft: '16px',
          paddingRight: '16px',
          paddingTop: '12px',
          paddingBottom: '6px',
          marginTop: '6px'
        }}
      >
        {tabs
          // Filtramos las pestañas según permisos y condiciones
          .filter(tab => {
            // Si es solo para admins, verificar que sea admin
            if (tab.adminOnly && !isAdmin) return false;

            // Si solo se muestra cuando hay conversaciones, verificar que haya conversaciones
            if (tab.showOnlyIfHasConversations && assignedConversations?.length === 0 && !isAdmin) return false;

            // Si solo se muestra cuando hay salas activas, verificar que haya salas
            if (tab.showOnlyIfHasRooms && myActiveRooms?.length === 0) return false;

            return true;
          })
          // Mapeamos el array para renderizar cada botón
          .map((tab) => (
            <TabButton
              key={tab.id}
              label={tab.label}
              shortLabel={tab.shortLabel}
              icon={tab.icon}
              notificationCount={tab.notificationCount}
              isActive={activeModule === tab.id}
              onClick={() => setActiveModule(tab.id)}
            />
          ))}
      </div>

      {/* Barra de búsqueda - MÁS COMPACTA */}
      <div className="bg-white flex flex-col max-[1280px]:!px-3 max-[1280px]:!py-1.5 max-[1024px]:!px-2 max-[1024px]:!py-1 max-[768px]:!px-3 max-[768px]:!py-1.5" style={{ paddingTop: '8px', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '8px' }}>
        {/* Input de búsqueda */}
        <div
          className="relative flex items-center bg-[#E8E8E8] overflow-hidden max-[1280px]:!w-full max-[1280px]:!h-9 max-[1280px]:!px-2.5 max-[1280px]:!py-1.5 max-[1280px]:!gap-1.5 max-[1024px]:!h-8 max-[1024px]:!px-2 max-[1024px]:!py-1 max-[1024px]:!gap-1 max-[768px]:!w-full max-[768px]:!h-9 max-[768px]:!px-2.5 max-[768px]:!py-1.5 max-[768px]:!gap-1.5"
          style={{
            width: '100%',
            height: '38px',
            borderRadius: '12px',
            paddingTop: '8px',
            paddingRight: '12px',
            paddingBottom: '8px',
            paddingLeft: '12px',
            gap: '10px'
          }}
        >
          <span className="text-gray-500 flex-shrink-0" style={{ display: 'flex', alignItems: 'center' }}>
            <svg viewBox="0 0 20 20" height="20" width="20" preserveAspectRatio="xMidYMid meet" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M4.36653 4.3664C5.36341 3.36953 6.57714 2.87 8.00012 2.87C9.42309 2.87 10.6368 3.36953 11.6337 4.3664C12.6306 5.36329 13.1301 6.57724 13.1301 8.00062C13.1301 8.57523 13.0412 9.11883 12.8624 9.63057C12.6972 10.1038 12.4733 10.5419 12.1909 10.9444L16.5712 15.3247C16.7454 15.4989 16.8385 15.7046 16.8385 15.9375C16.8385 16.1704 16.7454 16.3761 16.5712 16.5503C16.396 16.7254 16.1866 16.8175 15.948 16.8175C15.7095 16.8175 15.5001 16.7254 15.3249 16.5503L10.9448 12.1906C10.5421 12.4731 10.104 12.697 9.63069 12.8623C9.11895 13.041 8.57535 13.13 8.00074 13.13C6.57736 13.13 5.36341 12.6305 4.36653 11.6336C3.36965 10.6367 2.87012 9.42297 2.87012 8C2.87012 6.57702 3.36965 5.36328 4.36653 4.3664ZM8.00012 4.63C7.06198 4.63 6.26877 4.95685 5.61287 5.61275C4.95698 6.26865 4.63012 7.06186 4.63012 8C4.63012 8.93813 4.95698 9.73134 5.61287 10.3872C6.26877 11.0431 7.06198 11.37 8.00012 11.37C8.93826 11.37 9.73146 11.0431 10.3874 10.3872C11.0433 9.73134 11.3701 8.93813 11.3701 8C11.3701 7.06186 11.0433 6.26865 10.3874 5.61275C9.73146 4.95685 8.93826 4.63 8.00012 4.63Z" fill="currentColor" />
            </svg>
          </span>
          <input
            type="text"
            placeholder="Buscar un chat o iniciar uno nuevo"
            className="flex-1 bg-transparent border-none text-gray-800 outline-none placeholder:text-gray-400 max-[1280px]:!text-sm max-[1280px]:placeholder:!text-xs max-[1024px]:!text-xs max-[1024px]:placeholder:!text-[11px] max-[768px]:!text-sm max-[768px]:placeholder:!text-xs"
            style={{
              fontSize: '13px',
              lineHeight: '18px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400
            }}
            value={
              activeModule === 'chats' || activeModule === 'monitoring' ? assignedSearchTerm :
              searchTerm
            }
            onChange={(e) => {
              const value = e.target.value;
              if (activeModule === 'chats' || activeModule === 'monitoring') {
                setAssignedSearchTerm(value);
                // Buscar en mensajes también
                handleMessageSearch(value);
              } else {
                setSearchTerm(value);
                // Buscar en mensajes también
                handleMessageSearch(value);
              }
            }}
          />
          {((activeModule === 'conversations' && searchTerm) ||
            (activeModule === 'chats' && assignedSearchTerm) ||
            (activeModule === 'monitoring' && assignedSearchTerm)) && (
            <button
              className="bg-transparent border-none text-gray-500 cursor-pointer p-0.5 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-gray-200 hover:text-gray-800 active:scale-95 max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!p-0.5"
              style={{ fontSize: '13px' }}
              onClick={() => {
                if (activeModule === 'chats' || activeModule === 'monitoring') {
                  setAssignedSearchTerm('');
                  setMessageSearchResults([]);
                } else {
                  setSearchTerm('');
                  setMessageSearchResults([]);
                }
              }}
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Ordenar por */}
        {(activeModule === 'conversations' || activeModule === 'chats' || activeModule === 'monitoring') && (
          <div className="flex items-center gap-2 max-[1280px]:!mt-2 max-[1280px]:!gap-1.5 max-[1024px]:!mt-1.5 max-[1024px]:!gap-1" style={{ marginTop: '12px' }}>
            <span
              className="text-gray-600 max-[1280px]:!text-sm max-[1024px]:!text-xs"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '15.55px',
                lineHeight: '20.73px',
                color: 'rgba(0, 0, 0, 0.65)'
              }}
            >
              Ordenar por
            </span>
            <select
              className="bg-transparent border-none text-[#33B8FF] cursor-pointer outline-none max-[1280px]:!text-sm max-[1024px]:!text-xs"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '15.55px',
                lineHeight: '20.73px'
              }}
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name</option>
            </select>
          </div>
        )}
      </div>

      {/* Contenido según módulo activo */}
      {activeModule === 'chats' && (
        <div className="flex-1 overflow-y-auto bg-white px-4">
          {/* Mostrar resultados de búsqueda de mensajes si hay búsqueda activa */}
          {assignedSearchTerm.trim() && messageSearchResults.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-gray-500 font-semibold mb-2 px-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                📝 Mensajes encontrados ({messageSearchResults.length})
              </div>
              {messageSearchResults.map((msg) => {
                const isGroupMsg = msg.isGroup;
                const conversationName = isGroupMsg ? msg.roomCode : msg.to;
                const messagePreview = msg.message || (msg.fileName ? `📎 ${msg.fileName}` : 'Archivo');

                return (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 p-3 mb-2 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                    onClick={() => {
                      if (isGroupMsg) {
                        // Buscar el objeto de sala completo
                        const room = myActiveRooms?.find(r => r.roomCode === msg.roomCode);
                        if (room && onRoomSelect) {
                          // Navegar a grupo con el objeto completo y el messageId
                          onRoomSelect(room, msg.id);
                        } else {
                          console.error('Sala no encontrada:', msg.roomCode);
                        }
                      } else {
                        // Navegar a chat directo
                        onUserSelect(msg.to, null, msg.id);
                      }
                    }}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center text-lg">
                      {isGroupMsg ? '👥' : '💬'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {conversationName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {isGroupMsg ? 'Grupo' : 'Chat'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {messagePreview}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(msg.sentAt).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-gray-200 my-3"></div>
            </div>
          )}

          {/* Mostrar indicador de búsqueda */}
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Buscando mensajes...</div>
            </div>
          )}

          {/* 🔥 SECCIÓN DE GRUPOS */}
          {myActiveRooms && myActiveRooms.length > 0 && (
            <>
              <div
                className="text-xs text-gray-500 font-semibold mb-2 px-4 mt-4 flex items-center justify-between cursor-pointer select-none"
                style={{ fontFamily: 'Inter, sans-serif' }}
                onClick={() => setShowGroups(prev => !prev)}
              >
                <div className="flex items-center gap-2">
                  <Users className="w-3.5 h-3.5" />
                  <span>GRUPOS</span>
                </div>
                {showGroups ? (
                  <FaChevronDown className="w-3 h-3 text-gray-400" />
                ) : (
                  <FaChevronRight className="w-3 h-3 text-gray-400" />
                )}
              </div>
              {showGroups && myActiveRooms
                .filter(room =>
                  assignedSearchTerm.trim() === '' ||
                  room.name.toLowerCase().includes(assignedSearchTerm.toLowerCase()) ||
                  room.roomCode.toLowerCase().includes(assignedSearchTerm.toLowerCase())
                )
                // Ordenar: menciones primero, luego favoritas, luego por fecha
                .sort((a, b) => {
                  // Verificar si hay menciones al usuario en el último mensaje
                  const aHasMention = hasMentionToUser(a.lastMessage?.text);
                  const bHasMention = hasMentionToUser(b.lastMessage?.text);

                  // Si una tiene mención y la otra no, la que tiene mención va primero
                  if (aHasMention && !bHasMention) return -1;
                  if (!aHasMention && bHasMention) return 1;

                  // Si ambas tienen mención o ninguna, verificar favoritas
                  const aIsFavorite = favoriteRoomCodes.includes(a.roomCode);
                  const bIsFavorite = favoriteRoomCodes.includes(b.roomCode);

                  // Si una es favorita y la otra no, la favorita va primero
                  if (aIsFavorite && !bIsFavorite) return -1;
                  if (!aIsFavorite && bIsFavorite) return 1;

                  // Si ambas son favoritas o ninguna lo es, ordenar por fecha
                  return new Date(b.createdAt) - new Date(a.createdAt);
                })
                .map((room) => {
                  // Obtener usuarios escribiendo en esta sala
                  const typingUsers = roomTypingUsers[room.roomCode] || [];
                  const isTypingInRoom = typingUsers.length > 0;
                  const isFavorite = favoriteRoomCodes.includes(room.roomCode);
                  // 🔥 NUEVO: Obtener contador de mensajes no leídos para esta sala
                  const roomUnreadCount = unreadMessages?.[room.roomCode] || 0;

                  return (
                    <div
                      key={room.id}
                      className={`flex items-center transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer ${currentRoomCode === room.roomCode ? 'bg-[#e7f3f0]' : ''}`}
                      style={{
                        padding: '8px 12px',
                        gap: '10px',
                        minHeight: '56px'
                      }}
                      onClick={() => onRoomSelect && onRoomSelect(room)}
                    >
                      {/* Icono de sala */}
                      <div className="relative flex-shrink-0" style={{ width: '36px', height: '36px' }}>
                        <div
                          className="rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold"
                          style={{
                            width: '36px',
                            height: '36px',
                            border: '1.3px solid rgba(0, 0, 0, 0.1)',
                            fontSize: '16px'
                          }}
                        >
                          🏠
                        </div>
                        {/* Indicador de sala activa - más pequeño y en la esquina */}
                        {room.isActive && (
                          <div
                            className="absolute bottom-0 right-0 rounded-full bg-white flex items-center justify-center"
                            style={{
                              width: '12px',
                              height: '12px',
                              border: '2px solid white'
                            }}
                          >
                            <div
                              className="rounded-full bg-green-500"
                              style={{
                                width: '8px',
                                height: '8px'
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Info de la sala */}
                      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: '2px' }}>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {/* Indicador de Fijado */}
                            {isFavorite && (
                              <span
                                className="flex-shrink-0 text-yellow-500 font-semibold flex items-center gap-1"
                                style={{
                                  fontSize: '10px',
                                  lineHeight: '12px',
                                  fontFamily: 'Inter, sans-serif',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}
                              >
                                <PinIcon size={12} className="text-yellow-500" /> Fijado
                              </span>
                            )}
                            <h3
                              className="font-semibold text-[#111] truncate flex-1"
                              style={{
                                fontSize: '14px',
                                lineHeight: '18px',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 600
                              }}
                            >
                              {room.name}
                            </h3>
                            {/* 🔥 NUEVO: Badge de mensajes no leídos */}
                            {roomUnreadCount > 0 && (
                              <div
                                className="flex-shrink-0 rounded-full bg-[#00a884] text-white flex items-center justify-center ml-2"
                                style={{
                                  minWidth: '20px',
                                  height: '20px',
                                  fontSize: '11px',
                                  fontWeight: 'bold',
                                  padding: roomUnreadCount > 99 ? '0 4px' : '0'
                                }}
                              >
                                {roomUnreadCount > 99 ? '99+' : roomUnreadCount}
                              </div>
                            )}
                          </div>
                          {/* Botón de favorito */}
                          <button
                            onClick={(e) => handleToggleFavorite(room, e)}
                            className="flex-shrink-0 p-1 hover:bg-gray-200 rounded-full transition-colors"
                            title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                            style={{
                              color: isFavorite ? '#fbbf24' : '#9ca3af',
                              fontSize: '16px'
                            }}
                          >
                            {isFavorite ? <FaStar /> : <FaRegStar />}
                          </button>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {isTypingInRoom ? (
                            <p
                              className="text-green-600 italic truncate flex items-center gap-1"
                              style={{
                                fontSize: '11px',
                                lineHeight: '14px',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 400
                              }}
                            >
                              {typingUsers.length === 1
                                ? `${typingUsers[0].nombre && typingUsers[0].apellido
                                    ? `${typingUsers[0].nombre} ${typingUsers[0].apellido}`
                                    : (typingUsers[0].nombre || typingUsers[0].username)} está escribiendo...`
                                : `${typingUsers.length} personas están escribiendo...`
                              }
                            </p>
                          ) : room.lastMessage ? (
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-gray-700 truncate"
                                style={{
                                  fontSize: '12px',
                                  lineHeight: '16px',
                                  fontFamily: 'Inter, sans-serif',
                                  fontWeight: 400
                                }}
                              >
                                <span className="font-semibold text-gray-800">{room.lastMessage.from}:</span>{' '}
                                {room.lastMessage.mediaType ? (
                                  room.lastMessage.mediaType === 'image' ? '📷 Imagen' :
                                  room.lastMessage.mediaType === 'video' ? '🎥 Video' :
                                  room.lastMessage.mediaType === 'audio' ? '🎵 Audio' :
                                  room.lastMessage.fileName ? `📎 ${room.lastMessage.fileName}` : 'Archivo'
                                ) : (
                                  room.lastMessage.text
                                )}
                              </p>
                              <p
                                className="text-gray-500 text-xs mt-0.5"
                                style={{
                                  fontSize: '10px',
                                  lineHeight: '12px',
                                  fontFamily: 'Inter, sans-serif',
                                  fontWeight: 400
                                }}
                              >
                                {isAdmin && `Código: ${room.roomCode} • `}
                                {room.currentMembers}/{room.maxCapacity} usuarios
                              </p>
                            </div>
                          ) : (
                            <p
                              className="text-gray-600 truncate"
                              style={{
                                fontSize: '11px',
                                lineHeight: '14px',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 400
                              }}
                            >
                              {/* Solo mostrar código de sala a ADMIN y JEFEPISO */}
                              {isAdmin ? (
                                <>Código: {room.roomCode} • {room.currentMembers}/{room.maxCapacity} usuarios</>
                              ) : (
                                <>{room.currentMembers}/{room.maxCapacity} usuarios</>
                              )}
                            </p>
                          )}
                          {/* Ícono de menciones si el mensaje contiene una mención al usuario */}
                          {hasMentionToUser(room.lastMessage?.text) && (
                            <span aria-hidden="true" data-icon="mentions-refreshed" style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                              <svg viewBox="0 0 24 24" height="20" preserveAspectRatio="xMidYMid meet" fill="none">
                                <title>mentions-refreshed</title>
                                <path d="M11.9873 21C10.7513 21 9.58985 20.7663 8.50285 20.2989C7.4157 19.8314 6.46047 19.186 5.63715 18.3629C4.81397 17.5395 4.16862 16.5818 3.70108 15.4896C3.23369 14.3975 3 13.2305 3 11.9886C3 10.7469 3.23369 9.58368 3.70108 8.49906C4.16862 7.41444 4.81397 6.46047 5.63715 5.63715C6.46047 4.81397 7.41823 4.16862 8.51044 3.70108C9.6025 3.23369 10.7695 3 12.0114 3C13.2531 3 14.4163 3.23369 15.5009 3.70108C16.5856 4.16862 17.5395 4.81397 18.3629 5.63715C19.186 6.46047 19.8314 7.41332 20.2989 8.49571C20.7663 9.57824 21 10.7421 21 11.9873V13.3265C21 14.1986 20.6799 14.9414 20.0398 15.5547C19.3995 16.1681 18.6323 16.4748 17.7383 16.4748C17.205 16.4748 16.7143 16.3441 16.2661 16.0826C15.8177 15.8213 15.4436 15.4655 15.1436 15.0153C14.763 15.4804 14.2969 15.8399 13.7455 16.0938C13.1938 16.3478 12.612 16.4748 12 16.4748C10.7554 16.4748 9.69848 16.0396 8.82918 15.1693C7.95987 14.2989 7.52522 13.2408 7.52522 11.9949C7.52522 10.7489 7.96039 9.69253 8.83074 8.8256C9.70108 7.95868 10.7592 7.52522 12.0051 7.52522C13.2511 7.52522 14.3075 7.95987 15.1744 8.82917C16.0413 9.69848 16.4748 10.7554 16.4748 12V13.2256C16.4748 13.5789 16.6007 13.8778 16.8527 14.1224C17.1047 14.3669 17.404 14.4892 17.7506 14.4892C18.0972 14.4892 18.3923 14.3669 18.6361 14.1224C18.8799 13.8778 19.0019 13.5789 19.0019 13.2256V11.9873C19.0019 10.0528 18.3185 8.40442 16.9518 7.04199C15.585 5.67941 13.9344 4.99811 12 4.99811C10.0656 4.99811 8.41498 5.68149 7.04824 7.04824C5.68149 8.41498 4.99812 10.0656 4.99812 12C4.99812 13.9344 5.67941 15.585 7.04199 16.9518C8.40442 18.3185 10.0555 19.0019 11.9953 19.0019H15.2927C15.5739 19.0019 15.8097 19.0965 16 19.2858C16.1903 19.4752 16.2855 19.7099 16.2855 19.9898C16.2855 20.2667 16.1903 20.5043 16 20.7025C15.8097 20.9008 15.5739 21 15.2927 21H11.9873ZM12.0022 14.4892C12.6943 14.4892 13.2818 14.247 13.7646 13.7626C14.2477 13.2781 14.4892 12.6898 14.4892 11.9978C14.4892 11.3057 14.247 10.7182 13.7626 10.2354C13.2781 9.75234 12.6898 9.51084 11.9978 9.51084C11.3057 9.51084 10.7182 9.75301 10.2354 10.2374C9.75234 10.7219 9.51084 11.3102 9.51084 12.0022C9.51084 12.6943 9.75301 13.2818 10.2374 13.7646C10.7219 14.2477 11.3102 14.4892 12.0022 14.4892Z" fill="currentColor" style={{ color: '#00a884' }}></path>
                              </svg>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </>
          )}

          {/* 🔥 SECCIÓN DE ASIGNADOS */}
          <div
            className="text-xs text-gray-500 font-semibold mb-2 px-4 mt-4 flex items-center justify-between cursor-pointer select-none"
            style={{ fontFamily: 'Inter, sans-serif' }}
            onClick={() => setShowAssigned(prev => !prev)}
          >
            <div className="flex items-center gap-2">
              <CommunityIcon size={14} />
              <span>ASIGNADOS</span>
            </div>
            {showAssigned ? (
              <FaChevronDown className="w-3 h-3 text-gray-400" />
            ) : (
              <FaChevronRight className="w-3 h-3 text-gray-400" />
            )}
          </div>
          {(() => {
            // Filtrar conversaciones asignadas
            // Aplicar búsqueda sobre myAssignedConversations
            const myConversations = myAssignedConversations.filter(conv => {
              if (!assignedSearchTerm.trim()) return true;
              const searchLower = assignedSearchTerm.toLowerCase();
              const participants = conv.participants || [];
              return (
                conv.name?.toLowerCase().includes(searchLower) ||
                participants.some(p => p?.toLowerCase().includes(searchLower)) ||
                conv.lastMessage?.toLowerCase().includes(searchLower)
              );
            });

            if (!showAssigned) {
              return null;
            }

            return myConversations.length > 0 ? (
              <>
                {myConversations
                  // Ordenar: favoritas primero, luego según sortBy
                  .sort((a, b) => {
                    const aIsFavorite = favoriteConversationIds.includes(a.id);
                    const bIsFavorite = favoriteConversationIds.includes(b.id);

                    // Si una es favorita y la otra no, la favorita va primero
                    if (aIsFavorite && !bIsFavorite) return -1;
                    if (!aIsFavorite && bIsFavorite) return 1;

                    // Si ambas son favoritas o ninguna lo es, ordenar según sortBy
                    if (sortBy === 'newest') {
                      return new Date(b.lastMessageTime || b.createdAt) - new Date(a.lastMessageTime || a.createdAt);
                    } else if (sortBy === 'oldest') {
                      return new Date(a.lastMessageTime || a.createdAt) - new Date(b.lastMessageTime || b.createdAt);
                    } else if (sortBy === 'name') {
                      const aName = (a.name || '').toLowerCase();
                      const bName = (b.name || '').toLowerCase();
                      return aName.localeCompare(bName);
                    }
                    return 0;
                  })
                  .map((conv) => {
                  // Obtener nombres de los participantes desde el array participants
                  const participants = conv.participants || [];
                  const participant1Name = participants[0] || 'Usuario 1';
                  const participant2Name = participants[1] || 'Usuario 2';

                  // 🔥 Calcular el nombre a mostrar según el usuario actual
                  const currentUserFullName = user?.nombre && user?.apellido
                    ? `${user.nombre} ${user.apellido}`
                    : user?.username;

                  // Si el usuario actual es uno de los participantes, mostrar solo el nombre del otro
                  let displayName = conv.name; // Por defecto, usar el nombre de la conversación
                  let otherParticipantName = null; // Nombre del otro participante

                  // 🔥 Comparación case-insensitive
                  const currentUserNormalized = currentUserFullName?.toLowerCase().trim();
                  const participant1Normalized = participant1Name?.toLowerCase().trim();
                  const participant2Normalized = participant2Name?.toLowerCase().trim();

                  if (currentUserNormalized === participant1Normalized) {
                    // El usuario actual es participant1, mostrar solo participant2
                    displayName = participant2Name;
                    otherParticipantName = participant2Name;
                  } else if (currentUserNormalized === participant2Normalized) {
                    // El usuario actual es participant2, mostrar solo participant1
                    displayName = participant1Name;
                    otherParticipantName = participant1Name;
                  } else if (!conv.name) {
                    // Si no hay nombre y el usuario no es participante, mostrar ambos
                    displayName = `${participant1Name} ↔️ ${participant2Name}`;
                  }

                  // 🔥 Buscar la foto del otro participante en la lista de usuarios o en el cache
                  let otherParticipantPicture = null;
                  let isOtherParticipantOnline = false;
                  if (otherParticipantName) {
                    const otherParticipantNormalized = otherParticipantName?.toLowerCase().trim();

                    // Primero buscar en la lista de usuarios conectados
                    const otherUser = userList.find(u => {
                      const fullName = u.nombre && u.apellido
                        ? `${u.nombre} ${u.apellido}`
                        : u.username;
                      return fullName?.toLowerCase().trim() === otherParticipantNormalized;
                    });

                    if (otherUser) {
                      // Usuario encontrado en la lista
                      otherParticipantPicture = otherUser.picture || null;
                      // 🔥 FIX: Leer la propiedad isOnline del usuario, no asumir que está online
                      isOtherParticipantOnline = otherUser.isOnline === true;
                    } else {
                      // Usuario no encontrado en la lista, buscar en el cache
                      const cachedUser = userCache[otherParticipantNormalized];
                      if (cachedUser) {
                        otherParticipantPicture = cachedUser.picture || null;
                        // 🔥 FIX: Leer la propiedad isOnline del cache
                        isOtherParticipantOnline = cachedUser.isOnline === true;
                      }
                    }
                  }

                  // Obtener iniciales
                  const getInitials = (name) => {
                    const parts = name.split(' ');
                    if (parts.length >= 2) {
                      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                    }
                    return name[0]?.toUpperCase() || 'U';
                  };

                  const isFavorite = favoriteConversationIds.includes(conv.id);

                  return (
                    <div
                      key={conv.id}
                      className="flex transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer group overflow-visible relative"
                      style={{
                        padding: '8px 12px',
                        gap: '10px',
                        minHeight: '60px',
                        alignItems: 'flex-start',
                        width: '100%',
                        minWidth: 0,
                        overflow: 'visible',
                        position: 'relative'
                      }}
                      onClick={() => {
                        // console.log('Usuario viendo conversación asignada:', conv);
                        // console.log('  - displayName:', displayName);
                        // Llamar a onUserSelect con el displayName correcto
                        if (onUserSelect) {
                          onUserSelect(displayName, null, conv);
                        }
                      }}
                    >
                      {/* Avatar único para el otro participante */}
                      <div className="relative flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                        <div
                          className="rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold"
                          style={{
                            width: '40px',
                            height: '40px',
                            fontSize: '16px'
                          }}
                        >
                          {otherParticipantPicture ? (
                            <img
                              src={otherParticipantPicture}
                              alt={displayName}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentElement.innerHTML = getInitials(displayName);
                              }}
                            />
                          ) : (
                            getInitials(displayName)
                          )}
                        </div>
                        {/* Indicador de estado online/offline */}
                        <div
                          className="absolute bottom-0 right-0 rounded-full border-2 border-white"
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: isOtherParticipantOnline ? '#10b981' : '#9ca3af'
                          }}
                          title={isOtherParticipantOnline ? 'En línea' : 'Desconectado'}
                        />
                      </div>

                      {/* Info de la conversación */}
                      <div className="flex-1 min-w-0 flex flex-col overflow-visible relative" style={{ gap: '4px', overflow: 'visible', position: 'relative' }}>
                        <div className="flex items-start justify-between gap-2 overflow-visible relative" style={{ overflow: 'visible', position: 'relative' }}>
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            {/* Indicador de Fijado */}
                            {isFavorite && (
                              <span
                                className="flex-shrink-0 text-yellow-500 font-semibold flex items-center gap-1"
                                style={{
                                  fontSize: '10px',
                                  lineHeight: '12px',
                                  fontFamily: 'Inter, sans-serif',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}
                              >
                                <PinIcon size={12} className="text-yellow-500" /> Fijado
                              </span>
                            )}
                            <div className="flex items-center gap-2 w-full min-w-0">
                              <h3
                                className="font-semibold text-[#111] flex-1 min-w-0 truncate"
                                style={{
                                  fontSize: '12px',
                                  lineHeight: '16px',
                                  fontFamily: 'Inter, sans-serif',
                                  fontWeight: 600,
                                  maxWidth: '100%'
                                }}
                                title={displayName}
                              >
                                {displayName}
                              </h3>
                              {/* Botón de favorito */}
                              <button
                                onClick={(e) => handleToggleConversationFavorite(conv, e)}
                                className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 transition-all duration-200 opacity-0 group-hover:opacity-100"
                                style={{
                                  opacity: isFavorite ? 1 : undefined
                                }}
                                title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                              >
                                {isFavorite ? (
                                  <FaStar className="text-yellow-500" size={14} />
                                ) : (
                                  <FaRegStar className="text-gray-400" size={14} />
                                )}
                              </button>
                            </div>
                          </div>
                          {/* Hora del último mensaje */}
                          {conv.lastMessageTime && (
                            <span className="conversation-timestamp">
                              {(() => {
                                // 🔥 Extraer hora directamente del string ISO sin convertir a Date
                                // Formato: "2025-11-14T16:44:07.482Z" -> "16:44"
                                const timeMatch = conv.lastMessageTime.match(/T(\d{2}):(\d{2})/);
                                return timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : '';
                              })()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {/* Último mensaje con remitente */}
                          <div className="flex-1 min-w-0 flex items-center gap-1">
                            {conv.lastMessage ? (
                              <>
                                {conv.lastMessageFrom && (
                                  <span
                                    className="font-semibold flex-shrink-0"
                                    style={{
                                      fontSize: '12px',
                                      lineHeight: '16px',
                                      fontFamily: 'Inter, sans-serif',
                                      fontWeight: 600,
                                      color: '#00a884'
                                    }}
                                  >
                                    {conv.lastMessageFrom.split(' ')[0]}:
                                  </span>
                                )}
                                <p
                                  className="text-gray-600 truncate"
                                  style={{
                                    fontSize: '12px',
                                    lineHeight: '16px',
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 400
                                  }}
                                >
                                  {conv.lastMessageMediaType ? (
                                    <span className="flex items-center gap-1">
                                      {conv.lastMessageMediaType === 'image' && '📷 Imagen'}
                                      {conv.lastMessageMediaType === 'video' && '🎥 Video'}
                                      {conv.lastMessageMediaType === 'audio' && '🎵 Audio'}
                                      {conv.lastMessageMediaType === 'document' && '📄 Documento'}
                                      {!['image', 'video', 'audio', 'document'].includes(conv.lastMessageMediaType) && '📎 Archivo'}
                                    </span>
                                  ) : conv.lastMessageThreadCount > 0 ? (
                                    // Si el último mensaje tiene respuestas en hilos, mostrar el contador
                                    <span className="flex items-center gap-1">
                                      <span className="text-gray-500">🧵</span>
                                      <span className="font-semibold text-[#00a884]">
                                        {conv.lastMessageThreadCount} {conv.lastMessageThreadCount === 1 ? 'respuesta' : 'respuestas'}
                                      </span>
                                      {conv.lastMessageLastReplyFrom && (
                                        <span className="text-gray-500">
                                          • {conv.lastMessageLastReplyFrom}
                                        </span>
                                      )}
                                    </span>
                                  ) : (
                                    conv.lastMessage
                                  )}
                                </p>
                              </>
                            ) : (
                              <p
                                className="text-gray-400 italic truncate"
                                style={{
                                  fontSize: '12px',
                                  lineHeight: '16px',
                                  fontFamily: 'Inter, sans-serif',
                                  fontWeight: 400
                                }}
                              >
                                Sin mensajes aún
                              </p>
                            )}
                          </div>
                          {/* Ícono de menciones si el mensaje contiene una mención al usuario */}
                          {hasMentionToUser(conv.lastMessage) && (
                            <span aria-hidden="true" data-icon="mentions-refreshed" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: '4px' }}>
                              <svg viewBox="0 0 24 24" height="20" preserveAspectRatio="xMidYMid meet" fill="none">
                                <title>mentions-refreshed</title>
                                <path d="M11.9873 21C10.7513 21 9.58985 20.7663 8.50285 20.2989C7.4157 19.8314 6.46047 19.186 5.63715 18.3629C4.81397 17.5395 4.16862 16.5818 3.70108 15.4896C3.23369 14.3975 3 13.2305 3 11.9886C3 10.7469 3.23369 9.58368 3.70108 8.49906C4.16862 7.41444 4.81397 6.46047 5.63715 5.63715C6.46047 4.81397 7.41823 4.16862 8.51044 3.70108C9.6025 3.23369 10.7695 3 12.0114 3C13.2531 3 14.4163 3.23369 15.5009 3.70108C16.5856 4.16862 17.5395 4.81397 18.3629 5.63715C19.186 6.46047 19.8314 7.41332 20.2989 8.49571C20.7663 9.57824 21 10.7421 21 11.9873V13.3265C21 14.1986 20.6799 14.9414 20.0398 15.5547C19.3995 16.1681 18.6323 16.4748 17.7383 16.4748C17.205 16.4748 16.7143 16.3441 16.2661 16.0826C15.8177 15.8213 15.4436 15.4655 15.1436 15.0153C14.763 15.4804 14.2969 15.8399 13.7455 16.0938C13.1938 16.3478 12.612 16.4748 12 16.4748C10.7554 16.4748 9.69848 16.0396 8.82918 15.1693C7.95987 14.2989 7.52522 13.2408 7.52522 11.9949C7.52522 10.7489 7.96039 9.69253 8.83074 8.8256C9.70108 7.95868 10.7592 7.52522 12.0051 7.52522C13.2511 7.52522 14.3075 7.95987 15.1744 8.82917C16.0413 9.69848 16.4748 10.7554 16.4748 12V13.2256C16.4748 13.5789 16.6007 13.8778 16.8527 14.1224C17.1047 14.3669 17.404 14.4892 17.7506 14.4892C18.0972 14.4892 18.3923 14.3669 18.6361 14.1224C18.8799 13.8778 19.0019 13.5789 19.0019 13.2256V11.9873C19.0019 10.0528 18.3185 8.40442 16.9518 7.04199C15.585 5.67941 13.9344 4.99811 12 4.99811C10.0656 4.99811 8.41498 5.68149 7.04824 7.04824C5.68149 8.41498 4.99812 10.0656 4.99812 12C4.99812 13.9344 5.67941 15.585 7.04199 16.9518C8.40442 18.3185 10.0555 19.0019 11.9953 19.0019H15.2927C15.5739 19.0019 15.8097 19.0965 16 19.2858C16.1903 19.4752 16.2855 19.7099 16.2855 19.9898C16.2855 20.2667 16.1903 20.5043 16 20.7025C15.8097 20.9008 15.5739 21 15.2927 21H11.9873ZM12.0022 14.4892C12.6943 14.4892 13.2818 14.247 13.7646 13.7626C14.2477 13.2781 14.4892 12.6898 14.4892 11.9978C14.4892 11.3057 14.247 10.7182 13.7626 10.2354C13.2781 9.75234 12.6898 9.51084 11.9978 9.51084C11.3057 9.51084 10.7182 9.75301 10.2354 10.2374C9.75234 10.7219 9.51084 11.3102 9.51084 12.0022C9.51084 12.6943 9.75301 13.2818 10.2374 13.7646C10.7219 14.2477 11.3102 14.4892 12.0022 14.4892Z" fill="currentColor" style={{ color: '#00a884' }}></path>
                              </svg>
                            </span>
                          )}
                          {/* Badge de mensajes no leídos */}
                          {conv.unreadCount > 0 && (
                            <div
                              className="flex-shrink-0 rounded-full bg-[#00a884] text-white flex items-center justify-center"
                              style={{
                                minWidth: '20px',
                                height: '20px',
                                padding: '0 6px',
                                fontSize: '11px',
                                fontWeight: 600,
                                fontFamily: 'Inter, sans-serif'
                              }}
                            >
                              {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-[60px] px-5 text-center">
                <div className="text-5xl mb-4 opacity-50">👁️</div>
                <div className="text-sm text-gray-600 font-medium">
                  {assignedSearchTerm ? `No se encontraron resultados para "${assignedSearchTerm}"` : 'No hay chats asignados'}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Módulo de Chats Monitoreo (solo para ADMIN) */}
      {activeModule === 'monitoring' && isAdmin && (
        <div className="flex-1 overflow-y-auto bg-white px-4 w-full min-w-0">
          {/* Mostrar resultados de búsqueda de mensajes si hay búsqueda activa */}
          {assignedSearchTerm.trim() && messageSearchResults.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-gray-500 font-semibold mb-2 px-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                📝 Mensajes encontrados ({messageSearchResults.length})
              </div>
              {messageSearchResults.map((msg) => {
                const isGroupMsg = msg.isGroup;
                const conversationName = isGroupMsg ? msg.roomCode : msg.to;
                const messagePreview = msg.message || (msg.fileName ? `📎 ${msg.fileName}` : 'Archivo');

                return (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 p-3 mb-2 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                    onClick={() => {
                      if (isGroupMsg) {
                        // Buscar el objeto de sala completo
                        const room = myActiveRooms?.find(r => r.roomCode === msg.roomCode);
                        if (room && onRoomSelect) {
                          // Navegar a grupo con el objeto completo y el messageId
                          onRoomSelect(room, msg.id);
                        } else {
                          console.error('Sala no encontrada:', msg.roomCode);
                        }
                      } else {
                        // Navegar a chat directo
                        onUserSelect(msg.to, null, msg.id);
                      }
                    }}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center text-lg">
                      {isGroupMsg ? '👥' : '💬'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {conversationName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {isGroupMsg ? 'Grupo' : 'Chat'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {messagePreview}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(msg.sentAt).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-gray-200 my-3"></div>
            </div>
          )}

          {/* Mostrar indicador de búsqueda */}
          {isSearching && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-gray-500">Buscando mensajes...</div>
            </div>
          )}

          {(() => {
            // Filtrar conversaciones de monitoreo con búsqueda
            const filteredMonitoring = monitoringConversations.filter(conv => {
              if (!assignedSearchTerm.trim()) return true;
              const searchLower = assignedSearchTerm.toLowerCase();
              const participants = conv.participants || [];
              return (
                conv.name?.toLowerCase().includes(searchLower) ||
                participants.some(p => p?.toLowerCase().includes(searchLower)) ||
                conv.lastMessage?.toLowerCase().includes(searchLower)
              );
            });

            return filteredMonitoring.length > 0 ? (
            <>
              {filteredMonitoring
                // Ordenar: favoritas primero, luego según sortBy
                .sort((a, b) => {
                  const aIsFavorite = favoriteConversationIds.includes(a.id);
                  const bIsFavorite = favoriteConversationIds.includes(b.id);

                  // Si una es favorita y la otra no, la favorita va primero
                  if (aIsFavorite && !bIsFavorite) return -1;
                  if (!aIsFavorite && bIsFavorite) return 1;

                  // Si ambas son favoritas o ninguna lo es, ordenar según sortBy
                  if (sortBy === 'newest') {
                    return new Date(b.lastMessageTime || b.createdAt) - new Date(a.lastMessageTime || a.createdAt);
                  } else if (sortBy === 'oldest') {
                    return new Date(a.lastMessageTime || a.createdAt) - new Date(b.lastMessageTime || b.createdAt);
                  } else if (sortBy === 'name') {
                    const aName = (a.name || '').toLowerCase();
                    const bName = (b.name || '').toLowerCase();
                    return aName.localeCompare(bName);
                  }
                  return 0;
                })
                .map((conv) => {
                // Obtener nombres de los participantes desde el array participants
                const participants = conv.participants || [];
                const participant1Name = participants[0] || 'Usuario 1';
                const participant2Name = participants[1] || 'Usuario 2';

                // Obtener iniciales
                const getInitials = (name) => {
                  const parts = name.split(' ');
                  if (parts.length >= 2) {
                    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
                  }
                  return name[0]?.toUpperCase() || 'U';
                };

                const isFavorite = favoriteConversationIds.includes(conv.id);

                return (
                  <div
                    key={conv.id}
                    className="flex transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer group relative"
                    style={{
                      padding: '10px 12px',
                      gap: '10px',
                      minHeight: '72px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      width: '100%',
                      minWidth: 0,
                      position: 'relative'
                    }}
                    onClick={() => {
                      // console.log('Admin monitoreando conversación:', conv);
                      // 🔥 IMPORTANTE: Pasar el nombre del otro participante, no el nombre de la conversación
                      // Esto es crítico para que la API cargue los mensajes correctamente
                      if (onUserSelect) {
                        // Obtener el nombre completo del admin actual
                        const adminFullName = user?.nombre && user?.apellido
                          ? `${user.nombre} ${user.apellido}`
                          : user?.username;

                        // Obtener el nombre del otro participante (no el del admin)
                        const otherParticipant = participants.find(p =>
                          p.toLowerCase().trim() !== adminFullName?.toLowerCase().trim()
                        ) || participant2Name;

                        onUserSelect(otherParticipant, null, conv);
                      }
                    }}
                  >
                    {/* Avatar doble para conversación */}
                    <div
                      className="relative flex-shrink-0 cursor-pointer group"
                      style={{ width: '40px', height: '40px' }}
                      title={`${participant1Name} ↔️ ${participant2Name}`}
                    >
                      <div className="relative" style={{ width: '40px', height: '40px' }}>
                        {/* Avatar 1 */}
                        <div
                          className="absolute rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold hover:ring-2 hover:ring-purple-400 transition-all"
                          style={{
                            width: '26px',
                            height: '26px',
                            border: '1.3px solid rgba(0, 0, 0, 0.1)',
                            fontSize: '11px',
                            top: '0',
                            left: '0',
                            zIndex: 2,
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onUserSelect) {
                              onUserSelect(participant1Name, null, { ...conv, selectedParticipant: participant1Name });
                            }
                          }}
                        >
                          {getInitials(participant1Name)}
                        </div>
                        {/* Avatar 2 */}
                        <div
                          className="absolute rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center text-white font-bold hover:ring-2 hover:ring-pink-400 transition-all"
                          style={{
                            width: '26px',
                            height: '26px',
                            border: '1.3px solid rgba(0, 0, 0, 0.1)',
                            fontSize: '11px',
                            bottom: '0',
                            right: '0',
                            zIndex: 1,
                            cursor: 'pointer'
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (onUserSelect) {
                              onUserSelect(participant2Name, null, { ...conv, selectedParticipant: participant2Name });
                            }
                          }}
                        >
                          {getInitials(participant2Name)}
                        </div>
                      </div>
                    </div>

                    {/* Info de la conversación */}
                    <div className="flex-1 min-w-0 flex flex-col relative" style={{ gap: '4px', position: 'relative' }}>
                      <div className="flex items-start justify-between gap-2 w-full min-w-0 relative" style={{ position: 'relative' }}>
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          {/* Indicador de Fijado */}
                          {isFavorite && (
                            <span
                              className="flex-shrink-0 text-yellow-500 font-semibold flex items-center gap-1"
                              style={{
                                fontSize: '10px',
                                lineHeight: '12px',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}
                            >
                              <PinIcon size={12} className="text-yellow-500" /> Fijado
                            </span>
                          )}
                          <div className="flex items-center gap-1 w-full min-w-0">
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-semibold text-[#111]"
                                style={{
                                  fontSize: '12px',
                                  lineHeight: '16px',
                                  fontFamily: 'Inter, sans-serif',
                                  fontWeight: 600,
                                  width: '100%',
                                  minWidth: 0,
                                  maxWidth: '100%',
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  wordBreak: 'break-word'
                                }}
                                title={`${participant1Name} • ${participant2Name}`}
                              >
                                {participant1Name} • {participant2Name}
                              </p>
                            </div>
                            {/* Botón de favorito */}
                            <button
                              onClick={(e) => handleToggleConversationFavorite(conv, e)}
                              className="flex-shrink-0 p-0.5 rounded-full hover:bg-gray-200 transition-all duration-200 opacity-0 group-hover:opacity-100"
                              style={{
                                opacity: isFavorite ? 1 : undefined,
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                              title={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
                            >
                              {isFavorite ? (
                                <FaStar className="text-yellow-500" size={12} />
                              ) : (
                                <FaRegStar className="text-gray-400" size={12} />
                              )}
                            </button>
                          </div>
                        </div>
                        {/* Timestamp */}
                        {conv.lastMessageTimestamp && (
                          <span className="conversation-timestamp">
                            {conv.lastMessageTimestamp}
                          </span>
                        )}
                      </div>

                      {/* Último mensaje */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {conv.lastMessage ? (
                            <>
                              {conv.lastMessageFrom && (
                                <span
                                  className="text-gray-500 font-medium"
                                  style={{
                                    fontSize: '12px',
                                    lineHeight: '16px',
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 500
                                  }}
                                >
                                  {conv.lastMessageFrom.split(' ')[0]}:{' '}
                                </span>
                              )}
                              <p
                                className="text-gray-600"
                                style={{
                                  fontSize: '12px',
                                  lineHeight: '16px',
                                  fontFamily: 'Inter, sans-serif',
                                  fontWeight: 400,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  wordBreak: 'break-word'
                                }}
                              >
                                {conv.lastMessageMediaType ? (
                                  <span className="flex items-center gap-1">
                                    {conv.lastMessageMediaType === 'image' && '📷 Imagen'}
                                    {conv.lastMessageMediaType === 'video' && '🎥 Video'}
                                    {conv.lastMessageMediaType === 'audio' && '🎵 Audio'}
                                    {conv.lastMessageMediaType === 'document' && '📄 Documento'}
                                    {!['image', 'video', 'audio', 'document'].includes(conv.lastMessageMediaType) && '📎 Archivo'}
                                  </span>
                                ) : conv.lastMessageThreadCount > 0 ? (
                                  // Si el último mensaje tiene respuestas en hilos, mostrar el contador
                                  <span className="flex items-center gap-1">
                                    <span className="text-gray-500">🧵</span>
                                    <span className="font-semibold text-[#00a884]">
                                      {conv.lastMessageThreadCount} {conv.lastMessageThreadCount === 1 ? 'respuesta' : 'respuestas'}
                                    </span>
                                    {conv.lastMessageLastReplyFrom && (
                                      <span className="text-gray-500">
                                        • {conv.lastMessageLastReplyFrom}
                                      </span>
                                    )}
                                  </span>
                                ) : (
                                  conv.lastMessage
                                )}
                              </p>
                            </>
                          ) : (
                            <p
                              className="text-gray-400 italic truncate"
                              style={{
                                fontSize: '12px',
                                lineHeight: '16px',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 400
                              }}
                            >
                              Sin mensajes aún
                            </p>
                          )}
                        </div>
                        {/* Ícono de menciones si el mensaje contiene una mención al usuario */}
                        {hasMentionToUser(conv.lastMessage) && (
                          <span aria-hidden="true" data-icon="mentions-refreshed" style={{ display: 'flex', alignItems: 'center', flexShrink: 0, marginRight: '4px' }}>
                            <svg viewBox="0 0 24 24" height="20" preserveAspectRatio="xMidYMid meet" fill="none">
                              <title>mentions-refreshed</title>
                              <path d="M11.9873 21C10.7513 21 9.58985 20.7663 8.50285 20.2989C7.4157 19.8314 6.46047 19.186 5.63715 18.3629C4.81397 17.5395 4.16862 16.5818 3.70108 15.4896C3.23369 14.3975 3 13.2305 3 11.9886C3 10.7469 3.23369 9.58368 3.70108 8.49906C4.16862 7.41444 4.81397 6.46047 5.63715 5.63715C6.46047 4.81397 7.41823 4.16862 8.51044 3.70108C9.6025 3.23369 10.7695 3 12.0114 3C13.2531 3 14.4163 3.23369 15.5009 3.70108C16.5856 4.16862 17.5395 4.81397 18.3629 5.63715C19.186 6.46047 19.8314 7.41332 20.2989 8.49571C20.7663 9.57824 21 10.7421 21 11.9873V13.3265C21 14.1986 20.6799 14.9414 20.0398 15.5547C19.3995 16.1681 18.6323 16.4748 17.7383 16.4748C17.205 16.4748 16.7143 16.3441 16.2661 16.0826C15.8177 15.8213 15.4436 15.4655 15.1436 15.0153C14.763 15.4804 14.2969 15.8399 13.7455 16.0938C13.1938 16.3478 12.612 16.4748 12 16.4748C10.7554 16.4748 9.69848 16.0396 8.82918 15.1693C7.95987 14.2989 7.52522 13.2408 7.52522 11.9949C7.52522 10.7489 7.96039 9.69253 8.83074 8.8256C9.70108 7.95868 10.7592 7.52522 12.0051 7.52522C13.2511 7.52522 14.3075 7.95987 15.1744 8.82917C16.0413 9.69848 16.4748 10.7554 16.4748 12V13.2256C16.4748 13.5789 16.6007 13.8778 16.8527 14.1224C17.1047 14.3669 17.404 14.4892 17.7506 14.4892C18.0972 14.4892 18.3923 14.3669 18.6361 14.1224C18.8799 13.8778 19.0019 13.5789 19.0019 13.2256V11.9873C19.0019 10.0528 18.3185 8.40442 16.9518 7.04199C15.585 5.67941 13.9344 4.99811 12 4.99811C10.0656 4.99811 8.41498 5.68149 7.04824 7.04824C5.68149 8.41498 4.99812 10.0656 4.99812 12C4.99812 13.9344 5.67941 15.585 7.04199 16.9518C8.40442 18.3185 10.0555 19.0019 11.9953 19.0019H15.2927C15.5739 19.0019 15.8097 19.0965 16 19.2858C16.1903 19.4752 16.2855 19.7099 16.2855 19.9898C16.2855 20.2667 16.1903 20.5043 16 20.7025C15.8097 20.9008 15.5739 21 15.2927 21H11.9873ZM12.0022 14.4892C12.6943 14.4892 13.2818 14.247 13.7646 13.7626C14.2477 13.2781 14.4892 12.6898 14.4892 11.9978C14.4892 11.3057 14.247 10.7182 13.7626 10.2354C13.2781 9.75234 12.6898 9.51084 11.9978 9.51084C11.3057 9.51084 10.7182 9.75301 10.2354 10.2374C9.75234 10.7219 9.51084 11.3102 9.51084 12.0022C9.51084 12.6943 9.75301 13.2818 10.2374 13.7646C10.7219 14.2477 11.3102 14.4892 12.0022 14.4892Z" fill="currentColor" style={{ color: '#00a884' }}></path>
                            </svg>
                          </span>
                        )}
                        {/* Badge de mensajes no leídos */}
                        {conv.unreadCount > 0 && (
                          <div
                            className="flex-shrink-0 rounded-full bg-[#00a884] text-white flex items-center justify-center"
                            style={{
                              minWidth: '20px',
                              height: '20px',
                              padding: '0 6px',
                              fontSize: '11px',
                              fontWeight: 600,
                              fontFamily: 'Inter, sans-serif'
                            }}
                          >
                            {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Paginación */}
              {monitoringTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 py-4 border-t border-gray-200">
                  <button
                    onClick={() => onLoadMonitoringConversations(monitoringPage - 1)}
                    disabled={monitoringPage === 1 || monitoringLoading}
                    className="px-3 py-1 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    ← Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {monitoringPage} de {monitoringTotalPages}
                  </span>
                  <button
                    onClick={() => onLoadMonitoringConversations(monitoringPage + 1)}
                    disabled={monitoringPage === monitoringTotalPages || monitoringLoading}
                    className="px-3 py-1 text-sm rounded-lg bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Siguiente →
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-[60px] px-5 text-center">
              <div className="text-5xl mb-4 opacity-50">👁️</div>
              <div className="text-sm text-gray-600 font-medium">
                {assignedSearchTerm ? `No se encontraron resultados para "${assignedSearchTerm}"` : 'No hay chats para monitorear'}
              </div>
            </div>
          );
          })()}
        </div>
      )}

      {/* Lista de conversaciones */}
      {activeModule === 'conversations' && (
        <div
          ref={conversationsListRef}
          className="flex-1 overflow-y-auto bg-white px-4"
          onScroll={handleScroll}
        >
          {/* Mostrar resultados de búsqueda de mensajes si hay búsqueda activa */}
          {searchTerm.trim() && messageSearchResults.length > 0 && (
            <div className="mb-4">
              <div className="text-xs text-gray-500 font-semibold mb-2 px-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                📝 Mensajes encontrados ({messageSearchResults.length})
              </div>
              {messageSearchResults.map((msg) => {
                const isGroupMsg = msg.isGroup;
                const conversationName = isGroupMsg ? msg.roomCode : msg.to;
                const messagePreview = msg.message || (msg.fileName ? `📎 ${msg.fileName}` : 'Archivo');

                return (
                  <div
                    key={msg.id}
                    className="flex items-start gap-3 p-3 mb-2 bg-yellow-50 border border-yellow-200 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors"
                    onClick={() => {
                      if (isGroupMsg) {
                        // Buscar el objeto de sala completo
                        const room = myActiveRooms?.find(r => r.roomCode === msg.roomCode);
                        if (room && onRoomSelect) {
                          // Navegar a grupo con el objeto completo y el messageId
                          onRoomSelect(room, msg.id);
                        } else {
                          console.error('Sala no encontrada:', msg.roomCode);
                        }
                      } else {
                        // Navegar a chat directo
                        onUserSelect(msg.to, null, msg.id);
                      }
                    }}
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-yellow-200 flex items-center justify-center text-lg">
                      {isGroupMsg ? '👥' : '💬'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-gray-800" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {conversationName}
                        </span>
                        <span className="text-xs text-gray-500">
                          {isGroupMsg ? 'Grupo' : 'Chat'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-700 truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
                        {messagePreview}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(msg.sentAt).toLocaleString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div className="border-t border-gray-200 my-3"></div>
            </div>
          )}

          {isSearching ? (
            <div className="p-5 text-center text-[#00a884] text-sm">
              <p>🔍 Buscando mensajes...</p>
            </div>
          ) : filteredConversations.length === 0 && messageSearchResults.length === 0 ? (
            <div className="p-5 text-center text-[#999] text-sm">
              {searchTerm.trim().length > 0 ? (
                <p>No se encontraron resultados para "{searchTerm}"</p>
              ) : !isAdmin && !isGroup ? (
                <>
                  <p>No tienes conversaciones asignadas</p>
                  <p className="text-xs mt-2">
                    Espera a que un administrador te asigne una conversación
                  </p>
                </>
              ) : (
                <p>No hay usuarios conectados</p>
              )}
            </div>
          ) : (
            <>
              {filteredConversations.map((conversation) => {
              const unreadCount = unreadMessages?.[conversation.username] || 0;

              // Determinar el nombre a mostrar
              const displayName = conversation.nombre && conversation.apellido
                ? `${conversation.nombre} ${conversation.apellido}`
                : conversation.username;

              // Obtener iniciales para el avatar
              const getInitials = () => {
                if (conversation.nombre && conversation.apellido) {
                  return `${conversation.nombre[0]}${conversation.apellido[0]}`.toUpperCase();
                }
                return conversation.username?.[0]?.toUpperCase() || 'U';
              };

              return (
                <div
                  key={conversation.id || conversation.username}
                  className={`flex items-center transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 ${conversation.username === user?.username ? 'bg-[#e9edef]' : ''} ${isGroup ? 'cursor-default opacity-60 hover:bg-transparent' : 'cursor-pointer'}`}
                  style={{
                    padding: '8px 12px',
                    gap: '10px',
                    minHeight: '60px'
                  }}
                  onClick={() => {
                    if (isGroup) return;
                    onUserSelect && onUserSelect(displayName);
                  }}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                    <div
                      className="rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold"
                      style={{
                        width: '40px',
                        height: '40px',
                        border: '1.3px solid rgba(0, 0, 0, 0.1)',
                        fontSize: '14px'
                      }}
                    >
                      {conversation.picture ? (
                        <img
                          src={conversation.picture}
                          alt={displayName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = getInitials();
                          }}
                        />
                      ) : (
                        getInitials()
                      )}
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col" style={{ gap: '2px' }}>
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col flex-1 min-w-0">
                        <h3
                          className="font-semibold text-[#111] truncate"
                          style={{
                            fontSize: '14px',
                            lineHeight: '18px',
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 600
                          }}
                        >
                          {displayName}
                        </h3>
                        <span
                          className="text-gray-500 truncate"
                          style={{
                            fontSize: '10px',
                            lineHeight: '12px',
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 300
                          }}
                        >
                          {conversation.role && conversation.numeroAgente ? (
                            <>Rol: {conversation.role} • N° Agente: {conversation.numeroAgente}</>
                          ) : conversation.numeroAgente ? (
                            <>N° Agente: {conversation.numeroAgente}</>
                          ) : (
                            <>Rol: {conversation.role || 'Sin rol'}</>
                          )}
                        </span>
                      </div>
                      <span className="conversation-timestamp">
                        {conversation.timestamp || ''}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        className="text-gray-600 truncate"
                        style={{
                          fontSize: '12px',
                          lineHeight: '16px',
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 400
                        }}
                      >
                        {conversation.lastMessage || 'Haz clic para chatear'}
                      </p>
                      {unreadCount > 0 && (
                        <span
                          className="bg-[#25d366] text-white font-bold rounded-full flex items-center justify-center ml-2 flex-shrink-0"
                          style={{
                            fontSize: '11.66px',
                            minWidth: '20px',
                            height: '20px',
                            padding: '0 6px'
                          }}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
              })}

              {/* Indicador de carga al final de la lista */}
              {userListLoading && (
                <div className="p-4 text-center text-gray-500 text-sm">
                  <p>⏳ Cargando más usuarios...</p>
                </div>
              )}

              {/* Mensaje cuando no hay más usuarios */}
              {!userListHasMore && !searchTerm && filteredConversations.length > 0 && (
                <div className="p-4 text-center text-gray-400 text-xs">
                  <p>✓ Todos los usuarios cargados</p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationList;

