import { useState, useEffect, useCallback } from 'react';
import { FaEdit, FaTrash, FaUsers, FaClock, FaCalendarAlt, FaClipboardList, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import BaseModal from './BaseModal';
import './ManageAssignedConversationsModal.css';
import './Modal.css';
import apiService from "../../../../apiService";
import { showSuccessAlert, showErrorAlert, showConfirmAlert } from "../../../../sweetalert2";

const ManageAssignedConversationsModal = ({ show, onClose, onConversationUpdated, currentUser, socket }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingConv, setEditingConv] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: ''
  });

  // 🔥 Estados de paginación y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const ITEMS_PER_PAGE = 10;

  // Verificar si el usuario puede eliminar (ADMIN, SUPERADMIN, PROGRAMADOR)
  const canDelete = ['ADMIN', 'SUPERADMIN', 'PROGRAMADOR'].includes(currentUser?.role);

  // 🔥 Cargar conversaciones con paginación y búsqueda
  const loadConversations = useCallback(async (page = 1, search = '') => {
    setLoading(true);
    try {
      const result = await apiService.getAllAssignedConversations(page, ITEMS_PER_PAGE, search);
      setConversations(result.data || []);
      setCurrentPage(result.page || 1);
      setTotalPages(result.totalPages || 1);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Error al cargar conversaciones:', error);
      await showErrorAlert('Error', 'No se pudieron cargar las conversaciones asignadas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (show) {
      setSearchTerm('');
      setCurrentPage(1);
      loadConversations(1, '');
    }
  }, [show, loadConversations]);

  // 🔥 Búsqueda con debounce
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    // Limpiar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    // Crear nuevo timeout para buscar después de 500ms
    const timeout = setTimeout(() => {
      setCurrentPage(1);
      loadConversations(1, value);
    }, 500);

    setSearchTimeout(timeout);
  };

  // 🔥 Navegación de páginas
  const handlePrevPage = () => {
    if (currentPage > 1) {
      loadConversations(currentPage - 1, searchTerm);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      loadConversations(currentPage + 1, searchTerm);
    }
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      loadConversations(page, searchTerm);
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

        // 🔥 Emitir websocket para notificar a los participantes
        if (socket && socket.connected && conv.participants) {
          socket.emit('conversationRemoved', {
            conversationId: conv.id,
            conversationName: conv.name,
            participants: conv.participants || []
          });
        }

        await showSuccessAlert('¡Eliminado!', 'La conversación ha sido eliminada correctamente');
        loadConversations(currentPage, searchTerm);
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
          loadConversations(currentPage, searchTerm);
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
        loadConversations(currentPage, searchTerm);
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
        loadConversations(currentPage, searchTerm);
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
      {/* 🔥 Barra de búsqueda y contador */}
      {/* 🔥 Barra de búsqueda y contador (Estilo Compacto) */}
      <div style={{
        marginBottom: '20px',
        padding: '0 20px',
        paddingTop: '20px'
      }}>
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center'
        }}>
          <FaSearch style={{
            position: 'absolute',
            left: '12px',
            color: '#666666',
            fontSize: '14px'
          }} />
          <input
            type="text"
            placeholder="Buscar por nombre o participante..."
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={loading}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '10px 10px 10px 40px',
              border: '1px solid #d1d7db',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: loading ? '#f5f5f5' : '#FFFFFF',
              color: '#000000',
              outline: 'none',
              transition: 'border-color 0.2s',
              cursor: loading ? 'not-allowed' : 'text'
            }}
            onFocus={(e) => !loading && (e.target.style.borderColor = '#A50104')}
            onBlur={(e) => e.target.style.borderColor = '#d1d7db'}
          />
        </div>
        {!loading && (
          <div style={{
            marginTop: '8px',
            fontSize: '13px',
            color: '#666666'
          }}>
            {total} {total === 1 ? 'conversación encontrada' : 'conversaciones encontradas'}
          </div>
        )}
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p style={{ color: '#666666' }}>Cargando conversaciones...</p>
        </div>
      ) : conversations.length === 0 ? (
        <div className="empty-state">
          <FaUsers size={48} style={{ color: '#A50104' }} />
          <p style={{ color: '#666666' }}>
            {searchTerm ? 'No se encontraron conversaciones' : 'No hay conversaciones asignadas'}
          </p>
        </div>
      ) : (
        <div className="rooms-list">
          {conversations.map((conv) => (
            <div key={conv.id} className="room-item" style={{ backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
              {editingConv === conv.id ? (
                // Modo edición (Mantenemos el estilo de formulario pero dentro del item)
                <div className="edit-mode" style={{ width: '100%', padding: '10px' }}>
                  <div className="form-group">
                    <label style={{ color: '#000000' }}>Nombre</label>
                    <input
                      type="text"
                      value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      placeholder="Nombre"
                      style={{ backgroundColor: '#FFFFFF', color: '#000000', border: '1px solid #d1d7db' }}
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ color: '#000000' }}>Descripción</label>
                    <textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows="2"
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
                // Modo vista (Compacto estilo AdminRooms)
                <>
                  <div className="room-info">
                    <div className="room-name" style={{ color: '#000000', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {conv.name}
                      {!conv.isActive && (
                        <span style={{ fontSize: '11px', color: '#999', fontWeight: 'normal' }}>(Inactiva)</span>
                      )}
                    </div>

                    <div className="room-details">
                      <span className="room-code" style={{ backgroundColor: '#e0e0e0', color: '#000000' }} title="Participantes">
                        <FaUsers size={10} style={{ marginRight: '4px' }} />
                        {conv.participants?.length || 0}
                      </span>

                      <span className={`room-status ${formatExpiration(conv.expiresAt).className}`} style={{ fontSize: '10px' }}>
                        {formatExpiration(conv.expiresAt).text}
                      </span>

                      {conv.description && (
                        <span style={{ color: '#666', fontStyle: 'italic', maxWidth: '200px', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                          {conv.description}
                        </span>
                      )}

                      <span style={{ color: '#666' }}>
                        {formatDate(conv.createdAt)}
                      </span>
                    </div>
                  </div>

                  <div className="room-actions">
                    <button
                      className="btn btn-edit" // Usando estilo de Modal.css
                      onClick={() => handleEdit(conv)}
                      title="Editar"
                      style={{ padding: '6px 10px' }}
                    >
                      <FaEdit />
                    </button>
                    {canDelete && conv.isActive && (
                      <button
                        className="btn btn-warning"
                        onClick={() => handleDeactivate(conv)}
                        title="Desactivar"
                        style={{ padding: '6px 10px' }}
                      >
                        ⏸️
                      </button>
                    )}
                    {canDelete && !conv.isActive && (
                      <button
                        className="btn btn-success"
                        onClick={() => handleActivate(conv)}
                        title="Activar"
                        style={{ padding: '6px 10px' }}
                      >
                        ▶️
                      </button>
                    )}
                    {canDelete && (
                      <button
                        className="btn btn-danger"
                        onClick={() => handleDelete(conv)}
                        title="Eliminar"
                        style={{ padding: '6px 10px' }}
                      >
                        <FaTrash />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* 🔥 Paginación Compacta */}
      {totalPages > 1 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '8px',
          padding: '16px 20px',
          borderTop: '1px solid #e0e0e0',
          marginTop: '12px'
        }}>
          {/* Primera página */}
          <button
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
            title="Primera página"
            style={{
              width: '34px',
              height: '34px',
              border: '1px solid #d1d7db',
              borderRadius: '6px',
              backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
              color: currentPage === 1 ? '#bbb' : '#555',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.15s'
            }}
          >
            «
          </button>

          {/* Anterior */}
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
            title="Página anterior"
            style={{
              width: '34px',
              height: '34px',
              border: '1px solid #d1d7db',
              borderRadius: '6px',
              backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
              color: currentPage === 1 ? '#bbb' : '#555',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
          >
            <FaChevronLeft size={11} />
          </button>

          {/* Indicador de página */}
          <div style={{
            padding: '8px 20px',
            backgroundColor: '#A50104',
            color: '#fff',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: '600',
            textAlign: 'center',
            userSelect: 'none',
            whiteSpace: 'nowrap'
          }}>
            Página {currentPage} de {totalPages}
          </div>

          {/* Siguiente */}
          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            title="Página siguiente"
            style={{
              width: '34px',
              height: '34px',
              border: '1px solid #d1d7db',
              borderRadius: '6px',
              backgroundColor: currentPage === totalPages ? '#f5f5f5' : '#fff',
              color: currentPage === totalPages ? '#bbb' : '#555',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s'
            }}
          >
            <FaChevronRight size={11} />
          </button>

          {/* Última página */}
          <button
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
            title="Última página"
            style={{
              width: '34px',
              height: '34px',
              border: '1px solid #d1d7db',
              borderRadius: '6px',
              backgroundColor: currentPage === totalPages ? '#f5f5f5' : '#fff',
              color: currentPage === totalPages ? '#bbb' : '#555',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              fontWeight: 'bold',
              transition: 'all 0.15s'
            }}
          >
            »
          </button>
        </div>
      )}

      {/* Info de paginación */}
      <div style={{
        textAlign: 'center',
        padding: '10px 20px',
        fontSize: '13px',
        color: '#666666',
        borderTop: totalPages > 1 ? 'none' : '1px solid #e0e0e0'
      }}>
        Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, total)} de {total} {total === 1 ? 'conversación' : 'conversaciones'}
      </div>

      <div className="modal-footer" style={{ borderTop: '1px solid #e0e0e0', backgroundColor: '#FFFFFF' }}>
        <button className="btn-secondary" onClick={onClose}>
          Cerrar
        </button>
      </div>
    </BaseModal>
  );
};

export default ManageAssignedConversationsModal;
