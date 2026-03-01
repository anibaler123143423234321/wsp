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
    onLoadMoreConvs // Función callback para cargar más conversaciones
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDestination, setSelectedDestination] = useState(null);
    const [isSending, setIsSending] = useState(false);

    //  NUEVO: Ref para la lista scrolleable
    const destinationsListRef = useRef(null);

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
            conv.participants?.some(p => p.toLowerCase().includes(search))
        );
    }, [assignedConversations, searchTerm]);

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
                from: user?.username || currentUserFullName, //  FIX: Usar username (DNI) en vez de nombre completo
                // fromId: user.id, //  REMOVIDO: El backend lo resuelve vía DNI (username)
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
                                // Find other participant: exclude current user by both DNI and full name
                                const otherParticipant = participants.find(p =>
                                    p !== currentUserFullName &&
                                    p !== currentUserUsername
                                );

                                //  FIX: conv.name ya trae el nombre correcto del API ("KAREN CONDEMARIN")
                                // Usarlo primero antes de intentar resolver desde participants (que son DNIs)
                                const displayName = conv.name ||
                                    conv.displayName ||
                                    conv.otherUserName ||
                                    otherParticipant ||
                                    'Chat asignado';

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
