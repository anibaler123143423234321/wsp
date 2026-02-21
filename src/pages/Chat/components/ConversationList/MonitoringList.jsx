import React from 'react';
import { FaStar, FaRegStar } from 'react-icons/fa';

const PinIcon = ({ size = 14, className, style }) => (
    <svg viewBox="0 0 20 20" height={size} width={size} fill="none" className={className} style={{ flexShrink: 0, ...style }}>
        <path d="M13.5 4.5V11L15.2708 12.7708C15.3403 12.8403 15.3958 12.9201 15.4375 13.0104C15.4792 13.1007 15.5 13.2014 15.5 13.3125V13.746C15.5 13.9597 15.4281 14.1388 15.2844 14.2833C15.1406 14.4278 14.9625 14.5 14.75 14.5H10.75V19.125C10.75 19.3375 10.6785 19.5156 10.5356 19.6594C10.3927 19.8031 10.2156 19.875 10.0044 19.875C9.79313 19.875 9.61458 19.8031 9.46875 19.6594C9.32292 19.5156 9.25 19.3375 9.25 19.125V14.5H5.25C5.0375 14.5 4.85938 14.4278 4.71563 14.2833C4.57188 14.1388 4.5 13.9597 4.5 13.746V13.3125C4.5 13.2014 4.52083 13.1007 4.5625 13.0104C4.60417 12.9201 4.65972 12.8403 4.72917 12.7708L6.5 11V4.5H6.25C6.0375 4.5 5.85938 4.42854 5.71563 4.28563C5.57188 4.14271 5.5 3.96563 5.5 3.75438C5.5 3.54313 5.57188 3.36458 5.71563 3.21875C5.85938 3.07292 6.0375 3 6.25 3H13.75C13.9625 3 14.1406 3.07146 14.2844 3.21437C14.4281 3.35729 14.5 3.53437 14.5 3.74562C14.5 3.95687 14.4281 4.13542 14.2844 4.28125C14.1406 4.42708 13.9625 4.5 13.75 4.5H13.5ZM6.625 13H13.375L12 11.625V4.5H8V11.625L6.625 13Z" fill="currentColor" />
    </svg>
);
const MonitoringList = ({
    isSearching,
    monitoringConversations,
    favoriteConversationIds,
    assignedSearchTerm,
    sortBy,
    user,
    userList,
    userCache,
    highlightedChatId,
    onUserSelect,
    onLoadMonitoringConversations,
    monitoringPage,
    monitoringTotalPages,
    monitoringLoading,
    handleToggleConversationFavorite,
    unreadMessages,
    hasPendingMentions,
    pendingThreads,
    isCompact,
    to,
    currentRoomCode,
    isGroup,
}) => {
    const filteredMonitoring = monitoringConversations
        // 🔥 FIX: Excluir conversaciones que ya están en favoritos
        .filter(conv => !favoriteConversationIds.includes(conv.id))
        .filter(conv => {
            if (!assignedSearchTerm.trim()) return true;
            const searchLower = assignedSearchTerm.toLowerCase();
            const participants = conv.participants || [];
            const lastMsg = typeof conv.lastMessage === 'string' ? conv.lastMessage : (conv.lastMessage?.message || conv.lastMessage?.text || '');
            return (conv.name?.toLowerCase().includes(searchLower) || participants.some(p => p?.toLowerCase().includes(searchLower)) || lastMsg.toLowerCase().includes(searchLower));
        });

    return (
        <div className="flex-1 overflow-y-auto bg-white px-4 w-full min-w-0">
            {isSearching && <div className="flex items-center justify-center py-8"><div className="text-sm text-gray-500">Buscando mensajes...</div></div>}
            {filteredMonitoring.length > 0 ? (
                <>
                    {filteredMonitoring.sort((a, b) => {
                        const aIsFavorite = favoriteConversationIds.includes(a.id);
                        const bIsFavorite = favoriteConversationIds.includes(b.id);
                        if (aIsFavorite && !bIsFavorite) return -1;
                        if (!aIsFavorite && bIsFavorite) return 1;
                        if (sortBy === 'newest') return new Date(b.lastMessage?.sentAt || b.createdAt) - new Date(a.lastMessage?.sentAt || a.createdAt);
                        else if (sortBy === 'oldest') return new Date(a.lastMessage?.sentAt || a.createdAt) - new Date(b.lastMessage?.sentAt || b.createdAt);
                        else if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
                        return 0;
                    }).map((conv) => {
                        const participants = conv.participants || [];
                        const participant1Name = participants[0] || 'Usuario 1';
                        const participant2Name = participants[1] || 'Usuario 2';
                        const currentUserFullName = user?.nombre && user?.apellido ? `${user.nombre} ${user.apellido}` : user?.username;
                        const currentUserNormalized = currentUserFullName?.toLowerCase().trim();
                        const participant1Normalized = participant1Name?.toLowerCase().trim();
                        const participant2Normalized = participant2Name?.toLowerCase().trim();

                        let displayName = conv.name;
                        let otherParticipantName = null;

                        if (currentUserNormalized === participant1Normalized) { displayName = participant2Name; otherParticipantName = participant2Name; }
                        else if (currentUserNormalized === participant2Normalized) { displayName = participant1Name; otherParticipantName = participant1Name; }
                        else if (!conv.name) { displayName = `${participant1Name} ↔️ ${participant2Name}`; }

                        // Usar picture para el avatar si está disponible
                        let otherParticipantPicture = conv.picture || null;
                        let isOtherParticipantOnline = false;

                        if (otherParticipantName) {
                            const otherParticipantNormalized = otherParticipantName?.toLowerCase().trim();
                            const otherUser = userList.find(u => {
                                const fullName = u.nombre && u.apellido ? `${u.nombre} ${u.apellido}` : u.username;
                                return fullName?.toLowerCase().trim() === otherParticipantNormalized;
                            });
                            if (otherUser) {
                                if (otherUser.picture) otherParticipantPicture = otherUser.picture;
                                isOtherParticipantOnline = otherUser.isOnline === true;
                            } else {
                                const cachedUser = userCache[otherParticipantNormalized];
                                if (cachedUser) {
                                    if (cachedUser.picture) otherParticipantPicture = cachedUser.picture;
                                    isOtherParticipantOnline = cachedUser.isOnline === true;
                                }
                            }
                        }

                        const getInitials = (name) => { const parts = name.split(' '); if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase(); return name[0]?.toUpperCase() || 'U'; };
                        const isFavorite = favoriteConversationIds.includes(conv.id);

                        const itemUnreadCount = unreadMessages?.[conv.id] !== undefined ? unreadMessages[conv.id] : (conv.unreadCount || 0);

                        const chatId = `conv-${conv.id}`;
                        const isHighlighted = highlightedChatId === chatId;
                        // 🔥 NUEVO: Verificar si hay menciones pendientes
                        const hasMentions = hasPendingMentions(conv.id, conv.lastMessage, conv);

                        const isSelected = (!isGroup && to && participants.some(p => p?.toLowerCase().trim() === to?.toLowerCase().trim())) || (currentRoomCode && (String(currentRoomCode) === String(conv.id) || currentRoomCode === conv.roomCode));

                        return (
                            <div
                                key={conv.id}
                                id={chatId}
                                className={`flex transition-colors duration-150 hover:bg-[#f5f6f6] rounded-lg mb-1 cursor-pointer group overflow-visible relative ${isSelected ? 'selected-conversation' : ''} ${isHighlighted ? 'highlighted-chat' : ''}`}
                                style={{ padding: '4px 12px', gap: '6px', minHeight: '40px', display: 'flex', alignItems: 'center', width: '100%', minWidth: 0, position: 'relative' }}
                                onClick={() => { if (onUserSelect) onUserSelect(displayName, null, conv); }}
                            >
                                <div className="relative flex-shrink-0" style={{ width: '32px', height: '32px' }}>
                                    <div className="rounded-full overflow-hidden flex items-center justify-center text-white font-bold" style={{ width: '32px', height: '32px', fontSize: '14px', backgroundColor: '#A50104' }}>
                                        {otherParticipantPicture ? <img src={otherParticipantPicture} alt={displayName} className="w-full h-full object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.innerHTML = getInitials(displayName); }} /> : getInitials(displayName)}
                                    </div>
                                    <div className="absolute bottom-0 right-0 rounded-full border-2 border-white" style={{ width: '12px', height: '12px', backgroundColor: isOtherParticipantOnline ? '#10b981' : '#9ca3af' }} title={isOtherParticipantOnline ? 'En línea' : 'Desconectado'} />
                                    {/* 🔥 Badge de no leídos para modo compacto */}
                                    {isCompact && itemUnreadCount > 0 && (
                                        <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 rounded-full bg-[#ff453a] text-white flex items-center justify-center" style={{ minWidth: '16px', height: '16px', fontSize: '9px', fontWeight: 'bold', padding: '0 3px' }}>
                                            {itemUnreadCount > 99 ? '99+' : itemUnreadCount}
                                        </div>
                                    )}
                                    {/* 🔥 NUEVO: Punto rojo para menciones */}
                                    {hasMentions && (
                                        <div
                                            className="absolute top-0 right-0 rounded-full bg-red-600 border-2 border-white"
                                            style={{ width: '10px', height: '10px' }}
                                            title="Tienes menciones pendientes"
                                        />
                                    )}
                                    {/* 🔥 NUEVO: Punto verde para mensajes nuevos (sin menciones) */}
                                    {!hasMentions && (itemUnreadCount > 0 || pendingThreads[conv.id]) && (
                                        <div
                                            className="absolute top-0 right-0 rounded-full border-2 border-white"
                                            style={{ width: '10px', height: '10px', backgroundColor: '#10b981' }}
                                            title="Mensajes nuevos"
                                        />
                                    )}
                                </div>
                                <div className="flex-1 min-w-0 flex flex-col justify-center" style={{ gap: '2px', display: isCompact ? 'none' : 'flex' }}>
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                                            {/* Etiqueta de Favorito (arriba del todo si existe) */}
                                            {isFavorite && <span className="flex-shrink-0 text-red-500 font-semibold flex items-center gap-1" style={{ fontSize: '9px', lineHeight: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}><PinIcon size={10} className="text-red-500" /> Favorito</span>}

                                            {/* 1. NOMBRE DEL USUARIO (Arriba) */}
                                            <div className="flex items-center gap-2 w-full min-w-0">
                                                <h3 className="font-semibold text-[#111] truncate flex-1" style={{ fontSize: '11.5px', lineHeight: '14px', fontWeight: 600 }}>
                                                    {displayName}
                                                </h3>
                                                {/* Badge de no leídos al lado del nombre */}
                                                {itemUnreadCount > 0 && (
                                                    <div className="flex-shrink-0 rounded-full bg-[#ff453a] text-white flex items-center justify-center ml-2" style={{ minWidth: '18px', height: '18px', fontSize: '10px', fontWeight: 'bold' }}>
                                                        {itemUnreadCount > 99 ? '99+' : itemUnreadCount}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {/* Botón de Estrella */}
                                        <button onClick={(e) => handleToggleConversationFavorite(conv, e)} className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200 transition-all duration-200" style={{ color: isFavorite ? '#ff453a' : '#9ca3af' }}>{isFavorite ? <FaStar size={14} /> : <FaRegStar size={14} />}</button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {/* Cargar más desde API (si hay más páginas) */}
                    {monitoringPage < monitoringTotalPages && !monitoringLoading && (
                        <div className="flex justify-center py-2">
                            <button
                                onClick={() => onLoadMonitoringConversations(monitoringPage + 1, true)}
                                className="text-xs text-gray-500 hover:text-gray-700 font-medium px-3 py-1 rounded hover:bg-gray-100 transition-colors"
                            >
                                Cargar más chats...
                            </button>
                        </div>
                    )}
                </>
            ) : (<div className="flex flex-col items-center justify-center py-[60px] px-5 text-center"><div className="text-5xl mb-4 opacity-50">👁️</div><div className="text-sm text-gray-600 font-medium">{assignedSearchTerm ? `No se encontraron resultados para "${assignedSearchTerm}"` : 'No hay chats asignados para monitorear'}</div></div>)}
        </div>
    );
};

export default MonitoringList;
