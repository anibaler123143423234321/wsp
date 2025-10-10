import React from 'react';
import { FaUsers, FaUser, FaTrash, FaEdit, FaEye, FaExclamationTriangle } from 'react-icons/fa';
import './Modal.css';

const AdminRoomsModal = ({ isOpen, onClose, adminRooms, onDeleteRoom, onDeactivateRoom, onViewRoomUsers, currentUser }) => {
  if (!isOpen) return null;

  // Verificar si el usuario puede eliminar (solo ADMIN)
  const canDelete = currentUser?.role === 'ADMIN';

  // Función para formatear la duración en minutos a horas y minutos
  const formatDuration = (minutes) => {
    if (!minutes) return 'No especificada';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours === 0) {
      return `${mins}m`;
    } else if (mins === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${mins}m`;
    }
  };

  // Función para formatear la fecha de expiración
  const formatExpiration = (expiresAt) => {
    if (!expiresAt) return 'No especificada';
    
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffMs = expiration - now;
    
    if (diffMs <= 0) {
      return 'Expirada';
    }
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (diffHours === 0) {
      return `Expira en ${diffMinutes}m`;
    } else if (diffMinutes === 0) {
      return `Expira en ${diffHours}h`;
    } else {
      return `Expira en ${diffHours}h ${diffMinutes}m`;
    }
  };

  // Función para obtener el estado de expiración
  const getExpirationStatus = (expiresAt) => {
    if (!expiresAt) return 'unknown';
    
    const now = new Date();
    const expiration = new Date(expiresAt);
    const diffMs = expiration - now;
    
    if (diffMs <= 0) {
      return 'expired';
    } else if (diffMs <= 30 * 60 * 1000) { // 30 minutos
      return 'warning';
    } else {
      return 'normal';
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content admin-rooms-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Mis Salas Creadas</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-body">
          {adminRooms.length === 0 ? (
            <div className="no-rooms">
              <div className="no-rooms-icon">🏠</div>
              <div className="no-rooms-text">No has creado ninguna sala aún</div>
            </div>
          ) : (
            <div className="rooms-list">
              {adminRooms.map((room) => (
                <div key={room.id} className="room-item">
                  <div className="room-info">
                    <div className="room-name">{room.name}</div>
                    <div className="room-details">
                      <span className="room-code">Código: {room.roomCode}</span>
                      <span className="room-capacity">Capacidad: {room.currentMembers}/{room.maxCapacity}</span>
                      <span className={`room-status ${room.isActive ? 'active' : 'inactive'}`}>
                        {room.isActive ? 'Activa' : 'Inactiva'}
                      </span>
                    </div>
                    <div className="room-timing">
                      <div className="room-duration">
                        <span className="timing-label">⏱️ Duración:</span>
                        <span className="timing-value">{formatDuration(room.durationMinutes)}</span>
                      </div>
                      <div className="room-expiration">
                        <span className="timing-label">⏰ Expira:</span>
                        <span className={`timing-value expiration-${getExpirationStatus(room.expiresAt)}`}>
                          {formatExpiration(room.expiresAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="room-actions">
                    <button
                      className="btn btn-info"
                      onClick={() => onViewRoomUsers(room.roomCode, room.name)}
                      title="Ver usuarios conectados"
                    >
                      👥
                    </button>
                    {canDelete && room.isActive && (
                      <button
                        className="btn btn-warning"
                        onClick={() => onDeactivateRoom(room.id, room.name)}
                        title="Desactivar sala"
                      >
                        ⏸️
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="btn btn-danger"
                        onClick={() => onDeleteRoom(room.id, room.name)}
                        title="Eliminar sala permanentemente"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminRoomsModal;
