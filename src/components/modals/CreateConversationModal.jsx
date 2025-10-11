import React, { useState, useEffect, useMemo } from 'react';
import { FaTimes, FaUser, FaComments, FaInfoCircle, FaSearch } from 'react-icons/fa';
import './Modal.css';
import './CreateConversationModal.css';

const CreateConversationModal = ({
  isOpen,
  onClose,
  onCreateConversation,
  userList,
  currentUser
}) => {
  const [selectedUser1, setSelectedUser1] = useState('');
  const [selectedUser2, setSelectedUser2] = useState('');
  const [conversationName, setConversationName] = useState('');
  const [error, setError] = useState('');
  const [searchUser1, setSearchUser1] = useState('');
  const [searchUser2, setSearchUser2] = useState('');
  const [pageUser1, setPageUser1] = useState(1);
  const [pageUser2, setPageUser2] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Filtrar usuarios para excluir al usuario actual
  const availableUsers = useMemo(() => {
    return userList.filter(user => {
      const username = typeof user === 'string' ? user : user.username;
      return username !== currentUser?.username;
    });
  }, [userList, currentUser]);

  useEffect(() => {
    if (isOpen) {
      setSelectedUser1('');
      setSelectedUser2('');
      setConversationName('');
      setError('');
      setSearchUser1('');
      setSearchUser2('');
      setPageUser1(1);
      setPageUser2(1);
    }
  }, [isOpen]);

  // Generar nombre automático cuando se seleccionan ambos usuarios
  useEffect(() => {
    if (selectedUser1 && selectedUser2) {
      // Buscar los objetos de usuario completos
      const user1Obj = availableUsers.find(u => {
        const username = typeof u === 'string' ? u : u.username;
        return username === selectedUser1;
      });
      const user2Obj = availableUsers.find(u => {
        const username = typeof u === 'string' ? u : u.username;
        return username === selectedUser2;
      });

      // Función para obtener el nombre completo
      const getFullName = (userObj) => {
        if (typeof userObj === 'object' && userObj.nombre && userObj.apellido) {
          return `${userObj.nombre} ${userObj.apellido}`;
        }
        return typeof userObj === 'string' ? userObj : userObj?.username || '';
      };

      const name1 = getFullName(user1Obj);
      const name2 = getFullName(user2Obj);

      setConversationName(`${name1} ↔ ${name2}`);
    } else {
      // Limpiar el nombre si se deselecciona algún usuario
      setConversationName('');
    }
  }, [selectedUser1, selectedUser2, availableUsers]);

  // Filtrar usuarios para el primer select con búsqueda
  const filteredUsers1 = useMemo(() => {
    if (!searchUser1) return availableUsers;

    return availableUsers.filter(user => {
      const username = typeof user === 'string' ? user : user.username;
      const nombre = typeof user === 'object' ? user.nombre : '';
      const apellido = typeof user === 'object' ? user.apellido : '';
      const fullName = `${nombre} ${apellido}`.toLowerCase();
      const search = searchUser1.toLowerCase();

      return username.toLowerCase().includes(search) || fullName.includes(search);
    });
  }, [availableUsers, searchUser1]);

  // Filtrar usuarios para el segundo select con búsqueda
  const filteredUsers2 = useMemo(() => {
    const filtered = availableUsers.filter(user => {
      const username = typeof user === 'string' ? user : user.username;
      return username !== selectedUser1;
    });

    if (!searchUser2) return filtered;

    return filtered.filter(user => {
      const username = typeof user === 'string' ? user : user.username;
      const nombre = typeof user === 'object' ? user.nombre : '';
      const apellido = typeof user === 'object' ? user.apellido : '';
      const fullName = `${nombre} ${apellido}`.toLowerCase();
      const search = searchUser2.toLowerCase();

      return username.toLowerCase().includes(search) || fullName.includes(search);
    });
  }, [availableUsers, selectedUser1, searchUser2]);

  // Paginación para usuario 1
  const paginatedUsers1 = useMemo(() => {
    const startIndex = (pageUser1 - 1) * ITEMS_PER_PAGE;
    return filteredUsers1.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers1, pageUser1]);

  const totalPagesUser1 = Math.ceil(filteredUsers1.length / ITEMS_PER_PAGE);

  // Paginación para usuario 2
  const paginatedUsers2 = useMemo(() => {
    const startIndex = (pageUser2 - 1) * ITEMS_PER_PAGE;
    return filteredUsers2.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers2, pageUser2]);

  const totalPagesUser2 = Math.ceil(filteredUsers2.length / ITEMS_PER_PAGE);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!selectedUser1 || !selectedUser2) {
      setError('Debes seleccionar dos usuarios');
      return;
    }

    if (selectedUser1 === selectedUser2) {
      setError('Debes seleccionar dos usuarios diferentes');
      return;
    }

    onCreateConversation({
      user1: selectedUser1,
      user2: selectedUser2,
      name: conversationName
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="conversation-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="conversation-modal-header">
          <div className="flex items-center gap-3">
            <div className="icon-wrapper">
              <FaComments className="text-xl" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-white">Crear Conversación Individual</h2>
              <p className="text-sm text-gray-400 mt-1">Asigna una conversación entre dos usuarios</p>
            </div>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            type="button"
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="conversation-modal-body">
            {error && (
              <div className="error-banner">
                <FaInfoCircle className="text-lg" />
                <span>{error}</span>
              </div>
            )}

            {/* Usuario 1 */}
            <div className="user-selection-card">
              <div className="card-header">
                <FaUser className="text-emerald-400" />
                <h3 className="text-base font-medium text-white">Primer Usuario</h3>
              </div>

              <div className="card-body">
                {/* Búsqueda */}
                <div className="search-input-wrapper">
                  <FaSearch className="search-input-icon" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o usuario..."
                    value={searchUser1}
                    onChange={(e) => {
                      setSearchUser1(e.target.value);
                      setPageUser1(1);
                    }}
                    className="search-input"
                  />
                </div>

                {/* Lista de usuarios */}
                <div className="modal-users-list">
                  {paginatedUsers1.length === 0 ? (
                    <div className="modal-empty-state">
                      <p>No se encontraron usuarios</p>
                    </div>
                  ) : (
                    paginatedUsers1.map((user, index) => {
                      const username = typeof user === 'string' ? user : user.username;
                      const displayName = typeof user === 'object' && user.nombre && user.apellido
                        ? `${user.nombre} ${user.apellido}`
                        : username;
                      const isSelected = selectedUser1 === username;

                      return (
                        <div
                          key={index}
                          className={`modal-user-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedUser1(isSelected ? null : username)}
                        >
                          <div className="modal-user-avatar">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="modal-user-info">
                            <p className="modal-user-name">{displayName}</p>
                          </div>
                          {isSelected && (
                            <div className="modal-check-icon">✓</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Paginación */}
                {totalPagesUser1 > 1 && (
                  <div className="pagination-wrapper">
                    <button
                      type="button"
                      onClick={() => setPageUser1(prev => Math.max(1, prev - 1))}
                      disabled={pageUser1 === 1}
                      className="pagination-btn"
                    >
                      ← Anterior
                    </button>
                    <span className="pagination-info">
                      {pageUser1} / {totalPagesUser1}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPageUser1(prev => Math.min(totalPagesUser1, prev + 1))}
                      disabled={pageUser1 === totalPagesUser1}
                      className="pagination-btn"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Usuario 2 */}
            <div className="user-selection-card">
              <div className="card-header">
                <FaUser className="text-emerald-400" />
                <h3 className="text-base font-medium text-white">Segundo Usuario</h3>
              </div>

              <div className="card-body">
                {/* Búsqueda */}
                <div className="search-input-wrapper">
                  <FaSearch className="search-input-icon" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o usuario..."
                    value={searchUser2}
                    onChange={(e) => {
                      setSearchUser2(e.target.value);
                      setPageUser2(1);
                    }}
                    className="search-input"
                  />
                </div>

                {/* Lista de usuarios */}
                <div className="modal-users-list">
                  {paginatedUsers2.length === 0 ? (
                    <div className="modal-empty-state">
                      <p>No se encontraron usuarios</p>
                    </div>
                  ) : (
                    paginatedUsers2.map((user, index) => {
                      const username = typeof user === 'string' ? user : user.username;
                      const displayName = typeof user === 'object' && user.nombre && user.apellido
                        ? `${user.nombre} ${user.apellido}`
                        : username;
                      const isSelected = selectedUser2 === username;

                      return (
                        <div
                          key={index}
                          className={`modal-user-item ${isSelected ? 'selected' : ''}`}
                          onClick={() => setSelectedUser2(isSelected ? null : username)}
                        >
                          <div className="modal-user-avatar">
                            {displayName.charAt(0).toUpperCase()}
                          </div>
                          <div className="modal-user-info">
                            <p className="modal-user-name">{displayName}</p>
                          </div>
                          {isSelected && (
                            <div className="modal-check-icon">✓</div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Paginación */}
                {totalPagesUser2 > 1 && (
                  <div className="pagination-wrapper">
                    <button
                      type="button"
                      onClick={() => setPageUser2(prev => Math.max(1, prev - 1))}
                      disabled={pageUser2 === 1}
                      className="pagination-btn"
                    >
                      ← Anterior
                    </button>
                    <span className="pagination-info">
                      {pageUser2} / {totalPagesUser2}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPageUser2(prev => Math.min(totalPagesUser2, prev + 1))}
                      disabled={pageUser2 === totalPagesUser2}
                      className="pagination-btn"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Nombre de la conversación */}
            <div className="conversation-name-section">
              <label className="section-label">
                <FaComments className="text-emerald-400" />
                Nombre de la Conversación
              </label>
              <input
                type="text"
                value={conversationName}
                onChange={(e) => setConversationName(e.target.value)}
                placeholder="Se genera automáticamente..."
                className="conversation-name-input"
                required
              />
              <p className="input-hint">
                El nombre se genera automáticamente al seleccionar ambos usuarios
              </p>
            </div>

            {/* Info */}
            <div className="info-banner">
              <FaInfoCircle className="text-lg text-blue-400" />
              <div>
                <p className="font-medium text-white mb-1">Conversación Administrada</p>
                <p className="text-sm text-gray-400">
                  Los usuarios podrán chatear entre sí, pero solo el administrador puede eliminar la conversación.
                </p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="conversation-modal-footer">
            <button
              type="button"
              className="footer-btn cancel-btn"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="footer-btn create-btn"
              disabled={!selectedUser1 || !selectedUser2 || selectedUser1 === selectedUser2}
            >
              <FaComments />
              Crear Conversación
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateConversationModal;

