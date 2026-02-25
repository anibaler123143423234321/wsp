import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { FaTimes, FaSearch, FaShare } from 'react-icons/fa';
import { Users, MessageSquare } from 'lucide-react';
import apiService from '../../../../apiService';
import './ForwardMessageModal.css';

const ForwardMessageModal = ({
    isOpen,
    onClose,
    message,
    myActiveRooms = [],
    assignedConversations = [],
    user,
    socket,
    onForward,
    //  NUEVO: Props para paginación de grupos
    roomsPage = 1,
    roomsTotalPages = 1,
    roomsLoading = false,
    onLoadMoreRooms, // Función callback para cargar más grupos
    //  NUEVO: Props para paginación de conversaciones
    convsPage = 1,
    convsTotalPages = 1,
    convsLoading = false,
    onLoadMoreConvs, // Función callback para cargar más conversaciones
    userList = [] // 🔥 NUEVO: Para resolución de nombres
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDestination, setSelectedDestination] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [forwardLookupCache, setForwardLookupCache] = useState({});

    //  NUEVO: Ref para la lista scrolleable
    const destinationsListRef = useRef(null);

    const normalizeValue = useCallback((value) => {
        if (!value) return '';
        return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    }, []);

    const resolveUserByAnyKey = useCallback((value) => {
        if (!value || !Array.isArray(userList) || userList.length === 0) return null;
        const key = normalizeValue(value);
        return userList.find((u) => {
            if (!u || typeof u !== 'object') return false;
            const fullName = `${u.nombre || ''} ${u.apellido || ''}`.trim();
            const emailLocal = u.email ? String(u.email).split('@')[0] : '';
            const candidates = [
                u.username,
                u.userName,
                u.name,
                u.displayName,
                u.notify,
                u.vname,
                u.email,
                u.correo,
                emailLocal,
                u?.id?.user,
                fullName,
            ]
                .filter(Boolean)
                .map(normalizeValue);
            return candidates.includes(key);
        });
    }, [userList, normalizeValue]);

    const getDisplayName = useCallback((identifier) => {
        const cached = forwardLookupCache[normalizeValue(identifier)];
        const resolved = cached || resolveUserByAnyKey(identifier);
        if (resolved?.nombre && resolved?.apellido) return `${resolved.nombre} ${resolved.apellido}`.trim();
        if (resolved?.displayName) return resolved.displayName;
        if (resolved?.name) return resolved.name;
        if (resolved?.username) return resolved.username;
        return identifier || 'Usuario';
    }, [resolveUserByAnyKey, forwardLookupCache, normalizeValue]);

    useEffect(() => {
        const ids = (assignedConversations || [])
            .flatMap((conv) => conv?.participants || [])
            .filter(Boolean)
            .map((p) => String(p).trim())
            .filter((p) => /^\d{6,}$/.test(p) || p.includes('@'));

        const toResolve = Array.from(new Set(ids))
            .filter((id) => !forwardLookupCache[normalizeValue(id)])
            .slice(0, 20);

        if (toResolve.length === 0) return;
        let cancelled = false;

        (async () => {
            const resolved = await Promise.all(
                toResolve.map(async (id) => {
                    try {
                        const list = await apiService.searchUsersFromBackend(id, 0, 10);
                        if (!Array.isArray(list) || list.length === 0) return null;
                        const match = list.find((u) => {
                            const full = `${u.nombre || ''} ${u.apellido || ''}`.trim();
                            const emailLocal = u.email ? String(u.email).split('@')[0] : '';
                            return [u.username, u.email, u.correo, u?.id?.user, full, emailLocal]
                                .filter(Boolean)
                                .map(normalizeValue)
                                .includes(normalizeValue(id));
                        }) || list[0];
                        return match ? [normalizeValue(id), match] : null;
                    } catch {
                        return null;
                    }
                })
            );

            if (cancelled) return;
            const patch = {};
            resolved.forEach((r) => {
                if (r && r[0] && r[1]) patch[r[0]] = r[1];
            });
            if (Object.keys(patch).length > 0) {
                setForwardLookupCache((prev) => ({ ...prev, ...patch }));
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [assignedConversations, forwardLookupCache, normalizeValue]);

    // Filtrar chats disponibles por búsqueda
    const filteredRooms = useMemo(() => {
        if (!searchTerm) return myActiveRooms;
        const search = searchTerm.toLowerCase();
        return myActiveRooms.filter(room =>
            room.name?.toLowerCase().includes(search) ||
            room.roomCode?.toLowerCase().includes(search)
        );
    }, [myActiveRooms, searchTerm]);

    const filteredConversations = useMemo(() => {
        if (!searchTerm) return assignedConversations;
        const search = searchTerm.toLowerCase();
        return assignedConversations.filter(conv =>
            conv.name?.toLowerCase().includes(search) ||
            conv.participants?.some(p => {
                const display = getDisplayName(p);
                return String(display).toLowerCase().includes(search) || String(p).toLowerCase().includes(search);
            })
        );
    }, [assignedConversations, searchTerm, getDisplayName]);

    //  NUEVO: Handler para scroll infinito
    const handleScroll = useCallback(() => {
        if (!destinationsListRef.current || roomsLoading || !onLoadMoreRooms) return;

        const { scrollTop, scrollHeight, clientHeight } = destinationsListRef.current;
        // Si llegamos al final (con 50px de margen) y hay más páginas
        if (scrollHeight - scrollTop - clientHeight < 50) {
            if (roomsPage < roomsTotalPages) {
                console.log('📜 Cargando más grupos...', { currentPage: roomsPage, totalPages: roomsTotalPages });
                onLoadMoreRooms();
            }
        }
    }, [roomsLoading, roomsPage, roomsTotalPages, onLoadMoreRooms]);

    //  NUEVO: Agregar event listener al scroll
    useEffect(() => {
        const listElement = destinationsListRef.current;
        if (listElement) {
            listElement.addEventListener('scroll', handleScroll);
            return () => listElement.removeEventListener('scroll', handleScroll);
        }
    }, [handleScroll]);

    //  NUEVO: Handler para scroll infinito de conversaciones
    const handleConvsScroll = useCallback(() => {
        if (!destinationsListRef.current || convsLoading || !onLoadMoreConvs) return;

        const { scrollTop, scrollHeight, clientHeight } = destinationsListRef.current;
        // Si llegamos al final (con 50px de margen) y hay más páginas
        if (scrollHeight - scrollTop - clientHeight < 50) {
            if (convsPage < convsTotalPages) {
                console.log('📧 Cargando más conversaciones...', { currentPage: convsPage, totalPages: convsTotalPages });
                onLoadMoreConvs();
            }
        }
    }, [convsLoading, convsPage, convsTotalPages, onLoadMoreConvs]);

    //  NUEVO: Combinar ambos handlers en uno solo
    const handleCombinedScroll = useCallback(() => {
        handleScroll();      // Para grupos
        handleConvsScroll(); // Para conversaciones
    }, [handleScroll, handleConvsScroll]);

    //  Actualizar event listener para usar handler combinado
    useEffect(() => {
        const listElement = destinationsListRef.current;
        if (listElement) {
            listElement.addEventListener('scroll', handleCombinedScroll);
            return () => listElement.removeEventListener('scroll', handleCombinedScroll);
        }
    }, [handleCombinedScroll]);

    // Obtener preview del mensaje
    const getMessagePreview = () => {
        if (message.text || message.message) {
            const text = message.text || message.message;
            return text.length > 80 ? text.substring(0, 80) + '...' : text;
        }
        if (message.mediaType === 'image') return '📷 Imagen';
        if (message.mediaType === 'video') return '🎥 Video';
        if (message.mediaType === 'audio') return '🎵 Audio';
        if (message.fileName) return `📎 ${message.fileName}`;
        return 'Archivo';
    };

    // Manejar envío del mensaje reenviado
    const handleForward = async () => {
        if (!selectedDestination || isSending) return;

        setIsSending(true);
        try {
            const currentUserFullName = user?.nombre && user?.apellido
                ? `${user.nombre} ${user.apellido}`
                : user?.username;

            // Construir mensaje reenviado
            const forwardedMessage = {
                from: currentUserFullName,
                fromId: user.id,
                to: selectedDestination.type === 'group' ? selectedDestination.name : selectedDestination.to,
                message: message.text || message.message || '',
                isGroup: selectedDestination.type === 'group',
                roomCode: selectedDestination.type === 'group' ? selectedDestination.roomCode : undefined,
                conversationId: selectedDestination.type === 'assigned' ? selectedDestination.id : undefined,

                // Copiar datos multimedia si existen
                mediaType: message.mediaType || null,
                mediaData: message.mediaData || null,
                fileName: message.fileName || null,
                fileSize: message.fileSize || null,

                // Marcar como reenviado
                isForwarded: true,
            };

            // Guardar en BD
            const savedMessage = await apiService.createMessage(forwardedMessage);

            // Emitir por Socket
            if (socket && socket.connected) {
                socket.emit('message', {
                    ...forwardedMessage,
                    id: savedMessage.id,
                    sentAt: savedMessage.sentAt
                });
            }

            // Callback y cerrar modal
            if (onForward) onForward();
            onClose();
            setSelectedDestination(null);
            setSearchTerm('');
        } catch (error) {
            console.error('Error al reenviar mensaje:', error);
            alert('Error al reenviar el mensaje. Inténtalo de nuevo.');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="forward-modal-overlay" onClick={onClose}>
            <div className="forward-modal-content" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="forward-modal-header">
                    <div className="forward-modal-title">
                        <FaShare className="forward-icon" />
                        <h3>Reenviar mensaje</h3>
                    </div>
                    <button className="forward-modal-close" onClick={onClose}>
                        <FaTimes />
                    </button>
                </div>

                {/* Preview del mensaje */}
                <div className="forward-message-preview">
                    <div className="preview-label">Mensaje a reenviar:</div>
                    <div className="preview-content">{getMessagePreview()}</div>
                </div>

                {/* Búsqueda */}
                <div className="forward-search-container">
                    <FaSearch className="search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar chat o conversación..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="forward-search-input"
                    />
                </div>

                {/* Lista de destinos */}
                <div className="forward-destinations-list" ref={destinationsListRef}>
                    {/* Grupos */}
                    {filteredRooms.length > 0 && (
                        <div className="destination-section">
                            <div className="section-title">
                                <Users size={16} />
                                <span>Grupos ({filteredRooms.length})</span>
                            </div>
                            {filteredRooms.map((room) => (
                                <div
                                    key={`room-${room.id}`}
                                    className={`destination-item ${selectedDestination?.id === room.id && selectedDestination?.type === 'group' ? 'selected' : ''}`}
                                    onClick={() => setSelectedDestination({ ...room, type: 'group' })}
                                >
                                    <div className="destination-avatar">
                                        <div className="group-avatar">👥</div>
                                    </div>
                                    <div className="destination-info">
                                        <div className="destination-name">{room.name}</div>
                                        <div className="destination-details">{room.currentMembers} miembros</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Conversaciones Asignadas */}
                    {filteredConversations.length > 0 && (
                        <div className="destination-section">
                            <div className="section-title">
                                <MessageSquare size={16} />
                                <span>Chats Asignados ({filteredConversations.length})</span>
                            </div>
                            {filteredConversations.map((conv) => {
                                const currentUserFullName = user?.nombre && user?.apellido
                                    ? `${user.nombre} ${user.apellido}`
                                    : user?.username;
                                const currentUserUsername = user?.username;

                                const participants = conv.participants || [];
                                const otherParticipantIdentifier = participants.find((p) => {
                                    const pNorm = normalizeValue(p);
                                    return pNorm !== normalizeValue(currentUserFullName) &&
                                        pNorm !== normalizeValue(currentUserUsername);
                                });

                                let displayName = getDisplayName(otherParticipantIdentifier) || conv.name || 'Usuario';
                                if (!displayName || displayName === otherParticipantIdentifier) {
                                    displayName = conv.name || displayName || 'Usuario';
                                }

                                return (
                                    <div
                                        key={`conv-${conv.id}`}
                                        className={`destination-item ${selectedDestination?.id === conv.id && selectedDestination?.type === 'assigned' ? 'selected' : ''}`}
                                        onClick={() => setSelectedDestination({ ...conv, type: 'assigned', to: displayName })}
                                    >
                                        <div className="destination-avatar">
                                            <div className="user-avatar">{displayName.charAt(0).toUpperCase()}</div>
                                        </div>
                                        <div className="destination-info">
                                            <div className="destination-name">{displayName}</div>
                                            <div className="destination-details">Chat asignado</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Indicador de carga para conversaciones */}
                    {convsLoading && filteredConversations.length > 0 && (
                        <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: '12px' }}>
                            Cargando más conversaciones...
                        </div>
                    )}

                    {/* Sin resultados */}
                    {filteredRooms.length === 0 && filteredConversations.length === 0 && (
                        <div className="no-results">
                            <span>No se encontraron chats</span>
                        </div>
                    )}
                </div>

                {/* Footer con botones */}
                <div className="forward-modal-footer">
                    <button className="forward-btn-cancel" onClick={onClose} disabled={isSending}>
                        Cancelar
                    </button>
                    <button
                        className="forward-btn-send"
                        onClick={handleForward}
                        disabled={!selectedDestination || isSending}
                    >
                        {isSending ? 'Enviando...' : 'Reenviar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ForwardMessageModal;
