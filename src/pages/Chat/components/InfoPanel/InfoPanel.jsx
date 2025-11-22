import React, { useState, useRef } from 'react';
import {
    FaTimes,
    FaPoll,
    FaChalkboardTeacher,
    FaUsers,
    FaHashtag,
    FaInfoCircle,
    FaUser,
    FaCamera
} from 'react-icons/fa';
import apiService from '../../../../apiService';
import Swal from 'sweetalert2';
import './InfoPanel.css';

const InfoPanel = ({ isOpen, onClose, chatInfo, onCreatePoll, user, onRoomUpdated }) => {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);

    if (!isOpen) return null;

    const isGroup = chatInfo?.isGroup;
    const userRole = (user?.role || user?.rol || '').toUpperCase();
    const allowedRoles = ['ADMIN', 'COORDINADOR', 'JEFEPISO', 'PROGRAMADOR'];
    const canEditGroupInfo = isGroup && allowedRoles.includes(userRole);

    const handleImageClick = () => {
        if (canEditGroupInfo && fileInputRef.current) {
            fileInputRef.current.click();
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
                confirmButtonColor: '#00a884'
            });
            return;
        }

        // Validar tamaño (ej. 70MB)
        if (file.size > 70 * 1024 * 1024) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'La imagen no debe superar los 70MB',
                confirmButtonColor: '#00a884'
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
                confirmButtonColor: '#00a884'
            });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className="info-panel-container">
            <header className="info-panel-header">
                <div className="info-panel-title">Info. del contacto</div>
                <button className="info-close-btn" onClick={onClose}>
                    <FaTimes />
                </button>
            </header>

            <div className="info-content">
                <div className="info-avatar-section">
                    <div
                        className={`info-avatar-wrapper ${canEditGroupInfo ? 'editable' : ''}`}
                        onClick={handleImageClick}
                    >
                        {chatInfo?.picture || (chatInfo?.description && chatInfo.description.startsWith('http')) ? (
                            <img src={chatInfo.picture || chatInfo.description} alt="Avatar" className="info-avatar-img" />
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
                            <InfoRow
                                label="Código de invitación"
                                value={chatInfo.roomCode}
                                icon={<FaHashtag />}
                            />
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

                <section className="info-section">
                    <h3 className="info-section-title">Acciones (PROXIMAMENTE)</h3>
                    <div className="info-tools-list">
                        <ActionRow
                            icon={<FaPoll />}
                            text="Crear Encuesta"
                        />
                        <ActionRow
                            icon={<FaChalkboardTeacher />}
                            text="Abrir Pizarra"
                            onClick={() => console.log("Abrir pizarra")}
                        />
                    </div>
                </section>
            </div>
        </div>
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