import { useState, useRef, useCallback, useEffect } from 'react';
import { FaTimes, FaBars, FaSignInAlt, FaStar, FaRegStar } from 'react-icons/fa';
import { MessageSquare, Home, UserCheck } from 'lucide-react';
import clsx from 'clsx';
import apiService from '../apiService';

// Componente reutilizable para cada pestaña (botón)
const TabButton = ({ isActive, onClick, label, shortLabel, icon: Icon, notificationCount }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        // Clases base para todos los botones - MÁS COMPACTO
        'relative flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all duration-200 whitespace-nowrap flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2',
        // Clases condicionales
        {
          'bg-red-50 text-red-600 font-semibold shadow-sm': isActive,
          'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium': !isActive,
        },
        // Responsive MacBook Air y tablets
        'max-[1280px]:px-2 max-[1280px]:py-1 max-[1280px]:text-xs max-[1280px]:gap-1.5',
        'max-[1024px]:px-2 max-[1024px]:py-1 max-[1024px]:text-[11px] max-[1024px]:gap-1',
        // Responsive mobile
        'max-[768px]:px-1.5 max-[768px]:py-1 max-[768px]:text-[10px] max-[768px]:gap-1'
      )}
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
      }}
    >
      {/* El componente Icono se pasa como prop - MÁS PEQUEÑO */}
      <Icon size={16} strokeWidth={2} className="max-[1280px]:w-4 max-[1280px]:h-4 max-[1024px]:w-3.5 max-[1024px]:h-3.5 max-[768px]:w-3 max-[768px]:h-3" />

      {/* Texto del label - usa shortLabel en pantallas pequeñas si está disponible */}
      <span className="font-medium max-[1280px]:text-xs max-[1024px]:text-[11px] max-[768px]:text-[10px]">
        <span className="max-[1024px]:hidden">{label}</span>
        <span className="hidden max-[1024px]:inline">{shortLabel || label}</span>
      </span>

      {/* Badge de notificaciones - MÁS COMPACTO */}
      {notificationCount > 0 && (
        <span className="absolute -top-1.5 -right-1.5 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white shadow-md ring-2 ring-white max-[1280px]:h-4 max-[1280px]:min-w-[16px] max-[1280px]:text-[9px] max-[1280px]:-top-1 max-[1280px]:-right-1 max-[1024px]:h-4 max-[1024px]:min-w-[16px] max-[1024px]:text-[9px] max-[1024px]:-top-1 max-[1024px]:-right-1 max-[768px]:h-3.5 max-[768px]:min-w-[14px] max-[768px]:text-[8px] max-[768px]:-top-1 max-[768px]:-right-1">
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
  // 🔥 Módulo activo por defecto: 'assigned' (Chats Asignados)
  const [activeModule, setActiveModule] = useState('assigned');
  const [searchTerm, setSearchTerm] = useState('');
  const [roomsSearchTerm, setRoomsSearchTerm] = useState('');
  const [assignedSearchTerm, setAssignedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isSearching] = useState(false);
  const conversationsListRef = useRef(null);
  const [favoriteRoomCodes, setFavoriteRoomCodes] = useState([]); // Códigos de salas favoritas
  const [favoriteConversationIds, setFavoriteConversationIds] = useState([]); // IDs de conversaciones favoritas

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'JEFEPISO';

  // Obtener el displayName del usuario
  const getDisplayName = () => {
    if (!user) return '';
    return user.nombre && user.apellido
      ? `${user.nombre} ${user.apellido}`
      : user.username;
  };

  // Cargar favoritos al montar el componente
  useEffect(() => {
    const loadFavorites = async () => {
      const displayName = getDisplayName();
      if (!displayName) return;

      try {
        // Cargar favoritos de salas
        const roomCodes = await apiService.getUserFavoriteRoomCodes(displayName);
        setFavoriteRoomCodes(roomCodes);

        // Cargar favoritos de conversaciones
        const conversationIds = await apiService.getUserFavoriteConversationIds(displayName);
        setFavoriteConversationIds(conversationIds);
      } catch (error) {
        console.error('Error al cargar favoritos:', error);
      }
    };

    loadFavorites();
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
      console.log('📄 Cargando más usuarios...');
      onLoadMoreUsers();
    }
  }, [onLoadMoreUsers, userListHasMore, userListLoading]);

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

  // Filtrar conversaciones para monitoreo (SOLO las que NO son del usuario)
  const monitoringConversations = assignedConversations.filter(conv => {
    const displayName = getDisplayName();
    return !conv.participants?.includes(displayName);
  });

  // Contar solo conversaciones NO LEÍDAS para cada módulo
  const unreadAssignedCount = myAssignedConversations.filter(conv => conv.unreadCount > 0).length;
  const unreadMonitoringCount = monitoringConversations.filter(conv => conv.unreadCount > 0).length;
  const unreadRoomsCount = myActiveRooms?.filter(room => {
    // Contar mensajes no leídos en salas
    const roomUnread = unreadMessages?.[room.roomCode] || 0;
    return roomUnread > 0;
  }).length || 0;

  // Definimos las pestañas como un array de objetos
  // 🔥 Para ADMIN: Chats Asignados, Chats Monitoreo, Grupos Activos
  // 🔥 Para usuarios normales: Chats Asignados, Grupos Activos
  // 🔥 CONTADOR: Solo muestra conversaciones/grupos NO LEÍDOS
  const tabs = isAdmin ? [
    {
      id: 'assigned',
      label: 'Chats Asignados',
      shortLabel: 'Asignados',
      icon: UserCheck,
      notificationCount: unreadAssignedCount, // Solo no leídos
      adminOnly: false,
      showOnlyIfHasConversations: true,
    },
    {
      id: 'monitoring',
      label: 'Chats Monitoreo',
      shortLabel: 'Monitoreo',
      icon: MessageSquare,
      notificationCount: unreadMonitoringCount, // Solo no leídos
      adminOnly: true,
    },
    {
      id: 'rooms',
      label: 'Grupos Activos',
      shortLabel: 'Grupos',
      icon: Home,
      notificationCount: unreadRoomsCount, // Solo no leídos
      adminOnly: false,
      showOnlyIfHasRooms: true,
    },
  ] : [
    {
      id: 'assigned',
      label: 'Chats Asignados',
      shortLabel: 'Asignados',
      icon: UserCheck,
      notificationCount: unreadAssignedCount, // Solo no leídos
      adminOnly: false,
      showOnlyIfHasConversations: true,
    },
    {
      id: 'rooms',
      label: 'Grupos Activos',
      shortLabel: 'Grupos',
      icon: Home,
      notificationCount: unreadRoomsCount, // Solo no leídos
      adminOnly: false,
      showOnlyIfHasRooms: true,
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-white max-[768px]:w-full">
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

      {/* Pestañas de módulos - MÁS COMPACTO */}
      <div className="flex gap-1.5 bg-white overflow-x-auto scrollbar-hide max-[1280px]:!px-3 max-[1280px]:!py-1.5 max-[1280px]:!gap-1 max-[1024px]:!px-2 max-[1024px]:!py-1 max-[1024px]:!gap-1 max-[768px]:!gap-1 max-[768px]:!px-2 max-[768px]:!py-1.5 max-[768px]:!mt-1" style={{ paddingLeft: '16px', paddingRight: '16px', paddingTop: '12px', paddingBottom: '6px', marginTop: '6px' }}>
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
          <span className="text-gray-500 flex-shrink-0 max-[1280px]:!text-sm max-[1024px]:!text-xs max-[768px]:!text-sm" style={{ fontSize: '14px' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar..."
            className="flex-1 bg-transparent border-none text-gray-800 outline-none placeholder:text-gray-400 max-[1280px]:!text-sm max-[1280px]:placeholder:!text-xs max-[1024px]:!text-xs max-[1024px]:placeholder:!text-[11px] max-[768px]:!text-sm max-[768px]:placeholder:!text-xs"
            style={{
              fontSize: '13px',
              lineHeight: '18px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400
            }}
            value={
              activeModule === 'rooms' ? roomsSearchTerm :
              activeModule === 'assigned' || activeModule === 'monitoring' ? assignedSearchTerm :
              searchTerm
            }
            onChange={(e) => {
              if (activeModule === 'rooms') {
                setRoomsSearchTerm(e.target.value);
              } else if (activeModule === 'assigned' || activeModule === 'monitoring') {
                setAssignedSearchTerm(e.target.value);
              } else {
                setSearchTerm(e.target.value);
              }
            }}
          />
          {((activeModule === 'conversations' && searchTerm) ||
            (activeModule === 'rooms' && roomsSearchTerm) ||
            (activeModule === 'assigned' && assignedSearchTerm) ||
            (activeModule === 'monitoring' && assignedSearchTerm)) && (
            <button
              className="bg-transparent border-none text-gray-500 cursor-pointer p-0.5 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-gray-200 hover:text-gray-800 active:scale-95 max-[1280px]:!text-xs max-[1024px]:!text-[11px] max-[1024px]:!p-0.5"
              style={{ fontSize: '13px' }}
              onClick={() => {
                if (activeModule === 'rooms') {
                  setRoomsSearchTerm('');
                } else if (activeModule === 'assigned' || activeModule === 'monitoring') {
                  setAssignedSearchTerm('');
                } else {
                  setSearchTerm('');
                }
              }}
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Ordenar por */}
        {activeModule === 'conversations' && (
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
      {activeModule === 'rooms' && (
        <div className="flex-1 overflow-y-auto bg-white px-4">
          {myActiveRooms && myActiveRooms.length > 0 ? (
            <>
              {myActiveRooms
                .filter(room =>
                  roomsSearchTerm.trim() === '' ||
                  room.name.toLowerCase().includes(roomsSearchTerm.toLowerCase()) ||
                  room.roomCode.toLowerCase().includes(roomsSearchTerm.toLowerCase())
                )
                // Ordenar: favoritas primero, luego por fecha
                .sort((a, b) => {
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
                                className="flex-shrink-0 text-yellow-500 font-semibold"
                                style={{
                                  fontSize: '10px',
                                  lineHeight: '12px',
                                  fontFamily: 'Inter, sans-serif',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}
                              >
                                📌 Fijado
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
                        <div className="flex items-center justify-between">
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
                              <span className="animate-pulse">✍️</span>
                              {typingUsers.length === 1
                                ? `${typingUsers[0]} está escribiendo...`
                                : `${typingUsers.length} personas están escribiendo...`
                              }
                            </p>
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
                        </div>
                      </div>
                    </div>
                  );
                })}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-[60px] px-5 text-center">
              <div className="text-5xl mb-4 opacity-50">🏠</div>
              <div className="text-sm text-gray-600 font-medium">
                {roomsSearchTerm ? `No se encontraron resultados para "${roomsSearchTerm}"` : 'No tienes salas activas'}
              </div>
            </div>
          )}
        </div>
      )}

      {activeModule === 'assigned' && (
        <div className="flex-1 overflow-y-auto bg-white px-4">
          {(() => {
            // Filtrar solo las conversaciones donde el usuario es participante
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

            return myConversations.length > 0 ? (
              <>
                {myConversations
                  // Ordenar: favoritas primero, luego por fecha
                  .sort((a, b) => {
                    const aIsFavorite = favoriteConversationIds.includes(a.id);
                    const bIsFavorite = favoriteConversationIds.includes(b.id);

                    // Si una es favorita y la otra no, la favorita va primero
                    if (aIsFavorite && !bIsFavorite) return -1;
                    if (!aIsFavorite && bIsFavorite) return 1;

                    // Si ambas son favoritas o ninguna lo es, ordenar por fecha del último mensaje
                    return new Date(b.lastMessageTime || b.createdAt) - new Date(a.lastMessageTime || a.createdAt);
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
                      className="flex items-center transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer group"
                      style={{
                        padding: '8px 12px',
                        gap: '10px',
                        minHeight: '60px'
                      }}
                      onClick={() => {
                        console.log('Usuario viendo conversación asignada:', conv);
                        // Llamar a onUserSelect con los datos de la conversación
                        if (onUserSelect) {
                          onUserSelect(conv.name, null, conv);
                        }
                      }}
                    >
                      {/* Avatar doble para conversación */}
                      <div className="relative flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                        <div className="relative" style={{ width: '40px', height: '40px' }}>
                          {/* Avatar 1 */}
                          <div
                            className="absolute rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold"
                            style={{
                              width: '26px',
                              height: '26px',
                              border: '1.3px solid rgba(0, 0, 0, 0.1)',
                              fontSize: '10px',
                              top: '0',
                              left: '0',
                              zIndex: 2
                            }}
                          >
                            {getInitials(participant1Name)}
                          </div>
                          {/* Avatar 2 */}
                          <div
                            className="absolute rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center text-white font-bold"
                            style={{
                              width: '26px',
                              height: '26px',
                              border: '1.3px solid rgba(0, 0, 0, 0.1)',
                              fontSize: '10px',
                              bottom: '0',
                              right: '0',
                              zIndex: 1
                            }}
                          >
                            {getInitials(participant2Name)}
                          </div>
                        </div>
                      </div>

                      {/* Info de la conversación */}
                      <div className="flex-1 min-w-0 flex flex-col" style={{ gap: '4px' }}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex flex-col gap-1 flex-1 min-w-0">
                            {/* Indicador de Fijado */}
                            {isFavorite && (
                              <span
                                className="flex-shrink-0 text-yellow-500 font-semibold"
                                style={{
                                  fontSize: '10px',
                                  lineHeight: '12px',
                                  fontFamily: 'Inter, sans-serif',
                                  fontWeight: 600,
                                  textTransform: 'uppercase',
                                  letterSpacing: '0.5px'
                                }}
                              >
                                📌 Fijado
                              </span>
                            )}
                            <div className="flex items-center gap-2">
                              <h3
                                className="font-semibold text-[#111] flex-1 min-w-0"
                                style={{
                                  fontSize: '14px',
                                  lineHeight: '18px',
                                  fontFamily: 'Inter, sans-serif',
                                  fontWeight: 600,
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical',
                                  overflow: 'hidden',
                                  wordBreak: 'break-word'
                                }}
                                title={`${participant1Name} ↔️ ${participant2Name}`}
                              >
                                {participant1Name} ↔️ {participant2Name}
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
                            <span
                              className="text-gray-500 flex-shrink-0"
                              style={{
                                fontSize: '11px',
                                lineHeight: '14px',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 400
                              }}
                            >
                              {new Date(conv.lastMessageTime).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
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
        <div className="flex-1 overflow-y-auto bg-white px-4">
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
                // Ordenar: favoritas primero, luego por fecha
                .sort((a, b) => {
                  const aIsFavorite = favoriteConversationIds.includes(a.id);
                  const bIsFavorite = favoriteConversationIds.includes(b.id);

                  // Si una es favorita y la otra no, la favorita va primero
                  if (aIsFavorite && !bIsFavorite) return -1;
                  if (!aIsFavorite && bIsFavorite) return 1;

                  // Si ambas son favoritas o ninguna lo es, ordenar por fecha del último mensaje
                  return new Date(b.lastMessageTime || b.createdAt) - new Date(a.lastMessageTime || a.createdAt);
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
                    className="flex items-center transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer group"
                    style={{
                      padding: '8px 12px',
                      gap: '10px',
                      minHeight: '60px'
                    }}
                    onClick={() => {
                      console.log('Admin monitoreando conversación:', conv);
                      // Llamar a onUserSelect con los datos de la conversación
                      if (onUserSelect) {
                        onUserSelect(conv.name, null, conv);
                      }
                    }}
                  >
                    {/* Avatar doble para conversación */}
                    <div className="relative flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                      <div className="relative" style={{ width: '40px', height: '40px' }}>
                        {/* Avatar 1 */}
                        <div
                          className="absolute rounded-full overflow-hidden bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-bold"
                          style={{
                            width: '26px',
                            height: '26px',
                            border: '1.3px solid rgba(0, 0, 0, 0.1)',
                            fontSize: '10px',
                            top: '0',
                            left: '0',
                            zIndex: 2
                          }}
                        >
                          {getInitials(participant1Name)}
                        </div>
                        {/* Avatar 2 */}
                        <div
                          className="absolute rounded-full overflow-hidden bg-gradient-to-br from-pink-500 to-pink-700 flex items-center justify-center text-white font-bold"
                          style={{
                            width: '26px',
                            height: '26px',
                            border: '1.3px solid rgba(0, 0, 0, 0.1)',
                            fontSize: '10px',
                            bottom: '0',
                            right: '0',
                            zIndex: 1
                          }}
                        >
                          {getInitials(participant2Name)}
                        </div>
                      </div>
                    </div>

                    {/* Info de la conversación */}
                    <div className="flex-1 min-w-0 flex flex-col" style={{ gap: '4px' }}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-col gap-1 flex-1 min-w-0">
                          {/* Indicador de Fijado */}
                          {isFavorite && (
                            <span
                              className="flex-shrink-0 text-yellow-500 font-semibold"
                              style={{
                                fontSize: '10px',
                                lineHeight: '12px',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 600,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}
                            >
                              📌 Fijado
                            </span>
                          )}
                          <div className="flex items-center gap-2">
                            <h3
                              className="font-semibold text-[#111] flex-1 min-w-0"
                              style={{
                                fontSize: '14px',
                                lineHeight: '18px',
                                fontFamily: 'Inter, sans-serif',
                                fontWeight: 600,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                wordBreak: 'break-word'
                              }}
                              title={`${participant1Name} ↔️ ${participant2Name}`}
                            >
                              {participant1Name} ↔️ {participant2Name}
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
                      </div>

                      {/* Último mensaje */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          {conv.lastMessage ? (
                            <>
                              {conv.lastMessageSender && (
                                <span
                                  className="text-gray-500 font-medium"
                                  style={{
                                    fontSize: '12px',
                                    lineHeight: '16px',
                                    fontFamily: 'Inter, sans-serif',
                                    fontWeight: 500
                                  }}
                                >
                                  {conv.lastMessageSender}:{' '}
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
          {isSearching ? (
            <div className="p-5 text-center text-[#00a884] text-sm">
              <p>🔍 Buscando mensajes...</p>
            </div>
          ) : filteredConversations.length === 0 ? (
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
                      <span
                        className="text-gray-500 ml-2 flex-shrink-0"
                        style={{
                          fontSize: '11px',
                          lineHeight: '14px',
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 400
                        }}
                      >
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

