import React, { useState, useRef } from 'react';
// MentionsPanel removed
import {
    FaTimes,
    FaPoll,
    FaChalkboardTeacher,
    FaUsers,
    FaHashtag,
    FaInfoCircle,
    FaUser,
    FaCamera,
    FaEye,
    FaPen,
    FaPlus,
    FaTrashAlt,
} from 'react-icons/fa';
import apiService from '../../../../apiService';
import Swal from 'sweetalert2';
import './InfoPanel.css';

import ImageViewer from '../ChatContent/ImageViewer'; //  Importar visor de imágenes

const InfoPanel = ({ isOpen, onClose, chatInfo, onCreatePoll, user, onRoomUpdated, onGoToMessage }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [showImageViewer, setShowImageViewer] = useState(false); //  Estado para el visor
    // showMentions state removed
    const fileInputRef = useRef(null);

    // Resetear vista al cerrar o cambiar de chat
    React.useEffect(() => {
        if (!isOpen) {
            // reset logic if needed
        }
    }, [isOpen, chatInfo?.roomCode, chatInfo?.to]);

    if (!isOpen) return null;

    const isGroup = chatInfo?.isGroup;
    const userRole = (user?.role || user?.rol || '').toUpperCase();
    const allowedRoles = ['ADMIN', 'COORDINADOR', 'JEFEPISO', 'PROGRAMADOR', 'SUPERADMIN'];
    const canEditGroupInfo = isGroup && allowedRoles.includes(userRole);
    const isSuperAdmin = userRole === 'SUPERADMIN';

    //  NUEVO: Handler para vaciar todos los mensajes del chat
    const handleClearChat = async () => {
        const chatName = isGroup ? (chatInfo.roomName || chatInfo.roomCode) : chatInfo.to;
        const result = await Swal.fire({
            title: '¿Vaciar chat?',
            html: `<p>Esto eliminará <strong>TODOS</strong> los mensajes de este chat.</p><p><strong>${chatName}</strong></p><p style="color: #ff6b6b; font-size: 0.9em;">⚠️ Esta acción no se puede deshacer</p>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ff453a',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, vaciar chat',
            cancelButtonText: 'Cancelar',
        });

        if (result.isConfirmed) {
            try {
                const deletedBy = user?.username || user?.nombre || 'SUPERADMIN';
                let response;

                if (isGroup && chatInfo.roomCode) {
                    // Chat grupal o favorito
                    response = await apiService.clearAllMessagesInRoom(chatInfo.roomCode, deletedBy);
                } else if (chatInfo.to) {
                    // Chat asignado/directo
                    // Usar nombre completo del usuario (como se guarda en los mensajes)
                    const currentUserFullName = user?.nombre && user?.apellido
                        ? `${user.nombre} ${user.apellido}`.toUpperCase()
                        : user?.username || '';
                    response = await apiService.clearAllMessagesInConversation(currentUserFullName, chatInfo.to, deletedBy);
                }

                Swal.fire({
                    icon: 'success',
                    title: 'Chat vaciado',
                    text: `Se eliminaron ${response?.deletedCount || 0} mensajes`,
                    timer: 2000,
                    showConfirmButton: false
                });

                // Refrescar el chat
                if (onRoomUpdated) {
                    onRoomUpdated();
                }
            } catch (error) {
                console.error('Error al vaciar chat:', error);
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'No se pudo vaciar el chat',
                    confirmButtonColor: '#ff453a'
                });
            }
        }
    };

    // Obtener la imagen actual (si existe)
    const currentPicture = chatInfo?.picture || (chatInfo?.description && chatInfo.description.trim().length > 0 ? chatInfo.description : null);

    const handleImageClick = async () => {
        if (!currentPicture && canEditGroupInfo) {
            // Si no hay foto y puede editar, abrir selector directamente
            fileInputRef.current?.click();
            return;
        }

        if (!currentPicture) return; // Si no hay foto y no puede editar, no hacer nada

        if (canEditGroupInfo) {
            // Si puede editar, preguntar qué hacer
            const result = await Swal.fire({
                title: 'Foto de perfil',
                text: '¿Qué deseas hacer?',
                icon: 'question',
                showCancelButton: true,
                showDenyButton: true,
                confirmButtonText: 'Ver foto',
                denyButtonText: 'Cambiar foto',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#3085d6',
                denyButtonColor: '#28a745'
            });

            if (result.isConfirmed) {
                // Ver foto
                setShowImageViewer(true);
            } else if (result.isDenied) {
                // Cambiar foto
                fileInputRef.current?.click();
            }
        } else {
            // Si no puede editar, solo ver foto
            setShowImageViewer(true);
        }
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Validar tipo de archivo
        if (!file.type.startsWith('image/')) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Por favor selecciona un archivo de imagen válido',
                confirmButtonColor: 'ff453a'
            });
            return;
        }

        // Validar tamaño (ej. 70MB)
        if (file.size > 70 * 1024 * 1024) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'La imagen no debe superar los 70MB',
                confirmButtonColor: 'ff453a'
            });
            return;
        }

        try {
            setIsUploading(true);

            // 1. Subir imagen
            const uploadResult = await apiService.uploadFile(file, 'chat');

            // 2. Actualizar sala
            if (chatInfo.roomCode) {
                let roomId = chatInfo.roomId;

                if (!roomId || roomId === chatInfo.roomCode) {
                    try {
                        console.log('🔍 Buscando ID real de la sala para código:', chatInfo.roomCode);
                        const roomDetails = await apiService.getRoomByCode(chatInfo.roomCode);
                        if (roomDetails && (roomDetails._id || roomDetails.id)) {
                            roomId = roomDetails._id || roomDetails.id;
                            console.log('✅ ID real encontrado:', roomId);
                        }
                    } catch (err) {
                        console.warn('⚠️ No se pudo obtener detalles de la sala por código:', err);
                    }
                }

                console.log('🚀 Actualizando sala:', { roomId, picture: uploadResult.fileUrl });

                await apiService.updateRoom(roomId, {
                    picture: uploadResult.fileUrl,
                    description: uploadResult.fileUrl
                });

                Swal.fire({
                    icon: 'success',
                    title: 'Imagen actualizada',
                    text: 'La foto del grupo se ha actualizado correctamente',
                    timer: 1500,
                    showConfirmButton: false
                });

                if (onRoomUpdated) {
                    onRoomUpdated();
                }
            }

        } catch (error) {
            console.error('Error al actualizar foto de grupo:', error);
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'No se pudo actualizar la foto del grupo',
                confirmButtonColor: 'ff453a'
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    // Función de descarga dummy (para ImageViewer) o real si tienes lógica
    const handleDownloadImage = (url, fileName) => {
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || 'imagen.jpg';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };


    // Mentions panel render logic removed

    return (
        <>
            <div className="info-panel-container">
                <header className="info-panel-header">
                    <div className="info-panel-title">Info. del contacto</div>
                    <button className="info-close-btn" onClick={onClose}>
                        <FaTimes />
                    </button>
                </header>

                <div className="info-content">
                    <div className="info-avatar-section">
                        <div className="info-avatar-container">
                            <div
                                className={`info-avatar-wrapper ${canEditGroupInfo ? 'editable' : ''}`}
                                onClick={canEditGroupInfo ? handleImageClick : undefined} // Keep original behavior as fallback or secondary
                            >
                                {currentPicture ? (
                                    <img src={currentPicture} alt="Avatar" className="info-avatar-img" />
                                ) : (
                                    <div className="info-avatar-placeholder">
                                        {isGroup ? (
                                            <FaUsers className="info-avatar-icon" />
                                        ) : (
                                            <FaUser className="info-avatar-icon" />
                                        )}
                                    </div>
                                )}

                                {canEditGroupInfo && (
                                    <div className="info-avatar-overlay">
                                        {isUploading ? (
                                            <div className="info-spinner"></div>
                                        ) : (
                                            <FaCamera className="info-camera-icon" />
                                        )}
                                    </div>
                                )}

                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    style={{ display: 'none' }}
                                    accept="image/*"
                                    onChange={handleFileChange}
                                    disabled={isUploading}
                                />
                            </div>

                            <div className="info-avatar-actions">
                                {currentPicture && (
                                    <button
                                        className="info-avatar-action-btn view-btn"
                                        onClick={() => setShowImageViewer(true)}
                                        title="Ver foto"
                                    >
                                        <FaEye />
                                    </button>
                                )}
                                {canEditGroupInfo && (
                                    <button
                                        className="info-avatar-action-btn edit-btn"
                                        onClick={() => fileInputRef.current?.click()}
                                        title={currentPicture ? "Cambiar foto" : "Agregar foto"}
                                        disabled={isUploading}
                                    >
                                        {currentPicture ? <FaPen /> : <FaPlus />}
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    <section className="info-section">
                        <h3 className="info-section-title">
                            {isGroup ? 'Info. del Grupo' : 'Info. del Usuario'}
                        </h3>

                        <InfoRow
                            label="Tipo de chat"
                            value={isGroup ? "Grupo" : "Privado"}
                            icon={<FaInfoCircle />}
                        />

                        {isGroup ? (
                            <>
                                <InfoRow
                                    label="Nombre"
                                    value={chatInfo.roomName}
                                />
                                {allowedRoles.includes(userRole) && (
                                    <InfoRow
                                        label="Código de invitación"
                                        value={chatInfo.roomCode}
                                        icon={<FaHashtag />}
                                    />
                                )}
                                <InfoRow
                                    label="Participantes"
                                    value={`${chatInfo.roomUsers?.length || 0} miembros`}
                                    icon={<FaUsers />}
                                />
                            </>
                        ) : (
                            <InfoRow
                                label="Nombre de usuario"
                                value={chatInfo.to}
                                icon={<FaUser />}
                            />
                        )}
                    </section>

                    {/* ... Resto de secciones ... */}
                    <section className="info-section">
                        <h3 className="info-section-title">Acciones</h3>
                        <div className="info-tools-list">
                            {/* Ver Menciones removed */}
                            <ActionRow
                                icon={<FaChalkboardTeacher />}
                                text="Abrir Pizarra"
                                onClick={() => console.log("Abrir pizarra")}
                            />
                            {/*  NUEVO: Botón vaciar chat - Solo SUPERADMIN */}
                            {isSuperAdmin && (
                                <ActionRow
                                    icon={<FaTrashAlt />}
                                    text="Vaciar Chat"
                                    onClick={handleClearChat}
                                />
                            )}
                        </div>
                    </section>
                </div>
            </div>

            {/* Visor de imágenes */}
            {showImageViewer && currentPicture && (
                <ImageViewer
                    imagePreview={{ url: currentPicture, fileName: `foto_${chatInfo.roomName || 'perfil'}.jpg` }}
                    onClose={() => setShowImageViewer(false)}
                    onDownload={handleDownloadImage}
                />
            )}
        </>
    );
};

const InfoRow = ({ label, value }) => {
    if (!value) return null;
    return (
        <div className="info-item">
            <span className="info-label">{label}</span>
            <span className="info-value">{value}</span>
        </div>
    );
};

const ActionRow = ({ icon, text, onClick }) => (
    <button className="info-tool-btn" onClick={onClick}>
        <div className="info-tool-icon">{icon}</div>
        <span className="info-tool-text">{text}</span>
    </button>
);

export default InfoPanel;
