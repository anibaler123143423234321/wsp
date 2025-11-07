import { useState, useRef, useCallback } from 'react';
import { FaTimes, FaBars, FaSignInAlt } from 'react-icons/fa';
import { MessageSquare, Home, UserCheck } from 'lucide-react';
import clsx from 'clsx';

// Componente reutilizable para cada pestaña (botón)
const TabButton = ({ isActive, onClick, label, shortLabel, icon: Icon, notificationCount }) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        // Clases base para todos los botones
        'relative flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm transition-all duration-200 whitespace-nowrap flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
        // Clases condicionales
        {
          'bg-blue-50 text-blue-600 font-semibold shadow-sm': isActive,
          'text-gray-600 hover:bg-gray-50 hover:text-gray-900 font-medium': !isActive,
        },
        // Responsive MacBook Air y tablets
        'max-[1280px]:px-2 max-[1280px]:py-1.5 max-[1280px]:text-xs max-[1280px]:gap-1.5',
        'max-[1024px]:px-2 max-[1024px]:py-1 max-[1024px]:text-[11px] max-[1024px]:gap-1',
        // Responsive mobile
        'max-[768px]:px-2.5 max-[768px]:py-1.5 max-[768px]:text-xs max-[768px]:gap-1'
      )}
      style={{
        fontFamily: 'Inter, sans-serif',
        fontSize: '14px',
      }}
    >
      {/* El componente Icono se pasa como prop */}
      <Icon size={18} strokeWidth={2} className="max-[1280px]:w-4 max-[1280px]:h-4 max-[1024px]:w-3.5 max-[1024px]:h-3.5 max-[768px]:w-4 max-[768px]:h-4" />

      {/* Texto del label - usa shortLabel en pantallas pequeñas si está disponible */}
      <span className="max-[1280px]:text-[11px] max-[1024px]:text-[10px] max-[768px]:text-[11px]">
        <span className="max-[1024px]:hidden">{label}</span>
        <span className="hidden max-[1024px]:inline">{shortLabel || label}</span>
      </span>

      {/* Badge de notificaciones - posicionado absolutamente para no afectar el layout */}
      {notificationCount > 0 && (
        <span className="absolute -top-2 -right-2 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-[10px] font-bold text-white shadow-md max-[1280px]:h-4 max-[1280px]:min-w-[16px] max-[1280px]:text-[8px] max-[1280px]:-top-1.5 max-[1280px]:-right-1.5 max-[1024px]:h-3.5 max-[1024px]:min-w-[14px] max-[1024px]:text-[7px] max-[1024px]:-top-1 max-[1024px]:-right-1 max-[768px]:h-4 max-[768px]:min-w-[16px] max-[768px]:text-[8px] max-[768px]:-top-1.5 max-[768px]:-right-1.5">
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
  onLoadMoreUsers
}) => {
  const [activeModule, setActiveModule] = useState('conversations');
  const [searchTerm, setSearchTerm] = useState('');
  const [roomsSearchTerm, setRoomsSearchTerm] = useState('');
  const [assignedSearchTerm, setAssignedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isSearching] = useState(false);
  const conversationsListRef = useRef(null);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'JEFEPISO';

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

  // Definimos las pestañas como un array de objetos
  const tabs = [
    {
      id: 'conversations',
      label: 'Conversaciones',
      shortLabel: 'Chats', // Label corto para pantallas pequeñas
      icon: MessageSquare,
      notificationCount: 0,
      adminOnly: false,
    },
    {
      id: 'rooms',
      label: 'Salas Activas',
      shortLabel: 'Salas', // Label corto para pantallas pequeñas
      icon: Home,
      notificationCount: myActiveRooms?.length || 0,
      adminOnly: false, // Permitir que todos vean sus salas activas
      showOnlyIfHasRooms: true, // Solo mostrar si tiene salas activas
    },
    {
      id: 'assigned',
      label: 'Chats Asignados',
      shortLabel: 'Asignados', // Label corto para pantallas pequeñas
      icon: UserCheck,
      notificationCount: assignedConversations?.length || 0,
      adminOnly: false, // Cambiar a false para que todos puedan ver sus chats asignados
      showOnlyIfHasConversations: true, // Solo mostrar si tiene conversaciones asignadas
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
        <span className="text-sm font-semibold text-gray-700">Conversaciones</span>
        <div className="w-10"></div> {/* Spacer para centrar el título */}
      </div>

      {/* Pestañas de módulos */}
      <div className="flex gap-2 bg-white overflow-x-auto scrollbar-hide max-[1280px]:!px-3 max-[1280px]:!py-2 max-[1280px]:!gap-1.5 max-[1024px]:!px-2 max-[1024px]:!py-1.5 max-[1024px]:!gap-1 max-[768px]:!gap-1 max-[768px]:!px-2 max-[768px]:!py-2 max-[768px]:!mt-2" style={{ paddingLeft: '27.21px', paddingRight: '27.21px', paddingTop: '20px', paddingBottom: '8px', marginTop: '8px' }}>
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

      {/* Barra de búsqueda */}
      <div className="bg-white flex flex-col max-[1280px]:!px-3 max-[1280px]:!py-2 max-[1024px]:!px-2 max-[1024px]:!py-1.5 max-[768px]:!px-3 max-[768px]:!py-2" style={{ paddingTop: '12px', paddingLeft: '27.21px', paddingRight: '27.21px', paddingBottom: '12px' }}>
        {/* Input de búsqueda */}
        <div
          className="relative flex items-center bg-[#E8E8E8] overflow-hidden max-[1280px]:!w-full max-[1280px]:!h-10 max-[1280px]:!px-3 max-[1280px]:!py-2 max-[1280px]:!gap-2 max-[1024px]:!h-9 max-[1024px]:!px-2.5 max-[1024px]:!py-1.5 max-[1024px]:!gap-1.5 max-[768px]:!w-full max-[768px]:!h-10 max-[768px]:!px-3 max-[768px]:!py-2 max-[768px]:!gap-2"
          style={{
            width: '377.03px',
            height: '46.64px',
            borderRadius: '15.55px',
            paddingTop: '12.96px',
            paddingRight: '15.55px',
            paddingBottom: '12.96px',
            paddingLeft: '15.55px',
            gap: '20.73px'
          }}
        >
          <span className="text-gray-500 flex-shrink-0 max-[1280px]:!text-sm max-[1024px]:!text-xs max-[768px]:!text-sm" style={{ fontSize: '15.55px' }}>🔍</span>
          <input
            type="text"
            placeholder={
              activeModule === 'rooms' ? 'Buscar salas...' :
              activeModule === 'assigned' ? 'Buscar chats asignados...' :
              'Buscar'
            }
            className="flex-1 bg-transparent border-none text-gray-800 outline-none placeholder:text-gray-400 max-[1280px]:!text-sm max-[1280px]:placeholder:!text-xs max-[1024px]:!text-xs max-[1024px]:placeholder:!text-[11px] max-[768px]:!text-sm max-[768px]:placeholder:!text-xs"
            style={{
              fontSize: '15.55px',
              lineHeight: '20.73px',
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400
            }}
            value={
              activeModule === 'rooms' ? roomsSearchTerm :
              activeModule === 'assigned' ? assignedSearchTerm :
              searchTerm
            }
            onChange={(e) => {
              if (activeModule === 'rooms') {
                setRoomsSearchTerm(e.target.value);
              } else if (activeModule === 'assigned') {
                setAssignedSearchTerm(e.target.value);
              } else {
                setSearchTerm(e.target.value);
              }
            }}
          />
          {((activeModule === 'conversations' && searchTerm) ||
            (activeModule === 'rooms' && roomsSearchTerm) ||
            (activeModule === 'assigned' && assignedSearchTerm)) && (
            <button
              className="bg-transparent border-none text-gray-500 cursor-pointer p-1 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-gray-200 hover:text-gray-800 active:scale-95 max-[1280px]:!text-sm max-[1024px]:!text-xs max-[1024px]:!p-0.5"
              style={{ fontSize: '15.55px' }}
              onClick={() => {
                if (activeModule === 'rooms') {
                  setRoomsSearchTerm('');
                } else if (activeModule === 'assigned') {
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
      {activeModule === 'rooms' && isAdmin && (
        <div className="flex-1 overflow-y-auto bg-white px-4">
          {myActiveRooms && myActiveRooms.length > 0 ? (
            <>
              {myActiveRooms
                .filter(room =>
                  roomsSearchTerm.trim() === '' ||
                  room.name.toLowerCase().includes(roomsSearchTerm.toLowerCase()) ||
                  room.roomCode.toLowerCase().includes(roomsSearchTerm.toLowerCase())
                )
                .map((room) => (
                  <div
                    key={room.id}
                    className={`flex items-center transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer ${currentRoomCode === room.roomCode ? 'bg-[#e7f3f0]' : ''}`}
                    style={{
                      padding: '8px 12px',
                      gap: '10px',
                      minHeight: '60px'
                    }}
                    onClick={() => onRoomSelect && onRoomSelect(room)}
                  >
                    {/* Icono de sala */}
                    <div className="relative flex-shrink-0" style={{ width: '40px', height: '40px' }}>
                      <div
                        className="rounded-full overflow-hidden bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center text-white font-bold"
                        style={{
                          width: '40px',
                          height: '40px',
                          border: '1.3px solid rgba(0, 0, 0, 0.1)',
                          fontSize: '18px'
                        }}
                      >
                        🏠
                      </div>
                    </div>

                    {/* Info de la sala */}
                    <div className="flex-1 min-w-0 flex flex-col" style={{ gap: '4px' }}>
                      <div className="flex items-center justify-between">
                        <h3
                          className="font-semibold text-[#111] truncate"
                          style={{
                            fontSize: '14px',
                            lineHeight: '18px',
                            fontFamily: 'Inter, sans-serif',
                            fontWeight: 600
                          }}
                        >
                          {room.name}
                        </h3>
                        <span
                          className="ml-2 flex-shrink-0"
                          style={{ fontSize: '20px' }}
                        >
                          {room.isActive ? '🟢' : '🔴'}
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
                          Código: {room.roomCode} • {room.currentMembers}/{room.maxCapacity} usuarios
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
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
            return filteredAssigned.length > 0 ? (
              <>
                {filteredAssigned.map((conv) => {
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

                  return (
                    <div
                      key={conv.id}
                      className="flex items-center transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer"
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

