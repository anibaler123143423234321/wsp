import { useState } from 'react';
import { FaTimes } from 'react-icons/fa';

const ConversationList = ({
  user,
  userList,
  assignedConversations = [],
  myActiveRooms,
  currentRoomCode,
  isGroup,
  onUserSelect,
  onRoomSelect,
  unreadMessages
}) => {
  const [activeModule, setActiveModule] = useState('conversations');
  const [searchTerm, setSearchTerm] = useState('');
  const [roomsSearchTerm, setRoomsSearchTerm] = useState('');
  const [assignedSearchTerm, setAssignedSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [isSearching] = useState(false);

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'JEFEPISO';

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
    return (
      conv.participant1?.toLowerCase().includes(searchLower) ||
      conv.participant2?.toLowerCase().includes(searchLower) ||
      conv.lastMessage?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="flex-1 flex flex-col bg-white max-[768px]:hidden">
      {/* Pestañas de módulos */}
      <div className="flex gap-2 border-b border-gray-200 bg-white px-6 pt-3">
        <button
          onClick={() => setActiveModule('conversations')}
          className={`
            px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200
            ${activeModule === 'conversations'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }
          `}
        >
          Conversaciones
        </button>
        {isAdmin && (
          <>
            <button
              onClick={() => setActiveModule('rooms')}
              className={`
                relative px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200
                ${activeModule === 'rooms'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              `}
            >
              Salas Activas
              {myActiveRooms && myActiveRooms.length > 0 && (
                <span className="ml-2 inline-block bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center">
                  {myActiveRooms.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveModule('assigned')}
              className={`
                relative px-4 py-2.5 text-sm font-semibold border-b-2 transition-all duration-200
                ${activeModule === 'assigned'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }
              `}
            >
              Chats Asignados
              {assignedConversations && assignedConversations.length > 0 && (
                <span className="ml-2 inline-block bg-blue-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[18px] text-center">
                  {assignedConversations.length}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Barra de búsqueda */}
      <div className="bg-white flex flex-col" style={{ paddingTop: '44.05px', paddingLeft: '27.21px', paddingRight: '27.21px', paddingBottom: '20px' }}>
        {/* Input de búsqueda */}
        <div
          className="relative flex items-center bg-[#E8E8E8] overflow-hidden"
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
          <span className="text-gray-500 flex-shrink-0" style={{ fontSize: '15.55px' }}>🔍</span>
          <input
            type="text"
            placeholder={
              activeModule === 'rooms' ? 'Buscar salas...' :
              activeModule === 'assigned' ? 'Buscar chats asignados...' :
              'Buscar'
            }
            className="flex-1 bg-transparent border-none text-gray-800 outline-none placeholder:text-gray-400"
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
              className="bg-transparent border-none text-gray-500 cursor-pointer p-1 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-gray-200 hover:text-gray-800 active:scale-95"
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
          <div className="flex items-center gap-2 mt-4">
            <span 
              className="text-gray-600"
              style={{
                width: '89px',
                height: '21px',
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
              className="bg-transparent border-none text-[#33B8FF] cursor-pointer outline-none"
              style={{
                fontFamily: 'Inter, sans-serif',
                fontWeight: 400,
                fontSize: '15.55px',
                lineHeight: '20.73px',
                gap: '9.07px'
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
        <div className="flex-1 overflow-y-auto bg-white">
          {myActiveRooms && myActiveRooms.length > 0 ? (
            <div className="p-2.5">
              {myActiveRooms
                .filter(room =>
                  roomsSearchTerm.trim() === '' ||
                  room.name.toLowerCase().includes(roomsSearchTerm.toLowerCase()) ||
                  room.roomCode.toLowerCase().includes(roomsSearchTerm.toLowerCase())
                )
                .map((room) => (
                  <div
                    key={room.id}
                    className={`p-3 mb-2 rounded-lg cursor-pointer bg-white transition-all duration-200 hover:bg-gray-100 ${currentRoomCode === room.roomCode ? 'bg-[#e7f3f0] shadow-[0_2px_4px_rgba(0,168,132,0.1)]' : ''}`}
                    onClick={() => onRoomSelect && onRoomSelect(room)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        <div className="font-semibold text-sm text-[#111] mb-1">
                          🏠 {room.name}
                        </div>
                        <div className="text-xs text-gray-600">
                          Código: {room.roomCode} • {room.currentMembers}/{room.maxCapacity} usuarios
                        </div>
                      </div>
                      <div className="text-base ml-2.5">
                        {room.isActive ? '🟢' : '🔴'}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
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

      {activeModule === 'assigned' && isAdmin && (
        <div className="flex-1 overflow-y-auto bg-white">
          {(() => {
            return filteredAssigned.length > 0 ? (
              <div className="p-2.5">
                {filteredAssigned.map((conv) => (
                  <div
                    key={conv.id}
                    className="p-3 mb-2 rounded-lg cursor-pointer bg-white transition-all duration-200 hover:bg-gray-100"
                    onClick={() => {
                      console.log('Admin viendo conversación:', conv);
                    }}
                  >
                    <div className="flex justify-between items-center mb-1">
                      <div className="font-semibold text-sm text-[#111]">
                        {conv.participant1} ↔️ {conv.participant2}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
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
        <div className="flex-1 overflow-y-auto bg-white px-4">
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
            filteredConversations.map((conversation) => {
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
                    padding: '12px 16px',
                    gap: '12px',
                    minHeight: '72px'
                  }}
                  onClick={() => {
                    if (isGroup) return;
                    onUserSelect && onUserSelect(displayName);
                  }}
                >
                  {/* Avatar */}
                  <div className="relative flex-shrink-0" style={{ width: '46.64px', height: '46.64px' }}>
                    <div
                      className="rounded-full overflow-hidden bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white font-bold"
                      style={{
                        width: '46.64px',
                        height: '46.64px',
                        border: '1.3px solid rgba(0, 0, 0, 0.1)',
                        fontSize: '16px'
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
                  <div className="flex-1 min-w-0 flex flex-col" style={{ gap: '7.77px' }}>
                    <div className="flex items-center justify-between">
                      <h3
                        className="font-semibold text-[#111] truncate"
                        style={{
                          fontSize: '15.55px',
                          lineHeight: '20.73px',
                          fontFamily: 'Inter, sans-serif',
                          fontWeight: 600
                        }}
                      >
                        {displayName}
                      </h3>
                      <span
                        className="text-gray-500 ml-2 flex-shrink-0"
                        style={{
                          fontSize: '12.44px',
                          lineHeight: '16.59px',
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
                          fontSize: '13.99px',
                          lineHeight: '18.66px',
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
            })
          )}
        </div>
      )}
    </div>
  );
};

export default ConversationList;

