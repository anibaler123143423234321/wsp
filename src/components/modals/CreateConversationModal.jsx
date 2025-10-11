import React, { useState, useEffect } from 'react';
import { FaTimes, FaUser, FaComments, FaInfoCircle } from 'react-icons/fa';
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

  // Filtrar usuarios para excluir al usuario actual
  const availableUsers = userList.filter(user => {
    const username = typeof user === 'string' ? user : user.username;
    return username !== currentUser?.username;
  });

  useEffect(() => {
    if (isOpen) {
      setSelectedUser1('');
      setSelectedUser2('');
      setConversationName('');
      setError('');
    }
  }, [isOpen]);

  // Generar nombre automático cuando se seleccionan ambos usuarios
  useEffect(() => {
    if (selectedUser1 && selectedUser2) {
      // Función para extraer solo los primeros nombres
      const getShortName = (fullName) => {
        const parts = fullName.split(' ');
        // Si tiene más de 2 palabras, tomar las primeras 2 (nombre + segundo nombre)
        return parts.length > 2 ? `${parts[0]} ${parts[1]}` : parts[0];
      };

      const shortName1 = getShortName(selectedUser1);
      const shortName2 = getShortName(selectedUser2);

      setConversationName(`${shortName1} ↔ ${shortName2}`);
    }
  }, [selectedUser1, selectedUser2]);

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
      <div className="modal-content create-conversation-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>
            <FaComments className="header-icon" />
            Crear Conversación Individual
          </h2>
          <button className="modal-close" onClick={onClose}>
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-alert">
                <FaInfoCircle />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group-modern">
              <label htmlFor="user1">
                <FaUser className="label-icon" />
                Primer Usuario
              </label>
              <div className="select-wrapper">
                <select
                  id="user1"
                  value={typeof selectedUser1 === 'string' ? selectedUser1 : selectedUser1?.username || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedUser1(value);
                  }}
                  required
                  className="form-select-modern"
                >
                  <option value="">Selecciona un usuario</option>
                  {availableUsers.map((user, index) => {
                    const username = typeof user === 'string' ? user : user.username;
                    const displayName = typeof user === 'object' && user.nombre && user.apellido
                      ? `${user.nombre} ${user.apellido} (${username})`
                      : username;

                    return (
                      <option key={index} value={username}>
                        {displayName}
                      </option>
                    );
                  })}
                </select>
              </div>
            </div>

            <div className="form-group-modern">
              <label htmlFor="user2">
                <FaUser className="label-icon" />
                Segundo Usuario
              </label>
              <div className="select-wrapper">
                <select
                  id="user2"
                  value={typeof selectedUser2 === 'string' ? selectedUser2 : selectedUser2?.username || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    setSelectedUser2(value);
                  }}
                  required
                  className="form-select-modern"
                >
                  <option value="">Selecciona un usuario</option>
                  {availableUsers
                    .filter(user => {
                      const username = typeof user === 'string' ? user : user.username;
                      return username !== selectedUser1;
                    })
                    .map((user, index) => {
                      const username = typeof user === 'string' ? user : user.username;
                      const displayName = typeof user === 'object' && user.nombre && user.apellido
                        ? `${user.nombre} ${user.apellido} (${username})`
                        : username;

                      return (
                        <option key={index} value={username}>
                          {displayName}
                        </option>
                      );
                    })}
                </select>
              </div>
            </div>

            <div className="form-group-modern">
              <label htmlFor="conversationName">
                <FaComments className="label-icon" />
                Nombre de la Conversación
              </label>
              <input
                type="text"
                id="conversationName"
                value={conversationName}
                onChange={(e) => setConversationName(e.target.value)}
                placeholder="Ej: Juan Carlos ↔ María Elena"
                className="form-input-modern"
                required
              />
              <small className="form-hint-modern">
                Se genera automáticamente al seleccionar los usuarios
              </small>
            </div>

            <div className="info-box-modern">
              <FaInfoCircle className="info-icon" />
              <div className="info-content">
                <strong>Nota:</strong> Esta conversación será asignada por el administrador.
                Los usuarios seleccionados podrán chatear entre sí pero no podrán eliminar
                la conversación ni los mensajes.
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-cancel-modern"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-create-modern"
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

