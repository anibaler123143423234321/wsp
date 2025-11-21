import React from 'react';
import { FaTimes, FaUserPlus } from 'react-icons/fa';
import './MembersPanel.css';

const MembersPanel = ({
    isOpen,
    onClose,
    roomUsers,
    onAddUsersToRoom,
    currentRoomCode,
    user
}) => {
    if (!isOpen) return null;

    return (
        <div className="members-panel-container">
            <div className="members-panel-header">
                <h3 className="members-panel-title">Gente</h3>
                <button className="members-panel-close-btn" onClick={onClose} title="Cerrar panel">
                    <FaTimes />
                </button>
            </div>

            <div className="members-panel-content">
                {onAddUsersToRoom && user && ['ADMIN', 'JEFEPISO', 'PROGRAMADOR', 'COORDINADOR'].includes(user.role) && (
                    <button className="members-panel-invite-btn" onClick={onAddUsersToRoom}>
                        <div className="invite-icon-wrapper">
                            <FaUserPlus />
                        </div>
                        <span className="invite-text">Invitar a la sala</span>
                    </button>
                )}

                <div className="members-list">
                    {roomUsers && roomUsers.map((member, index) => {
                        const username = typeof member === 'string' ? member : member.username;
                        const picture = typeof member === 'object' ? member.picture : null;
                        const nombre = typeof member === 'object' ? member.nombre : null;
                        const apellido = typeof member === 'object' ? member.apellido : null;
                        const displayName = nombre && apellido ? `${nombre} ${apellido}` : username;
                        const role = typeof member === 'object' ? member.role : null;
                        const numeroAgente = typeof member === 'object' ? member.numeroAgente : null;
                        const colorIndex = (index % 5) + 1;

                        // Determinar qué mostrar en la segunda línea (Rol y/o Número de Agente)
                        let subText = '';

                        if (role && numeroAgente) {
                            // Mostrar ambos: Rol • N° Agente
                            subText = `${role} • N° ${numeroAgente}`;
                        } else if (role) {
                            // Solo mostrar rol si numeroAgente es null
                            subText = role;
                        } else if (numeroAgente) {
                            // Solo mostrar numeroAgente si role es null
                            subText = `N° ${numeroAgente}`;
                        }

                        return (
                            <div key={index} className="mx_EntityTile" role="button" tabIndex="0">
                                <div className="mx_EntityTile_avatar">
                                    <span className="mx_BaseAvatar" data-color={colorIndex}>
                                        {picture ? (
                                            <img src={picture} alt={displayName} className="mx_BaseAvatar_image" />
                                        ) : (
                                            <span className="mx_BaseAvatar_initial">
                                                {displayName?.[0]?.toUpperCase() || '?'}
                                            </span>
                                        )}
                                    </span>
                                </div>
                                <div className="mx_EntityTile_details">
                                    <div className="mx_EntityTile_name">
                                        <span className="mx_DisambiguatedProfile" dir="auto">{displayName}</span>
                                    </div>
                                    {subText && (
                                        <div className="mx_EntityTile_subtext mx_EntityTile_role">
                                            {subText}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="members-panel-footer">
                <input
                    type="text"
                    placeholder="Filtrar miembros de la sala"
                    className="members-filter-input"
                />
            </div>
        </div>
    );
};

export default MembersPanel;
