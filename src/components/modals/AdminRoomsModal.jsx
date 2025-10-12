import React from 'react';
import { FaUsers, FaUser, FaTrash, FaEdit, FaEye, FaExclamationTriangle } from 'react-icons/fa';
import './Modal.css';

const AdminRoomsModal = ({ isOpen, onClose, adminRooms, onDeleteRoom, onDeactivateRoom, onViewRoomUsers, onEditRoom, currentUser }) => {
  if (!isOpen) return null;

  // Verificar si el usuario puede eliminar (solo ADMIN)
  const canDelete = currentUser?.role === 'ADMIN';
  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'JEFEPISO';

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
                  </div>
                  <div className="room-actions">
                    <button
                      className="btn btn-info"
                      onClick={() => onViewRoomUsers(room.roomCode, room.name)}
                      title="Ver usuarios conectados"
                    >
                      👥
                    </button>
                    {canEdit && room.isActive && (
                      <button
                        className="btn btn-edit"
                        onClick={() => onEditRoom(room)}
                        title="Editar capacidad de la sala"
                      >
                        <FaEdit />
                      </button>
                    )}
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
