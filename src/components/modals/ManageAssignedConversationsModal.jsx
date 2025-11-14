import { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaUsers, FaClock, FaCalendarAlt, FaClipboardList } from 'react-icons/fa';
import BaseModal from './BaseModal';
import './ManageAssignedConversationsModal.css';
import apiService from '../../apiService';
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from '../../sweetalert2';

const ManageAssignedConversationsModal = ({ show, onClose, onConversationUpdated, currentUser, socket }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingConv, setEditingConv] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: ''
  });

  // Verificar si el usuario puede eliminar (solo ADMIN)
  const canDelete = currentUser?.role === 'ADMIN';

  useEffect(() => {
    if (show) {
      loadConversations();
    }
  }, [show]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      const data = await apiService.getAllAssignedConversations();
      setConversations(data || []);
    } catch (error) {
      console.error('Error al cargar conversaciones:', error);
      await showErrorAlert('Error', 'No se pudieron cargar las conversaciones asignadas');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (conv) => {
    setEditingConv(conv.id);
    setEditForm({
      name: conv.name || '',
      description: conv.description || ''
    });
  };

  const handleCancelEdit = () => {
    setEditingConv(null);
    setEditForm({ name: '', description: '' });
  };

  const handleSaveEdit = async (convId) => {
    try {
      // Encontrar la conversación que se está editando
      const conv = conversations.find(c => c.id === convId);

      await apiService.updateAssignedConversation(convId, editForm);

      // 🔥 Actualizar la lista local inmediatamente (sin recargar desde el servidor)
      setConversations(prevConversations =>
        prevConversations.map(c =>
          c.id === convId
            ? { ...c, name: editForm.name, description: editForm.description }
            : c
        )
      );

      // Emitir evento WebSocket para notificar a los participantes
      if (socket && socket.connected && conv) {
        socket.emit('conversationUpdated', {
          conversationId: convId,
          conversationName: editForm.name,
          participants: conv.participants || []
        });
      }

      setEditingConv(null);
      setEditForm({ name: '', description: '' });

      // 🔥 Mostrar alerta de éxito UNA SOLA VEZ
      await showSuccessAlert('¡Actualizado!', 'La conversación ha sido actualizada correctamente');

      // Notificar al componente padre (sin mostrar otra alerta)
      if (onConversationUpdated) {
        onConversationUpdated();
      }
    } catch (error) {
      console.error('Error al actualizar conversación:', error);
      await showErrorAlert('Error', 'No se pudo actualizar la conversación');
    }
  };

  const handleDelete = async (conv) => {
    const result = await showConfirmAlert(
      '¿Eliminar conversación?',
      `¿Estás seguro de que deseas eliminar la conversación "${conv.name}"? Esta acción no se puede deshacer.`,
      'warning'
    );

    if (result.isConfirmed) {
      try {
        await apiService.deleteAssignedConversation(conv.id);
        await showSuccessAlert('¡Eliminado!', 'La conversación ha sido eliminada correctamente');
        loadConversations();
        if (onConversationUpdated) {
          onConversationUpdated();
        }
      } catch (error) {
        console.error('Error al eliminar conversación:', error);

        // Manejar error 404 (conversación ya eliminada o no encontrada)
        if (error.message.includes('404') || error.message.includes('Not Found') || error.message.includes('no encontrada')) {
          await showErrorAlert(
            'Conversación no encontrada',
            'La conversación ya fue eliminada o no existe. Se actualizará la lista.'
          );
          // Recargar la lista para sincronizar con el backend
          loadConversations();
          if (onConversationUpdated) {
            onConversationUpdated();
          }
        } else {
          await showErrorAlert('Error', 'No se pudo eliminar la conversación: ' + error.message);
        }
      }
    }
  };

  const handleDeactivate = async (conv) => {
    const result = await showConfirmAlert(
      '¿Desactivar conversación?',
      `¿Estás seguro de que deseas desactivar la conversación "${conv.name}"?`
    );

    if (result.isConfirmed) {
      try {
        await apiService.deactivateAssignedConversation(conv.id);
        await showSuccessAlert('¡Desactivado!', 'La conversación ha sido desactivada correctamente');
        loadConversations();
        if (onConversationUpdated) {
          onConversationUpdated();
        }
      } catch (error) {
        console.error('Error al desactivar conversación:', error);
        await showErrorAlert('Error', 'No se pudo desactivar la conversación: ' + error.message);
      }
    }
  };

  const handleActivate = async (conv) => {
    const result = await showConfirmAlert(
      '¿Activar conversación?',
      `¿Estás seguro de que deseas activar la conversación "${conv.name}"?`
    );

    if (result.isConfirmed) {
      try {
        await apiService.activateAssignedConversation(conv.id);
        await showSuccessAlert('¡Activado!', 'La conversación ha sido activada correctamente');
        loadConversations();
        if (onConversationUpdated) {
          onConversationUpdated();
        }
      } catch (error) {
        console.error('Error al activar conversación:', error);
        await showErrorAlert('Error', 'No se pudo activar la conversación: ' + error.message);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatExpiration = (dateString) => {
    const expirationDate = new Date(dateString);
    const now = new Date();
    const diffTime = expirationDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'Expirada', className: 'expired' };
    } else if (diffDays === 0) {
      return { text: 'Expira hoy', className: 'expiring-soon' };
    } else if (diffDays === 1) {
      return { text: 'Expira mañana', className: 'expiring-soon' };
    } else if (diffDays <= 7) {
      return { text: `Expira en ${diffDays} días`, className: 'expiring-soon' };
    } else {
      return { text: `Expira en ${diffDays} días`, className: 'active' };
    }
  };

  return (
    <BaseModal
      isOpen={show}
      onClose={onClose}
      title="Gestionar Conversaciones Asignadas"
      icon={<FaClipboardList />}
      headerBgColor="#A50104"
      bodyBgColor="#FFFFFF"
      titleColor="#FFFFFF"
      maxWidth="1000px"
    >
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p style={{ color: '#666666' }}>Cargando conversaciones...</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="empty-state">
          <FaUsers size={48} style={{ color: '#A50104' }} />
          <p style={{ color: '#666666' }}>No hay conversaciones asignadas</p>
        </div>
      ) : (
        <div className="conversations-list">
          {conversations.map((conv) => (
                <div key={conv.id} className="conversation-card" style={{ backgroundColor: '#f9f9f9', border: '1px solid #e0e0e0' }}>
                  {editingConv === conv.id ? (
                    // Modo edición
                    <div className="edit-mode">
                      <div className="form-group">
                        <label style={{ color: '#000000' }}>Nombre de la conversación</label>
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                          placeholder="Nombre de la conversación"
                          style={{ backgroundColor: '#FFFFFF', color: '#000000', border: '1px solid #d1d7db' }}
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ color: '#000000' }}>Descripción (opcional)</label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          placeholder="Descripción de la conversación"
                          rows="3"
                          style={{ backgroundColor: '#FFFFFF', color: '#000000', border: '1px solid #d1d7db' }}
                        />
                      </div>
                      <div className="edit-actions">
                        <button className="btn-save" onClick={() => handleSaveEdit(conv.id)}>
                          Guardar
                        </button>
                        <button className="btn-cancel" onClick={handleCancelEdit}>
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    // Modo vista
                    <>
                      <div className="conversation-header">
                        <h3 style={{ color: '#000000' }}>
                          {conv.name}
                          {!conv.isActive && (
                            <span style={{ marginLeft: '10px', fontSize: '12px', color: '#999', fontWeight: 'normal' }}>
                              (Inactiva)
                            </span>
                          )}
                        </h3>
                        <div className="conversation-actions">
                          <button
                            className="action-btn edit-btn"
                            onClick={() => handleEdit(conv)}
                            title="Editar"
                          >
                            <FaEdit />
                          </button>
                          {canDelete && conv.isActive && (
                            <button
                              className="action-btn"
                              onClick={() => handleDeactivate(conv)}
                              title="Desactivar"
                              style={{ color: '#f59e0b' }}
                            >
                              ⏸️
                            </button>
                          )}
                          {canDelete && !conv.isActive && (
                            <button
                              className="action-btn"
                              onClick={() => handleActivate(conv)}
                              title="Activar"
                              style={{ color: '#10b981' }}
                            >
                              ▶️
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="action-btn delete-btn"
                              onClick={() => handleDelete(conv)}
                              title="Eliminar permanentemente"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </div>
                      </div>

                      {conv.description && (
                        <p className="conversation-description" style={{ color: '#666666' }}>{conv.description}</p>
                      )}

                      <div className="conversation-info">
                        <div className="info-item">
                          <FaUsers style={{ color: '#A50104' }} />
                          <span style={{ color: '#000000' }}>Participantes:</span>
                          <div className="participants">
                            {conv.participants?.map((participant, idx) => {
                              // Función para extraer solo los primeros nombres
                              const getShortName = (fullName) => {
                                const parts = fullName.split(' ');
                                return parts.length > 2 ? `${parts[0]} ${parts[1]}` : parts[0];
                              };

                              return (
                                <span key={idx} className="participant-badge" title={participant}>
                                  {getShortName(participant)}
                                </span>
                              );
                            })}
                          </div>
                        </div>

                        <div className="info-item">
                          <FaCalendarAlt style={{ color: '#A50104' }} />
                          <span style={{ color: '#000000' }}>Creada:</span>
                          <span className="date" style={{ color: '#666666' }}>{formatDate(conv.createdAt)}</span>
                        </div>

                        <div className="info-item">
                          <FaClock style={{ color: '#A50104' }} />
                          <span style={{ color: '#000000' }}>Estado:</span>
                          <span className={`status ${formatExpiration(conv.expiresAt).className}`}>
                            {formatExpiration(conv.expiresAt).text}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

      <div className="modal-footer" style={{ borderTop: '1px solid #e0e0e0', backgroundColor: '#FFFFFF' }}>
        <button className="btn-secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </BaseModal>
  );
};

export default ManageAssignedConversationsModal;

