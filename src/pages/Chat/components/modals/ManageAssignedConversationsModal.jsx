import { useState, useEffect, useCallback } from 'react';
import { FaEdit, FaTrash, FaUsers, FaSearch, FaChevronLeft, FaChevronRight, FaPause, FaPlay, FaSave, FaTimes } from 'react-icons/fa';
import BaseModal from './BaseModal';
import './ManageAssignedConversationsModal.css';
import './Modal.css';
import apiService from "../../../../apiService";
import { showSuccessAlert, showErrorAlert, showConfirmAlert, showInfoAlert } from "../../../../sweetalert2";

const ManageAssignedConversationsModal = ({ show, onClose, onConversationUpdated, currentUser, socket }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingConv, setEditingConv] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    description: ''
  });
  const [filterType, setFilterType] = useState('assigned');
  const [statusFilter, setStatusFilter] = useState('all');

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
  const loadConversations = useCallback(async (page = 1, search = '', type = 'assigned') => {
    setLoading(true);
    try {
      let result;
      if (type === 'assigned') {
        result = await apiService.getAllAssignedConversations(page, ITEMS_PER_PAGE, search);
        setConversations(result.data || []);
      } else {
        result = await apiService.getAllRoomsPaginated(page, ITEMS_PER_PAGE, search);
        setConversations(result.data || []);
      }
      setCurrentPage(result.page || 1);
      setTotalPages(result.totalPages || 1);
      setTotal(result.total || 0);
    } catch (error) {
      console.error('Error al cargar conversaciones:', error);
      await showErrorAlert('Error', 'No se pudieron cargar los datos solicitados');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (show) {
      setSearchTerm('');
      setCurrentPage(1);
      setFilterType('assigned');
      loadConversations(1, '', 'assigned');
    }
  }, [show, loadConversations]);

  const handleFilterChange = (e) => {
    const newType = e.target.value;
    setFilterType(newType);
    setStatusFilter('all');
    setCurrentPage(1);
    loadConversations(1, searchTerm, newType);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
  };

  // Client-side status filtering
  const filteredConversations = conversations.filter(conv => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return conv.isActive !== false;
    if (statusFilter === 'inactive') return conv.isActive === false;
    return true;
  });

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
      loadConversations(1, value, filterType);
    }, 500);

    setSearchTimeout(timeout);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      loadConversations(page, searchTerm, filterType);
    }
  };

  const handleEdit = (conv) => {
    setEditingConv(conv.id);
    setEditForm({
      name: conv.name || '',
      description: conv.description || '',
      maxCapacity: conv.maxCapacity || 50
    });
  };

  const handleCancelEdit = () => {
    setEditingConv(null);
    setEditForm({ name: '', description: '', maxCapacity: 50 });
  };

  const handleSaveEdit = async (convId) => {
    try {
      const conv = conversations.find(c => c.id === convId);
      if (filterType === 'assigned') {
        await apiService.updateAssignedConversation(convId, editForm);
      } else {
        await apiService.updateRoom(convId, {
          description: editForm.description,
          maxCapacity: editForm.maxCapacity
        });
      }

      setConversations(prevConversations =>
        prevConversations.map(c =>
          c.id === convId
            ? {
              ...c,
              name: filterType === 'assigned' ? editForm.name : c.name,
              description: editForm.description,
              maxCapacity: filterType === 'group' ? editForm.maxCapacity : c.maxCapacity
            }
            : c
        )
      );

      if (socket && socket.connected && conv && filterType === 'assigned') {
        socket.emit('conversationUpdated', {
          conversationId: convId,
          conversationName: editForm.name,
          participants: conv.participants || []
        });
      }

      setEditingConv(null);
      setEditForm({ name: '', description: '', maxCapacity: 50 });

      await showSuccessAlert('¡Actualizado!', 'Actualizado correctamente');

      if (onConversationUpdated) {
        onConversationUpdated();
      }
    } catch (error) {
      console.error('Error al actualizar:', error);
      await showErrorAlert('Error', 'No se pudo actualizar');
    }
  };

  const handleDelete = async (conv) => {
    const result = await showConfirmAlert(
      '¿Eliminar?',
      `¿Estás seguro de que deseas eliminar "${conv.name}"?`,
      'warning'
    );

    if (result.isConfirmed) {
      try {
        if (filterType === 'assigned') {
          await apiService.deleteAssignedConversation(conv.id);
          if (socket && socket.connected && conv.participants) {
            socket.emit('conversationRemoved', {
              conversationId: conv.id,
              conversationName: conv.name,
              participants: conv.participants || []
            });
          }
        } else {
          await apiService.deleteRoom(conv.id);
        }

        await showSuccessAlert('¡Eliminado!', 'Eliminado correctamente');
        loadConversations(currentPage, searchTerm, filterType);
        if (onConversationUpdated) {
          onConversationUpdated();
        }
      } catch (error) {
        if (error.message.includes('404') || error.message.includes('Not Found')) {
          await showErrorAlert(
            'No encontrado',
            'Ya fue eliminado o no existe. Se actualizará la lista.'
          );
          loadConversations(currentPage, searchTerm, filterType);
        } else {
          await showErrorAlert('Error', 'No se pudo eliminar: ' + error.message);
        }
      }
    }
  };

  const handleDeactivate = async (conv) => {
    const result = await showConfirmAlert(
      '¿Desactivar?',
      `¿Estás seguro de que deseas desactivar "${conv.name}"?`
    );

    if (result.isConfirmed) {
      try {
        if (filterType === 'assigned') {
          await apiService.deactivateAssignedConversation(conv.id);
        } else {
          await apiService.deactivateRoom(conv.id);
        }
        await showSuccessAlert('¡Desactivado!', 'Desactivado correctamente');
        loadConversations(currentPage, searchTerm, filterType);
        if (onConversationUpdated) {
          onConversationUpdated();
        }
      } catch (error) {
        await showErrorAlert('Error', 'No se pudo desactivar: ' + error.message);
      }
    }
  };

  const handleActivate = async (conv) => {
    const result = await showConfirmAlert(
      '¿Activar?',
      `¿Estás seguro de que deseas activar "${conv.name}"?`
    );

    if (result.isConfirmed) {
      try {
        if (filterType === 'assigned') {
          await apiService.activateAssignedConversation(conv.id);
        } else {
          await apiService.activateRoom(conv.id);
        }
        await showSuccessAlert('¡Activado!', 'Activado correctamente');
        loadConversations(currentPage, searchTerm, filterType);
        if (onConversationUpdated) {
          onConversationUpdated();
        }
      } catch (error) {
        await showErrorAlert('Error', 'No se pudo activar: ' + error.message);
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    return date.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatExpiration = (dateString) => {
    if (!dateString) return { text: '-', className: 'active' };
    const expirationDate = new Date(dateString);
    if (isNaN(expirationDate.getTime())) return { text: '-', className: 'active' };

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

  const handleViewMembers = async (conv) => {
    const title = 'Participantes';
    const memberList = filterType === 'assigned'
      ? (conv.participants || conv.users || [])
      : (conv.members || []);

    if (!memberList || memberList.length === 0) {
      await showInfoAlert(title, '<p>No hay participantes en esta sala.</p>');
      return;
    }

    const htmlList = `<div style="max-height: 250px; overflow-y: auto; text-align: left; padding: 10px; background: #1f2937; border-radius: 8px;">
      ${memberList.map(member => `<div style="padding: 6px 0; border-bottom: 1px solid #374151; color: #e5e7eb; font-size: 14px;">• ${member}</div>`).join('')}
    </div>`;

    await showInfoAlert(title, htmlList);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterType('assigned');
    setStatusFilter('all');
    setCurrentPage(1);
    loadConversations(1, '', 'assigned');
  };

  const hasActiveFilters = searchTerm || filterType !== 'assigned' || statusFilter !== 'all';

  return (
    <BaseModal
      isOpen={show}
      onClose={onClose}
      title="Gestionar Conversaciones y Salas"
      icon={null}
      headerBgColor="#A50104"
      bodyBgColor="#111b21"
      titleColor="#FFFFFF"
      maxWidth="1000px"
      closeOnOverlayClick={false}
    >
      {/* ── Toolbar ── */}
      <div className="mac-toolbar">
        <select
          className="mac-select"
          value={filterType}
          onChange={handleFilterChange}
          disabled={loading}
        >
          <option value="assigned">Conversaciones Asignadas</option>
          <option value="group">Chats Grupales (Salas)</option>
        </select>

        <select
          className="mac-select"
          value={statusFilter}
          onChange={handleStatusFilterChange}
          disabled={loading}
          style={{ minWidth: '130px' }}
        >
          <option value="all">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>

        <div className="mac-search-wrap">
          <FaSearch className="mac-search-icon" />
          <input
            type="text"
            className="mac-search-input"
            placeholder="Buscar por nombre o participante..."
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={loading}
          />
        </div>

        {hasActiveFilters && (
          <button className="mac-clear-btn" onClick={handleClearFilters} title="Limpiar filtros">
            <FaTimes size={10} />
            Limpiar
          </button>
        )}

        {!loading && (
          <span className="mac-results-count">
            {total} {total === 1 ? 'resultado' : 'resultados'}
          </span>
        )}
      </div>

      {/* ── Table Header ── */}
      <div className="mac-list-header">
        <div className="mac-header-cell">Nombre</div>
        <div className="mac-header-cell">Miembros</div>
        <div className="mac-header-cell">Estado</div>
        <div className="mac-header-cell">Creado</div>
        <div className="mac-header-cell" style={{ justifyContent: 'flex-end' }}>Acciones</div>
      </div>

      {/* ── List ── */}
      <div className="mac-conversations-list">
        {loading ? (
          <div className="mac-loading-state">
            <div className="mac-spinner" />
            <p>Cargando datos...</p>
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="mac-empty-state">
            <FaUsers size={36} />
            <p>{searchTerm ? 'No se encontraron coincidencias' : 'No hay datos disponibles'}</p>
          </div>
        ) : (
          filteredConversations.map((conv) => (
            <div key={conv.id} className="mac-row">
              {editingConv === conv.id ? (
                <div className="mac-edit-row">
                  <input
                    type="text"
                    className="mac-edit-input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    placeholder="Nombre"
                    disabled={filterType === 'group'}
                    autoFocus={filterType !== 'group'}
                    style={{ flex: '1 1 180px' }}
                  />
                  <input
                    type="text"
                    className="mac-edit-input"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    placeholder="Descripción (opcional)"
                    autoFocus={filterType === 'group'}
                    style={{ flex: '2 1 220px' }}
                  />
                  {filterType === 'group' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span style={{ color: '#8696a0', fontSize: '11px', whiteSpace: 'nowrap' }}>Cap. máx:</span>
                      <input
                        type="number"
                        className="mac-edit-input"
                        value={editForm.maxCapacity}
                        onChange={(e) => setEditForm({ ...editForm, maxCapacity: parseInt(e.target.value) || 1 })}
                        min="1"
                        max="500"
                        style={{ width: '70px', textAlign: 'center' }}
                      />
                    </div>
                  )}
                  <div className="mac-edit-actions">
                    <button className="mac-edit-btn save" onClick={() => handleSaveEdit(conv.id)}>
                      <FaSave size={12} /> Guardar
                    </button>
                    <button className="mac-edit-btn cancel" onClick={handleCancelEdit}>
                      <FaTimes size={11} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Name */}
                  <div className="mac-cell-name">
                    <div className="mac-name-text" title={conv.name}>
                      {conv.name}
                      {!conv.isActive && <span className="mac-inactive-tag">(Inactiva)</span>}
                    </div>
                    {conv.description && (
                      <div className="mac-desc-text" title={conv.description}>{conv.description}</div>
                    )}
                  </div>

                  {/* Participants */}
                  <div className="mac-cell-participants" onClick={() => handleViewMembers(conv)} title="Ver participantes">
                    <FaUsers className="mac-p-icon" />
                    <span className="mac-p-count">
                      {conv.currentMembers !== undefined ? conv.currentMembers : (conv.participants || conv.users || []).length}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="mac-cell-status">
                    {filterType === 'assigned' ? (
                      <span className={`mac-badge ${formatExpiration(conv.expiresAt).className}`}>
                        {formatExpiration(conv.expiresAt).text}
                      </span>
                    ) : (
                      <span className={`mac-badge ${conv.isActive ? 'active' : 'inactive'}`}>
                        {conv.isActive ? 'Activa' : 'Cerrada'}
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <div className="mac-cell-date">
                    {formatDate(conv.createdAt)}
                  </div>

                  {/* Actions */}
                  <div className="mac-cell-actions">
                    <button className="mac-action-btn edit" onClick={() => handleEdit(conv)} title="Editar">
                      <FaEdit size={13} />
                    </button>
                    {canDelete && conv.isActive && (
                      <button className="mac-action-btn pause" onClick={() => handleDeactivate(conv)} title="Desactivar">
                        <FaPause size={11} />
                      </button>
                    )}
                    {canDelete && !conv.isActive && (
                      <button className="mac-action-btn play" onClick={() => handleActivate(conv)} title="Activar">
                        <FaPlay size={11} />
                      </button>
                    )}
                    {canDelete && (
                      <button className="mac-action-btn delete" onClick={() => handleDelete(conv)} title="Eliminar">
                        <FaTrash size={11} />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))
        )}
      </div>

      {/* ── Footer ── */}
      <div className="mac-footer">
        <span className="mac-page-info">Página {currentPage} de {totalPages}</span>

        {totalPages > 1 && (
          <div className="mac-pagination">
            <button className="mac-page-btn" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1}>
              <FaChevronLeft size={10} />
            </button>

            {[...Array(totalPages)].map((_, idx) => {
              const pageNum = idx + 1;
              if (
                totalPages <= 7 ||
                pageNum === 1 ||
                pageNum === totalPages ||
                (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
              ) {
                return (
                  <button
                    key={pageNum}
                    className={`mac-page-btn ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => goToPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              } else if (
                (pageNum === currentPage - 2 && pageNum > 1) ||
                (pageNum === currentPage + 2 && pageNum < totalPages)
              ) {
                return <span key={pageNum} className="mac-page-dots">...</span>;
              }
              return null;
            })}

            <button className="mac-page-btn" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages}>
              <FaChevronRight size={10} />
            </button>
          </div>
        )}

        <button className="mac-close-btn" onClick={onClose}>
          <FaTimes size={11} /> Cerrar
        </button>
      </div>
    </BaseModal>
  );
};

export default ManageAssignedConversationsModal;

