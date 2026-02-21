import React, { useState, useEffect, useRef } from 'react';
import { FaDoorOpen, FaEdit, FaSearch, FaChevronLeft, FaChevronRight, FaUsers, FaPause, FaPlay, FaTrash, FaTimes, FaSave } from 'react-icons/fa';
import BaseModal from './BaseModal';
import apiService from "../../../../apiService";
import { showSuccessAlert, showErrorAlert } from "../../../../sweetalert2";
import './ManageAssignedConversationsModal.css';
import './Modal.css';

const AdminRoomsModal = ({ isOpen, onClose, onDeleteRoom, onDeactivateRoom, onActivateRoom, onViewRoomUsers, currentUser }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 10;
  const searchTimeoutRef = useRef(null);

  // Inline edit state
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCapacity, setEditCapacity] = useState(50);

  const canDelete = ['ADMIN', 'SUPERADMIN', 'PROGRAMADOR'].includes(currentUser?.role);
  const canEdit = ['ADMIN', 'SUPERADMIN', 'PROGRAMADOR'].includes(currentUser?.role);

  const loadRooms = async (page = 1, search = '') => {
    setLoading(true);
    try {
      const response = await apiService.getAdminRooms(page, itemsPerPage, search);
      setRooms(response.data || []);
      setTotalRooms(response.total || 0);
      setTotalPages(response.totalPages || 0);
      setCurrentPage(response.page || 1);
    } catch (error) {
      console.error('Error al cargar salas:', error);
      setRooms([]);
      setTotalRooms(0);
      setTotalPages(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadRooms(1, '');
      setSearchTerm('');
      setEditingRoomId(null);
    }
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isOpen]);

  const handleSearchChange = (e) => {
    const newSearch = e.target.value;
    setSearchTerm(newSearch);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      loadRooms(1, newSearch);
    }, 500);
  };

  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      loadRooms(page, searchTerm);
    }
  };

  // Inline edit handlers
  const handleStartEdit = (room) => {
    setEditingRoomId(room.id);
    setEditName(room.name || '');
    setEditCapacity(room.maxCapacity || 50);
  };

  const handleCancelEdit = () => {
    setEditingRoomId(null);
    setEditName('');
    setEditCapacity(50);
  };

  const handleSaveEdit = async (roomId) => {
    try {
      await apiService.updateRoom(roomId, { name: editName, maxCapacity: editCapacity });
      await showSuccessAlert('Éxito', 'Sala actualizada correctamente');
      setEditingRoomId(null);
      loadRooms(currentPage, searchTerm);
    } catch (error) {
      console.error('Error al actualizar sala:', error);
      await showErrorAlert('Error', 'Error al actualizar: ' + error.message);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Mis Salas Creadas"
      icon={<FaDoorOpen />}
      headerBgColor="#A50104"
      bodyBgColor={document.documentElement.classList.contains('dark') ? '#111b21' : '#ffffff'}
      titleColor="#FFFFFF"
      maxWidth="960px"
    >
      {/* ── Toolbar ── */}
      <div className="mac-toolbar">
        <div className="mac-search-wrap">
          <FaSearch className="mac-search-icon" />
          <input
            type="text"
            className="mac-search-input"
            placeholder="Buscar por nombre o código de sala..."
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={loading}
          />
        </div>

        {searchTerm && (
          <button className="mac-clear-btn" onClick={() => { setSearchTerm(''); loadRooms(1, ''); }} title="Limpiar búsqueda">
            <FaTimes size={10} />
            Limpiar
          </button>
        )}

        {!loading && (
          <span className="mac-results-count">
            {totalRooms} {totalRooms === 1 ? 'sala' : 'salas'}
          </span>
        )}
      </div>

      {/* ── Table Header ── */}
      <div className="mac-list-header mac-grid-assigned">
        <div className="mac-header-cell">NOMBRE</div>
        <div className="mac-header-cell">CÓDIGO</div>
        <div className="mac-header-cell">MIEMBROS</div>
        <div className="mac-header-cell">ESTADO</div>
        <div className="mac-header-cell" style={{ justifyContent: 'flex-end', paddingRight: '15px' }}>ACCIONES</div>
      </div>

      {/* ── List ── */}
      <div className="mac-conversations-list">
        {loading ? (
          <div className="mac-loading-state">
            <div className="mac-spinner" />
            <p>Cargando salas...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="mac-empty-state">
            <FaDoorOpen size={36} />
            <p>{searchTerm ? `No se encontraron salas con "${searchTerm}"` : 'No has creado ninguna sala aún'}</p>
          </div>
        ) : (
          rooms.map((room) => (
            <div key={room.id} className="mac-row mac-grid-assigned">
              {editingRoomId === room.id ? (
                /* ── Inline Edit Mode ── */
                <div className="mac-edit-row">
                  <input
                    type="text"
                    className="mac-edit-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Nombre de la sala"
                    autoFocus
                    style={{ flex: '1 1 180px' }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                    <span style={{ color: '#8696a0', fontSize: '11px', whiteSpace: 'nowrap' }}>Cap. máx:</span>
                    <input
                      type="number"
                      className="mac-edit-input"
                      value={editCapacity}
                      onChange={(e) => setEditCapacity(parseInt(e.target.value) || 1)}
                      min="1"
                      max="500"
                      style={{ width: '70px', textAlign: 'center' }}
                    />
                  </div>
                  <div className="mac-edit-actions">
                    <button className="mac-edit-btn save" onClick={() => handleSaveEdit(room.id)}>
                      <FaSave size={12} /> Guardar
                    </button>
                    <button className="mac-edit-btn cancel" onClick={handleCancelEdit}>
                      <FaTimes size={11} /> Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Name and Description */}
                  <div className="mac-cell-name">
                    <div className="mac-name-text" title={room.name}>
                      {room.name}
                    </div>
                    {room.description && (
                      <div className="mac-desc-text" title={room.description}>{room.description}</div>
                    )}
                  </div>

                  {/* Room Code */}
                  <div className="mac-cell-date" style={{ fontFamily: 'monospace', fontSize: '12px', color: '#8696a0', letterSpacing: '0.5px' }}>
                    {room.roomCode}
                  </div>

                  {/* Participants */}
                  <div className="mac-cell-participants" onClick={() => onViewRoomUsers(room.roomCode, room.name)}>
                    <FaUsers className="mac-p-icon" />
                    <span className="mac-p-count">{room.currentMembers}/{room.maxCapacity}</span>
                  </div>

                  {/* Status */}
                  <div className="mac-cell-status">
                    <span className={`mac-badge ${room.isActive ? 'active' : 'inactive'}`}>
                      {room.isActive ? 'ACTIVA' : 'INACTIVA'}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="mac-cell-actions">
                    {canEdit && room.isActive && (
                      <button className="mac-action-btn edit" onClick={() => handleStartEdit(room)} title="Editar capacidad">
                        <FaEdit size={13} />
                      </button>
                    )}
                    {canDelete && room.isActive && (
                      <button className="mac-action-btn pause" onClick={() => onDeactivateRoom(room.id, room.name)} title="Desactivar sala">
                        <FaPause size={11} />
                      </button>
                    )}
                    {canDelete && !room.isActive && (
                      <button className="mac-action-btn play" onClick={() => onActivateRoom(room.id, room.name)} title="Activar sala">
                        <FaPlay size={11} />
                      </button>
                    )}
                    {canDelete && (
                      <button className="mac-action-btn delete" onClick={() => onDeleteRoom(room.id, room.name)} title="Eliminar sala">
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
        <span className="mac-page-info">
          {totalRooms > 0
            ? `Mostrando ${((currentPage - 1) * itemsPerPage) + 1}-${Math.min(currentPage * itemsPerPage, totalRooms)} de ${totalRooms}`
            : 'Sin resultados'
          }
        </span>

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

export default AdminRoomsModal;
