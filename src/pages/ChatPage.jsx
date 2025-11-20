import React, { useState, useEffect, useRef, useCallback } from "react";
import Swal from 'sweetalert2';
import ChatLayout from "../layouts/ChatLayout";
import Login from "../components/Login";
import LoadingScreen from "../components/LoadingScreen";
import RoomCreatedModal from "../components/modals/RoomCreatedModal";
import EditRoomModal from "../components/modals/EditRoomModal";
import CreateConversationModal from "../components/modals/CreateConversationModal";
import ManageAssignedConversationsModal from "../components/modals/ManageAssignedConversationsModal";
import AddUsersToRoomModal from "../components/modals/AddUsersToRoomModal";
import RemoveUsersFromRoomModal from "../components/modals/RemoveUsersFromRoomModal";
import ThreadPanel from "../components/ThreadPanel";
import SettingsPanel from "../components/SettingsPanel";
import { useAuth } from "../hooks/useAuth";
import { useSocket } from "../hooks/useSocket";
import { useMessages } from "../hooks/useMessages";
import { useMessagePagination } from "../hooks/useMessagePagination";
import apiService from "../apiService";
import {
  showSuccessAlert,
  showErrorAlert,
  showConfirmAlert,
} from "../sweetalert2";

const ChatPage = () => {
  // Hooks personalizados
  const {
    isAuthenticated,
    user,
    username,
    isAdmin,
    isLoading,
    logout,
    refreshAuth,
  } = useAuth();
  const socket = useSocket(isAuthenticated, username, user);

  // 🔥 Nombre completo del usuario actual (usado en múltiples lugares)
  const currentUserFullName =
    user?.nombre && user?.apellido
      ? `${user.nombre} ${user.apellido}`
      : username;
  const {
    input,
    setInput,
    mediaFiles,
    mediaPreviews,
    isRecording,
    setIsRecording,
    messageSound,
    playMessageSound,
    handleFileSelect,
    handleRemoveMediaFile,
    cancelMediaUpload,
    clearInput,
  } = useMessages();

  // 🔥 BLOQUEADO: Hook de WebRTC deshabilitado

  // Estados del chat (declarar antes de los hooks que los usan)
  const [to, setTo] = useState("");
  const [isGroup, setIsGroup] = useState(false);
  const [userList, setUserList] = useState([]);
  const [userListPage, setUserListPage] = useState(0);
  const [userListHasMore, setUserListHasMore] = useState(true);
  const [userListLoading, setUserListLoading] = useState(false);
  const [groupList] = useState([]);
  const [roomUsers, setRoomUsers] = useState([]);
  const [currentRoomCode, setCurrentRoomCodeInternal] = useState(null);
  const [assignedConversations, setAssignedConversations] = useState([]);

  // 🔥 Wrapper para setCurrentRoomCode con logging (memoizado para evitar re-renders innecesarios)
  const setCurrentRoomCode = useCallback((newRoomCode) => {
    // console.log('🔄 Cambiando currentRoomCode:', {
    //   from: currentRoomCode,
    //   to: newRoomCode,
    //   stack: new Error().stack
    // });
    setCurrentRoomCodeInternal(newRoomCode);
  }, []);
  const [monitoringConversations, setMonitoringConversations] = useState([]);
  const [monitoringPage, setMonitoringPage] = useState(1);
  const [monitoringTotal, setMonitoringTotal] = useState(0);
  const [monitoringTotalPages, setMonitoringTotalPages] = useState(0);
  const [monitoringLoading, setMonitoringLoading] = useState(false);

  // 🔥 NUEVOS: Estados para paginación real de conversaciones asignadas
  const [assignedPage, setAssignedPage] = useState(1);
  const [assignedTotal, setAssignedTotal] = useState(0);
  const [assignedTotalPages, setAssignedTotalPages] = useState(0);
  const [assignedLoading, setAssignedLoading] = useState(false);

  // 🔥 NUEVOS: Estados para paginación real de salas del usuario
  const [roomsPage, setRoomsPage] = useState(1);
  const [roomsTotal, setRoomsTotal] = useState(0);
  const [roomsTotalPages, setRoomsTotalPages] = useState(0);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsLimit, setRoomsLimit] = useState(10);

  // Hook para paginación de mensajes
  const {
    messages,
    hasMoreMessages,
    isLoadingMore,
    loadInitialMessages,
    loadMoreMessages,
    addNewMessage,
    updateMessage,
    clearMessages,
    setInitialMessages,
    isLoading: isLoadingMessages, // 🔥 Estado de carga inicial de mensajes
  } = useMessagePagination(
    currentRoomCode,
    username,
    to,
    isGroup,
    socket,
    user
  );

  // Estados adicionales del chat
  const [unreadMessages, setUnreadMessages] = useState({});
  const [socketConnected, setSocketConnected] = useState(false);
  const [soundsEnabled, setSoundsEnabled] = useState(() => {
    // 🔥 Leer preferencia de sonido desde localStorage
    const saved = localStorage.getItem("soundsEnabled");
    return saved === "true"; // Por defecto false si no existe
  });
  // 🔥 NUEVO: Estado para menciones pendientes (persisten hasta que el usuario entre al chat)
  const [pendingMentions, setPendingMentions] = useState({});
  const [typingUser, setTypingUser] = useState(null); // Usuario que está escribiendo (objeto con username, nombre, picture)
  const [typingTimeout, setTypingTimeout] = useState(null); // Timeout para detectar cuando deja de escribir
  const [roomTypingUsers, setRoomTypingUsers] = useState({}); // Usuarios escribiendo en cada sala { roomCode: [username1, username2] }
  const [adminViewConversation, setAdminViewConversation] = useState(null); // Conversación que el admin está viendo
  const [replyingTo, setReplyingTo] = useState(null); // Mensaje al que se está respondiendo
  const [threadMessage, setThreadMessage] = useState(null); // Mensaje del hilo abierto
  const [isUploadingFile, setIsUploadingFile] = useState(false); // 🔥 Estado para indicar si se está subiendo un archivo

  // Estados de UI
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  // Sidebar cerrado por defecto en mobile, abierto en desktop
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  // Estado para colapsar/expandir el sidebar en desktop
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showJoinRoomModal, setShowJoinRoomModal] = useState(false);
  const [showAdminRoomsModal, setShowAdminRoomsModal] = useState(false);
  const [showRoomCreatedModal, setShowRoomCreatedModal] = useState(false);
  const [showEditRoomModal, setShowEditRoomModal] = useState(false);
  const [showCreateConversationModal, setShowCreateConversationModal] =
    useState(false);
  const [showManageConversationsModal, setShowManageConversationsModal] =
    useState(false);
  const [showAddUsersToRoomModal, setShowAddUsersToRoomModal] = useState(false);
  const [showRemoveUsersFromRoomModal, setShowRemoveUsersFromRoomModal] =
    useState(false);
  const [createdRoomData, setCreatedRoomData] = useState(null);
  const [myActiveRooms, setMyActiveRooms] = useState([]); // Salas activas para mostrar en el sidebar
  const [editingRoom, setEditingRoom] = useState(null);

  // Estados de formularios
  const [roomForm, setRoomForm] = useState({ name: "", maxCapacity: 50 });
  const [joinRoomForm, setJoinRoomForm] = useState({ roomCode: "" });
  const [editForm, setEditForm] = useState({ maxCapacity: 50 });

  // Referencias
  const currentRoomCodeRef = useRef(null);
  const hasRestoredRoom = useRef(false);

  // 🔥 EFFECT: Actualizar título de la pestaña con contador de no leídos
  useEffect(() => {
    // 1. Contar no leídos de conversaciones asignadas
    // Filtrar conversaciones donde el usuario es participante
    const myAssignedConversations = assignedConversations.filter(conv => {
      const displayName = user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : user?.username;
      return conv.participants?.includes(displayName);
    });
    const unreadAssignedCount = myAssignedConversations.filter(conv => conv.unreadCount > 0).length;

    // 2. Contar no leídos de salas activas
    const unreadRoomsCount = myActiveRooms?.filter(room => {
      const roomUnread = unreadMessages?.[room.roomCode] || 0;
      return roomUnread > 0;
    }).length || 0;

    // 3. Total
    const totalUnread = unreadAssignedCount + unreadRoomsCount;

    // 4. Actualizar título
    if (totalUnread > 0) {
      document.title = `(${totalUnread}) Chat Call Center +34`;
    } else {
      document.title = 'Chat Call Center +34';
    }
  }, [assignedConversations, myActiveRooms, unreadMessages, user]);

  // Efecto para escuchar eventos de conexión del socket
  useEffect(() => {
    const handleSocketConnected = () => {
      setSocketConnected(true);
    };

    const handleSocketDisconnected = () => {
      setSocketConnected(false);
    };

    // Escuchar eventos personalizados
    window.addEventListener("socketConnected", handleSocketConnected);
    window.addEventListener("socketDisconnected", handleSocketDisconnected);

    return () => {
      window.removeEventListener("socketConnected", handleSocketConnected);
      window.removeEventListener(
        "socketDisconnected",
        handleSocketDisconnected
      );
    };
  }, []);

  // Efecto para establecer el estado inicial del socket
  useEffect(() => {
    if (socket) {
      setSocketConnected(socket.connected);
    } else {
      setSocketConnected(false);
    }
  }, [socket]);

  // 🔥 NUEVO: Función para cargar las salas activas del usuario con paginación real
  const loadMyActiveRooms = useCallback(
    async (page = 1, append = false, limitOverride) => {
      const parsedLimit = Number(limitOverride ?? roomsLimit) || 10;
      try {
        setRoomsLoading(true);

        const isPrivilegedUser =
          user?.role === "ADMIN" ||
          user?.role === "JEFEPISO" ||
          user?.role === "PROGRAMADOR";

        console.log("🏠 loadMyActiveRooms - Iniciando carga de salas:", {
          username,
          role: user?.role,
          isPrivilegedUser,
          page,
          parsedLimit,
        });

        // Si es ADMIN/JEFEPISO/PROGRAMADOR usar endpoint de admin pero respetando paginación
        if (isPrivilegedUser) {
          console.log("👑 Usuario privilegiado - Usando endpoint de admin");
          const response = await apiService.getAdminRooms(page, parsedLimit, "");
          const activeRooms = response.data
            ? response.data.filter((room) => room.isActive)
            : [];

          console.log("✅ Salas de admin cargadas:", {
            total: response.total,
            activeRooms: activeRooms.length,
            rooms: activeRooms.map(r => ({ name: r.name, roomCode: r.roomCode })),
          });

          const nextPage = Number(response.page ?? page) || page;
          const totalRooms =
            Number(response.total ?? activeRooms.length) || activeRooms.length;
          const totalPages =
            Number(
              response.totalPages ?? Math.ceil(totalRooms / parsedLimit)
            ) || 1;

          setRoomsPage(nextPage);
          setRoomsTotal(totalRooms);
          setRoomsTotalPages(totalPages);

          if (append && page > 1) {
            setMyActiveRooms((prev) => {
              const existingCodes = new Set(
                prev.map((room) => room.roomCode)
              );
              const newRooms = activeRooms.filter(
                (room) => !existingCodes.has(room.roomCode)
              );
              return [...prev, ...newRooms];
            });
          } else {
            setMyActiveRooms(activeRooms);
          }
        } else {
          // Para usuarios normales, usar paginación real
          console.log("👤 Usuario normal - Usando endpoint de usuario");
          const result = await apiService.getUserRoomsPaginated(
            page,
            parsedLimit
          );

          console.log("✅ Salas de usuario cargadas:", {
            total: result.total,
            rooms: result.rooms?.length || 0,
            roomsList: result.rooms?.map(r => ({ name: r.name, roomCode: r.roomCode, members: r.members })) || [],
          });

          // Actualizar estados de paginación
          const nextPage = Number(result.page ?? page) || page;
          const totalRooms =
            Number(result.total ?? result.rooms?.length ?? 0) ||
            result.rooms?.length ||
            0;
          const totalPages =
            Number(
              result.totalPages ?? Math.ceil(totalRooms / parsedLimit)
            ) || 1;

          setRoomsPage(nextPage);
          setRoomsTotal(totalRooms);
          setRoomsTotalPages(totalPages);

          // Actualizar salas (append o replace)
          if (append && page > 1) {
            setMyActiveRooms((prev) => {
              const existingCodes = new Set(prev.map((room) => room.roomCode));
              const newRooms = (result.rooms || []).filter(
                (room) => !existingCodes.has(room.roomCode)
              );
              return [...prev, ...newRooms];
            });
          } else {
            console.log("📝 Actualizando myActiveRooms con:", result.rooms?.length || 0, "salas");
            setMyActiveRooms(result.rooms || []);
          }
        }
      } catch (error) {
        console.error("❌ Error al cargar salas activas:", error);
        if (!append) {
          setMyActiveRooms([]);
        }
      } finally {
        setRoomsLoading(false);
      }
    },
    [user?.role, roomsLimit, username]
  );

  // 🔥 NUEVO: Función para marcar mensajes de grupo como leídos
  const markRoomMessagesAsRead = useCallback(
    async (roomCode) => {
      if (!socket || !socket.connected || !roomCode) {
        console.log("⚠️ No se puede marcar mensajes: socket no conectado o sin roomCode");
        return;
      }

      // Emitir evento para marcar como leídos
      socket.emit('markRoomMessagesAsRead', {
        roomCode,
        username,
      });
    },
    [socket, username]
  );
  // 1. Crean una sala nueva
  // 2. Ingresan manualmente el código de una sala
  // 3. Acceden mediante un enlace directo (URL con hash)
  useEffect(() => {
    if (!isAuthenticated || !username) return;

    // Solo marcar que se ha verificado, pero NO reconectar automáticamente
    if (!hasRestoredRoom.current) {
      hasRestoredRoom.current = true;
    }

    // Cargar las salas activas para todos los usuarios
    loadMyActiveRooms();
  }, [isAuthenticated, username, user, loadMyActiveRooms]);

  // Efecto para detectar código de sala en URL y abrir modal de unirse
  useEffect(() => {
    if (!isAuthenticated || !username) return;

    // Verificar si hay un código de sala en la URL hash
    const hash = window.location.hash;
    const roomMatch = hash.match(/#\/room\/([A-Z0-9]+)/);

    if (roomMatch && roomMatch[1]) {
      const roomCode = roomMatch[1];

      // Pre-llenar el formulario con el código de la sala
      setJoinRoomForm({ roomCode: roomCode });

      // Abrir el modal de "Unirse a sala"
      setShowJoinRoomModal(true);

      // Limpiar el hash de la URL
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [isAuthenticated, username]);

  // Cargar mensajes cuando cambie currentRoomCode (para grupos/salas)
  useEffect(() => {
    if (currentRoomCode && username && isGroup) {
      loadInitialMessages();
    }
  }, [currentRoomCode, username, isGroup, loadInitialMessages]);

  // 🔥 NUEVO: Marcar mensajes como leídos cuando se carguen en un grupo
  // Usar ref para evitar múltiples ejecuciones
  const markedRoomsRef = useRef(new Set());

  useEffect(() => {
    if (isGroup && currentRoomCode && messages.length > 0) {
      // Solo marcar si no se ha marcado antes para esta sala
      if (!markedRoomsRef.current.has(currentRoomCode)) {
        markedRoomsRef.current.add(currentRoomCode);

        // Esperar a que los mensajes se rendericen
        const timer = setTimeout(() => {
          markRoomMessagesAsRead(currentRoomCode);
        }, 500);

        return () => clearTimeout(timer);
      }
    }

    // Limpiar el set cuando se cambia de sala
    if (!isGroup || !currentRoomCode) {
      markedRoomsRef.current.clear();
    }
  }, [isGroup, currentRoomCode, messages.length, markRoomMessagesAsRead]);

  // Cargar mensajes cuando cambie 'to' (para conversaciones individuales)
  useEffect(() => {
    if (
      to &&
      username &&
      !isGroup &&
      !currentRoomCode &&
      !adminViewConversation
    ) {
      loadInitialMessages();
    }
  }, [
    to,
    username,
    isGroup,
    currentRoomCode,
    loadInitialMessages,
    adminViewConversation,
  ]);

  // Cargar mensajes cuando el admin ve una conversación de otros usuarios
  useEffect(() => {
    const loadAdminViewMessages = async () => {
      if (
        !adminViewConversation ||
        !adminViewConversation.participants ||
        adminViewConversation.participants.length < 2
      ) {
        return;
      }

      // console.log('🔄 Cargando mensajes para conversación asignada:', adminViewConversation);
      // console.log('   - currentUserFullName:', currentUserFullName);

      try {
        const [participant1, participant2] = adminViewConversation.participants;

        // console.log('   - participant1:', participant1);
        // console.log('   - participant2:', participant2);

        // 🔥 CORREGIDO: Usar los participantes reales de la conversación, no el admin
        // Los mensajes se guardan entre los dos participantes, no entre el admin y uno de ellos
        // console.log('   - participant1:', participant1);
        // console.log('   - participant2:', participant2);

        // 🔥 PRIMERO: Cargar mensajes para ver cuáles NO están leídos
        // Usar los participantes reales de la conversación para que coincida con cómo se guardan en la BD
        // 🔥 USAR ORDENAMIENTO POR ID para evitar problemas con sentAt corrupto
        const historicalMessages = await apiService.getUserMessagesOrderedById(
          participant1,
          participant2,
          20,
          0
        );

        // console.log('   - Mensajes cargados:', historicalMessages.length);

        // console.log('✅ Mensajes cargados:', historicalMessages.length);

        // 🔥 SEGUNDO: Marcar como leídos SOLO si el usuario es ADMIN, PROGRAMADOR o JEFEPISO
        // Los ASESORES NO deben marcar mensajes como leídos automáticamente
        const canMarkAsRead =
          user?.role === "ADMIN" ||
          user?.role === "PROGRAMADOR" ||
          user?.role === "JEFEPISO";

        if (canMarkAsRead) {
          const unreadMessages = historicalMessages.filter(
            (msg) => !msg.isRead
          );

          if (unreadMessages.length > 0) {
            try {
              // Marcar mensajes de participant1 a participant2 como leídos por participant2
              const unreadFromP1 = unreadMessages.filter(
                (msg) => msg.from === participant1
              );
              if (unreadFromP1.length > 0) {
                await apiService.markConversationAsRead(
                  participant1,
                  participant2
                );

                if (socket && socket.connected) {
                  socket.emit("markConversationAsRead", {
                    from: participant1,
                    to: participant2,
                  });
                }
              }

              // Marcar mensajes de participant2 a participant1 como leídos por participant1
              const unreadFromP2 = unreadMessages.filter(
                (msg) => msg.from === participant2
              );
              if (unreadFromP2.length > 0) {
                await apiService.markConversationAsRead(
                  participant2,
                  participant1
                );

                if (socket && socket.connected) {
                  socket.emit("markConversationAsRead", {
                    from: participant2,
                    to: participant1,
                  });
                }
              }

              // 🔥 Resetear el contador de mensajes no leídos en la lista de conversaciones
              setAssignedConversations((prevConversations) => {
                return prevConversations.map((conv) => {
                  if (conv.id === adminViewConversation.id) {
                    return {
                      ...conv,
                      unreadCount: 0,
                    };
                  }
                  return conv;
                });
              });
            } catch (error) {
              console.error("Error al marcar conversación como leída:", error);
            }
          }
        }

        // 🔥 TERCERO: Convertir mensajes al formato del frontend
        const formattedMessages = historicalMessages.map((msg) => {
          // 🔥 El mensaje es propio si fue enviado por el usuario actual logueado
          const isOwnMessage = msg.from === currentUserFullName;

          return {
            sender: msg.from,
            realSender: msg.from, // 🔥 Nombre real del remitente
            receiver: msg.to,
            text: msg.message || "",
            isGroup: false,
            time:
              msg.time ||
              new Date(msg.sentAt).toLocaleTimeString("es-ES", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
              }),
            isSent: true, // 🔥 Marcar como enviado para que muestre los checks
            isSelf: isOwnMessage, // 🔥 Mensajes del usuario actual a la derecha, otros a la izquierda
            mediaType: msg.mediaType,
            mediaData: msg.mediaData,
            fileName: msg.fileName,
            fileSize: msg.fileSize,
            id: msg.id,
            sentAt: msg.sentAt,
            isRead: msg.isRead, // 🔥 Estado de lectura desde la BD (ya actualizado)
            readAt: msg.readAt,
            readBy: msg.readBy,
            // Campos de respuesta
            replyToMessageId: msg.replyToMessageId,
            replyToSender: msg.replyToSender, // 🔥 Mantener el valor original de la BD
            replyToSenderNumeroAgente: msg.replyToSenderNumeroAgente || null,
            replyToText: msg.replyToText,
            // Campos de hilos
            threadCount: msg.threadCount || 0,
            lastReplyFrom: msg.lastReplyFrom || null,
            // Campos de edición
            isEdited: msg.isEdited || false,
            editedAt: msg.editedAt,
            // 🔥 Campos de eliminación
            isDeleted: msg.isDeleted || false,
            deletedBy: msg.deletedBy || null,
            deletedAt: msg.deletedAt || null,
            // 🔥 Campos de reacciones
            reactions: msg.reactions || [],
          };
        });

        // 🔥 CORREGIDO: Establecer todos los mensajes de una vez (no uno por uno)
        setInitialMessages(formattedMessages);

        // 🔥 NUEVO: Cargar threads automáticamente para mensajes que tengan threadCount > 0
        const messagesWithThreads = formattedMessages.filter(
          (msg) => msg.threadCount > 0
        );
        if (messagesWithThreads.length > 0) {
          // console.log(`🧵 Cargando threads para ${messagesWithThreads.length} mensajes...`);

          // Cargar threads en paralelo
          const threadPromises = messagesWithThreads.map((msg) =>
            apiService
              .getThreadMessages(msg.id)
              .then((threadMsgs) => ({
                messageId: msg.id,
                threads: threadMsgs,
              }))
              .catch((err) => {
                console.error(
                  `Error cargando threads para mensaje ${msg.id}:`,
                  err
                );
                return { messageId: msg.id, threads: [] };
              })
          );

          try {
            await Promise.all(threadPromises);
            // console.log('✅ Threads cargados');
            // Los threads se cargarán bajo demanda cuando se abra el ThreadPanel
            // Aquí solo los precargamos para que estén disponibles
          } catch (error) {
            console.error("Error cargando threads en paralelo:", error);
          }
        }

        // console.log('✅ Mensajes actualizados en el estado');
      } catch (error) {
        console.error("❌ Error al cargar mensajes de admin view:", error);
      }
    };

    if (adminViewConversation) {
      loadAdminViewMessages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    adminViewConversation,
    user?.role,
    username,
    socket,
    currentUserFullName,
  ]);

  // 🔥 NUEVO: Función para cargar conversaciones asignadas con paginación real
  const loadAssignedConversations = useCallback(
    async (page = 1, append = false) => {
      if (!isAuthenticated || !username) {
        return;
      }

      try {
        setAssignedLoading(true);

        // Usar paginación para todos los usuarios (admin y normales)
        const result = await apiService.getAssignedConversationsPaginated(page, 10);

        // Actualizar estados de paginación
        setAssignedPage(result.page);
        setAssignedTotal(result.total);
        setAssignedTotalPages(result.totalPages);

        // Actualizar conversaciones (append o replace)
        if (append && page > 1) {
          setAssignedConversations((prev) => [
            ...prev,
            ...result.conversations,
          ]);
        } else {
          setAssignedConversations(result.conversations);
        }

        // Actualizar el registro del socket con las conversaciones asignadas
        if (socket && result.conversations && result.conversations.length > 0) {
          const displayName =
            user?.nombre && user?.apellido
              ? `${user.nombre} ${user.apellido}`
              : user?.username || user?.email;

          socket.emit("updateAssignedConversations", {
            username: displayName,
            assignedConversations: result.conversations,
          });
        }
      } catch (error) {
        console.error("❌ Error al cargar conversaciones asignadas:", error);
        if (!append) {
          setAssignedConversations([]);
        }
      } finally {
        setAssignedLoading(false);
      }
    },
    [isAuthenticated, username, socket, user]
  );

  // 🔥 NUEVO: Función para cargar conversaciones de monitoreo con paginación
  const loadMonitoringConversations = useCallback(
    async (page = 1) => {
      if (!isAuthenticated || !username) {
        return;
      }

      setMonitoringLoading(true);
      try {
        const result = await apiService.getMonitoringConversations(page, 10);
        setMonitoringConversations(result.data || []);
        setMonitoringPage(result.page);
        setMonitoringTotal(result.total);
        setMonitoringTotalPages(result.totalPages);
      } catch (error) {
        console.error("❌ Error al cargar conversaciones de monitoreo:", error);
        setMonitoringConversations([]);
      } finally {
        setMonitoringLoading(false);
      }
    },
    [isAuthenticated, username]
  );

  // 🔥 NUEVO: Función para cargar conteos de mensajes no leídos
  const loadUnreadCounts = useCallback(async () => {
    if (!isAuthenticated || !username) {
      console.log(
        "⚠️ No se puede cargar conteos: no autenticado o sin username"
      );
      return;
    }

    console.log("📊 Cargando conteos de mensajes no leídos para:", username);
    try {
      const counts = await apiService.getUnreadCounts();
      console.log("📊 Conteos recibidos:", counts);
      setUnreadMessages(counts || {});
    } catch (error) {
      console.error("❌ Error al cargar conteos de mensajes no leídos:", error);
      setUnreadMessages({});
    }
  }, [isAuthenticated, username]);

  // Cargar conversaciones asignadas al usuario
  useEffect(() => {
    if (!isAuthenticated || !username) {
      return;
    }

    // Pequeño delay para asegurar que el usuario esté completamente autenticado
    const timeoutId = setTimeout(() => {
      loadAssignedConversations();
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, username, loadAssignedConversations]);

  // 🔥 NUEVO: Cargar conversaciones de monitoreo al usuario (solo para ADMIN)
  useEffect(() => {
    if (!isAuthenticated || !username || user?.role !== "ADMIN") {
      return;
    }

    // Pequeño delay para asegurar que el usuario esté completamente autenticado
    const timeoutId = setTimeout(() => {
      loadMonitoringConversations(1);
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, username, user?.role, loadMonitoringConversations]);

  // 🔥 NUEVO: Callback para cargar más conversaciones asignadas
  const handleLoadAssignedConversations = useCallback(
    async (page) => {
      await loadAssignedConversations(page, true); // append = true
    },
    [loadAssignedConversations]
  );

  // 🔥 NUEVO: Callback para cargar más salas del usuario
  const handleLoadUserRooms = useCallback(
    async (page) => {
      await loadMyActiveRooms(page, true); // append = true
    },
    [loadMyActiveRooms]
  );

  const handleRoomsLimitChange = useCallback(
    async (newLimit) => {
      const normalized = Math.max(5, Math.min(50, Number(newLimit) || 10));
      setRoomsLimit(normalized);
      await loadMyActiveRooms(1, false, normalized);
    },
    [loadMyActiveRooms]
  );

  const handleGoToRoomsPage = useCallback(
    async (page) => {
      const safePage = Math.max(1, Number(page) || 1);
      await loadMyActiveRooms(safePage, false);
    },
    [loadMyActiveRooms]
  );

  // 🔥 NUEVO: Cargar conteos de mensajes no leídos al autenticarse
  useEffect(() => {
    if (!isAuthenticated || !username) {
      return;
    }

    // Pequeño delay para asegurar que el usuario esté completamente autenticado
    const timeoutId = setTimeout(() => {
      loadUnreadCounts();
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [isAuthenticated, username, loadUnreadCounts]);

  // 🔥 DEBUG: Monitorear cambios en unreadMessages
  useEffect(() => {
    console.log("📊 DEBUG: unreadMessages cambió:", unreadMessages);
  }, [unreadMessages]);

  // WebSocket listeners
  useEffect(() => {
    if (!socket) return;

    const s = socket;

    s.on("userList", (data) => {
      // ✅ SIEMPRE actualizar userList para que los indicadores de estado online/offline funcionen en tiempo real
      // No importa si el usuario está en una sala o no
      setUserList(data.users);
      setUserListPage(data.page || 0);
      setUserListHasMore(data.hasMore || false);
      setUserListLoading(false);
    });

    // Nuevo evento para recibir páginas adicionales
    s.on("userListPage", (data) => {
      // ✅ SIEMPRE actualizar userList para que los indicadores de estado online/offline funcionen en tiempo real
      // Agregar usuarios a la lista existente
      setUserList((prev) => [...prev, ...data.users]);
      setUserListPage(data.page);
      setUserListHasMore(data.hasMore || false);
      setUserListLoading(false);
    });

    s.on("roomUsers", (data) => {
      // Actualizar lista de usuarios si estamos en la sala
      if (data.roomCode === currentRoomCodeRef.current) {
        setRoomUsers(data.users);
      }

      // 🔥 MODIFICADO: Solo actualizar el contador si NO estamos actualmente en esa sala
      // Si estamos en la sala, el contador ya está correcto en ChatHeader
      if (data.roomCode !== currentRoomCodeRef.current) {
        const totalCount = data.users.length;
        setMyActiveRooms((prevRooms) =>
          prevRooms.map((room) =>
            room.roomCode === data.roomCode
              ? { ...room, currentMembers: totalCount }
              : room
          )
        );
      }
    });

    s.on("roomJoined", (data) => {
      if (data.roomCode === currentRoomCodeRef.current) {
        setRoomUsers(data.users);
      }
    });

    // 🔥 NUEVO: Escuchar errores al unirse a sala
    s.on("joinRoomError", (data) => {
      console.error("❌ Error al unirse a sala:", data.message);
      showErrorAlert("Error", data.message || "Error al unirse a la sala");
    });

    s.on("userJoinedRoom", (data) => {
      if (data.roomCode === currentRoomCodeRef.current) {
        // Actualizar la lista de usuarios agregando el nuevo usuario
        setRoomUsers((prevUsers) => {
          const userExists = prevUsers.some(
            (user) =>
              (typeof user === "string" ? user : user.username) ===
              data.user.username
          );
          if (!userExists) {
            return [...prevUsers, data.user];
          }
          return prevUsers;
        });
      }
    });

    // Actualizar contador de usuarios en salas activas (solo para ADMIN y JEFEPISO)
    s.on("roomCountUpdate", (data) => {
      if (user?.role === "ADMIN" || user?.role === "JEFEPISO") {
        // 🔥 MODIFICADO: Solo actualizar el contador si NO estamos actualmente en esa sala
        // Si estamos en la sala, el contador ya está correcto en ChatHeader
        if (data.roomCode !== currentRoomCodeRef.current) {
          setMyActiveRooms((prevRooms) =>
            prevRooms.map((room) =>
              room.roomCode === data.roomCode
                ? { ...room, currentMembers: data.currentMembers }
                : room
            )
          );
        }
      }
    });

    // Escuchar evento de expulsión
    s.on("kicked", async (data) => {
      // Limpiar estado de la sala
      setTo("");
      setIsGroup(false);
      setRoomUsers([]);
      setCurrentRoomCode(null);
      currentRoomCodeRef.current = null;
      clearMessages();

      // Mostrar alerta
      await showErrorAlert(
        "Expulsado",
        data.message || "Has sido expulsado de la sala"
      );
    });

    s.on("message", (data) => {
      // 🔥 CRÍTICO: Extraer hora de sentAt (formato ISO) para mostrar la hora correcta de Perú
      let timeString;
      if (data.sentAt) {
        // Extraer hora de sentAt (formato: "2025-11-14T16:44:07.482Z" -> "16:44")
        const timeMatch = data.sentAt.match(/T(\d{2}):(\d{2})/);
        timeString = timeMatch ? `${timeMatch[1]}:${timeMatch[2]}` : data.time;
      } else {
        timeString =
          data.time ||
          new Date().toLocaleTimeString("es-ES", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          });
      }

      const dateTimeString = data.sentAt || new Date().toISOString();

      // 🔥 Notificación Toast (SweetAlert2)
      // Mostrar si el mensaje NO es propio
      if (data.from !== username && data.from !== currentUserFullName) {
        // 🔥 NUEVO: Verificar si el usuario fue mencionado en un mensaje de grupo
        const isMentioned = data.isGroup && data.hasMention;

        if (isMentioned) {
          // 🔥 Alerta especial para menciones (persiste hasta que el usuario entre al chat)
          const mentionAlert = Swal.fire({
            icon: 'warning',
            title: '📢 ¡Te mencionaron!',
            html: `
              <strong>${data.from}</strong> te mencionó en <strong>${data.group || 'un grupo'}</strong>
              <br><br>
              <em>"${data.message?.substring(0, 100)}${data.message?.length > 100 ? '...' : ''}"</em>
            `,
            showConfirmButton: true,
            confirmButtonText: 'Ver mensaje',
            showCancelButton: true,
            cancelButtonText: 'Cerrar',
            allowOutsideClick: false,
            allowEscapeKey: false,
          }).then((result) => {
            if (result.isConfirmed) {
              // 🔥 Navegar al chat del grupo donde fue mencionado
              // Esto se manejará en el componente padre
              window.dispatchEvent(new CustomEvent('navigateToMention', {
                detail: {
                  roomCode: data.roomCode,
                  groupName: data.group,
                  messageId: data.id
                }
              }));
            }
          });

          // 🔥 Guardar la mención pendiente
          if (data.roomCode) {
            setPendingMentions((prev) => ({
              ...prev,
              [data.roomCode]: {
                from: data.from,
                message: data.message,
                group: data.group,
                roomCode: data.roomCode,
                messageId: data.id,
                timestamp: dateTimeString,
                alertInstance: mentionAlert,
              }
            }));
          }
        } else {
          // Toast normal para mensajes sin mención
          const Toast = Swal.mixin({
            toast: true,
            position: 'bottom-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
            didOpen: (toast) => {
              toast.addEventListener('mouseenter', Swal.stopTimer)
              toast.addEventListener('mouseleave', Swal.resumeTimer)
            }
          });

          Toast.fire({
            icon: 'info',
            title: `Nuevo mensaje de ${data.from}`,
            text: data.message || (data.fileName ? '📎 Archivo adjunto' : 'Mensaje recibido')
          });
        }
      }

      if (data.isGroup) {
        // 🔥 CRÍTICO: Verificar que el usuario esté viendo el grupo correcto
        // Para salas temporales (con roomCode), verificar por roomCode
        // Para grupos normales (sin roomCode), verificar por nombre del grupo
        let isViewingCorrectGroup = false;

        if (currentRoomCode && data.roomCode) {
          // Sala temporal: verificar por roomCode
          isViewingCorrectGroup = isGroup && currentRoomCode === data.roomCode;
        } else {
          // Grupo normal: verificar por nombre del grupo
          isViewingCorrectGroup = isGroup && to === data.group;
        }

        if (!isViewingCorrectGroup) {
          // 🔥 NUEVO: Actualizar contador de mensajes no leídos para esta sala
          if (data.roomCode && data.from !== currentUserFullName) {
            setUnreadMessages((prev) => ({
              ...prev,
              [data.roomCode]: (prev[data.roomCode] || 0) + 1,
            }));
          }

          // 🔥 NUEVO: Actualizar último mensaje en myActiveRooms para que aparezca en tiempo real
          if (data.roomCode) {
            setMyActiveRooms((prevRooms) =>
              prevRooms.map((room) =>
                room.roomCode === data.roomCode
                  ? {
                    ...room,
                    lastMessage: {
                      text: data.message || "",
                      from: data.from,
                      time: timeString,
                      sentAt: dateTimeString,
                      mediaType: data.mediaType || null,
                      fileName: data.fileName || null,
                    },
                    lastMessageFrom: data.from,
                    lastMessageTime: timeString,
                    lastMessageAt: dateTimeString,
                  }
                  : room
              )
            );
          }

          // 🔥 NUEVO: Reproducir sonido de notificación si está habilitado
          if (soundsEnabled && data.from !== currentUserFullName) {
            playMessageSound();
          }

          return; // No procesar el mensaje para el chat actual
        }

        // Determinar si es mensaje propio o de otro usuario
        const isOwnMessage =
          data.from === username || data.from === currentUserFullName;

        const newMessage = {
          id: data.id,
          sender: isOwnMessage ? "Tú" : data.from,
          realSender: data.from,
          senderRole: data.senderRole || null,
          senderNumeroAgente: data.senderNumeroAgente || null,
          receiver: data.group,
          text: data.message || "",
          isGroup: true,
          time: timeString,
          isSent: isOwnMessage,
          isSelf: isOwnMessage,
          mediaType: data.mediaType || null,
          mediaData: data.mediaData || null,
          fileName: data.fileName || null,
          fileSize: data.fileSize || null,
          replyToMessageId: data.replyToMessageId || null,
          replyToSender: data.replyToSender || null,
          replyToSenderNumeroAgente: data.replyToSenderNumeroAgente || null,
          replyToText: data.replyToText || null,
          threadCount: data.threadCount || 0,
          lastReplyFrom: data.lastReplyFrom || null,
          reactions: data.reactions || [],
        };

        // 🔥 Usar addNewMessage directamente (ya maneja duplicados)
        addNewMessage(newMessage);

        // 🔥 NUEVO: Actualizar el lastMessage en myActiveRooms
        if (data.roomCode) {
          setMyActiveRooms((prevRooms) =>
            prevRooms.map((room) =>
              room.roomCode === data.roomCode
                ? {
                  ...room,
                  lastMessage: {
                    text: data.message || "",
                    from: data.from,
                    time: timeString,
                    sentAt: dateTimeString,
                    mediaType: data.mediaType || null,
                    fileName: data.fileName || null,
                  },
                  lastMessageFrom: data.from,
                  lastMessageTime: timeString,
                  lastMessageAt: dateTimeString,
                }
                : room
            )
          );
        }

        // Solo reproducir sonido si es de otro usuario
        if (!isOwnMessage) {
          playMessageSound(true);
        }

        return;
      } else {
        // 🔥 IMPORTANTE: Solo agregar el mensaje si el usuario está viendo el chat correcto
        console.log("📨 Mensaje 1-a-1 recibido:", {
          from: data.from,
          to: data.to,
          message: data.message?.substring(0, 50),
          isGroup: data.isGroup,
          currentTo: to,
          currentIsGroup: isGroup,
          currentRoomCode,
          username,
          currentUserFullName,
          adminViewConversation: !!adminViewConversation,
        });

        let isViewingCorrectChat = false;

        if (adminViewConversation) {
          // 🔥 Si estás viendo una conversación asignada, verificar que el mensaje pertenezca a esa conversación
          const participants = adminViewConversation.participants || [];
          const isMessageFromParticipants =
            participants.some(
              (p) => p.toLowerCase().trim() === data.from.toLowerCase().trim()
            ) &&
            participants.some(
              (p) => p.toLowerCase().trim() === data.to.toLowerCase().trim()
            );

          isViewingCorrectChat = isMessageFromParticipants;
        } else {
          // 🔥 Si NO estás viendo una conversación asignada, verificar que sea tu chat directo
          // Puede ser un mensaje recibido (from = to actual) O un mensaje enviado (to = to actual)
          const condition1 = !isGroup; // No está en un grupo
          const condition2 = !currentRoomCode; // No está en una sala
          const condition3 = !data.isGroup; // 🔥 CRÍTICO: El mensaje entrante NO debe ser de un grupo
          const condition4 = !!to; // Hay un destinatario seleccionado
          const condition5a = to?.toLowerCase().trim() === data.from?.toLowerCase().trim(); // Mensaje recibido del otro
          const condition5b = (data.from === username || data.from === currentUserFullName) &&
            to?.toLowerCase().trim() === data.to?.toLowerCase().trim(); // Mensaje enviado por mí al destinatario actual

          console.log("🔍 Condiciones para isViewingCorrectChat:", {
            condition1_notInGroup: condition1,
            condition2_noRoomCode: condition2,
            condition3_messageNotGroup: condition3,
            condition4_hasRecipient: condition4,
            condition5a_receivedFromOther: condition5a,
            condition5b_sentByMe: condition5b,
            "to?.toLowerCase()": to?.toLowerCase().trim(),
            "data.from?.toLowerCase()": data.from?.toLowerCase().trim(),
            "data.to?.toLowerCase()": data.to?.toLowerCase().trim(),
          });

          isViewingCorrectChat =
            condition1 &&
            condition2 &&
            condition3 &&
            condition4 &&
            (condition5a || condition5b);
        }

        console.log("🔍 isViewingCorrectChat:", isViewingCorrectChat);

        if (!isViewingCorrectChat) {
          console.log("⚠️ No estás viendo el chat correcto, actualizando preview...");
          // 🔥 Actualizar el preview del último mensaje en la lista de conversaciones asignadas
          setAssignedConversations((prevConversations) => {
            return prevConversations.map((conv) => {
              // Buscar la conversación que corresponde a este mensaje
              const otherUser = conv.participants?.find(
                (p) => p !== currentUserFullName
              );
              const isThisConversation =
                otherUser?.toLowerCase().trim() ===
                data.from.toLowerCase().trim();

              if (isThisConversation) {
                // 🔥 IMPORTANTE: Solo incrementar el contador si el usuario es participante
                // En monitoreo, el contador viene del backend y no debe ser modificado
                const isUserParticipant =
                  conv.participants?.includes(currentUserFullName);
                const newUnreadCount = isUserParticipant
                  ? (conv.unreadCount || 0) + 1
                  : conv.unreadCount;

                return {
                  ...conv,
                  lastMessage: data.message || "",
                  lastMessageTime: data.sentAt || dateTimeString, // 🔥 Usar sentAt del backend
                  lastMessageFrom: data.from,
                  lastMessageMediaType: data.mediaType || null,
                  lastMessageThreadCount: data.threadCount || 0,
                  lastMessageLastReplyFrom: data.lastReplyFrom || null,
                  unreadCount: newUnreadCount,
                };
              }

              return conv;
            });
          });

          // 🔥 NUEVO: También actualizar el preview en la lista de conversaciones de monitoreo
          setMonitoringConversations((prevConversations) => {
            return prevConversations.map((conv) => {
              // Buscar la conversación que corresponde a este mensaje
              // En monitoreo, verificar que ambos participantes coincidan
              const participants = conv.participants || [];
              const isThisConversation =
                participants.some(
                  (p) =>
                    p.toLowerCase().trim() === data.from.toLowerCase().trim()
                ) &&
                participants.some(
                  (p) => p.toLowerCase().trim() === data.to.toLowerCase().trim()
                );

              if (isThisConversation) {
                return {
                  ...conv,
                  lastMessage: data.message || "",
                  lastMessageTime: data.sentAt || dateTimeString, // 🔥 Usar sentAt del backend
                  lastMessageFrom: data.from,
                  lastMessageMediaType: data.mediaType || null,
                  lastMessageThreadCount: data.threadCount || 0,
                  lastMessageLastReplyFrom: data.lastReplyFrom || null,
                  // NO incrementar unreadCount en monitoreo
                };
              }

              return conv;
            });
          });

          // 🔥 NUEVO: Reproducir sonido siempre que llega un mensaje
          playMessageSound(true);
          return;
        }

        // 🔥 Determinar si el mensaje es nuestro (enviado por nosotros)
        const isMyMessage =
          data.from === currentUserFullName ||
          data.from === username ||
          data.fromId === user?.id;

        console.log("🔍 Verificando si el mensaje es mío:", {
          "data.from": data.from,
          currentUserFullName,
          username,
          "data.fromId": data.fromId,
          "user?.id": user?.id,
          isMyMessage,
        });

        const newMessage = {
          id: data.id,
          sender: isMyMessage ? "Tú" : data.from, // 🔥 Si es nuestro, mostrar "Tú"
          realSender: data.from, // 🔥 Nombre real del remitente
          senderRole: data.senderRole || null, // 🔥 Incluir role del remitente
          senderNumeroAgente: data.senderNumeroAgente || null, // 🔥 Incluir numeroAgente del remitente
          receiver: data.to || username,
          text: data.message || "",
          isGroup: false,
          time: timeString,
          isSent: isMyMessage, // 🔥 Si es nuestro, marcarlo como enviado
          isSelf: isMyMessage, // 🔥 Si es nuestro, mostrarlo a la derecha
          isRead: data.isRead || false,
          readAt: data.readAt,
          sentAt: data.sentAt,
        };

        if (data.mediaType) {
          newMessage.mediaType = data.mediaType;
          newMessage.mediaData = data.mediaData; // URL del archivo
          newMessage.fileName = data.fileName;
          newMessage.fileSize = data.fileSize;
        }

        // Agregar información de respuesta si existe
        if (data.replyToMessageId) {
          newMessage.replyToMessageId = data.replyToMessageId;
          newMessage.replyToSender = data.replyToSender;
          newMessage.replyToSenderNumeroAgente = data.replyToSenderNumeroAgente;
          newMessage.replyToText = data.replyToText;
        }

        // Agregar información de hilos
        newMessage.threadCount = data.threadCount || 0;
        newMessage.lastReplyFrom = data.lastReplyFrom || null;

        // Agregar información de reacciones
        newMessage.reactions = data.reactions || [];

        // 🔥 Usar addNewMessage directamente (ya maneja duplicados)
        addNewMessage(newMessage);

        // 🔥 IMPORTANTE: También actualizar el preview en la lista de conversaciones
        setAssignedConversations((prevConversations) => {
          return prevConversations.map((conv) => {
            // Buscar la conversación que corresponde a este mensaje
            const otherUser = conv.participants?.find(
              (p) => p !== currentUserFullName
            );
            const isThisConversation =
              otherUser?.toLowerCase().trim() ===
              data.from.toLowerCase().trim();

            if (isThisConversation) {
              return {
                ...conv,
                lastMessage: data.message || "",
                lastMessageTime: dateTimeString,
                lastMessageFrom: data.from,
                // NO incrementar unreadCount porque el usuario está viendo el chat
              };
            }

            return conv;
          });
        });

        // 🔥 NUEVO: También actualizar el preview en la lista de conversaciones de monitoreo
        setMonitoringConversations((prevConversations) => {
          return prevConversations.map((conv) => {
            // Buscar la conversación que corresponde a este mensaje
            // En monitoreo, verificar que ambos participantes coincidan
            const participants = conv.participants || [];
            const isThisConversation =
              participants.some(
                (p) => p.toLowerCase().trim() === data.from.toLowerCase().trim()
              ) &&
              participants.some(
                (p) => p.toLowerCase().trim() === data.to.toLowerCase().trim()
              );

            if (isThisConversation) {
              return {
                ...conv,
                lastMessage: data.message || "",
                lastMessageTime: dateTimeString,
                lastMessageFrom: data.from,
                lastMessageMediaType: data.mediaType || null,
                lastMessageThreadCount: data.threadCount || 0,
                lastMessageLastReplyFrom: data.lastReplyFrom || null,
                // NO incrementar unreadCount en monitoreo
              };
            }

            return conv;
          });
        });

        if (data.from !== username && data.from !== currentUserFullName) {
          // 🔥 NUEVO: Reproducir sonido siempre que llega un mensaje de otro usuario
          playMessageSound(true);
        }
      }
    });

    // 🔥 NUEVO: Evento para actualizar monitoreo en tiempo real
    s.on("monitoringMessage", (data) => {
      // console.log('📡 Evento monitoringMessage recibido:', {
      //   from: data.from,
      //   to: data.to,
      //   message: data.message?.substring(0, 50),
      //   isGroup: data.isGroup
      // });

      // 🔥 CORREGIDO: Usar directamente la fecha del backend (ya está en hora de Perú)
      const dateTimeString = data.sentAt || new Date().toISOString();

      // Actualizar el preview en la lista de conversaciones de monitoreo
      setMonitoringConversations((prevConversations) => {
        // Buscar si la conversación ya existe
        let conversationFound = false;
        const updatedConversations = prevConversations.map((conv) => {
          const participants = conv.participants || [];
          const isThisConversation =
            participants.some(
              (p) => p.toLowerCase().trim() === data.from.toLowerCase().trim()
            ) &&
            participants.some(
              (p) => p.toLowerCase().trim() === data.to.toLowerCase().trim()
            );

          if (isThisConversation) {
            conversationFound = true;
            return {
              ...conv,
              lastMessage: data.message || "",
              lastMessageTime: dateTimeString,
              lastMessageFrom: data.from,
              lastMessageMediaType: data.mediaType || null,
              lastMessageThreadCount: data.threadCount || 0,
              lastMessageLastReplyFrom: data.lastReplyFrom || null,
            };
          }

          return conv;
        });

        // 🔥 Si la conversación no existe en la lista actual, crear una nueva entrada
        if (!conversationFound) {
          // 🔥 CRÍTICO: Verificar si ya existe una conversación con los mismos participantes
          // Esto evita duplicados cuando React Strict Mode ejecuta el setter 2 veces
          const alreadyExists = updatedConversations.some((conv) => {
            const participants = conv.participants || [];
            return (
              participants.some(
                (p) => p.toLowerCase().trim() === data.from.toLowerCase().trim()
              ) &&
              participants.some(
                (p) => p.toLowerCase().trim() === data.to.toLowerCase().trim()
              )
            );
          });

          if (alreadyExists) {
            return updatedConversations;
          }

          const newConversation = {
            id: data.id || `temp-${Date.now()}`,
            name: `${data.from} • ${data.to}`,
            participants: [data.from, data.to],
            lastMessage: data.message || "",
            lastMessageTime: dateTimeString,
            lastMessageFrom: data.from,
            lastMessageMediaType: data.mediaType || null,
            lastMessageThreadCount: data.threadCount || 0,
            lastMessageLastReplyFrom: data.lastReplyFrom || null,
            isGroup: false,
            unreadCount: 0,
          };
          // Agregar la nueva conversación al inicio de la lista
          return [newConversation, ...updatedConversations];
        }

        return updatedConversations;
      });
    });

    // Evento para mensaje editado
    s.on("messageEdited", (data) => {
      const {
        messageId,
        newText,
        editedAt,
        isEdited,
        mediaType,
        mediaData,
        fileName,
        fileSize,
      } = data;

      // Actualizar el mensaje en la lista de mensajes
      const updateData = { text: newText, isEdited, editedAt };

      // 🔥 Si hay campos multimedia, incluirlos en la actualización
      if (mediaType !== undefined) updateData.mediaType = mediaType;
      if (mediaData !== undefined) updateData.mediaData = mediaData;
      if (fileName !== undefined) updateData.fileName = fileName;
      if (fileSize !== undefined) updateData.fileSize = fileSize;

      updateMessage(messageId, updateData);
    });

    // Evento para mensaje eliminado
    s.on("messageDeleted", (data) => {
      const { messageId, isDeleted, deletedAt, deletedBy } = data;

      // console.log(`🗑️ Mensaje eliminado recibido:`, { messageId, deletedBy });

      // Actualizar el mensaje en la lista de mensajes
      updateMessage(messageId, {
        isDeleted,
        deletedAt,
        deletedBy,
        text: deletedBy
          ? `Mensaje eliminado por ${deletedBy}`
          : "Mensaje eliminado",
      });
    });

    s.on("connect", () => {
      if (currentRoomCode) {
        socket.emit("joinRoom", {
          roomCode: currentRoomCode,
          roomName: to,
          from: username,
        });
      }
    });

    // 🔥 BLOQUEADO: Listeners de WebRTC deshabilitados

    // Nueva conversación asignada
    s.on("newConversationAssigned", async (data) => {
      // Recargar conversaciones asignadas
      try {
        // Usar paginación para todos los usuarios (admin y normales)
        const result = await apiService.getAssignedConversationsPaginated(1, 10);
        const conversations = result.conversations;

        setAssignedConversations(conversations);

        // Actualizar el socket con las conversaciones asignadas para que se actualice la lista de usuarios
        if (s && s.connected && user) {
          const displayName =
            user?.nombre && user?.apellido
              ? `${user.nombre} ${user.apellido}`
              : user?.username || user?.email;

          s.emit("updateAssignedConversations", {
            username: displayName,
            assignedConversations: conversations,
          });
        }

        // Mostrar notificación con SweetAlert2
        await showSuccessAlert(
          "💬 Conversación asignada",
          `Chat: ${data.otherUser}\n\nPuedes verla en tu lista de chats.`
        );
      } catch (error) {
        console.error("Error al recargar conversaciones:", error);
      }
    });

    // Evento: Conversación actualizada (nombre, descripción, etc.)
    s.on("conversationDataUpdated", async () => {
      try {
        // Recargar conversaciones asignadas
        await loadAssignedConversations();

        // 🔥 NO mostrar alerta aquí para evitar duplicados
        // La alerta ya se muestra en el modal de edición
        // console.log('✅ Conversación actualizada:', data.conversationName);
      } catch (error) {
        console.error("Error al recargar conversaciones:", error);
      }
    });

    // Evento: Conversación marcada como leída (actualizar checks)
    s.on("conversationRead", (data) => {
      const { readBy, messageIds, readAt, from, to: readTo } = data;

      // Actualizar todos los mensajes que fueron leídos
      if (messageIds && Array.isArray(messageIds)) {
        messageIds.forEach((messageId) => {
          updateMessage(messageId, {
            isRead: true,
            readAt: readAt,
            readBy: [readBy], // Agregar el usuario que leyó el mensaje
          });
        });
      }

      // 🔥 Resetear el contador de mensajes no leídos en la lista de conversaciones
      if (from && readTo) {
        setAssignedConversations((prevConversations) => {
          return prevConversations.map((conv) => {
            const otherUser = conv.participants?.find(
              (p) => p !== currentUserFullName
            );
            const isThisConversation =
              otherUser?.toLowerCase().trim() === from?.toLowerCase().trim() ||
              otherUser?.toLowerCase().trim() === readTo?.toLowerCase().trim();

            if (isThisConversation) {
              return {
                ...conv,
                unreadCount: 0,
              };
            }
            return conv;
          });
        });
      }
    });

    // Evento: El otro usuario está escribiendo
    s.on("userTyping", (data) => {
      const { from, isTyping: typing } = data;

      // Solo mostrar si el mensaje es del usuario con el que estamos chateando
      if (from === to) {
        if (typing) {
          // Buscar información del usuario en userList
          const userInfo = userList.find((u) => u.username === from);

          setTypingUser({
            username: from,
            nombre: userInfo?.nombre || from,
            apellido: userInfo?.apellido || "",
            picture: userInfo?.picture || null,
          });

          // Si está escribiendo, limpiar el timeout anterior
          if (typingTimeout) {
            clearTimeout(typingTimeout);
          }
        } else {
          // Si dejó de escribir, ocultar el indicador después de 1 segundo
          const timeout = setTimeout(() => {
            setTypingUser(null);
          }, 1000);
          setTypingTimeout(timeout);
        }
      }
    });

    // Evento: Alguien está escribiendo en una sala
    s.on("roomTyping", (data) => {
      const { from, roomCode, isTyping: typing } = data;

      setRoomTypingUsers((prev) => {
        const currentTyping = prev[roomCode] || [];

        if (typing) {
          // Buscar información del usuario en userList
          const userInfo = userList.find((u) => u.username === from);

          const userTypingInfo = {
            username: from,
            nombre: userInfo?.nombre || from,
            apellido: userInfo?.apellido || "",
            picture: userInfo?.picture || null,
          };

          // Agregar usuario si no está ya en la lista
          const existingIndex = currentTyping.findIndex(
            (u) => u.username === from
          );
          if (existingIndex === -1) {
            return {
              ...prev,
              [roomCode]: [...currentTyping, userTypingInfo],
            };
          }
        } else {
          // Remover usuario de la lista
          const filtered = currentTyping.filter(
            (user) => user.username !== from
          );
          if (filtered.length === 0) {
            const { [roomCode]: _, ...rest } = prev;
            return rest;
          }
          return {
            ...prev,
            [roomCode]: filtered,
          };
        }

        return prev;
      });
    });

    // Evento: Mensaje de sala marcado como leído
    s.on("roomMessageRead", (data) => {
      const { messageId, readBy, readAt } = data;

      // Actualizar el mensaje con el array completo de lectores
      updateMessage(messageId, {
        readBy: readBy, // readBy es el array completo desde el backend
        readAt: readAt,
      });
    });

    // 🔥 Evento: Nueva sala creada (notificación global para ADMIN y JEFEPISO)
    s.on("roomCreated", (data) => {
      // console.log('✨ Nueva sala creada:', data);

      // Solo agregar si el usuario es ADMIN o JEFEPISO
      if (user?.role === "ADMIN" || user?.role === "JEFEPISO") {
        // Agregar la nueva sala a la lista de salas activas
        setMyActiveRooms((prevRooms) => {
          // Verificar que no exista ya en la lista
          const exists = prevRooms.some((room) => room.id === data.id);
          if (!exists) {
            return [data, ...prevRooms];
          }
          return prevRooms;
        });
      }
    });

    // 🔥 Evento: Sala eliminada/desactivada (notificación global)
    s.on("roomDeleted", (data) => {
      const { roomCode, roomId } = data;

      // Actualizar la lista de salas activas eliminando la sala
      setMyActiveRooms((prevRooms) =>
        prevRooms.filter(
          (room) => room.id !== roomId && room.roomCode !== roomCode
        )
      );

      // Si el usuario está actualmente en la sala eliminada, sacarlo
      if (currentRoomCode === roomCode) {
        setTo("");
        setIsGroup(false);
        setCurrentRoomCode(null);
        currentRoomCodeRef.current = null;
        setRoomUsers([]);
        clearMessages();

        // Mostrar notificación
        showErrorAlert(
          "Sala eliminada",
          "La sala en la que estabas ha sido eliminada por el administrador."
        );
      }
    });

    // 🔥 Evento: Usuario agregado a una sala
    s.on("addedToRoom", async (data) => {
      const { message, roomCode } = data;

      // 🔥 MODIFICADO: Para ADMIN, recargar TODAS las salas activas
      // Para usuarios normales, recargar solo su sala actual
      try {
        if (
          user?.role === "ADMIN" ||
          user?.role === "JEFEPISO" ||
          user?.role === "PROGRAMADOR"
        ) {
          // ADMIN: Recargar todas las salas activas
          await loadMyActiveRooms();
        } else {
          // Usuario normal: Recargar solo su sala actual
          const response = await apiService.getCurrentUserRoom();
          if (response && response.inRoom && response.room) {
            setMyActiveRooms([response.room]);
          }
        }
      } catch (error) {
        console.error("Error al recargar sala activa:", error);
      }

      // Solo mostrar notificación si NO estamos actualmente en esa sala
      // (para evitar mostrar la alerta cuando el usuario se une manualmente)
      if (currentRoomCodeRef.current !== roomCode) {
        showSuccessAlert("Agregado a sala", message);
      }
    });

    // 🔥 Evento: Usuario eliminado de una sala
    s.on("removedFromRoom", async (data) => {
      const { message, roomCode } = data;

      // Si estamos en la sala de la que fuimos eliminados, salir
      if (currentRoomCodeRef.current === roomCode) {
        setTo(null);
        setIsGroup(false);
        setCurrentRoomCode(null);
        currentRoomCodeRef.current = null;
        setRoomUsers([]);
        clearMessages();
      }

      // 🔥 MODIFICADO: Para ADMIN, recargar TODAS las salas activas
      // Para usuarios normales, recargar solo su sala actual
      try {
        if (
          user?.role === "ADMIN" ||
          user?.role === "JEFEPISO" ||
          user?.role === "PROGRAMADOR"
        ) {
          // ADMIN: Recargar todas las salas activas
          await loadMyActiveRooms();
        } else {
          // Usuario normal: Recargar solo su sala actual
          const response = await apiService.getCurrentUserRoom();
          if (response && response.inRoom && response.room) {
            setMyActiveRooms([response.room]);
          } else {
            setMyActiveRooms([]);
          }
        }
      } catch (error) {
        console.error("Error al recargar sala activa:", error);
      }

      // Mostrar notificación
      showErrorAlert("Eliminado de sala", message);
    });

    // 🔥 Evento: Sala desactivada por el administrador
    s.on("roomDeactivated", async (data) => {
      const { message, roomCode } = data;

      // console.log('🚫 Sala desactivada:', roomCode);

      // Si estamos en la sala desactivada, salir
      if (currentRoomCodeRef.current === roomCode) {
        setTo(null);
        setIsGroup(false);
        setCurrentRoomCode(null);
        currentRoomCodeRef.current = null;
        setRoomUsers([]);
        clearMessages();
      }

      // 🔥 MODIFICADO: Para ADMIN, recargar TODAS las salas activas
      // Para usuarios normales, recargar solo su sala actual
      try {
        if (
          user?.role === "ADMIN" ||
          user?.role === "JEFEPISO" ||
          user?.role === "PROGRAMADOR"
        ) {
          // ADMIN: Recargar todas las salas activas
          await loadMyActiveRooms();
        } else {
          // Usuario normal: Recargar solo su sala actual
          const response = await apiService.getCurrentUserRoom();
          if (response && response.inRoom && response.room) {
            setMyActiveRooms([response.room]);
          } else {
            setMyActiveRooms([]);
          }
        }
      } catch (error) {
        console.error("Error al recargar sala activa:", error);
      }

      // Mostrar notificación
      showErrorAlert("Sala desactivada", message);
    });

    // Evento: Reacción actualizada en un mensaje
    s.on("reactionUpdated", (data) => {
      const { messageId, reactions } = data;
      // console.log(`🔄 reactionUpdated recibido - MessageID: ${messageId}, Reactions:`, reactions);

      // Actualizar el mensaje con las nuevas reacciones
      updateMessage(messageId, {
        reactions: reactions,
      });
    });

    // Evento: Contador de hilo actualizado
    s.on("threadCountUpdated", (data) => {
      const { messageId, lastReplyFrom, from, to, isGroup } = data;
      // console.log('🔢 Evento threadCountUpdated recibido:', data);

      // 🔥 IMPORTANTE: Solo actualizar si NO soy yo quien envió el mensaje
      // Si soy el remitente, ya actualicé localmente en handleSendThreadMessage
      if (lastReplyFrom !== username) {
        // console.log('✅ Actualizando porque el mensaje es de otro usuario');

        // Actualizar el contador del mensaje
        updateMessage(messageId, (prevMessage) => ({
          threadCount: (prevMessage.threadCount || 0) + 1,
          lastReplyFrom: lastReplyFrom,
        }));

        // Actualizar el preview en ConversationList
        if (!isGroup && from && to) {
          // console.log('📝 Actualizando preview en ConversationList para conversación:', from, '•', to);

          // Actualizar conversaciones asignadas
          setAssignedConversations((prevConversations) => {
            return prevConversations.map((conv) => {
              const participants = conv.participants || [];
              const isThisConversation =
                participants.some(
                  (p) => p.toLowerCase().trim() === from.toLowerCase().trim()
                ) &&
                participants.some(
                  (p) => p.toLowerCase().trim() === to.toLowerCase().trim()
                );

              if (isThisConversation) {
                const newCount = (conv.lastMessageThreadCount || 0) + 1;
                return {
                  ...conv,
                  lastMessageThreadCount: newCount,
                  lastMessageLastReplyFrom: lastReplyFrom,
                };
              }

              return conv;
            });
          });

          // Actualizar conversaciones de monitoreo
          setMonitoringConversations((prevConversations) => {
            // console.log('🔍 Conversaciones de monitoreo actuales:', prevConversations.length);
            const updated = prevConversations.map((conv) => {
              const participants = conv.participants || [];
              const isThisConversation =
                participants.some(
                  (p) => p.toLowerCase().trim() === from.toLowerCase().trim()
                ) &&
                participants.some(
                  (p) => p.toLowerCase().trim() === to.toLowerCase().trim()
                );

              if (isThisConversation) {
                const newCount = (conv.lastMessageThreadCount || 0) + 1;
                // console.log(`✅ Actualizando conversación de monitoreo "${conv.name}": ${conv.lastMessageThreadCount || 0} → ${newCount}`);
                return {
                  ...conv,
                  lastMessageThreadCount: newCount,
                  lastMessageLastReplyFrom: lastReplyFrom,
                  // 🔥 NO actualizar lastMessage aquí - el contador se muestra automáticamente en ConversationList
                  // cuando lastMessageThreadCount > 0
                };
              }

              return conv;
            });
            return updated;
          });
        }
      } else {
        // console.log('⏭️ No actualizando porque soy el remitente (ya actualicé localmente)');
      }
    });

    // 🔥 NUEVO: Evento para recibir mensajes de hilo en tiempo real
    s.on("threadMessage", (data) => {
      // console.log('🧵 Evento threadMessage recibido:', data);

      // El mensaje ya fue guardado en BD por el frontend que lo envió
      // Solo necesitamos notificar al usuario que hay un nuevo mensaje en el hilo
      // El ThreadPanel se encargará de cargar los mensajes cuando se abra

      // Si el hilo está abierto actualmente, podríamos recargar los mensajes
      // Pero por ahora solo notificamos que hay un nuevo mensaje
      if (threadMessage && threadMessage.id === data.threadId) {
        // El hilo está abierto, podríamos recargar los mensajes aquí
        // console.log('🧵 Nuevo mensaje en el hilo abierto:', data);
      }

      // 🔥 Reproducir sonido si el mensaje es de otro usuario
      if (data.from !== username && data.from !== currentUserFullName) {
        // console.log('🔔 Reproduciendo sonido de notificación para mensaje de hilo');
        playMessageSound(soundsEnabled);
      }
    });

    // 🔥 NUEVO: Listener para actualizaciones de conteos de mensajes no leídos
    s.on("unreadCountUpdate", (data) => {
      // console.log("📊 Evento unreadCountUpdate recibido:", data);
      // console.log("📊 DEBUG - Tipo de data:", typeof data);
      // console.log("📊 DEBUG - Keys de data:", Object.keys(data));
      // data = { roomCode: string, count: number, lastMessage?: { text, from, time, sentAt } }

      // Actualizar contador solo si count > 0
      if (data.count > 0) {
        setUnreadMessages((prev) => {
          const updated = {
            ...prev,
            [data.roomCode]: (prev[data.roomCode] || 0) + data.count, // Sumar al contador existente
          };
          // console.log("📊 Estado unreadMessages actualizado:", updated);
          return updated;
        });

        // 🔊 Reproducir sonido de notificación solo cuando hay mensajes no leídos
        try {
          const audio = new Audio(
            "https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
          );
          audio.volume = 0.5; // Volumen al 50%
          audio
            .play()
            .catch((e) => console.log("No se pudo reproducir sonido:", e));
        } catch (error) {
          console.log("Error al reproducir sonido:", error);
        }
      }

      // 🔥 SOLO actualizar último mensaje si NO es la sala actual donde el usuario está escribiendo
      // Esto evita que se sobrescriba el mensaje que el usuario acaba de enviar
      if (data.lastMessage && data.roomCode !== currentRoomCode) {
        setMyActiveRooms((prevRooms) =>
          prevRooms.map((room) =>
            room.roomCode === data.roomCode
              ? {
                ...room,
                lastMessage: {
                  text: data.lastMessage.text,
                  from: data.lastMessage.from,
                  time: data.lastMessage.time,
                  sentAt: data.lastMessage.sentAt,
                  mediaType: data.lastMessage.mediaType || null,
                  fileName: data.lastMessage.fileName || null,
                },
                lastMessageFrom: data.lastMessage.from,
                lastMessageTime: data.lastMessage.time,
                lastMessageAt: data.lastMessage.sentAt,
              }
              : room
          )
        );
        // console.log(
        //   "📊 Último mensaje actualizado en myActiveRooms para sala:",
        //   data.roomCode
        // );
      } else if (data.lastMessage && data.roomCode === currentRoomCode) {
        // console.log(
        //   "📊 Ignorando actualización de lastMessage para sala actual:",
        //   data.roomCode,
        //   "- El usuario está escribiendo en esta sala"
        // );
      }
    });

    // 🔥 NUEVO: Listener para resetear contador cuando el usuario entra a una sala
    s.on("unreadCountReset", (data) => {
      // console.log("📊 Evento unreadCountReset recibido:", data);
      // data = { roomCode: string }
      setUnreadMessages((prev) => {
        const updated = {
          ...prev,
          [data.roomCode]: 0,
        };
        // console.log("📊 Estado unreadMessages reseteado:", updated);
        return updated;
      });
    });

    return () => {
      s.off("userList");
      s.off("roomUsers");
      s.off("roomJoined");
      s.off("joinRoomError");
      s.off("userJoinedRoom");
      s.off("message");
      s.off("connect");
      // 🔥 BLOQUEADO: Event listeners de WebRTC removidos
      s.off("newConversationAssigned");
      s.off("userTyping");
      s.off("roomTyping");
      s.off("roomMessageRead");
      s.off("reactionUpdated");
      s.off("threadCountUpdated");
      s.off("threadMessage");
      s.off("roomCreated");
      s.off("roomDeleted");
      s.off("removedFromRoom");
      s.off("roomDeactivated");
      s.off("monitoringMessage"); // 🔥 CRÍTICO: Limpiar listener de monitoringMessage
      s.off("messageEdited");
      s.off("messageDeleted");
      s.off("kicked");
      s.off("roomCountUpdate");
      s.off("unreadCountUpdate");
      s.off("unreadCountReset");
    };
  }, [
    socket,
    currentRoomCode,
    to,
    isGroup,
    username,
    isAdmin,
    soundsEnabled,
    typingTimeout,
    adminViewConversation,
    addNewMessage,
    updateMessage,
    currentUserFullName,
    playMessageSound,
    setAssignedConversations,
    clearMessages,
    loadAssignedConversations,
    setCurrentRoomCode,
    user,
    loadMyActiveRooms,
    threadMessage,
    userList,
  ]);

  // Estado para el mensaje a resaltar
  const [highlightMessageId, setHighlightMessageId] = useState(null);

  // Función para cargar más usuarios (paginación)
  const loadMoreUsers = () => {
    if (!socket || !socket.connected || userListLoading || !userListHasMore) {
      return;
    }

    setUserListLoading(true);
    socket.emit("requestUserListPage", {
      page: userListPage + 1,
      pageSize: 10,
    });
  };

  // Handlers
  const handleUserSelect = (
    userName,
    messageId = null,
    conversationData = null
  ) => {
    // console.log('👤 Usuario seleccionado:', userName, 'conversationData:', conversationData);
    // console.log('🔄 Estado ANTES de cambiar:', {
    //   to,
    //   isGroup,
    //   currentRoomCode
    // });

    // 🔥 CRÍTICO: Limpiar INMEDIATAMENTE el estado anterior para evitar que se muestren datos del chat anterior
    clearMessages(); // Limpiar mensajes SIEMPRE, sin importar el tipo de conversación
    setRoomUsers([]); // Limpiar usuarios de sala para que el header se actualice inmediatamente
    setIsGroup(false); // Establecer que NO es grupo
    setCurrentRoomCode(null); // Limpiar código de sala
    currentRoomCodeRef.current = null;
    setReplyingTo(null); // 🔥 Limpiar estado de respuesta
    setThreadMessage(null); // 🔥 Limpiar panel de hilo

    // Si es una conversación de admin (conversationData presente), guardarla
    if (conversationData) {
      setAdminViewConversation(conversationData);
      // 🔥 IMPORTANTE: Usar userName (que es el displayName del otro participante)
      // NO usar conversationData.name porque puede ser el nombre de cualquiera de los dos
      setTo(userName);
    } else {
      setAdminViewConversation(null);
      setTo(userName);
    }

    // console.log('✅ Estado DESPUÉS de cambiar (programado):', {
    //   to: userName,
    //   isGroup: false,
    //   currentRoomCode: null
    // });

    // Si se proporciona un messageId, guardarlo para resaltarlo después de cargar los mensajes
    if (messageId) {
      setHighlightMessageId(messageId);
    } else {
      setHighlightMessageId(null);
    }

    // 📱 Cerrar sidebar en mobile al seleccionar un chat
    if (window.innerWidth <= 768) {
      setShowSidebar(false);
    }
  };

  const handleGroupSelect = (group) => {
    // 🔥 CRÍTICO: Limpiar INMEDIATAMENTE el estado anterior
    clearMessages(); // Limpiar mensajes primero
    setAdminViewConversation(null); // Limpiar vista de admin
    setCurrentRoomCode(null); // Limpiar código de sala
    currentRoomCodeRef.current = null;
    setReplyingTo(null); // 🔥 Limpiar estado de respuesta
    setThreadMessage(null); // 🔥 Limpiar panel de hilo

    // Establecer nuevo estado
    setTo(group.name);
    setIsGroup(true);
    setRoomUsers(group.members);

    // 📱 Cerrar sidebar en mobile al seleccionar un grupo
    if (window.innerWidth <= 768) {
      setShowSidebar(false);
    }
  };

  const handlePersonalNotes = () => {
    // 🔥 CRÍTICO: Limpiar INMEDIATAMENTE el estado anterior
    clearMessages(); // Limpiar mensajes primero
    setRoomUsers([]); // Limpiar usuarios de sala
    setIsGroup(false);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setAdminViewConversation(null); // Limpiar vista de admin
    setReplyingTo(null); // 🔥 Limpiar estado de respuesta
    setThreadMessage(null); // 🔥 Limpiar panel de hilo

    setTo(username);
  };

  // Función para cerrar el chat (volver al sidebar)
  const handleCloseChat = useCallback(() => {
    // En desktop, cerrar el chat significa limpiar la selección
    setTo("");
    setIsGroup(false);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setRoomUsers([]);
    setAdminViewConversation(null);
    clearMessages();
    setReplyingTo(null); // 🔥 Limpiar estado de respuesta
    setThreadMessage(null); // 🔥 Limpiar panel de hilo

    // En mobile, mostrar el sidebar
    if (window.innerWidth <= 768) {
      setShowSidebar(true);
    }
  });

  // Función para toggle del menú (ocultar/mostrar sidebar)
  const handleToggleMenu = () => {
    // En mobile, si hay un chat seleccionado y el sidebar está cerrado,
    // el botón de "regresar" debe cerrar el chat en lugar de abrir el sidebar
    if (window.innerWidth <= 768 && to && !showSidebar) {
      handleCloseChat();
    } else {
      setShowSidebar(!showSidebar);
    }
  };

  // Listener para la tecla ESC en desktop
  useEffect(() => {
    const handleEscKey = (event) => {
      // Solo en desktop (ancho > 600px)
      if (event.key === "Escape" && window.innerWidth > 600 && to) {
        handleCloseChat();
      }
    };

    window.addEventListener("keydown", handleEscKey);
    return () => {
      window.removeEventListener("keydown", handleEscKey);
    };
  }, [handleCloseChat, to]); // Dependencia: to (para saber si hay un chat abierto)

  const handleCreateRoom = async () => {
    try {
      // Incluir el nombre del creador en la petición de creación
      const createData = {
        name: roomForm.name,
        maxCapacity: roomForm.maxCapacity,
        creatorUsername: username,
      };

      const result = await apiService.createTemporaryRoom(createData);
      setShowCreateRoomModal(false);
      setRoomForm({ name: "", maxCapacity: 50 });

      // Guardar los datos de la sala creada para mostrar en el modal
      setCreatedRoomData(result);
      setShowRoomCreatedModal(true);

      // Ya no necesitamos unirnos manualmente, el creador ya está en la sala
      setTo(result.name);
      setIsGroup(true);
      setCurrentRoomCode(result.roomCode);
      currentRoomCodeRef.current = result.roomCode;

      // La sala se maneja automáticamente por el backend

      // Emitir evento de unirse a la sala
      if (socket && socket.connected) {
        socket.emit("joinRoom", {
          roomCode: result.roomCode,
          roomName: result.name,
          from: username,
        });
      }

      clearMessages();
      setRoomUsers([]);

      // Actualizar la lista de salas activas para que aparezca en el sidebar
      await loadMyActiveRooms();
    } catch (error) {
      console.error("Error al crear sala:", error);
      const errorMessage =
        error.response?.data?.message || error.message || "Error desconocido";
      await showErrorAlert("Error al crear sala", errorMessage);
    }
  };

  const handleJoinRoom = async () => {
    try {
      // Incluir el nombre del usuario en la petición
      const joinData = {
        roomCode: joinRoomForm.roomCode,
        username: username,
      };

      const result = await apiService.joinRoom(joinData);
      setShowJoinRoomModal(false);
      setJoinRoomForm({ roomCode: "" });

      // 🔥 CRÍTICO: Limpiar INMEDIATAMENTE el estado anterior
      clearMessages(); // Limpiar mensajes primero
      setAdminViewConversation(null); // Limpiar vista de admin
      setRoomUsers([]); // Limpiar usuarios de sala anterior

      setTo(result.name);
      setIsGroup(true);
      setCurrentRoomCode(result.roomCode);
      currentRoomCodeRef.current = result.roomCode;

      // Cargar mensajes históricos de la sala usando paginación
      await loadInitialMessages();

      // Emitir evento de unirse a la sala
      if (socket && socket.connected) {
        socket.emit("joinRoom", {
          roomCode: result.roomCode,
          roomName: result.name,
          from: username,
        });
      }
    } catch (error) {
      console.error("Error al unirse a sala:", error);
      await showErrorAlert(
        "Error",
        "Error al unirse a la sala: " + error.message
      );
    }
  };

  const handleLeaveRoom = () => {
    // 🔥 MODIFICADO: Solo emitir leaveRoom si el usuario está realmente en la sala
    if (socket && socket.connected) {
      // Verificar si el usuario está en la lista de miembros de la sala
      // Comparar con username (no con nombre completo)
      const isUserInRoom = roomUsers.some((user) => user.username === username);

      // Solo emitir leaveRoom si el usuario está realmente en la sala
      if (isUserInRoom) {
        socket.emit("leaveRoom", {
          roomCode: currentRoomCode,
          from: username,
        });
      }
    }

    // Limpiar el chat y regresar al WelcomeScreen
    setTo("");
    setIsGroup(false);
    setRoomUsers([]);
    setCurrentRoomCode(null);
    currentRoomCodeRef.current = null;
    setAdminViewConversation(null);
    clearMessages();
    setReplyingTo(null); // 🔥 Limpiar estado de respuesta
    setThreadMessage(null); // 🔥 Limpiar panel de hilo

    // En mobile, mostrar el sidebar
    if (window.innerWidth <= 768) {
      setShowSidebar(true);
    }
  };

  // Función para seleccionar una sala del sidebar
  const handleRoomSelect = async (room, messageId = null) => {
    try {
      console.log("🏠 Seleccionando sala:", {
        name: room.name,
        roomCode: room.roomCode,
        currentRoomCode,
        messageId,
        allRooms: myActiveRooms.map((r) => ({
          name: r.name,
          roomCode: r.roomCode,
        })),
      });

      // Si ya estamos en esta sala, no hacer nada (a menos que haya un messageId para resaltar)
      if (currentRoomCode === room.roomCode && !messageId) {
        return;
      }

      // 🔥 MODIFICADO: Solo emitir leaveRoom si el usuario está realmente en la sala anterior
      // Para ADMIN que solo monitorea, NO emitir leaveRoom
      if (currentRoomCode && socket && socket.connected) {
        // Verificar si el usuario está en la lista de miembros de la sala anterior
        // Comparar con username (no con nombre completo)
        const isUserInPreviousRoom = roomUsers.some(
          (user) => user.username === username
        );

        // Solo emitir leaveRoom si el usuario está realmente en la sala
        if (isUserInPreviousRoom) {
          socket.emit("leaveRoom", {
            roomCode: currentRoomCode,
            from: username,
          });
        }
      }

      // 🔥 CRÍTICO: Limpiar INMEDIATAMENTE el estado anterior
      clearMessages(); // Limpiar mensajes primero
      setAdminViewConversation(null); // Limpiar vista de admin
      setRoomUsers([]); // Limpiar usuarios de la sala anterior
      setReplyingTo(null); // 🔥 Limpiar estado de respuesta
      setThreadMessage(null); // 🔥 Limpiar panel de hilo

      // Unirse a la sala seleccionada
      setTo(room.name);
      setIsGroup(true);
      setCurrentRoomCode(room.roomCode);
      currentRoomCodeRef.current = room.roomCode;

      // 🔥 NUEVO: Resetear contador de mensajes no leídos para esta sala
      setUnreadMessages((prev) => ({
        ...prev,
        [room.roomCode]: 0,
      }));

      // 🔥 NUEVO: Cerrar alerta de mención si existe para esta sala
      if (pendingMentions[room.roomCode]) {
        Swal.close(); // Cerrar la alerta de SweetAlert2
        setPendingMentions((prev) => {
          const updated = { ...prev };
          delete updated[room.roomCode];
          return updated;
        });
      }

      // 🔥 MODIFICADO: Cargar usuarios de la sala ANTES de emitir joinRoom
      // para verificar si el usuario está realmente en la sala
      let roomUsersData = [];
      try {
        const response = await apiService.getRoomUsers(room.roomCode);
        // Asegurar que es un array
        if (Array.isArray(response)) {
          roomUsersData = response;
        } else if (response && typeof response === "object") {
          // Si es un objeto, intentar extraer el array de usuarios
          roomUsersData = response.users || response.data || [];
        }
        setRoomUsers(roomUsersData);
      } catch (error) {
        console.error("Error al cargar usuarios de la sala:", error);
        setRoomUsers([]);
        roomUsersData = [];
      }

      // 🔥 MODIFICADO: Emitir joinRoom si el usuario está en la lista de miembros de la sala
      // O si es ADMIN/JEFEPISO (para monitoreo)
      // Comparar con username (no con nombre completo)
      const isUserInRoom =
        Array.isArray(roomUsersData) &&
        roomUsersData.some((user) => user.username === username);
      const isAdminOrJefe = user?.role === "ADMIN" || user?.role === "JEFEPISO";

      console.log("🔍 Verificando si emitir joinRoom:", {
        roomCode: room.roomCode,
        roomName: room.name,
        username,
        isUserInRoom,
        isAdminOrJefe,
        userRole: user?.role,
        roomUsersData: roomUsersData.map((u) => u.username),
      });

      // ADMIN y JEFEPISO pueden unirse a cualquier sala para monitoreo
      if ((isUserInRoom || isAdminOrJefe) && socket && socket.connected) {
        console.log(
          "✅ Emitiendo joinRoom para sala:",
          room.roomCode,
          isAdminOrJefe ? "(como ADMIN/JEFEPISO)" : "(como miembro)"
        );
        socket.emit("joinRoom", {
          roomCode: room.roomCode,
          roomName: room.name,
          from: username,
          isMonitoring: isAdminOrJefe && !isUserInRoom, // 🔥 Indicar si es monitoreo
        });
      } else {
        console.log("⚠️ NO se emitió joinRoom. Razón:", {
          isUserInRoom,
          isAdminOrJefe,
          socketConnected: socket?.connected,
          hasSocket: !!socket,
        });
      }

      // Si se proporciona un messageId, guardarlo para resaltarlo después de cargar los mensajes
      if (messageId) {
        setHighlightMessageId(messageId);
      } else {
        setHighlightMessageId(null);
      }

      // 📱 Cerrar sidebar en mobile al seleccionar una sala
      if (window.innerWidth <= 768) {
        setShowSidebar(false);
      }
    } catch (error) {
      console.error("Error al seleccionar sala:", error);
      await showErrorAlert(
        "Error",
        "Error al unirse a la sala: " + error.message
      );
    }
  };

  // 🔥 NUEVO: Listener para navegar a una mención desde la alerta
  useEffect(() => {
    const handleNavigateToMention = async (event) => {
      const { roomCode, messageId } = event.detail;

      // Buscar la sala en myActiveRooms
      const room = myActiveRooms.find(r => r.roomCode === roomCode);
      if (room) {
        await handleRoomSelect(room, messageId);
      } else {
        console.error('Sala no encontrada:', roomCode);
      }
    };

    window.addEventListener('navigateToMention', handleNavigateToMention);
    return () => {
      window.removeEventListener('navigateToMention', handleNavigateToMention);
    };
  }, [myActiveRooms]);

  const handleSendMessage = async () => {
    if ((!input && mediaFiles.length === 0) || !to) return;

    console.log('📤 handleSendMessage - Estado actual:', {
      to,
      isGroup,
      currentRoomCode,
      username,
      currentUserFullName,
      input: input?.substring(0, 50)
    });

    // Buscar si esta conversación es asignada (normalizado)
    const currentUserNormalized = normalizeUsername(currentUserFullName);
    const assignedConv = assignedConversations?.find((conv) => {
      const otherUser = conv.participants?.find(
        (p) => normalizeUsername(p) !== currentUserNormalized
      );
      // 🔥 Comparación normalizada para nombres
      const toNormalized = normalizeUsername(to);
      const otherUserNormalized = normalizeUsername(otherUser);
      const convNameNormalized = normalizeUsername(conv.name);

      return (
        otherUserNormalized === toNormalized ||
        convNameNormalized === toNormalized
      );
    });

    console.log('📧 Conversación asignada encontrada:', assignedConv);

    // Si es una conversación asignada y el usuario NO está en ella, no permitir enviar
    // 🔥 MODIFICADO: Comparación normalizada para nombres
    if (assignedConv && assignedConv.participants) {
      const isUserParticipant = assignedConv.participants.some(
        (p) => normalizeUsername(p) === currentUserNormalized
      );
      if (!isUserParticipant) {
        await showErrorAlert(
          "No permitido",
          "No puedes enviar mensajes en conversaciones de otros usuarios. Solo puedes monitorearlas."
        );
        return;
      }
    }

    // 🔥 CRÍTICO: NO calcular fecha en frontend. Dejar que el backend lo haga con getPeruDate()
    // El backend calculará automáticamente sentAt y time usando getPeruDate() y formatPeruTime()

    // Generar ID único para el mensaje
    const messageId = `msg_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;

    // 🔥 Si es una conversación asignada, FORZAR isGroup a false
    const effectiveIsGroup = assignedConv ? false : isGroup;

    if (input || mediaFiles.length === 1) {
      const messageObj = {
        id: messageId,
        to,
        isGroup: effectiveIsGroup, // 🔥 Usar el valor efectivo
        // 🔥 ELIMINADO: time - el backend lo calculará automáticamente
        from: currentUserFullName, // 🔥 Usar currentUserFullName en lugar de username para conversaciones asignadas
        fromId: user.id,
        roomCode: currentRoomCode, // 🔥 Incluir roomCode para salas temporales
      };

      console.log("📤 Creando messageObj:", {
        to,
        isGroup: effectiveIsGroup,
        isAssignedConv: !!assignedConv,
        originalIsGroup: isGroup,
      });

      // Si es una conversación asignada, agregar información adicional
      if (assignedConv) {
        messageObj.isAssignedConversation = true;
        messageObj.conversationId = assignedConv.id;
        messageObj.participants = assignedConv.participants;
        // El destinatario real es el otro participante (comparación case-insensitive)
        const currentUserNormalized = currentUserFullName?.toLowerCase().trim();
        const otherParticipant = assignedConv.participants?.find(
          (p) => p?.toLowerCase().trim() !== currentUserNormalized
        );
        if (otherParticipant) {
          messageObj.actualRecipient = otherParticipant;
          console.log(
            "📧 Mensaje a conversación asignada. Destinatario real:",
            otherParticipant
          );
        }
      }

      if (input) {
        messageObj.message = input;
      }

      // Agregar información de respuesta si existe
      if (replyingTo) {
        messageObj.replyToMessageId = replyingTo.id;
        messageObj.replyToSender = replyingTo.sender;
        messageObj.replyToText = replyingTo.text;
        messageObj.replyToSenderNumeroAgente = replyingTo.numeroAgente; // 🔥 Incluir número de agente del remitente original
      }

      // 🔥 NUEVO: Subir archivo al servidor primero
      if (mediaFiles.length === 1) {
        try {
          setIsUploadingFile(true); // 🔥 Activar loading
          const file = mediaFiles[0];

          // Subir archivo y obtener URL
          const uploadResult = await apiService.uploadFile(file, "chat");

          messageObj.mediaType = file.type.split("/")[0];
          messageObj.mediaData = uploadResult.fileUrl; // ✅ Ahora es URL, no base64
          messageObj.fileName = uploadResult.fileName;
          messageObj.fileSize = uploadResult.fileSize;
        } catch (error) {
          console.error("❌ Error al subir archivo:", error);
          setIsUploadingFile(false); // 🔥 Desactivar loading en error
          await showErrorAlert(
            "Error",
            "Error al subir el archivo. Inténtalo de nuevo."
          );
          return;
        }
      }

      if (to === username) {
        // Mensaje a ti mismo - guardar en BD y mostrar localmente
        const newMessage = {
          sender: "Tú",
          realSender: currentUserFullName, // 🔥 Nombre real del remitente
          receiver: username,
          text:
            input || (messageObj.fileName ? `📎 ${messageObj.fileName}` : ""),
          // 🔥 ELIMINADO: time - se obtendrá del backend después de guardar
          isSent: true,
          isSelf: true,
          mediaType: messageObj.mediaType || null,
          mediaData: messageObj.mediaData || null, // Ahora es URL
          fileName: messageObj.fileName || null,
          fileSize: messageObj.fileSize || null,
        };

        // Agregar información de respuesta si existe
        if (replyingTo) {
          newMessage.replyToMessageId = replyingTo.id;
          newMessage.replyToSender = replyingTo.sender;
          newMessage.replyToText = replyingTo.text;
          newMessage.replyToSenderNumeroAgente = replyingTo.numeroAgente; // 🔥 Incluir número de agente del remitente original
        }

        // Agregar información de hilos
        newMessage.threadCount = 0;
        newMessage.lastReplyFrom = null;

        // Guardar en la base de datos
        try {
          const savedMessage = await apiService.createMessage({
            from: username,
            fromId: user.id,
            to: username,
            message: input,
            isGroup: false,
            mediaType: newMessage.mediaType,
            mediaData: newMessage.mediaData, // URL del archivo
            fileName: newMessage.fileName,
            fileSize: newMessage.fileSize,
            // 🔥 ELIMINADO: time - el backend lo calculará automáticamente
            // 🔥 NO enviar sentAt - dejar que el backend lo calcule con getPeruDate()
            replyToMessageId: replyingTo?.id,
            replyToSender: replyingTo?.sender,
            replyToText: replyingTo?.text,
            replyToSenderNumeroAgente: replyingTo?.numeroAgente,
          });

          // 🔥 Usar el time calculado por el backend
          if (savedMessage && savedMessage.time) {
            newMessage.time = savedMessage.time;
          }
        } catch (error) {
          console.error("❌ Error al guardar mensaje personal en BD:", error);
        }

        addNewMessage(newMessage);
        clearInput();
        setReplyingTo(null); // Limpiar el estado de respuesta
        setIsUploadingFile(false); // 🔥 Desactivar loading
        return;
      }

      console.log("🔌 Verificando conexión del socket...", {
        hasSocket: !!socket,
        isConnected: socket?.connected,
      });

      // Verificar que el socket esté conectado antes de enviar
      if (!socket || !socket.connected) {
        console.error("❌ Socket no conectado, no se puede enviar mensaje");
        await showErrorAlert(
          "Error de conexión",
          "No hay conexión con el servidor. Inténtalo de nuevo."
        );
        return;
      }

      console.log("✅ Socket conectado, continuando...");
      console.log("🔍 effectiveIsGroup:", effectiveIsGroup, "isGroup:", isGroup);
      console.log("🔍 Punto A - Antes del if");

      // 🔥 IMPORTANTE: Para grupos, NO agregar el mensaje localmente
      // Esperar a que el backend lo confirme y lo envíe de vuelta
      // Esto evita duplicados y problemas de sincronización
      console.log("🔍 Punto B - Justo antes del if");
      if (effectiveIsGroup) {
        console.log("🔍 Punto C - Dentro del if (grupo)");
        console.log("📤 Enviando mensaje de grupo");
        try {
          // 1. 🔥 Guardar primero en la BD para asegurar persistencia
          const savedMessage = await apiService.createMessage({
            from: currentUserFullName,
            fromId: user.id,
            to: to, // En grupos, 'to' suele ser el nombre del grupo
            roomCode: currentRoomCode,
            message: input,
            isGroup: true,
            mediaType: messageObj.mediaType,
            mediaData: messageObj.mediaData,
            fileName: messageObj.fileName,
            fileSize: messageObj.fileSize,
            // No enviamos time/sentAt, el backend lo genera
            replyToMessageId: replyingTo?.id,
            replyToSender: replyingTo?.sender,
            replyToText: replyingTo?.text,
            replyToSenderNumeroAgente: replyingTo?.numeroAgente,
          });

          console.log("✅ Mensaje de grupo guardado en BD:", savedMessage);

          // 2. 🔥 Actualizar messageObj con los datos reales de la BD
          messageObj.id = savedMessage.id;
          // 🔥 NO incluir sentAt ni time en el emit, el backend ya lo tiene
          // messageObj.sentAt = savedMessage.sentAt;
          // messageObj.time = savedMessage.time;

          // Asegurar que senderRole y senderNumeroAgente estén presentes si el backend los devuelve
          if (savedMessage.senderRole) messageObj.senderRole = savedMessage.senderRole;
          if (savedMessage.senderNumeroAgente) messageObj.senderNumeroAgente = savedMessage.senderNumeroAgente;

          // 3. 🔥 Emitir por socket con el ID real (sin sentAt/time - el backend ya los tiene)
          socket.emit("message", messageObj);
          console.log("📤 Mensaje emitido por socket con ID real:", messageObj.id);

          // 4. 🔥 NO agregar mensaje localmente - esperar a que vuelva del servidor
          // Esto evita duplicados porque el servidor enviará el mensaje de vuelta
          // con el timestamp correcto de Perú

        } catch (error) {
          console.error("❌ Error al enviar mensaje de grupo:", error);
          await showErrorAlert(
            "Error al enviar",
            "No se pudo enviar el mensaje. Por favor, verifica tu conexión e inténtalo de nuevo."
          );
          // NO limpiamos el input para que el usuario pueda reintentar
          setIsUploadingFile(false); // 🔥 Desactivar loading en error
        }

        console.log("🔚 Finalizando bloque de grupos con return");
        return;
      } else {
        console.log("🔍 Punto D - Dentro del else (1-a-1)");
        console.log("✅ effectiveIsGroup es FALSE - Entrando al bloque de mensajes 1-a-1");
        console.log("📤 Procesando mensaje 1-a-1 (NO es grupo)");
        // 🔥 Para mensajes individuales, guardar en BD primero para obtener el ID real
        try {
          console.log("💾 Guardando mensaje 1-a-1 en BD...");
          // Guardar en BD y obtener el mensaje con ID
          const savedMessage = await apiService.createMessage({
            from: currentUserFullName,
            fromId: user.id,
            to: messageObj.actualRecipient || to,
            message: input,
            isGroup: false,
            mediaType: messageObj.mediaType,
            mediaData: messageObj.mediaData,
            fileName: messageObj.fileName,
            fileSize: messageObj.fileSize,
            // 🔥 ELIMINADO: time - el backend lo calculará automáticamente
            // 🔥 NO enviar sentAt - dejar que el backend lo calcule con getPeruDate()
            replyToMessageId: replyingTo?.id,
            replyToSender: replyingTo?.sender,
            replyToText: replyingTo?.text,
            replyToSenderNumeroAgente: replyingTo?.numeroAgente,
          });
          console.log("✅ Mensaje 1-a-1 guardado en BD:", savedMessage);

          // Emitir por socket con el ID real de la BD
          console.log("📤 Emitiendo mensaje 1-a-1 por socket:", {
            ...messageObj,
            id: savedMessage.id,
          });
          socket.emit("message", {
            ...messageObj,
            id: savedMessage.id, // 🔥 Usar el ID de la BD
          });
          console.log("✅ Mensaje 1-a-1 emitido exitosamente");

          // 🔥 ELIMINADO: No agregar localmente para evitar duplicados
          // Esperar a que el mensaje vuelva del servidor con el timestamp correcto de Perú
        } catch (error) {
          console.error("❌ Error al guardar mensaje en BD:", error);
          await showErrorAlert(
            "Error",
            "Error al enviar el mensaje. Inténtalo de nuevo."
          );
          return;
        }
      }

      // 🔥 Para mensajes individuales, limpiar input después de guardar
      clearInput();
      setReplyingTo(null); // Limpiar el estado de respuesta
      setIsUploadingFile(false); // 🔥 Desactivar loading después de enviar
    }
  };

  const handleEditMessage = async (messageId, newText, newFile = null) => {
    if (!newText.trim() && !newFile) {
      await showErrorAlert("Error", "El mensaje no puede estar vacío");
      return;
    }

    try {
      let mediaType = null;
      let mediaData = null;
      let fileName = null;
      let fileSize = null;

      // 🔥 Si hay un nuevo archivo, subirlo primero
      if (newFile) {
        try {
          const uploadResult = await apiService.uploadFile(newFile, "chat");
          mediaType = newFile.type.split("/")[0];
          mediaData = uploadResult.fileUrl;
          fileName = uploadResult.fileName;
          fileSize = uploadResult.fileSize;
        } catch (error) {
          console.error("❌ Error al subir archivo:", error);
          await showErrorAlert(
            "Error",
            "Error al subir el archivo. Inténtalo de nuevo."
          );
          return;
        }
      }

      // Actualizar en la base de datos
      await apiService.editMessage(
        messageId,
        username,
        newText,
        mediaType,
        mediaData,
        fileName,
        fileSize
      );

      // Emitir evento de socket para sincronizar en tiempo real
      if (socket && socket.connected) {
        socket.emit("editMessage", {
          messageId,
          username,
          newText,
          mediaType,
          mediaData,
          fileName,
          fileSize,
          to,
          isGroup,
          roomCode: currentRoomCode,
        });
      }

      // Actualizar localmente
      // 🔥 CORREGIDO: Usar fecha actual directamente (el backend maneja la zona horaria)
      const updateData = {
        text: newText,
        isEdited: true,
        editedAt: new Date(),
      };

      // Si hay nuevo archivo, actualizar también los campos multimedia
      if (newFile) {
        updateData.mediaType = mediaType;
        updateData.mediaData = mediaData;
        updateData.fileName = fileName;
        updateData.fileSize = fileSize;
      }

      updateMessage(messageId, updateData);
    } catch (error) {
      console.error("Error al editar mensaje:", error);
      await showErrorAlert(
        "Error",
        "Error al editar el mensaje. Inténtalo de nuevo."
      );
    }
  };

  // Función para eliminar mensaje (solo ADMIN puede eliminar cualquier mensaje)
  const handleDeleteMessage = async (messageId, messageSender) => {
    const result = await showConfirmAlert(
      "¿Eliminar mensaje?",
      `¿Estás seguro de que quieres eliminar este mensaje de ${messageSender}?`
    );

    if (!result.isConfirmed) return;

    try {
      // Eliminar en la base de datos
      await apiService.deleteMessage(
        messageId,
        username,
        isAdmin,
        currentUserFullName
      );

      // Emitir evento de socket para sincronizar en tiempo real
      if (socket && socket.connected) {
        socket.emit("deleteMessage", {
          messageId,
          username,
          to,
          isGroup,
          roomCode: currentRoomCode,
          isAdmin,
          deletedBy: currentUserFullName,
        });
      }

      // 🔥 CORREGIDO: Usar fecha actual directamente (el backend maneja la zona horaria)
      // Actualizar localmente
      updateMessage(messageId, {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: currentUserFullName,
        text: `Mensaje eliminado por ${currentUserFullName}`,
      });

      await showSuccessAlert("Éxito", "Mensaje eliminado correctamente");
    } catch (error) {
      console.error("Error al eliminar mensaje:", error);
      await showErrorAlert(
        "Error",
        "Error al eliminar el mensaje. Inténtalo de nuevo."
      );
    }
  };

  // Función para manejar la respuesta a un mensaje
  const handleReplyMessage = (message) => {
    setReplyingTo({
      id: message.id,
      sender: message.realSender, // 🔥 SIEMPRE usar realSender (nunca "Tú")
      text:
        message.text ||
        (message.fileName ? `📎 ${message.fileName}` : "Archivo multimedia"),
      numeroAgente: message.numeroAgente, // 🔥 Incluir número de agente del mensaje original
    });
  };

  // Función para cancelar la respuesta
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Función para enviar mensaje de voz
  const handleSendVoiceMessage = async (audioFile) => {
    if (!audioFile || !to) return;

    try {
      // Subir el archivo de audio al servidor
      const uploadResult = await apiService.uploadFile(audioFile, "chat");

      // 🔥 CRÍTICO: NO calcular fecha en frontend. Dejar que el backend lo haga con getPeruDate()
      // El backend calculará automáticamente sentAt y time usando getPeruDate() y formatPeruTime()
      const messageId = `msg_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 11)}`;

      // 🔥 Verificar si es una conversación asignada
      const assignedConv = assignedConversations?.find((conv) => {
        const otherUser = conv.participants?.find(
          (p) => p !== currentUserFullName
        );
        const toNormalized = to?.toLowerCase().trim();
        const otherUserNormalized = otherUser?.toLowerCase().trim();
        const convNameNormalized = conv.name?.toLowerCase().trim();
        return (
          otherUserNormalized === toNormalized ||
          convNameNormalized === toNormalized
        );
      });

      // 🔥 Si es una conversación asignada, FORZAR isGroup a false
      const effectiveIsGroup = assignedConv ? false : isGroup;

      const messageObj = {
        id: messageId,
        to,
        isGroup: effectiveIsGroup, // 🔥 Usar el valor efectivo
        // 🔥 ELIMINADO: time - el backend lo calculará automáticamente
        from: username,
        fromId: user.id,
        mediaType: "audio",
        mediaData: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        message: "", // Mensaje vacío para audios
      };

      // 🔥 Si es una conversación asignada, agregar información adicional
      if (assignedConv) {
        messageObj.isAssignedConversation = true;
        messageObj.conversationId = assignedConv.id;
        messageObj.participants = assignedConv.participants;
        const currentUserNormalized = currentUserFullName?.toLowerCase().trim();
        const otherParticipant = assignedConv.participants?.find(
          (p) => p?.toLowerCase().trim() !== currentUserNormalized
        );
        if (otherParticipant) {
          messageObj.actualRecipient = otherParticipant;
          // console.log('🎤 Audio a conversación asignada. Destinatario real:', otherParticipant);
        }
      }

      // Si hay un mensaje al que se está respondiendo
      if (replyingTo) {
        messageObj.replyToMessageId = replyingTo.id;
        messageObj.replyToSender = replyingTo.sender;
        messageObj.replyToText = replyingTo.text;
        messageObj.replyToSenderNumeroAgente = replyingTo.numeroAgente;
      }

      // Si es una sala activa
      if (isGroup && currentRoomCode) {
        messageObj.roomCode = currentRoomCode;
      }

      // 🔥 Emitir evento 'message' (igual que los mensajes de texto)
      socket.emit("message", messageObj);

      // Agregar mensaje localmente
      const newMessage = {
        id: messageId,
        sender: "Tú",
        realSender: currentUserFullName, // 🔥 Nombre real del remitente
        receiver: to,
        text: "",
        isGroup: isGroup,
        // 🔥 ELIMINADO: time - se obtendrá del backend después de enviar
        isSent: true,
        mediaType: "audio",
        mediaData: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
      };

      if (replyingTo) {
        newMessage.replyToMessageId = replyingTo.id;
        newMessage.replyToSender = replyingTo.sender;
        newMessage.replyToText = replyingTo.text;
        newMessage.replyToSenderNumeroAgente = replyingTo.numeroAgente;
      }

      addNewMessage(newMessage);

      // 🔥 Actualizar el preview del último mensaje en la lista de conversaciones asignadas
      if (assignedConv) {
        setAssignedConversations((prevConversations) => {
          return prevConversations.map((conv) => {
            if (conv.id === assignedConv.id) {
              // console.log('🔄 Actualizando preview de conversación enviada (audio):', conv.name);
              return {
                ...conv,
                lastMessage: "🎤 Audio",
                lastMessageTime: new Date().toISOString(), // 🔥 Usar timestamp actual
                lastMessageFrom: currentUserFullName,
              };
            }
            return conv;
          });
        });
      }

      // Limpiar respuesta si existe
      if (replyingTo) {
        setReplyingTo(null);
      }

      // 🔥 Reproducir sonido si está habilitado
      playMessageSound(soundsEnabled);
    } catch (error) {
      console.error("❌ Error al enviar mensaje de voz:", error);
      await showErrorAlert(
        "Error",
        "Error al enviar el mensaje de voz. Inténtalo de nuevo."
      );
    }
  };

  // Función para abrir un hilo
  const handleOpenThread = (message) => {
    setThreadMessage({
      id: message.id,
      from: message.sender || message.from,
      to: message.receiver || message.to,
      text: message.text || message.message,
      sentAt: message.sentAt || message.time,
      threadCount: message.threadCount || 0,
      isGroup,
      roomCode: currentRoomCode,
      // 🔥 Incluir campos multimedia
      mediaType: message.mediaType,
      mediaData: message.mediaData,
      fileName: message.fileName,
      fileSize: message.fileSize,
      time: message.time,
      isRead: message.isRead,
      isSent: message.isSent,
      readBy: message.readBy,
    });
  };

  // Función para cerrar el hilo
  const handleCloseThread = () => {
    setThreadMessage(null);
  };

  // Función para enviar mensaje en hilo
  const handleSendThreadMessage = async (messageData) => {
    try {
      // 🔥 CRÍTICO: El backend calculará automáticamente sentAt y time usando getPeruDate() y formatPeruTime()

      const messageObj = {
        from: messageData.from,
        to: messageData.to,
        message: messageData.text,
        isGroup: messageData.isGroup,
        roomCode: messageData.roomCode,
        threadId: messageData.threadId,
        // 🔥 ELIMINADO: time - el backend lo calculará automáticamente
        fromId: user.id,
      };

      // 🔥 Agregar campos multimedia si existen
      if (messageData.mediaType) {
        messageObj.mediaType = messageData.mediaType;
        messageObj.mediaData = messageData.mediaData;
        messageObj.fileName = messageData.fileName;
        messageObj.fileSize = messageData.fileSize;
      }

      // Guardar en BD
      const savedMessage = await apiService.createMessage(messageObj);

      // Incrementar contador del hilo
      await apiService.incrementThreadCount(messageData.threadId);

      // Emitir por socket
      if (socket && socket.connected) {
        if (messageData.isGroup) {
          socket.emit("sendGroupMessage", {
            ...messageObj,
            roomCode: messageData.roomCode,
          });
        } else {
          socket.emit("sendMessage", messageObj);
        }

        // Emitir evento específico de hilo
        socket.emit("threadMessage", {
          ...savedMessage,
          threadId: messageData.threadId,
        });

        // Emitir evento para actualizar el contador en el mensaje original
        const threadCountData = {
          messageId: messageData.threadId,
          lastReplyFrom: messageData.from,
          from: messageData.from,
          to: messageData.to,
          roomCode: messageData.roomCode,
          isGroup: messageData.isGroup,
        };
        // console.log('🔢 Emitiendo threadCountUpdated:', threadCountData);
        socket.emit("threadCountUpdated", threadCountData);
      }

      // Actualizar el contador en el mensaje principal del ThreadPanel
      setThreadMessage((prev) => ({
        ...prev,
        threadCount: (prev.threadCount || 0) + 1,
        lastReplyFrom: messageData.from,
      }));

      // Actualizar el contador en la lista de mensajes del chat principal
      // Usar callback para acceder al estado más reciente del mensaje
      updateMessage(messageData.threadId, (prevMessage) => ({
        threadCount: (prevMessage.threadCount || 0) + 1,
        lastReplyFrom: messageData.from,
      }));

      // 🔥 NUEVO: Actualizar el preview en ConversationList cuando el remitente envía el mensaje
      if (!messageData.isGroup && messageData.from && messageData.to) {
        // console.log('📝 Actualizando preview en ConversationList (remitente):', messageData.from, '•', messageData.to);

        // Actualizar conversaciones asignadas
        setAssignedConversations((prevConversations) => {
          return prevConversations.map((conv) => {
            const participants = conv.participants || [];
            const isThisConversation =
              participants.some(
                (p) =>
                  p.toLowerCase().trim() ===
                  messageData.from.toLowerCase().trim()
              ) &&
              participants.some(
                (p) =>
                  p.toLowerCase().trim() === messageData.to.toLowerCase().trim()
              );

            if (isThisConversation) {
              const newCount = (conv.lastMessageThreadCount || 0) + 1;
              return {
                ...conv,
                lastMessageThreadCount: newCount,
                lastMessageLastReplyFrom: messageData.from,
              };
            }

            return conv;
          });
        });

        // Actualizar conversaciones de monitoreo
        setMonitoringConversations((prevConversations) => {
          return prevConversations.map((conv) => {
            const participants = conv.participants || [];
            const isThisConversation =
              participants.some(
                (p) =>
                  p.toLowerCase().trim() ===
                  messageData.from.toLowerCase().trim()
              ) &&
              participants.some(
                (p) =>
                  p.toLowerCase().trim() === messageData.to.toLowerCase().trim()
              );

            if (isThisConversation) {
              const newCount = (conv.lastMessageThreadCount || 0) + 1;
              // console.log(`✅ Actualizando conversación de monitoreo (remitente) "${conv.name}": ${conv.lastMessageThreadCount || 0} → ${newCount}`);
              return {
                ...conv,
                lastMessageThreadCount: newCount,
                lastMessageLastReplyFrom: messageData.from,
              };
            }

            return conv;
          });
        });
      }
    } catch (error) {
      console.error("Error al enviar mensaje en hilo:", error);
      await showErrorAlert("Error", "Error al enviar el mensaje en el hilo.");
    }
  };

  // Exponer la función globalmente para que ChatContent pueda acceder a ella
  useEffect(() => {
    window.handleReplyMessage = handleReplyMessage;
    return () => {
      delete window.handleReplyMessage;
    };
  }, []);

  const handleShowAdminRooms = () => {
    setShowAdminRoomsModal(true);
  };

  const handleDeleteRoom = async (roomId, roomName) => {
    const result = await showConfirmAlert(
      "¿Eliminar sala?",
      `¿Estás seguro de que quieres eliminar la sala "${roomName}"?`
    );

    // ✅ Verificar correctamente si el usuario confirmó
    if (result.isConfirmed) {
      try {
        await apiService.deleteRoom(roomId);
        await showSuccessAlert("Éxito", "Sala eliminada correctamente");

        // ✅ Actualizar la lista de salas activas en el sidebar
        await loadMyActiveRooms();
      } catch (error) {
        console.error("Error al eliminar sala:", error);
        if (
          error.message.includes("404") ||
          error.message.includes("Not Found")
        ) {
          await showErrorAlert("Aviso", "La sala ya fue eliminada");

          // ✅ Actualizar la lista de salas activas en el sidebar
          await loadMyActiveRooms();
        } else {
          await showErrorAlert(
            "Error",
            "Error al eliminar la sala: " + error.message
          );
        }
      }
    }
  };

  const handleKickUser = async (usernameToKick, roomCode) => {
    const result = await showConfirmAlert(
      "¿Expulsar usuario?",
      `¿Estás seguro de que quieres expulsar a ${usernameToKick} de la sala?`
    );

    if (result.isConfirmed) {
      if (socket && socket.connected) {
        socket.emit("kickUser", {
          roomCode: roomCode || currentRoomCode,
          username: usernameToKick,
          kickedBy: username,
        });
        await showSuccessAlert(
          "Éxito",
          `Usuario ${usernameToKick} expulsado de la sala`
        );
      }
    }
  };

  const handleEditRoom = (room) => {
    setEditingRoom(room);
    setEditForm({ maxCapacity: room.maxCapacity });
    setShowEditRoomModal(true);
  };

  const handleUpdateRoom = async () => {
    try {
      await apiService.updateRoom(editingRoom.id, {
        maxCapacity: editForm.maxCapacity,
      });

      await showSuccessAlert(
        "Éxito",
        "Capacidad de sala actualizada correctamente"
      );

      // Actualizar la lista de salas activas en el sidebar
      await loadMyActiveRooms();

      // Cerrar modal
      setShowEditRoomModal(false);
      setEditingRoom(null);
    } catch (error) {
      console.error("Error al actualizar sala:", error);
      await showErrorAlert(
        "Error",
        "Error al actualizar la sala: " + error.message
      );
    }
  };

  const handleDeactivateRoom = async (roomId, roomName) => {
    const result = await showConfirmAlert(
      "¿Desactivar sala?",
      `¿Estás seguro de que quieres desactivar la sala "${roomName}"?`
    );

    // ✅ Verificar correctamente si el usuario confirmó
    if (result.isConfirmed) {
      try {
        await apiService.deactivateRoom(roomId);
        await showSuccessAlert("Éxito", "Sala desactivada correctamente");

        // ✅ Actualizar la lista de salas activas en el sidebar
        await loadMyActiveRooms();
      } catch (error) {
        console.error("Error al desactivar sala:", error);
        await showErrorAlert(
          "Error",
          "Error al desactivar la sala: " + error.message
        );
      }
    }
  };

  const handleActivateRoom = async (roomId, roomName) => {
    const result = await showConfirmAlert(
      "¿Activar sala?",
      `¿Estás seguro de que quieres activar la sala "${roomName}"?`
    );

    if (result.isConfirmed) {
      try {
        await apiService.activateRoom(roomId);
        await showSuccessAlert("Éxito", "Sala activada correctamente");

        // ✅ Actualizar la lista de salas activas en el sidebar
        await loadMyActiveRooms();
      } catch (error) {
        console.error("Error al activar sala:", error);
        await showErrorAlert(
          "Error",
          "Error al activar la sala: " + error.message
        );
      }
    }
  };

  const handleAddUsersToRoom = () => {
    if (currentRoomCode) {
      setShowAddUsersToRoomModal(true);
    }
  };

  const handleUsersAdded = async (usernames) => {
    // Emitir evento de socket para que los usuarios agregados se unan a la sala
    if (socket && socket.connected && currentRoomCode) {
      usernames.forEach((username) => {
        socket.emit("joinRoom", {
          roomCode: currentRoomCode,
          roomName: to,
          from: username,
        });
      });

      // Esperar un momento para que el backend procese los eventos
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Recargar la lista de usuarios de la sala desde la API
      if (currentRoomCode) {
        const roomUsers = await apiService.getRoomUsers(currentRoomCode);
        // console.log('🔄 Usuarios recargados después de agregar:', roomUsers);
        // Si la sala está inactiva, roomUsers será un array vacío
        if (Array.isArray(roomUsers)) {
          setRoomUsers(roomUsers);
        }
      }
    }
  };

  const handleRemoveUsersFromRoom = () => {
    if (currentRoomCode) {
      setShowRemoveUsersFromRoomModal(true);
    }
  };

  const handleUsersRemoved = async () => {
    // Esperar un momento para que el backend procese los eventos
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Recargar la lista de usuarios de la sala desde la API
    if (currentRoomCode) {
      const roomUsers = await apiService.getRoomUsers(currentRoomCode);
      // console.log('🔄 Usuarios recargados después de eliminar:', roomUsers);
      // Si la sala está inactiva, roomUsers será un array vacío
      if (Array.isArray(roomUsers)) {
        setRoomUsers(roomUsers);
      }
    }
  };

  const handleCreateConversation = async (data) => {
    try {
      const result = await apiService.createAdminAssignedConversation(
        data.user1,
        data.user2,
        data.name
      );

      setShowCreateConversationModal(false);

      await showSuccessAlert(
        "Conversación creada",
        `Conversación creada exitosamente entre ${data.user1} y ${data.user2}`
      );

      // 🔥 Recargar las conversaciones asignadas para reflejar la nueva conversación
      await loadAssignedConversations();

      // Opcional: Notificar a los usuarios via Socket.io
      if (socket && socket.connected) {
        socket.emit("conversationAssigned", {
          user1: data.user1,
          user2: data.user2,
          conversationName: data.name,
          linkId: result.linkId,
        });
      }
    } catch (error) {
      console.error("Error al crear conversación:", error);
      await showErrorAlert(
        "Error",
        "Error al crear la conversación: " + error.message
      );
    }
  };

  // 🔥 BLOQUEADO: Funciones de llamadas deshabilitadas

  const handleViewRoomUsers = async (roomCode, roomName) => {
    try {
      const roomUsersData = await apiService.getRoomUsers(roomCode);

      // Si la sala está inactiva o no existe, mostrar mensaje informativo
      if (!roomUsersData || roomUsersData.length === 0) {
        await showErrorAlert(
          "Sala inactiva",
          "Esta sala ya no está activa o no existe."
        );
        return;
      }

      // Crear un modal personalizado en lugar de alert
      const modal = document.createElement("div");
      modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
      `;

      const modalContent = document.createElement("div");
      modalContent.style.cssText = `
        background: #2a3942;
        border-radius: 12px;
        padding: 24px;
        max-width: 500px;
        width: 90%;
        color: white;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      `;

      const usersList =
        roomUsersData.users && roomUsersData.users.length > 0
          ? roomUsersData.users
            .map((user) =>
              typeof user === "string"
                ? `• ${user}`
                : `• ${user.displayName || user.username} ${user.isOnline ? "🟢" : "🔴"
                }`
            )
            .join("\n")
          : "No hay usuarios conectados";

      modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <h3 style="margin: 0; color: #00a884;">👥 Usuarios en "${roomName}"</h3>
          <button onclick="this.closest('.modal-overlay').remove()" style="background: none; border: none; color: #8696a0; font-size: 20px; cursor: pointer;">✕</button>
        </div>
        <div style="margin-bottom: 16px;">
          <strong>Código:</strong> ${roomCode}
        </div>
        <div style="margin-bottom: 20px;">
          <strong>Usuarios conectados:</strong>
          <div style="margin-top: 8px; padding: 12px; background: #1e2a30; border-radius: 8px; white-space: pre-line; font-family: monospace;">
            ${usersList}
          </div>
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 16px; border-top: 1px solid #374045;">
          <span style="color: #8696a0;">Total: ${roomUsersData.totalUsers || 0
        }/${roomUsersData.maxCapacity || 0}</span>
          <button onclick="this.closest('.modal-overlay').remove()" style="background: #00a884; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer;">Cerrar</button>
        </div>
      `;

      modal.className = "modal-overlay";
      modal.appendChild(modalContent);
      document.body.appendChild(modal);

      // Cerrar al hacer clic fuera del modal
      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.remove();
        }
      });
    } catch (error) {
      console.error("Error al obtener usuarios de la sala:", error);
      // No mostrar error, ya que es esperado cuando la sala está inactiva
    }
  };

  const handleEnableSounds = async () => {
    try {
      // Intentar reproducir un sonido para habilitar la reproducción automática
      if (messageSound.current) {
        messageSound.current.currentTime = 0;
        await messageSound.current.play();
        setSoundsEnabled(true);
        localStorage.setItem("soundsEnabled", "true");
      }
    } catch {
      // Silenciar errores de sonido
    }
  };

  // 🔥 Función para toggle del sonido de notificaciones
  const handleSoundToggle = () => {
    const newValue = !soundsEnabled;
    setSoundsEnabled(newValue);
    localStorage.setItem("soundsEnabled", newValue.toString());
  };
  // 🔥 FUNCIÓN MEJORADA: Iniciar videollamada con Tarjeta UI
  const handleStartVideoCall = async () => {
    try {
      // 1️⃣ VALIDACIONES
      if (!to) {
        await showErrorAlert("Atención", "Selecciona un chat para iniciar la llamada.");
        return;
      }

      // Validar permisos estrictos para grupos (Coordinador/Admin/etc)
      const userRole = (user?.role || '').toUpperCase();
      const allowedRoles = ['COORDINADOR', 'ADMIN', 'JEFEPISO', 'PROGRAMADOR'];

      if (isGroup && !allowedRoles.includes(userRole)) {
        await showErrorAlert(
          "Sin permisos",
          "Solo los coordinadores y administradores pueden iniciar videollamadas grupales."
        );
        return;
      }

      // 2️⃣ GENERACIÓN DE SALA Y URL
      const videoRoomID = isGroup
        ? `group_${currentRoomCode || Date.now()}`
        : `call_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;

      const baseUrl = window.location.origin;
      const videoCallUrl = `${baseUrl}/video-call?roomID=${videoRoomID}`;

      console.log("📹 Iniciando llamada en:", videoCallUrl);

      // 3️⃣ PREPARAR DATOS DEL MENSAJE (Estructura para la Tarjeta UI)
      // Nota: 'text' se usa para notificaciones push o vistas previas
      const fallbackText = isGroup
        ? `📹 Videollamada grupal iniciada por ${currentUserFullName}`
        : `📹 Videollamada iniciada`;

      const messagePayload = {
        to,
        isGroup,
        from: currentUserFullName,
        fromId: user?.id,
        roomCode: currentRoomCode,

        // 🔥 CLAVE: Esto activa el componente visual VideoCallNotification
        type: 'video_call',
        text: fallbackText,

        // Datos técnicos para la llamada
        videoCallRoomID: videoRoomID,
        videoCallUrl: videoCallUrl,

        // Metadatos adicionales
        sender: currentUserFullName, // Para compatibilidad
        senderRole: userRole,
        time: new Date().toISOString()
      };

      // 4️⃣ GUARDAR EN BASE DE DATOS (Persistencia)
      let savedMessageId = `temp_${Date.now()}`;

      try {
        const savedMessage = await apiService.createMessage({
          from: currentUserFullName,
          fromId: user?.id,
          to: to,
          roomCode: isGroup ? currentRoomCode : undefined,
          message: fallbackText, // Guardamos texto legible en BD
          type: 'video_call',    // Guardamos el tipo
          isGroup: isGroup,

          // Campos extra para que el backend sepa la URL
          metadata: {
            videoCallUrl: videoCallUrl,
            videoRoomID: videoRoomID
          },
          // O si tu backend espera campos planos:
          videoCallUrl: videoCallUrl
        });

        if (savedMessage && savedMessage.id) {
          savedMessageId = savedMessage.id;
          console.log("✅ Videollamada registrada en BD ID:", savedMessageId);
        }
      } catch (dbError) {
        console.error("⚠️ Advertencia: No se pudo guardar en BD (pero seguimos)", dbError);
      }

      // Asignar el ID real (o temporal) al payload final
      const finalSocketPayload = { ...messagePayload, id: savedMessageId };

      // 5️⃣ EMITIR EVENTOS SOCKET
      if (socket && socket.connected) {
        // Evento A: Notificación específica de llamada (para timbres/modales)
        socket.emit('startVideoCall', {
          roomID: videoRoomID,
          callType: isGroup ? 'group' : 'individual',
          chatId: isGroup ? currentRoomCode : to,
          initiator: currentUserFullName,
          callUrl: videoCallUrl,
          participants: isGroup ? roomUsers : [to]
        });

        // Evento B: El mensaje para el chat (La tarjeta)
        // Usamos 'message' o 'sendMessage' según tu backend. 
        // Aquí uso 'sendMessage' que suele ser el estándar para propagar a otros.
        socket.emit('sendMessage', finalSocketPayload);
      }

      // 6️⃣ ACTUALIZAR UI LOCAL (Agregar mensaje "mío" inmediatamente)
      addNewMessage({
        ...finalSocketPayload,
        isSelf: true,
        isSent: true,
        isRead: false
      });

      // 7️⃣ ABRIR VENTANA DE LLAMADA
      const windowFeatures = 'width=1280,height=720,menubar=no,toolbar=no,location=no,status=no';
      const videoWindow = window.open(videoCallUrl, '_blank', windowFeatures);

      if (!videoWindow) {
        await showErrorAlert(
          "Pop-up Bloqueado",
          "Por favor permite las ventanas emergentes para entrar a la llamada."
        );
      }

    } catch (error) {
      console.error("❌ Error crítico iniciando llamada:", error);
      await showErrorAlert("Error", "No se pudo conectar la llamada.");
    }
  };

  const handleLoginSuccess = (userData) => {
    // Guardar datos del usuario en localStorage
    localStorage.setItem("user", JSON.stringify(userData));
    localStorage.setItem("token", userData.token || "mock-token");

    // Forzar actualización del estado de autenticación
    refreshAuth();
  };

  // Función mejorada de logout que primero sale de la sala si está en una
  const handleLogout = async () => {
    try {
      // Si el usuario está en una sala, salir primero
      if (currentRoomCode && socket && socket.connected) {
        socket.emit("leaveRoom", {
          roomCode: currentRoomCode,
          from: username,
        });
      }

      // 🔥 Limpiar TODOS los estados del chat
      setTo("");
      setIsGroup(false);
      setRoomUsers([]);
      setCurrentRoomCode(null);
      currentRoomCodeRef.current = null;
      setMyActiveRooms([]);
      setAssignedConversations([]);
      setAdminViewConversation(null);
      clearMessages();
      clearInput();
      setReplyingTo(null); // 🔥 Limpiar estado de respuesta
      setThreadMessage(null); // 🔥 Limpiar panel de hilo

      // Desconectar socket
      if (socket) {
        socket.disconnect();
      }

      // Ejecutar logout normal
      logout();
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      // Aún así ejecutar logout
      logout();
    }
  };

  // 🔥 Función para normalizar nombres (remover acentos y convertir a minúsculas)
  const normalizeUsername = (username) => {
    return (
      username
        ?.toLowerCase()
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") || ""
    );
  };

  // Verificar si el usuario puede enviar mensajes en la conversación actual
  const canSendMessages = React.useMemo(() => {
    if (!to) return false;

    const currentUserFullName =
      user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : user?.username;

    const currentUserNormalized = normalizeUsername(currentUserFullName);
    const toNormalized = normalizeUsername(to);

    // Buscar si esta conversación es asignada (normalizado)
    const assignedConv = assignedConversations?.find((conv) => {
      const otherUser = conv.participants?.find(
        (p) => normalizeUsername(p) !== currentUserNormalized
      );
      return (
        normalizeUsername(otherUser) === toNormalized ||
        normalizeUsername(conv.name) === toNormalized
      );
    });

    // Si es una conversación asignada y el usuario NO está en ella, no puede enviar
    if (assignedConv && assignedConv.participants) {
      const isUserParticipant = assignedConv.participants.some(
        (p) => normalizeUsername(p) === currentUserNormalized
      );
      if (!isUserParticipant) {
        return false;
      }
    }

    return true;
  }, [to, user, assignedConversations]);

  // Mostrar loading mientras verifica autenticación
  if (isLoading) {
    return <LoadingScreen message="Verificando sesión..." />;
  }

  if (!isAuthenticated) {
    return (
      <div className="login-container">
        <Login onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return (
    <>
      {/* Elemento de audio para notificaciones */}
      <audio
        ref={messageSound}
        preload="auto"
        src="https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3"
      />

      <ChatLayout
        // Props del sidebar
        user={user}
        userList={userList}
        groupList={groupList}
        assignedConversations={assignedConversations}
        monitoringConversations={monitoringConversations}
        monitoringPage={monitoringPage}
        monitoringTotal={monitoringTotal}
        monitoringTotalPages={monitoringTotalPages}
        monitoringLoading={monitoringLoading}
        onLoadMonitoringConversations={loadMonitoringConversations}
        // 🔥 NUEVOS PROPS para paginación real
        assignedPage={assignedPage}
        assignedTotal={assignedTotal}
        assignedTotalPages={assignedTotalPages}
        assignedLoading={assignedLoading}
        onLoadAssignedConversations={handleLoadAssignedConversations}
        roomsPage={roomsPage}
        roomsTotal={roomsTotal}
        roomsTotalPages={roomsTotalPages}
        roomsLoading={roomsLoading}
        onLoadUserRooms={handleLoadUserRooms}
        roomsLimit={roomsLimit}
        onRoomsLimitChange={handleRoomsLimitChange}
        onGoToRoomsPage={handleGoToRoomsPage}
        isAdmin={isAdmin}
        showAdminMenu={showAdminMenu}
        setShowAdminMenu={setShowAdminMenu}
        showSidebar={showSidebar}
        sidebarCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        onUserSelect={handleUserSelect}
        onGroupSelect={handleGroupSelect}
        onPersonalNotes={handlePersonalNotes}
        onLogout={handleLogout}
        onShowCreateRoom={() => setShowCreateRoomModal(true)}
        onShowJoinRoom={() => setShowJoinRoomModal(true)}
        onShowAdminRooms={handleShowAdminRooms}
        onShowCreateConversation={() => setShowCreateConversationModal(true)}
        onShowManageConversations={() => setShowManageConversationsModal(true)}
        onShowManageUsers={() => { }}
        onShowSystemConfig={() => { }}
        unreadMessages={unreadMessages}
        myActiveRooms={myActiveRooms}
        onRoomSelect={handleRoomSelect}
        onKickUser={handleKickUser}
        userListHasMore={userListHasMore}
        userListLoading={userListLoading}
        onLoadMoreUsers={loadMoreUsers}
        roomTypingUsers={roomTypingUsers}
        // Props del chat
        to={to}
        isGroup={isGroup}
        currentRoomCode={currentRoomCode}
        roomUsers={roomUsers}
        messages={messages}
        adminViewConversation={adminViewConversation}
        input={input}
        setInput={setInput}
        onSendMessage={handleSendMessage}
        canSendMessages={canSendMessages}
        onFileSelect={handleFileSelect}
        onRecordAudio={() => setIsRecording(true)}
        onStopRecording={() => setIsRecording(false)}
        isRecording={isRecording}
        mediaFiles={mediaFiles}
        mediaPreviews={mediaPreviews}
        onCancelMediaUpload={cancelMediaUpload}
        onRemoveMediaFile={handleRemoveMediaFile}
        onLeaveRoom={handleLeaveRoom}
        hasMoreMessages={hasMoreMessages}
        isLoadingMore={isLoadingMore}
        isLoadingMessages={isLoadingMessages} // 🔥 Estado de carga inicial
        onLoadMoreMessages={loadMoreMessages}
        onToggleMenu={handleToggleMenu}
        socket={socket}
        socketConnected={socketConnected}
        soundsEnabled={soundsEnabled}
        onEnableSounds={handleEnableSounds}
        currentUsername={username}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        isTyping={typingUser !== null}
        typingUser={typingUser}
        highlightMessageId={highlightMessageId}
        onMessageHighlighted={() => setHighlightMessageId(null)}
        replyingTo={replyingTo}
        onCancelReply={handleCancelReply}
        onAddUsersToRoom={handleAddUsersToRoom}
        onRemoveUsersFromRoom={handleRemoveUsersFromRoom}
        onOpenThread={handleOpenThread}
        onSendVoiceMessage={handleSendVoiceMessage}
        onStartVideoCall={handleStartVideoCall} // 🔥 NUEVO: Handler de videollamada
        isUploadingFile={isUploadingFile} // 🔥 Pasar estado de upload
        // Props de modales
        showCreateRoomModal={showCreateRoomModal}
        setShowCreateRoomModal={setShowCreateRoomModal}
        roomForm={roomForm}
        setRoomForm={setRoomForm}
        onCreateRoom={handleCreateRoom}
        showJoinRoomModal={showJoinRoomModal}
        setShowJoinRoomModal={setShowJoinRoomModal}
        joinRoomForm={joinRoomForm}
        setJoinRoomForm={setJoinRoomForm}
        onJoinRoom={handleJoinRoom}
        showAdminRoomsModal={showAdminRoomsModal}
        setShowAdminRoomsModal={setShowAdminRoomsModal}
        onDeleteRoom={handleDeleteRoom}
        onDeactivateRoom={handleDeactivateRoom}
        onActivateRoom={handleActivateRoom}
        onEditRoom={handleEditRoom}
        onViewRoomUsers={handleViewRoomUsers}
      />

      <EditRoomModal
        isOpen={showEditRoomModal}
        onClose={() => {
          setShowEditRoomModal(false);
          setEditingRoom(null);
        }}
        room={editingRoom}
        editForm={editForm}
        setEditForm={setEditForm}
        onUpdateRoom={handleUpdateRoom}
      />

      <RoomCreatedModal
        isOpen={showRoomCreatedModal}
        onClose={() => {
          setShowRoomCreatedModal(false);
          setCreatedRoomData(null);
        }}
        roomData={createdRoomData}
      />

      <CreateConversationModal
        isOpen={showCreateConversationModal}
        onClose={() => setShowCreateConversationModal(false)}
        onCreateConversation={handleCreateConversation}
        currentUser={user}
      />

      <ManageAssignedConversationsModal
        show={showManageConversationsModal}
        onClose={() => setShowManageConversationsModal(false)}
        onConversationUpdated={() => {
          // Recargar las conversaciones asignadas
          loadAssignedConversations();
        }}
        currentUser={user}
        socket={socket}
      />

      <AddUsersToRoomModal
        isOpen={showAddUsersToRoomModal}
        onClose={() => setShowAddUsersToRoomModal(false)}
        roomCode={currentRoomCode}
        roomName={to}
        currentMembers={roomUsers}
        onUserAdded={handleUsersAdded}
      />

      <RemoveUsersFromRoomModal
        isOpen={showRemoveUsersFromRoomModal}
        onClose={() => setShowRemoveUsersFromRoomModal(false)}
        roomCode={currentRoomCode}
        roomName={to}
        currentMembers={roomUsers}
        currentUser={username}
        onUsersRemoved={handleUsersRemoved}
      />

      {/* 🔥 BLOQUEADO: CallWindow deshabilitado */}

      {/* Panel de hilos */}
      {threadMessage && (
        <ThreadPanel
          message={threadMessage}
          onClose={handleCloseThread}
          onSendMessage={handleSendThreadMessage}
          currentUsername={currentUserFullName}
          socket={socket}
        />
      )}

      {/* Panel de configuración */}
      <SettingsPanel
        isOpen={showAdminMenu}
        onClose={() => setShowAdminMenu(false)}
        user={user}
        isSoundEnabled={soundsEnabled}
        onSoundToggle={handleSoundToggle}
      />
    </>
  );
};

export default ChatPage;
