// Servicio para conectar con la API (mismo host para CRM y Chat por ahora)
// Temporalmente hardcodeadas hasta resolver el problema con .env
 const API_BASE_URL = "https://apisozarusac.com/BackendJava/";
// const API_BASECHAT_URL = "http://localhost:8747/";
 const API_BASECHAT_URL = "https://apisozarusac.com/BackendChat/";

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.baseChatUrl = API_BASECHAT_URL;

    // Debug: mostrar las URLs que se están usando (comentado para evitar logs duplicados)
    // console.log("API_BASE_URL:", this.baseUrl);
    // console.log("API_BASECHAT_URL:", this.baseChatUrl);
  }

  // Método para subir archivos al servidor
  async uploadFile(file, category = 'chat') {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('category', category);

      const token = localStorage.getItem('token');

      // Para FormData, no podemos usar fetchWithAuth directamente porque necesita headers especiales
      // Pero podemos manejar el refresh manualmente
      let response = await fetch(`${this.baseUrl}api/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      // Si falla con 401 o 403, intentar renovar token
      if (response.status === 401 || response.status === 403) {
        try {
          const newToken = await this.refreshToken();

          // Reintentar con el nuevo token
          response = await fetch(`${this.baseUrl}api/files/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${newToken}`,
            },
            body: formData,
          });
        } catch (refreshError) {
          console.error('❌ Error al renovar token para subir archivo:', refreshError);
          this.logout();
          window.location.href = '/';
          throw new Error('Sesión expirada');
        }
      }

      if (!response.ok) {
        throw new Error('Error al subir archivo');
      }

      const data = await response.json();
      return {
        fileUrl: data.fileUrl,
        fileName: data.fileName,
        fileSize: data.size,
      };
    } catch (error) {
      console.error('❌ Error al subir archivo:', error);
      throw error;
    }
  }

  // Método para hacer login usando la API de Angular
  async login(credentials) {
    try {
      const response = await fetch(
        `${this.baseUrl}api/authentication/sign-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(credentials),
        }
      );

      const data = await response.json();

      if (data.rpta !== 1) {
        throw new Error(data.message || "Error en el login");
      }

      // Estructura de datos que devuelve tu API
      const user = {
        id: data.data.userId,
        username: data.data.username,
        nombre: data.data.nombre,
        apellido: data.data.apellido,
        role: data.data.role,
        token: data.data.token,
        sede: data.data.sede,
        sede_id: data.data.sede_id,
        picture: data.data.picture,
        email: data.data.email,
        tipoTrabajo: data.data.tipoTrabajo,
        numeroAgente: data.data.numeroAgente,
      };

      // Guardar en localStorage como lo hace Angular
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(user));

      return {
        success: true,
        user: user,
        message: "Login exitoso",
      };
    } catch (error) {
      console.error("Error en login:", error);
      return {
        success: false,
        error: error.message,
        message: "Error al iniciar sesión",
      };
    }
  }

  // Método para obtener el usuario actual del localStorage
  getCurrentUser() {
    try {
      const userStr = localStorage.getItem("user");
      return userStr ? JSON.parse(userStr) : null;
    } catch (error) {
      console.error("Error al obtener usuario actual:", error);
      return null;
    }
  }

  // Método para cerrar sesión
  logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }

  // Método para verificar si hay un token válido
  isAuthenticated() {
    const token = localStorage.getItem("token");
    const user = this.getCurrentUser();
    return !!(token && user);
  }

  // Variable para evitar múltiples intentos de refresh simultáneos
  _refreshPromise = null;

  // Método para renovar el token
  async refreshToken() {
    // Si ya hay un refresh en progreso, esperar a que termine
    if (this._refreshPromise) {
      return this._refreshPromise;
    }

    this._refreshPromise = (async () => {
      try {
        const currentToken = localStorage.getItem("token");
        if (!currentToken) {
          throw new Error('No hay token para renovar');
        }

        // Intentar renovar con el endpoint del backend de Java
        const refreshResp = await fetch(
          `${this.baseUrl}api/authentication/refresh-token`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${currentToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!refreshResp.ok) {
          throw new Error(`Error ${refreshResp.status} al renovar token`);
        }

        const refreshData = await refreshResp.json();

        if (refreshData?.rpta === 1 && refreshData?.data?.token) {
          const newToken = refreshData.data.token;

          // Actualizar token en localStorage
          localStorage.setItem("token", newToken);

          // Actualizar usuario si viene información adicional
          if (refreshData.data.user || refreshData.data.userId) {
            const existingUserStr = localStorage.getItem("user");
            const existingUser = existingUserStr ? JSON.parse(existingUserStr) : {};

            const updatedUser = {
              ...existingUser,
              token: newToken,
              id: refreshData.data.userId || existingUser.id,
              username: refreshData.data.username || existingUser.username,
              nombre: refreshData.data.nombre || existingUser.nombre,
              apellido: refreshData.data.apellido || existingUser.apellido,
              role: refreshData.data.role || existingUser.role,
              email: refreshData.data.email || existingUser.email,
              numeroAgente: refreshData.data.numeroAgente !== undefined ? refreshData.data.numeroAgente : existingUser.numeroAgente,
            };

            localStorage.setItem("user", JSON.stringify(updatedUser));
          }

          return newToken;
        } else {
          throw new Error('Respuesta de refresh token inválida');
        }
      } catch (error) {
        console.error('❌ Error al renovar token:', error);
        throw error;
      } finally {
        // Limpiar la promesa después de 1 segundo
        setTimeout(() => {
          this._refreshPromise = null;
        }, 1000);
      }
    })();

    return this._refreshPromise;
  }

  // Helper: fetch con Authorization y reintento usando refresh-token (estilo interceptor)
  async fetchWithAuth(endpoint, options = {}) {
    const token = localStorage.getItem("token");
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
      Authorization:
        options?.headers?.Authorization ||
        (token ? `Bearer ${token}` : undefined),
    };

    const doRequest = async (authHeaders) => {
      return await fetch(endpoint, {
        ...(options || {}),
        headers: authHeaders,
      });
    };

    let response = await doRequest(headers);

    // ✅ Renovar token automáticamente en caso de 401 o 403
    if (response.status === 401 || response.status === 403) {
      try {
        // Intentar renovar el token
        const newToken = await this.refreshToken();

        // Reintentar la petición original con el nuevo token
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        };

        response = await doRequest(retryHeaders);

        // Si aún falla después del refresh, cerrar sesión
        if (response.status === 401 || response.status === 403) {
          this.logout();
          window.location.href = '/';
        }
      } catch (error) {
        console.error('❌ Error al renovar token:', error);
        // Si falla el refresh, limpiar sesión
        this.logout();
        window.location.href = '/';
      }
    }

    return response;
  }

  // Método para crear conversación temporal
  async createTemporaryConversation(data) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-conversations`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al crear conversación temporal:", error);
      throw error;
    }
  }

  // Método para crear sala temporal
  async createTemporaryRoom(data) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Error del servidor: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al crear sala temporal:", error);
      throw error;
    }
  }

  // Método para unirse a sala
  async joinRoom(data) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/join`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al unirse a sala:", error);
      throw error;
    }
  }

  // Método para obtener información de sala por código
  async getRoomByCode(roomCode) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/code/${roomCode}`,
        {
          method: "GET",
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al obtener información de sala:", error);
      throw error;
    }
  }

  async getAdminRooms() {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/admin/rooms`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al obtener salas del admin:", error);
      throw error;
    }
  }

  async deleteRoom(roomId) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/${roomId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Error del servidor: ${response.status} - ${errorText}`
        );
      }

      return true;
    } catch (error) {
      console.error("Error al eliminar sala:", error);
      throw error;
    }
  }

  async deactivateRoom(roomId) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/${roomId}/deactivate`,
        {
          method: "PATCH",
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al desactivar sala:", error);
      throw error;
    }
  }

  async activateRoom(roomId) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/${roomId}/activate`,
        {
          method: "PATCH",
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al activar sala:", error);
      throw error;
    }
  }

  // Método para obtener configuración del sistema
  async getSystemConfig() {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/system-config`,
        {
          method: "GET",
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al obtener configuración:", error);
      throw error;
    }
  }

  // Método para actualizar configuración del sistema
  async updateSystemConfig(key, data) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/system-config/${key}`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al actualizar configuración:", error);
      throw error;
    }
  }

  // Método para obtener la sala actual del usuario
  async getCurrentUserRoom() {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/user/current-room`,
        {
          method: "GET",
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al obtener sala actual del usuario:", error);
      throw error;
    }
  }

  // Método para obtener usuarios de una sala
  async getRoomUsers(roomCode) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/${roomCode}/users`,
        {
          method: "GET",
        }
      );

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al obtener usuarios de la sala:", error);
      throw error;
    }
  }

  // Método para actualizar la capacidad de una sala
  async updateRoom(roomId, updateData) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/${roomId}/update`,
        {
          method: "PATCH",
          body: JSON.stringify(updateData),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Error del servidor: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al actualizar sala:", error);
      throw error;
    }
  }

  // Crear un mensaje
  async createMessage(messageData) {
    try {
      const response = await fetch(`${API_BASECHAT_URL}api/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(messageData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Error del servidor: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al crear mensaje:", error);
      throw error;
    }
  }

  // Obtener mensajes entre usuarios
  async getUserMessages(from, to, limit = 50, offset = 0) {
    try {
      // ✅ Usar fetchWithAuth para renovación automática de token
      const response = await this.fetchWithAuth(
        `${API_BASECHAT_URL}api/messages/user/${from}/${to}?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Error del servidor: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al obtener mensajes entre usuarios:", error);
      throw error;
    }
  }

  // Obtener mensajes de una sala
  async getRoomMessages(roomCode, limit = 50, offset = 0) {
    try {

      const response = await fetch(
        `${API_BASECHAT_URL}api/messages/room/${roomCode}?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Error del servidor: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        );
      }

      const result = await response.json();

      return result;
    } catch (error) {
      console.error("Error al obtener mensajes de la sala:", error);
      throw error;
    }
  }

  // Editar un mensaje
  async editMessage(messageId, username, newText) {
    try {
      const response = await fetch(`${API_BASECHAT_URL}api/messages/${messageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, message: newText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Error del servidor: ${response.status} - ${JSON.stringify(
            errorData
          )}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al editar mensaje:", error);
      throw error;
    }
  }

  // Crear conversación asignada por admin
  async createAdminAssignedConversation(user1, user2, name) {
    try {
      // Obtener información del usuario actual
      const currentUser = this.getCurrentUser();
      if (!currentUser) {
        throw new Error("Usuario no autenticado");
      }

      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-conversations/admin-assign`,
        {
          method: "POST",
          body: JSON.stringify({
            user1,
            user2,
            name,
            adminId: currentUser.id,
            adminRole: currentUser.role,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al crear conversación asignada:", error);
      throw error;
    }
  }

  // Obtener conversaciones asignadas al usuario actual
  async getMyAssignedConversations() {
    try {
      // Obtener el usuario actual
      const user = this.getCurrentUser();

      if (!user) {
        return [];
      }

      // Usar el nombre completo si está disponible, sino usar username
      const displayName = user.nombre && user.apellido
        ? `${user.nombre} ${user.apellido}`
        : (user.username || user.email);

      // ✅ Usar fetchWithAuth para renovación automática de token
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-conversations/my-conversations?username=${encodeURIComponent(displayName)}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al obtener conversaciones asignadas:", error);
      return []; // Retornar array vacío en caso de error
    }
  }

  // Obtener TODAS las conversaciones asignadas (solo para admin)
  async getAllAssignedConversations() {
    try {
      // ✅ Usar fetchWithAuth para renovación automática de token
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-conversations/all`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al obtener todas las conversaciones:", error);
      throw error;
    }
  }

  // Actualizar una conversación asignada
  async updateAssignedConversation(conversationId, data) {
    try {
      // ✅ Usar fetchWithAuth para renovación automática de token
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-conversations/${conversationId}`,
        {
          method: "PUT",
          body: JSON.stringify(data),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al actualizar conversación:", error);
      throw error;
    }
  }

  // Eliminar una conversación asignada
  async deleteAssignedConversation(conversationId) {
    try {
      // ✅ Usar fetchWithAuth para renovación automática de token
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-conversations/${conversationId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      // Verificar si hay contenido en la respuesta antes de parsear JSON
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const result = await response.json();
        return result;
      }

      // Si no hay contenido JSON, retornar true indicando éxito
      return { success: true };
    } catch (error) {
      console.error("Error al eliminar conversación:", error);
      throw error;
    }
  }

  // Desactivar una conversación asignada
  async deactivateAssignedConversation(conversationId) {
    try {
      const user = this.getCurrentUser();
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-conversations/${conversationId}/deactivate`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userRole: user?.role || 'ASESOR'
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al desactivar conversación:", error);
      throw error;
    }
  }

  // Activar una conversación asignada
  async activateAssignedConversation(conversationId) {
    try {
      const user = this.getCurrentUser();
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-conversations/${conversationId}/activate`,
        {
          method: "PATCH",
          body: JSON.stringify({
            userRole: user?.role || 'ASESOR'
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al activar conversación:", error);
      throw error;
    }
  }

  // Buscar mensajes por contenido
  async searchMessages(username, searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
      }

      const response = await fetch(
        `${this.baseChatUrl}api/messages/search/${encodeURIComponent(username)}?q=${encodeURIComponent(searchTerm)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al buscar mensajes:", error);
      return [];
    }
  }

  // Marcar un mensaje como leído
  async markMessageAsRead(messageId, username) {
    try {
      const response = await fetch(
        `${this.baseChatUrl}api/messages/${messageId}/read`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al marcar mensaje como leído:", error);
      throw error;
    }
  }

  // Marcar múltiples mensajes como leídos
  async markMultipleMessagesAsRead(messageIds, username) {
    try {
      const response = await fetch(
        `${this.baseChatUrl}api/messages/mark-read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ messageIds, username }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al marcar mensajes como leídos:", error);
      throw error;
    }
  }

  // Marcar toda una conversación como leída
  async markConversationAsRead(from, to) {
    try {
      const response = await fetch(
        `${this.baseChatUrl}api/messages/mark-conversation-read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from, to }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al marcar conversación como leída:", error);
      throw error;
    }
  }

  // ===== MÉTODOS PARA OBTENER USUARIOS DEL BACKEND JAVA =====

  // Obtener lista de usuarios del backend Java con paginación
  async getUsersFromBackend(page = 0, size = 10) {
    try {
      // ✅ Usar fetchWithAuth para renovación automática de token
      const response = await this.fetchWithAuth(
        `${this.baseUrl}api/user/listar?page=${page}&size=${size}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Error del servidor al obtener usuarios:", errorData);
        throw new Error(
          errorData.msg || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();

      // Validar que la respuesta sea exitosa (rpta === 1)
      if (result.rpta !== 1) {
        console.warn("Respuesta no exitosa del servidor:", result.msg);
        return [];
      }

      // Retornar solo los usuarios del data, filtrando usuarios válidos
      const users = result.data?.users || [];
      return users.filter(user => user && user.username); // Filtrar usuarios inválidos
    } catch (error) {
      console.error("Error al obtener usuarios del backend:", error);
      return [];
    }
  }

  // Buscar usuarios en el backend Java
  async searchUsersFromBackend(query, page = 0, size = 10) {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      // ✅ Usar fetchWithAuth para renovación automática de token
      const response = await this.fetchWithAuth(
        `${this.baseUrl}api/user/buscar?page=${page}&size=${size}&query=${encodeURIComponent(query)}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.msg || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      // Retornar solo los usuarios del data
      return result.data?.users || [];
    } catch (error) {
      console.error("Error al buscar usuarios en backend:", error);
      return [];
    }
  }
}

export default new ApiService();
