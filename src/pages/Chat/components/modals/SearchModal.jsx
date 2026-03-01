import React, { useState, useEffect } from 'react';
import BaseModal from './BaseModal';
import './SearchModal.css';
import apiService from '../../../../apiService';

const SearchModal = ({ isOpen, onClose, onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('general');
  const [recentSearches, setRecentSearches] = useState([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedResultId, setSelectedResultId] = useState(null);

  const user = apiService.getCurrentUser();

  const searchTypes = [
    { value: 'general', label: 'General', icon: '🔍' },
    { value: 'messages', label: 'Mensajes', icon: '💬' },
    { value: 'users', label: 'Usuarios', icon: '👤' },
    { value: 'groups', label: 'Grupos', icon: '👥' }
  ];

  // Cargar búsquedas recientes al abrir el modal
  useEffect(() => {
    if (isOpen && user?.username) {
      loadRecentSearches();
    }
  }, [isOpen, user?.username]);

  // Búsqueda en tiempo real con debounce
  useEffect(() => {
    if (!searchTerm.trim()) {
      setShowResults(false);
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 500); // Esperar 500ms después de que el usuario deje de escribir

    return () => clearTimeout(timer);
  }, [searchTerm, selectedType]);

  // Limpiar selección cuando se abre/cierra el modal
  useEffect(() => {
    if (!isOpen) {
      setSelectedResultId(null);
      setSearchTerm('');
      setShowResults(false);
      setSearchResults([]);
    }
  }, [isOpen]);

  const loadRecentSearches = async () => {
    try {
      setLoadingRecent(true);
      const searches = await apiService.getRecentSearches(user.username, 10);
      setRecentSearches(searches || []);
    } catch (error) {
      console.error('Error al cargar búsquedas recientes:', error);
      setRecentSearches([]);
    } finally {
      setLoadingRecent(false);
    }
  };

  const performSearch = async () => {
    if (!searchTerm.trim()) {
      setShowResults(false);
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      setShowResults(true);
      let allResults = [];

      // Buscar según el tipo seleccionado
      if (selectedType === 'general' || selectedType === 'messages') {
        try {
          const messagesResponse = await apiService.searchMessages(searchTerm, 1, 20);
          const messages = messagesResponse?.data || [];

          const messageResults = messages.map(msg => ({
            id: msg.id,
            type: 'message',
            from: msg.from || msg.username || 'Desconocido',
            to: msg.to || null,
            text: msg.text || msg.message || '',
            sentAt: msg.sentAt,
            roomCode: msg.roomCode || null,
            isGroup: !!msg.isGroup,
            conversationId: msg.conversationId || null,
            conversationName: msg.conversationName || null
          }));

          allResults = [...allResults, ...messageResults];
        } catch (error) {
          console.error('Error buscando mensajes:', error);
        }
      }

      if (selectedType === 'general' || selectedType === 'groups') {
        try {
          const roomsResponse = await apiService.searchRooms(searchTerm, 1, 20);
          const rooms = roomsResponse?.data || [];

          const roomResults = rooms.map(room => ({
            id: room.id,
            type: 'room',
            name: room.name,
            roomCode: room.roomCode,
            description: room.description || '',
            currentMembers: room.currentMembers
          }));

          allResults = [...allResults, ...roomResults];
        } catch (error) {
          console.error('Error buscando grupos:', error);
        }
      }

      if (selectedType === 'general' || selectedType === 'users') {
        try {
          const usersResponse = await apiService.searchUsersFromBackend(searchTerm, 0, 20);
          const users = Array.isArray(usersResponse) ? usersResponse : (usersResponse?.content || []);

          const userResults = users.map(u => ({
            id: u.id,
            type: 'user',
            username: u.username,
            nombre: u.nombre,
            apellido: u.apellido,
            role: u.role
          }));

          allResults = [...allResults, ...userResults];
        } catch (error) {
          console.error('Error buscando usuarios:', error);
        }
      }

      setSearchResults(allResults);

      // Guardar en historial si hay resultados
      if (allResults.length > 0 && user?.username) {
        try {
          await apiService.saveRecentSearch(user.username, searchTerm, selectedType);
        } catch (error) {
          console.error('Error guardando búsqueda:', error);
        }
      }
    } catch (error) {
      console.error('Error en búsqueda:', error);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Seleccionar un resultado
  const handleSelectResult = (result) => {
    // Marcar como seleccionado para resaltarlo
    setSelectedResultId(`${result.type}-${result.id}`);

    // Ejecutar callback con el resultado seleccionado
    if (onSearch) {
      onSearch(searchTerm, selectedType, result);
    }

    //  Cerrar modal después de seleccionar
    setTimeout(() => {
      onClose();
    }, 100); // Pequeño delay para que se vea el resaltado antes de cerrar
  };

  // Seleccionar una búsqueda reciente
  const handleSelectRecentSearch = (search) => {
    setSearchTerm(search.searchTerm);
    setSelectedType(search.searchType || 'general');
  };

  // Eliminar una búsqueda reciente
  const handleDeleteRecentSearch = async (searchId, e) => {
    e.stopPropagation();
    try {
      await apiService.deleteRecentSearch(user.username, searchId);
      setRecentSearches(prev => prev.filter(s => s.id !== searchId));
    } catch (error) {
      console.error('Error eliminando búsqueda:', error);
    }
  };

  // Limpiar todas las búsquedas recientes
  const handleClearAllRecent = async () => {
    try {
      await apiService.clearRecentSearches(user.username);
      setRecentSearches([]);
    } catch (error) {
      console.error('Error limpiando búsquedas:', error);
    }
  };

  const getTypeIcon = (type) => {
    const typeObj = searchTypes.find(t => t.value === type);
    return typeObj?.icon || '🔍';
  };

  const getResultIcon = (type) => {
    switch (type) {
      case 'message': return '💬';
      case 'room': return '👥';
      case 'user': return '👤';
      default: return '🔍';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';

    const date = new Date(dateString);

    // Validar si la fecha es válida
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Ahora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
  };

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title="Búsqueda Avanzada" maxWidth="600px">
      <div className="search-modal-content">
        {/* Barra de búsqueda */}
        <div className="search-input-container">
          <div className="search-input-wrapper">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Buscar mensajes, usuarios, grupos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              autoFocus
            />
            {searchTerm && (
              <button
                className="clear-search-btn"
                onClick={() => {
                  setSearchTerm('');
                  setShowResults(false);
                  setSearchResults([]);
                }}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Filtros de tipo */}
        <div className="search-types">
          {searchTypes.map(type => (
            <button
              key={type.value}
              className={`search-type-btn ${selectedType === type.value ? 'active' : ''}`}
              onClick={() => setSelectedType(type.value)}
            >
              <span className="type-icon">{type.icon}</span>
              <span className="type-label">{type.label}</span>
            </button>
          ))}
        </div>

        {/* Resultados de búsqueda */}
        {showResults && (
          <div className="search-results-section">
            <div className="search-results-header">
              <h3>Resultados</h3>
              {searching && <div className="search-spinner"></div>}
            </div>

            {searching ? (
              <div className="search-loading">
                <div className="search-spinner"></div>
                <p>Buscando...</p>
              </div>
            ) : searchResults.length === 0 ? (
              <div className="no-results">
                <span className="no-results-icon">🔍</span>
                <p>No se encontraron resultados</p>
                <span className="no-results-hint">Intenta con otros términos</span>
              </div>
            ) : (
              <div className="search-results-list">
                {searchResults.map(result => {
                  const resultId = `${result.type}-${result.id}`;
                  const isSelected = selectedResultId === resultId;

                  return (
                    <div
                      key={resultId}
                      className={`search-result-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => handleSelectResult(result)}
                    >
                      <div className="search-result-icon">
                        {getResultIcon(result.type)}
                      </div>
                      <div className="search-result-content">
                        <div className="search-result-title">
                          {result.type === 'message' && result.from}
                          {result.type === 'room' && result.name}
                          {result.type === 'user' && `${result.nombre || ''} ${result.apellido || ''}`.trim() || result.username}
                        </div>
                        <div className="search-result-subtitle">
                          {result.type === 'message' && result.text}
                          {result.type === 'room' && (result.description || `${result.currentMembers || 0} miembros`)}
                          {result.type === 'user' && `@${result.username} • ${result.role || 'Usuario'}`}
                        </div>
                      </div>
                      {result.sentAt && (
                        <div className="search-result-time">
                          {formatDate(result.sentAt)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Búsquedas recientes */}
        {!showResults && (
          <div className="recent-searches-section">
            <div className="recent-searches-header">
              <h3>Búsquedas Recientes</h3>
              {recentSearches.length > 0 && (
                <button className="clear-all-btn" onClick={handleClearAllRecent}>
                  Limpiar todo
                </button>
              )}
            </div>

            {loadingRecent ? (
              <div className="recent-loading">
                <div className="search-spinner"></div>
                <p>Cargando...</p>
              </div>
            ) : recentSearches.length === 0 ? (
              <div className="no-recent">
                <span className="no-recent-icon">🕐</span>
                <p>No hay búsquedas recientes</p>
              </div>
            ) : (
              <div className="recent-searches-list">
                {recentSearches.map(search => (
                  <div
                    key={search.id}
                    className="recent-search-item"
                    onClick={() => handleSelectRecentSearch(search)}
                  >
                    <div className="recent-search-icon">
                      {getTypeIcon(search.searchType)}
                    </div>
                    <div className="recent-search-content">
                      <div className="recent-search-term">{search.searchTerm}</div>
                      <div className="recent-search-time">{formatDate(search.searchedAt)}</div>
                    </div>
                    <button
                      className="delete-recent-btn"
                      onClick={(e) => handleDeleteRecentSearch(search.id, e)}
                      title="Eliminar"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default SearchModal;


