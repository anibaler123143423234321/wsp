import { useState, useEffect, useCallback } from 'react';
import { FaEdit, FaTrash, FaUsers, FaSearch, FaChevronLeft, FaChevronRight, FaPause, FaPlay, FaCircle, FaSave, FaTimes } from 'react-icons/fa';
import SidebarMenuButton from '../../../../components/SidebarMenuButton/SidebarMenuButton';
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

  //  Estados de paginación y búsqueda
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchTimeout, setSearchTimeout] = useState(null);
  const ITEMS_PER_PAGE = 10;

  // Verificar si el usuario puede eliminar (ADMIN, SUPERADMIN, PROGRAMADOR)
  const canDelete = ['ADMIN', 'SUPERADMIN', 'PROGRAMADOR'].includes(currentUser?.role);

  //  Cargar conversaciones con paginación y búsqueda
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

  //  Búsqueda con debounce
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
      const conv = conversations.find(c => c.id === convId);
      await apiService.updateAssignedConversation(convId, editForm);

      setConversations(prevConversations =>
        prevConversations.map(c =>
          c.id === convId
            ? { ...c, name: editForm.name, description: editForm.description }
            : c
        )
      );

      if (socket && socket.connected && conv) {
        socket.emit('conversationUpdated', {
          conversationId: convId,
          conversationName: editForm.name,
          participants: conv.participants || []
        });
      }

      setEditingConv(null);
      setEditForm({ name: '', description: '' });

      await showSuccessAlert('¡Actualizado!', 'La conversación ha sido actualizada correctamente');

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
      `¿Estás seguro de que deseas eliminar la conversación "${conv.name}"?`,
      'warning'
    );

    if (result.isConfirmed) {
      try {
        await apiService.deleteAssignedConversation(conv.id);

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
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          await showErrorAlert(
            'Conversación no encontrada',
            'La conversación ya fue eliminada o no existe. Se actualizará la lista.'
          );
          loadConversations(currentPage, searchTerm);
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
        await showErrorAlert('Error', 'No se pudo activar la conversación: ' + error.message);
      }
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatExpiration = (dateString) => {
    const expirationDate = new Date(dateString);
    const now = new Date();
    const diffTime = expirationDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: 'CADUCADA', className: 'expired' };
    } else if (diffDays === 0) {
      return { text: 'HOY', className: 'expiring-soon' };
    } else if (diffDays === 1) {
      return { text: 'MAÑANA', className: 'expiring-soon' };
    } else if (diffDays <= 7) {
      return { text: `${diffDays} DÍAS`, className: 'expiring-soon' };
    } else {
      return { text: `${diffDays} DÍAS`, className: 'active' };
    }
  };

  return (
    <BaseModal
      isOpen={show}
      onClose={onClose}
      title="Gestionar Conversaciones Asignadas"
      icon={null}
      headerBgColor="#A50104" // Red Header Restored
      bodyBgColor="#ffffff"   // Light Body (Default)
      titleColor="#FFFFFF"
      maxWidth="1000px"
      closeOnOverlayClick={false}
    >
      {/* Filtros y Búsqueda */}
      <div className="search-container">
        <div className="search-wrapper">
          <FaSearch style={{
            position: 'absolute',
            left: '12px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#9ca3af',
            fontSize: '14px'
          }} />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar por nombre o participante..."
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={loading}
          />
        </div>
        {!loading && (
          <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: '500' }}>
            {total} {total === 1 ? 'resultado' : 'resultados'}
          </div>
        )}
      </div>

      {/* Header de la Lista (Tipo Tabla) */}
      <div className="list-header">
        <div className="header-cell">NOMBRE Y DESCRIPCIÓN</div>
        <div className="header-cell">PARTICIPANTES</div>
        <div className="header-cell">ESTADO</div>
        <div className="header-cell">CREADO</div>
        <div className="header-cell" style={{ justifyContent: 'flex-end' }}>ACCIONES</div>
      </div>

      <div className="conversations-list">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p style={{ color: '#6b7280', marginTop: '10px' }}>Cargando datos...</p>
          </div>
        ) : conversations.length === 0 ? (
          <div className="empty-state">
            <FaUsers size={40} style={{ color: '#e5e7eb', marginBottom: '16px' }} />
            <p style={{ color: '#6b7280', fontWeight: '500' }}>
              {searchTerm ? 'No se encontraron coincidencias' : 'No hay conversaciones asignadas'}
            </p>
          </div>
        ) : (
          conversations.map((conv) => (
            <div key={conv.id} className="room-item">
              {editingConv === conv.id ? (
                // Edición en línea
                <div className="edit-mode-grid">
                  <input
                    type="text"
                    className="input-inline"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nombre de la conversación"
                    autoFocus
                    style={{ flex: 1 }}
                  />
                  <input
                    type="text"
                    className="input-inline"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Descripción (opcional)"
                    style={{ flex: 2 }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <SidebarMenuButton
                      onClick={() => handleSaveEdit(conv.id)}
                      label="Guardar"
                      icon={FaSave}
                      className="sidebar-menu-btn primary"
                      style={{ padding: '6px 12px', height: 'auto', fontSize: '0.8rem' }}
                    />
                    <SidebarMenuButton
                      onClick={handleCancelEdit}
                      label="Cancelar"
                      icon={FaTimes}
                      className="sidebar-menu-btn light"
                      style={{ padding: '6px 12px', height: 'auto', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              ) : (
                // Vista Grid
                <>
                  {/* Celda 1: Nombre */}
                  <div className="cell-name">
                    <div className="room-name-text" title={conv.name}>
                      {conv.name}
                      {!conv.isActive && <span style={{ color: '#ef4444', fontSize: '11px', marginLeft: '6px' }}>(Inactiva)</span>}
                    </div>
                    {conv.description && (
                      <div className="room-desc-text" title={conv.description}>
                        {conv.description}
                      </div>
                    )}
                  </div>

                  {/* Celda 2: Participantes */}
                  <div className="cell-participants" title={`${conv.participants?.length || 0} participantes`}>
                    <FaUsers size={14} style={{ color: '#9ca3af' }} />
                    <span>{conv.participants?.length || 0}</span>
                  </div>

                  {/* Celda 3: Estado */}
                  <div className="cell-status">
                    <span className={`status-app-badge ${formatExpiration(conv.expiresAt).className}`}>
                      {formatExpiration(conv.expiresAt).text}
                    </span>
                  </div>

                  {/* Celda 4: Fecha */}
                  <div className="cell-date">
                    {formatDate(conv.createdAt)}
                  </div>

                  {/* Celda 5: Acciones */}
                  <div className="cell-actions">
                    <button className="action-icon-btn edit" onClick={() => handleEdit(conv)} title="Editar">
                      <FaEdit size={14} />
                    </button>

                    {canDelete && conv.isActive && (
                      <button className="action-icon-btn pause" onClick={() => handleDeactivate(conv)} title="Desactivar">
                        <FaPause size={12} />
                      </button>
                    )}

                    {canDelete && !conv.isActive && (
                      <button className="action-icon-btn active" onClick={() => handleActivate(conv)} title="Activar">
                        <FaPlay size={12} />
                      </button>
                    )}

                    {canDelete && (
                      <button className="action-icon-btn delete" onClick={() => handleDelete(conv)} title="Eliminar">
                        <FaTrash size={12} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      <div className="modal-footer-custom">
        <div className="pagination-info" style={{ fontSize: '13px', color: '#6b7280' }}>
          Página {currentPage} de {totalPages}
        </div>

        {totalPages > 1 && (
          <div className="pagination-modern">
            <button
              className="page-btn"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <FaChevronLeft size={10} />
            </button>

            {/* Generar números de página simple */}
            {[...Array(totalPages)].map((_, idx) => {
              const pageNum = idx + 1;
              // Mostrar solo páginas cercanas a la actual para no saturar si hay muchas
              if (
                totalPages <= 7 ||
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    className={`page-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              } else if (
                (pageNum === currentPage - 2 && pageNum > 1) ||
                (pageNum === currentPage + 2 && pageNum < totalPages)
              ) {
                return <span key={pageNum} style={{ padding: '0 4px', color: '#9ca3af' }}>...</span>;
              }
              return null;
            })}

            <button
              className="page-btn"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <FaChevronRight size={10} />
            </button>
          </div>
        )}

        <SidebarMenuButton
          onClick={onClose}
          label="Cerrar"
          icon={FaTimes}
          className="sidebar-menu-btn light"
          style={{ width: 'auto', padding: '8px 16px' }}
        />
      </div>
    </BaseModal>
  );
};

export default ManageAssignedConversationsModal;
