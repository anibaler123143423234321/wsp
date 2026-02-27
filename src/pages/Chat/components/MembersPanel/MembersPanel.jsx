import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaTimes, FaUserPlus } from 'react-icons/fa';
import apiService from '../../../../apiService';
import './MembersPanel.css';
import PendingRequestsList from '../PendingRequestsList';

const MembersPanel = ({
    isOpen,
    onClose,
    roomUsers: propRoomUsers,
    onAddUsersToRoom,
    currentRoomCode,
    user,
    userList,
    socket, //  NUEVO: Socket para escuchar eventos en tiempo real
    setRoomUsers: setGlobalRoomUsers // 🔥 NUEVO: Setter global para sincronización
}) => {
    const [filterText, setFilterText] = useState('');
    const [roomUsers, setRoomUsers] = useState([]);
    const [pendingMembers, setPendingMembers] = useState([]); // Nuevo estado
    const [isLoading, setIsLoading] = useState(false);

    //  NUEVO: Escuchar eventos de socket para actualizar isOnline en tiempo real
    useEffect(() => {
        if (!socket || !isOpen) return;

        const handleUserStatusChanged = (data) => {
            const { username, originalUsername, isOnline, nombre, apellido } = data;
            const displayName = nombre && apellido ? `${nombre} ${apellido}` : username;

            // Actualizar solo el isOnline del usuario afectado sin recargar la API
            setRoomUsers(prevUsers => prevUsers.map(u => {
                const uDisplayName = u.displayName?.trim().toLowerCase() || '';
                const targetName = displayName?.trim().toLowerCase() || '';
                const origName = originalUsername?.trim().toLowerCase() || '';

                if (uDisplayName === targetName || uDisplayName === origName) {
                    return { ...u, isOnline };
                }
                return u;
            }));
        };

        const handleAdminJoinRequest = (data) => {
            if (data.roomCode === currentRoomCode) {
                // Agregar a pendientes si no está
                setPendingMembers(prev => {
                    if (prev.includes(data.username)) return prev;
                    return [...prev, data.username];
                });
            }
        };

        socket.on('userStatusChanged', handleUserStatusChanged);
        socket.on('adminJoinRequest', handleAdminJoinRequest);

        return () => {
            socket.off('userStatusChanged', handleUserStatusChanged);
            socket.off('adminJoinRequest', handleAdminJoinRequest);
        };
    }, [socket, isOpen, currentRoomCode]);

    //  Helper: Buscar picture en userList o propRoomUsers por displayName
    const findPicture = (displayName) => {
        if (!displayName) return null;
        const normalizedName = displayName.trim().toLowerCase();

        // 1. Buscar en userList
        if (userList) {
            const listUser = userList.find(u => {
                if (typeof u === 'string') return false;
                const uDisplayName = u.displayName ||
                    (u.nombre && u.apellido ? `${u.nombre} ${u.apellido}` : u.username);
                return uDisplayName?.trim().toLowerCase() === normalizedName;
            });
            if (listUser?.picture) return listUser.picture;
        }

        // 2. Buscar en propRoomUsers
        if (propRoomUsers) {
            const propUser = propRoomUsers.find(pu => {
                if (typeof pu === 'string') return false;
                const puDisplayName = pu.displayName ||
                    (pu.nombre && pu.apellido ? `${pu.nombre} ${pu.apellido}` : pu.username);
                return puDisplayName?.trim().toLowerCase() === normalizedName;
            });
            if (propUser?.picture) return propUser.picture;
        }

        return null;
    };

    //  Cargar usuarios de la API cuando se abre el panel
    // isOnline viene correcto de la API, solo necesitamos añadir picture
    useEffect(() => {
        if (isOpen && currentRoomCode) {
            loadRoomUsers();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, currentRoomCode]); // Solo recargar cuando se abre o cambia la sala, NO por cambios de socket

    const loadRoomUsers = async () => {
        setIsLoading(true);
        try {
            const response = await apiService.getRoomUsers(currentRoomCode);
            let apiUsers = [];

            if (Array.isArray(response)) {
                apiUsers = response;
            } else if (response && response.users) {
                apiUsers = response.users;
            }

            // Recuperar pendientes si existen (depende de qué devuelva getRoomUsers o necesitamos endpoint endpoint)
            // Por ahora, asumimos que getRoomUsers podría devolver pendingMembers si modificamos el backend, o llamamos a getRoomByCode
            const roomInfo = await apiService.getRoomByCode(currentRoomCode);
            if (roomInfo && roomInfo.pendingMembers) {
                setPendingMembers(roomInfo.pendingMembers);
            } else {
                setPendingMembers([]);
            }

            // Solo añadir picture (isOnline ya viene correcto de la API)
            const enrichedUsers = apiUsers.map(apiUser => ({
                ...apiUser,
                picture: apiUser.picture || findPicture(apiUser.displayName)
            }));


            setRoomUsers(enrichedUsers);

            // 🔥 SINCRONIZACIÓN GLOBAL: Actualizar el estado centralizado
            if (setGlobalRoomUsers) {
                console.log('✅ MembersPanel: Sincronizando estado global de roomUsers');
                setGlobalRoomUsers(enrichedUsers);
            }
        } catch (error) {
            console.error('Error al cargar usuarios de la sala:', error);
            setRoomUsers(propRoomUsers || []);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    // Helper para obtener el displayName de cualquier estructura de datos
    const getDisplayName = (member) => {
        if (typeof member === 'string') return member;
        // Prioridad 1: displayName directo de la API optimizada
        if (member.displayName) return member.displayName;
        // Prioridad 2: Construir desde nombre + apellido
        if (member.nombre && member.apellido) return `${member.nombre} ${member.apellido}`;
        // Prioridad 3: username como fallback
        return member.username || '?';
    };

    // Filter members based on search text
    const filteredUsers = roomUsers?.filter(member => {
        const displayName = getDisplayName(member);
        const role = typeof member === 'object' ? member.role : null;
        const numeroAgente = typeof member === 'object' ? member.numeroAgente : null;
        const email = typeof member === 'object' ? member.email : null;

        const searchText = filterText.toLowerCase();

        return (
            displayName?.toLowerCase().includes(searchText) ||
            role?.toLowerCase().includes(searchText) ||
            numeroAgente?.toString().includes(searchText) ||
            email?.toLowerCase().includes(searchText)
        );
    }) || [];

    const isAdmin = user && ['ADMIN', 'JEFEPISO', 'PROGRAMADOR', 'COORDINADOR', 'SUPERADMIN'].includes(user.role);

    return (
        <div className="members-panel-container">
            <div className="members-panel-header">
                <h3 className="members-panel-title">Gente</h3>
                <button className="members-panel-close-btn" onClick={onClose} title="Cerrar panel">
                    <FaTimes />
                </button>
            </div>

            <div className="members-panel-content">

                {/* 🔥 NUEVO: Lista de solicitudes pendientes (Solo Admin) */}
                {isAdmin && (
                    <PendingRequestsList
                        roomCode={currentRoomCode}
                        pendingMembers={pendingMembers}
                        onUpdate={loadRoomUsers}
                    />
                )}

                {onAddUsersToRoom && user && ['ADMIN', 'JEFEPISO', 'PROGRAMADOR', 'COORDINADOR'].includes(user.role) && (
                    <button className="members-panel-invite-btn" onClick={onAddUsersToRoom}>
                        <div className="invite-icon-wrapper">
                            <FaUserPlus />
                        </div>
                        <span className="invite-text">Invitar a la sala</span>
                    </button>
                )}

                {isLoading ? (
                    <div className="members-loading">Cargando miembros...</div>
                ) : (
                    <div className="members-list">
                        {filteredUsers && filteredUsers.map((member, index) => {
                            const displayName = getDisplayName(member);
                            const picture = typeof member === 'object' ? member.picture : null;
                            const role = typeof member === 'object' ? member.role : null;
                            const numeroAgente = typeof member === 'object' ? member.numeroAgente : null;
                            const isOnline = typeof member === 'object' ? member.isOnline : false;
                            const email = typeof member === 'object' ? member.email : null;
                            const colorIndex = (index % 5) + 1;

                            // Construir línea de rol y número de agente
                            let roleText = '';
                            if (role && numeroAgente) {
                                roleText = `${role} • N° ${numeroAgente}`;
                            } else if (role) {
                                roleText = role;
                            } else if (numeroAgente) {
                                roleText = `N° ${numeroAgente}`;
                            }

                            return (
                                <div key={`member-${index}`} className="mx_EntityTile" role="button" tabIndex="0">
                                    <div className="mx_EntityTile_avatar">
                                        <span className="mx_BaseAvatar" data-color={colorIndex}>
                                            {picture ? (
                                                <img src={picture} alt={displayName} className="mx_BaseAvatar_image" />
                                            ) : (
                                                <span className="mx_BaseAvatar_initial">
                                                    {displayName?.[0]?.toUpperCase() || '?'}
                                                </span>
                                            )}
                                            {isOnline && <div className="mx_BaseAvatar_online_indicator" />}
                                        </span>
                                    </div>
                                    <div className="mx_EntityTile_details">
                                        <div className="mx_EntityTile_name">
                                            <span className="mx_DisambiguatedProfile" dir="auto">{displayName}</span>
                                        </div>
                                        {roleText && (
                                            <div className="mx_EntityTile_subtext mx_EntityTile_role">
                                                {roleText}
                                            </div>
                                        )}
                                        {email && (
                                            <div className="mx_EntityTile_subtext mx_EntityTile_email">
                                                {email}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="members-panel-footer">
                <input
                    type="text"
                    placeholder="Filtrar miembros de la sala"
                    className="members-filter-input"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                />
            </div>
        </div>
    );
};

export default MembersPanel;
