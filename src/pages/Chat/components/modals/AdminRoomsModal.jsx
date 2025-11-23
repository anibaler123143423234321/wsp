import React, { useState, useEffect, useRef } from 'react';
import { FaDoorOpen, FaEdit, FaSearch, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import BaseModal from './BaseModal';
import apiService from "../../../../apiService";
import './Modal.css';

const AdminRoomsModal = ({ isOpen, onClose, onDeleteRoom, onDeactivateRoom, onActivateRoom, onViewRoomUsers, onEditRoom, currentUser }) => {
  // Estados para búsqueda y paginación
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rooms, setRooms] = useState([]);
  const [totalRooms, setTotalRooms] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const itemsPerPage = 5;
  const searchTimeoutRef = useRef(null);

  // Verificar si el usuario puede eliminar (solo ADMIN)
  const canDelete = currentUser?.role === 'ADMIN';
  const canEdit = currentUser?.role === 'ADMIN' || currentUser?.role === 'JEFEPISO';

  // Cargar salas desde el backend
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

  // Cargar salas cuando se abre el modal
  useEffect(() => {
    if (isOpen) {
      loadRooms(1, '');
      setSearchTerm('');
    }

    // Limpiar timeout al cerrar el modal
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [isOpen]);

  // Resetear a página 1 cuando cambia la búsqueda (con debounce)
  const handleSearchChange = (e) => {
    const newSearch = e.target.value;
    setSearchTerm(newSearch);

    // Limpiar timeout anterior
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Esperar 500ms después de que el usuario deje de escribir
    searchTimeoutRef.current = setTimeout(() => {
      loadRooms(1, newSearch);
    }, 500);
  };

  // Navegación de páginas
  const goToPage = (page) => {
    if (page >= 1 && page <= totalPages) {
      loadRooms(page, searchTerm);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Mis Salas Creadas"
      icon={<FaDoorOpen />}
      headerBgColor="#A50104"
      bodyBgColor="#FFFFFF"
      titleColor="#FFFFFF"
      maxWidth="900px"
    >
      {/* Buscador */}
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
            placeholder="Buscar por nombre o código de sala..."
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={loading}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck="false"
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
        {searchTerm && !loading && (
          <div style={{
            marginTop: '8px',
            fontSize: '13px',
            color: '#666666'
          }}>
            {totalRooms} {totalRooms === 1 ? 'sala encontrada' : 'salas encontradas'}
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div style={{
          padding: '60px 20px',
          textAlign: 'center',
          color: '#666666'
        }}>
          <div className="spinner" style={{
            margin: '0 auto 15px',
            width: '40px',
            height: '40px',
            border: '4px solid #f3f3f3',
            borderTop: '4px solid #A50104',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <p>Cargando salas...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="no-rooms" style={{ padding: '40px 20px' }}>
          <div className="no-rooms-icon">{searchTerm ? '🔍' : '🏠'}</div>
          <div className="no-rooms-text" style={{ color: '#666666' }}>
            {searchTerm
              ? `No se encontraron salas con "${searchTerm}"`
              : 'No has creado ninguna sala aún'
            }
          </div>
        </div>
      ) : (
        <>
          {/* Lista de salas */}
          <div className="rooms-list">
            {rooms.map((room) => (
              <div key={room.id} className="room-item" style={{ backgroundColor: '#f5f5f5', border: '1px solid #e0e0e0' }}>
                <div className="room-info">
                  <div className="room-name" style={{ color: '#000000' }}>{room.name}</div>
                  <div className="room-details">
                    <span className="room-code" style={{ backgroundColor: '#e0e0e0', color: '#000000' }}>Código: {room.roomCode}</span>
                    <span className="room-capacity" style={{ color: 'ff453a' }}>Capacidad: {room.currentMembers}/{room.maxCapacity}</span>
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
                  {canDelete && !room.isActive && (
                    <button
                      className="btn btn-success"
                      onClick={() => onActivateRoom(room.id, room.name)}
                      title="Activar sala"
                    >
                      ▶️
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

          {/* Paginación */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '10px',
              padding: '20px',
              borderTop: '1px solid #e0e0e0',
              marginTop: '20px'
            }}>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d7db',
                  borderRadius: '6px',
                  backgroundColor: currentPage === 1 ? '#f5f5f5' : '#FFFFFF',
                  color: currentPage === 1 ? '#999999' : '#000000',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.backgroundColor = '#f5f5f5';
                    e.target.style.borderColor = '#A50104';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== 1) {
                    e.target.style.backgroundColor = '#FFFFFF';
                    e.target.style.borderColor = '#d1d7db';
                  }
                }}
              >
                <FaChevronLeft size={12} />
                Anterior
              </button>

              <div style={{
                display: 'flex',
                gap: '5px',
                alignItems: 'center'
              }}>
                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  const isCurrentPage = pageNum === currentPage;

                  return (
                    <button
                      key={pageNum}
                      onClick={() => goToPage(pageNum)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid',
                        borderColor: isCurrentPage ? '#A50104' : '#d1d7db',
                        borderRadius: '6px',
                        backgroundColor: isCurrentPage ? '#A50104' : '#FFFFFF',
                        color: isCurrentPage ? '#FFFFFF' : '#000000',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: isCurrentPage ? 'bold' : 'normal',
                        minWidth: '40px',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        if (!isCurrentPage) {
                          e.target.style.backgroundColor = '#f5f5f5';
                          e.target.style.borderColor = '#A50104';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isCurrentPage) {
                          e.target.style.backgroundColor = '#FFFFFF';
                          e.target.style.borderColor = '#d1d7db';
                        }
                      }}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #d1d7db',
                  borderRadius: '6px',
                  backgroundColor: currentPage === totalPages ? '#f5f5f5' : '#FFFFFF',
                  color: currentPage === totalPages ? '#999999' : '#000000',
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  fontSize: '14px',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.backgroundColor = '#f5f5f5';
                    e.target.style.borderColor = '#A50104';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== totalPages) {
                    e.target.style.backgroundColor = '#FFFFFF';
                    e.target.style.borderColor = '#d1d7db';
                  }
                }}
              >
                Siguiente
                <FaChevronRight size={12} />
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
            Mostrando {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, totalRooms)} de {totalRooms} {totalRooms === 1 ? 'sala' : 'salas'}
          </div>
        </>
      )}
    </BaseModal>
  );
};

export default AdminRoomsModal;
