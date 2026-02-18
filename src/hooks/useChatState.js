import { useState, useRef, useCallback, useEffect } from 'react';
import apiService from '../apiService';

/**
 * Hook personalizado para gestionar todos los estados del chat
 * Centraliza estados de chat, UI, modales y referencias
 */
export const useChatState = () => {
    // ===== ESTADOS DEL CHAT =====
    const [to, setTo] = useState('');
    const [isGroup, setIsGroup] = useState(false);
    const [userList, setUserList] = useState([]);
    const [userListPage, setUserListPage] = useState(0);
    const [userListHasMore, setUserListHasMore] = useState(true);
    const [userListLoading, setUserListLoading] = useState(false);
    const [groupList] = useState([]);
    const [roomUsers, setRoomUsers] = useState([]);
    const [currentRoomCode, setCurrentRoomCodeInternal] = useState(null);
    const [assignedConversations, setAssignedConversations] = useState([]);

    // Wrapper para setCurrentRoomCode con logging
    const setCurrentRoomCode = useCallback((newRoomCode) => {
        setCurrentRoomCodeInternal(newRoomCode);
    }, []);

    const [monitoringConversations, setMonitoringConversations] = useState([]);
    const [monitoringPage, setMonitoringPage] = useState(1);
    const [monitoringTotal, setMonitoringTotal] = useState(0);
    const [monitoringTotalPages, setMonitoringTotalPages] = useState(0);
    const [monitoringLoading, setMonitoringLoading] = useState(false);

    // Estados de paginación de conversaciones asignadas
    const [assignedPage, setAssignedPage] = useState(1);
    const [assignedTotal, setAssignedTotal] = useState(0);
    const [assignedTotalPages, setAssignedTotalPages] = useState(0);
    const [assignedLoading, setAssignedLoading] = useState(false);

    // Estados de paginación de salas
    const [roomsPage, setRoomsPage] = useState(1);
    const [roomsTotal, setRoomsTotal] = useState(0);
    const [roomsTotalPages, setRoomsTotalPages] = useState(0);
    const [roomsLoading, setRoomsLoading] = useState(false);
    const [roomsLimit, setRoomsLimit] = useState(50);

    const [myActiveRooms, setMyActiveRooms] = useState([]);
    const [isSending, setIsSending] = useState(false);
    const [favoriteRoomCodes, setFavoriteRoomCodes] = useState([]); //  Códigos de salas favoritas
    const [favoriteRooms, setFavoriteRooms] = useState([]); //  🔥 NUEVO: Salas favoritas con datos completos (incluido unreadCount)
    const [lastFavoriteUpdate, setLastFavoriteUpdate] = useState(null); //  Notifica actualizaciones a favoritos

    // 🔥 Función para cargar favoritos tempranamente (llamada desde ChatPage)
    const loadFavoriteRoomCodes = useCallback(async (displayName) => {
        if (!displayName) return;
        try {
            const roomsWithData = await apiService.getUserFavoriteRoomsWithData(displayName);
            const codes = roomsWithData.map(r => r.roomCode);
            console.log('🔥 useChatState: Favoritos cargados tempranamente:', { codes, count: roomsWithData.length });
            setFavoriteRoomCodes(codes);
            setFavoriteRooms(roomsWithData); // Guardar datos completos
        } catch (error) {
            console.error('Error al cargar favoritos en useChatState:', error);
        }
    }, []);

    // ===== ESTADOS ADICIONALES =====
    const [unreadMessages, setUnreadMessages] = useState({});
    const [unreadCountsLoaded, setUnreadCountsLoaded] = useState(false); // 🔥 Flag para saber si los contadores ya cargaron
    const [socketConnected, setSocketConnected] = useState(false);
    const [soundsEnabled, setSoundsEnabled] = useState(() => {
        const saved = localStorage.getItem('soundsEnabled');
        return saved === 'true';
    });
    // 🔥 NUEVO: Estado global para silenciar TODAS las alertas (sonidos y notificaciones)
    const [areAlertsEnabled, setAreAlertsEnabled] = useState(() => {
        const saved = localStorage.getItem('areAlertsEnabled');
        // Por defecto TRUE (alertas activadas)
        return saved !== 'false';
    });
    // 🔥 NUEVO: Estados granulares (Hilos vs Mensajes)
    const [areThreadAlertsEnabled, setAreThreadAlertsEnabled] = useState(() => {
        const saved = localStorage.getItem('areThreadAlertsEnabled');
        return saved !== 'false';
    });
    const [areMessageAlertsEnabled, setAreMessageAlertsEnabled] = useState(() => {
        const saved = localStorage.getItem('areMessageAlertsEnabled');
        return saved !== 'false';
    });
    const [pendingMentions, setPendingMentions] = useState({});
    const [pendingThreads, setPendingThreads] = useState({}); // 🔥 NUEVO: Rastrea salas con hilos no leídos
    const [typingUser, setTypingUser] = useState(null);
    const [typingTimeout, setTypingTimeout] = useState(null);
    const [roomTypingUsers, setRoomTypingUsers] = useState({});
    const [adminViewConversation, setAdminViewConversation] = useState(null);
    const [isAdminViewLoading, setIsAdminViewLoading] = useState(false);
    const [replyingTo, setReplyingTo] = useState(null);
    const [isUploadingFile, setIsUploadingFile] = useState(false);
    const [pinnedMessageId, setPinnedMessageId] = useState(null);

    // ===== ESTADOS DE UI =====
    const [showAdminMenu, setShowAdminMenu] = useState(false);
    const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    // Estados de modales
    const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
    const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
    const [showAdminRoomsModal, setShowAdminRoomsModal] = useState(false);
    const [showRoomCreatedModal, setShowRoomCreatedModal] = useState(false);
    const [showEditRoomModal, setShowEditRoomModal] = useState(false);
    const [showCreateConversationModal, setShowCreateConversationModal] = useState(false);
    const [showManageConversationsModal, setShowManageConversationsModal] = useState(false);
    const [showAddUsersToRoomModal, setShowAddUsersToRoomModal] = useState(false);
    const [showRemoveUsersFromRoomModal, setShowRemoveUsersFromRoomModal] = useState(false);
    const [showRoomUsersModal, setShowRoomUsersModal] = useState(false);
    const [roomUsersModalData, setRoomUsersModalData] = useState({ roomName: '', users: [], maxCapacity: 0 });

    const [createdRoomData, setCreatedRoomData] = useState(null);
    const [editingRoom, setEditingRoom] = useState(null);

    // ===== ESTADOS DE FORMULARIOS =====
    const [roomForm, setRoomForm] = useState({ name: '', maxCapacity: 50 });
    const [joinRoomForm, setJoinRoomForm] = useState({ roomCode: '' });
    const [editForm, setEditForm] = useState({ maxCapacity: 50 });

    // ===== REFERENCIAS =====
    const currentRoomCodeRef = useRef(null);
    const hasRestoredRoom = useRef(false);
    const lastSendTimestamp = useRef(0);
    const duplicateClickCount = useRef(0);

    // Referencias para estabilizar useEffect del socket
    const toRef = useRef(to);
    const isGroupRef = useRef(isGroup);
    const adminViewConversationRef = useRef(adminViewConversation);
    const currentUserFullNameRef = useRef(null);
    const userListRef = useRef(userList);

    // ===== EFECTO PARA MANEJAR RESIZE DE VENTANA =====
    // Cuando cambiamos de desktop a móvil, el sidebar overlay debe estar cerrado
    const previousWidthRef = useRef(window.innerWidth);

    useEffect(() => {
        const handleResize = () => {
            const currentWidth = window.innerWidth;
            const wasMobile = previousWidthRef.current <= 768;
            const isMobile = currentWidth <= 768;

            // Si cambiamos de desktop a móvil, cerrar el sidebar overlay
            if (!wasMobile && isMobile) {
                setShowSidebar(false);
            }

            previousWidthRef.current = currentWidth;
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // ===== RETORNAR TODOS LOS ESTADOS Y SETTERS =====
    return {
        // Estados de chat
        to,
        setTo,
        isGroup,
        setIsGroup,
        userList,
        setUserList,
        userListPage,
        setUserListPage,
        userListHasMore,
        setUserListHasMore,
        userListLoading,
        setUserListLoading,
        groupList,
        roomUsers,
        setRoomUsers,
        currentRoomCode,
        setCurrentRoomCode,
        assignedConversations,
        setAssignedConversations,

        // Estados de monitoreo
        monitoringConversations,
        setMonitoringConversations,
        monitoringPage,
        setMonitoringPage,
        monitoringTotal,
        setMonitoringTotal,
        monitoringTotalPages,
        setMonitoringTotalPages,
        monitoringLoading,
        setMonitoringLoading,

        // Estados de paginación asignadas
        assignedPage,
        setAssignedPage,
        assignedTotal,
        setAssignedTotal,
        assignedTotalPages,
        setAssignedTotalPages,
        assignedLoading,
        setAssignedLoading,

        // Estados de paginación salas
        roomsPage,
        setRoomsPage,
        roomsTotal,
        setRoomsTotal,
        roomsTotalPages,
        setRoomsTotalPages,
        roomsLoading,
        setRoomsLoading,
        roomsLimit,
        setRoomsLimit,

        myActiveRooms,
        setMyActiveRooms,
        isSending,
        setIsSending,
        favoriteRoomCodes,
        favoriteRooms, // 🔥 NUEVO: Exponer datos completos
        setFavoriteRooms, // 🔥 NUEVO: Permitir actualización externa (sockets)
        setFavoriteRoomCodes,
        loadFavoriteRoomCodes,
        lastFavoriteUpdate,
        setLastFavoriteUpdate,

        // Estados adicionales
        unreadMessages,
        setUnreadMessages,
        unreadCountsLoaded,
        setUnreadCountsLoaded,
        socketConnected,
        setSocketConnected,
        soundsEnabled,
        setSoundsEnabled,
        areAlertsEnabled,
        setAreAlertsEnabled,
        areThreadAlertsEnabled,
        setAreThreadAlertsEnabled,
        areMessageAlertsEnabled,
        setAreMessageAlertsEnabled,
        pendingMentions,
        setPendingMentions,
        pendingThreads,
        setPendingThreads,
        typingUser,
        setTypingUser,
        typingTimeout,
        setTypingTimeout,
        roomTypingUsers,
        setRoomTypingUsers,
        adminViewConversation,
        setAdminViewConversation,
        isAdminViewLoading,
        setIsAdminViewLoading,
        replyingTo,
        setReplyingTo,
        isUploadingFile,
        setIsUploadingFile,
        pinnedMessageId,
        setPinnedMessageId,

        // Estados de UI
        showAdminMenu,
        setShowAdminMenu,
        showSidebar,
        setShowSidebar,
        sidebarCollapsed,
        setSidebarCollapsed,

        // Estados de modales
        showCreateRoomModal,
        setShowCreateRoomModal,
        showJoinRoomModal,
        setShowJoinRoomModal,
        showAdminRoomsModal,
        setShowAdminRoomsModal,
        showRoomCreatedModal,
        setShowRoomCreatedModal,
        showEditRoomModal,
        setShowEditRoomModal,
        showCreateConversationModal,
        setShowCreateConversationModal,
        showManageConversationsModal,
        setShowManageConversationsModal,
        showAddUsersToRoomModal,
        setShowAddUsersToRoomModal,
        showRemoveUsersFromRoomModal,
        setShowRemoveUsersFromRoomModal,
        showRoomUsersModal,
        setShowRoomUsersModal,
        roomUsersModalData,
        setRoomUsersModalData,

        createdRoomData,
        setCreatedRoomData,
        editingRoom,
        setEditingRoom,

        // Estados de formularios
        roomForm,
        setRoomForm,
        joinRoomForm,
        setJoinRoomForm,
        editForm,
        setEditForm,

        // Referencias
        currentRoomCodeRef,
        hasRestoredRoom,
        lastSendTimestamp,
        duplicateClickCount,
        toRef,
        isGroupRef,
        adminViewConversationRef,
        currentUserFullNameRef,
        userListRef,
    };
};
