import React, { useState, useEffect } from 'react';
import { FaTimes, FaAt, FaSpinner, FaArrowRight } from 'react-icons/fa';
import apiService from '../../../../apiService';
import './MentionsPanel.css';

const MentionsPanel = ({
    isOpen,
    onClose,
    currentUsername,
    // Props para filtro contextual (opcional)
    isGroup,
    roomCode,
    roomName,
    // Callback para navegar al mensaje
    onGoToMessage,
    roomUsers = []
}) => {
    const [mentions, setMentions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen && currentUsername) {
            loadMentions();
        }
    }, [isOpen, currentUsername]);

    const loadMentions = async () => {
        setLoading(true);
        setError(null);
        try {
            // Llamar al endpoint de menciones
            // Pasamos roomCode solo si queremos filtrar por la sala actual (opcional según requerimiento)
            // El usuario pidió "como en la bd se guarda bien user full name quisiera que salga una opcion para ver las etiquetas que tengo un api asi como hilos generales listado para ver quienes me etiquetaron"
            // Asumiremos búsqueda global si no se pasa roomCode, o contextual si se pasa.
            // Por ahora probemos contextual primero como hilos, o global? El usuario dijo "como hilos generales listado", pero suele ser contextual al chat.
            // Empezaremos pasando roomCode para que sea contextual a la sala abierta.
            const response = await apiService.searchMentions(currentUsername, roomCode);

            const mentionsData = response?.data || [];
            setMentions(mentionsData);
        } catch (err) {
            console.error('Error al cargar menciones:', err);
            setError('Error al cargar las menciones');
        } finally {
            setLoading(false);
        }
    };

    const handleMentionClick = (mention) => {
        if (onGoToMessage) {
            onGoToMessage(mention);
        }
        // Opcional: Cerrar panel o mantenerlo abierto
        // onClose(); 
    };

    const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            if (date >= today) {
                return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } else if (date >= yesterday) {
                return 'Ayer';
            } else {
                return date.toLocaleDateString();
            }
        } catch (e) {
            return '';
        }
    };

    const getUserPicture = (username) => {
        const user = roomUsers.find(u => u.username === username ||
            `${u.nombre} ${u.apellido}` === username);
        return user?.picture;
    };

    const getDisplayName = (from, fullName) => {
        // 1. Si el API ya devuelve fullName, usarlo
        if (fullName) return fullName;
        // 2. Buscar en roomUsers por username (DNI)
        if (from && roomUsers && roomUsers.length > 0) {
            const user = roomUsers.find(u => u && typeof u === 'object' && u.username === from);
            if (user && user.nombre && user.apellido) {
                return `${user.nombre} ${user.apellido}`.trim();
            }
        }
        // 3. Si ya tiene espacios (es un nombre), mostrarlo directo
        return from || '?';
    };

    if (!isOpen) return null;

    return (
        <div className="mentions-panel">
            <div className="mentions-header">
                <div className="mentions-title">
                    <FaAt />
                    <span>Menciones</span>
                </div>
                <button className="mentions-close" onClick={onClose}>
                    <FaTimes />
                </button>
            </div>

            <div className="mentions-content">
                {loading && (
                    <div className="mentions-loading">
                        <FaSpinner className="spinner" />
                        <span>Cargando menciones...</span>
                    </div>
                )}

                {error && (
                    <div className="mentions-error">
                        <span>{error}</span>
                        <button onClick={loadMentions}>Reintentar</button>
                    </div>
                )}

                {!loading && !error && mentions.length === 0 && (
                    <div className="mentions-empty">
                        <FaAt size={40} />
                        <p>No te han mencionado aquí</p>
                    </div>
                )}

                {!loading && !error && mentions.length > 0 && (
                    <div className="mentions-list">
                        {mentions.map((mention) => {
                            const senderPicture = getUserPicture(mention.from);

                            return (
                                <div
                                    key={mention.id}
                                    className="mention-item"
                                    onClick={() => handleMentionClick(mention)}
                                >
                                    <div className="mention-avatar">
                                        {senderPicture ? (
                                            <img src={senderPicture} alt="" />
                                        ) : (
                                            <span>{(getDisplayName(mention.from, mention.fullName) || '?')[0].toUpperCase()}</span>
                                        )}
                                    </div>
                                    <div className="mention-info">
                                        <div className="mention-top">
                                            <span className="mention-sender">{getDisplayName(mention.from, mention.fullName)}</span>
                                            <span className="mention-date">{formatDate(mention.sentAt)}</span>
                                        </div>
                                        {mention.groupName && isGroup && (
                                            <div className="mention-group-name">{mention.groupName}</div>
                                        )}
                                        <div className="mention-text">
                                            {mention.message}
                                        </div>
                                        <div className="mention-footer">
                                            <span>Ir al mensaje</span>
                                            <FaArrowRight size={10} />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};

export default MentionsPanel;
