import React from 'react';
import {
    FaTimes,
    FaPoll,
    FaChalkboardTeacher,
    FaUsers,
    FaHashtag,
    FaInfoCircle,
    FaUser
} from 'react-icons/fa';
import './InfoPanel.css';

const InfoPanel = ({ isOpen, onClose, chatInfo, onCreatePoll }) => {
    if (!isOpen) return null;

    const isGroup = chatInfo?.isGroup;

    return (
        <div className="info-panel-container">
            {/* Header */}
            <header className="info-panel-header">
                <div className="info-panel-title">Info. del contacto</div>
                <button className="info-close-btn" onClick={onClose}>
                    <FaTimes />
                </button>
            </header>

            {/* Contenido */}
            <div className="info-content">

                {/* Sección 1: Detalles */}
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

                {/* Sección 2: Acciones (En Columna) */}
                <section className="info-section">
                    <h3 className="info-section-title">Acciones (PROXIMAMENTE)</h3>
                    <div className="info-tools-list">

                        <ActionRow
                            icon={<FaPoll />}
                            text="Crear Encuesta"
                        //  onClick={onCreatePoll}
                        />

                        <ActionRow
                            icon={<FaChalkboardTeacher />}
                            text="Abrir Pizarra"
                            onClick={() => console.log("Abrir pizarra")}
                        />

                        {/* Puedes agregar más acciones aquí fácilmente */}
                    </div>
                </section>

            </div>
        </div>
    );
};

// --- Componentes auxiliares para mantener el código limpio ---

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