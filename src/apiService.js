// Servicio para conectar con la API (mismo host para CRM y Chat por ahora)
// Temporalmente hardcodeadas hasta resolver el problema con .env
 const API_BASE_URL = "https://apisozarusac.com/BackendJava/";
 const API_BASECHAT_URL = "http://localhost:8747/";
// const API_BASECHAT_URL = "https://apisozarusac.com/BackendChat/";

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
      const response = await fetch(`${this.baseUrl}api/files/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

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

    // Temporalmente deshabilitado el refresh token para el backend de chat
    // if (response.status === 401) {
    //   // Intentar refrescar token como en Angular (GET refresh-token)
    //   try {
    //     const currentToken = localStorage.getItem("token");
    //     const refreshResp = await fetch(
    //       `${this.baseUrl}api/authentication/refresh-token`,
    //       {
    //         method: "GET",
    //         headers: {
    //           Authorization: currentToken
    //             ? `Bearer ${currentToken}`
    //             : undefined,
    //         },
    //       }
    //     );

    //     if (refreshResp.ok) {
    //       const refreshData = await refreshResp.json();
    //       if (
    //         refreshData?.rpta === 1 &&
    //         (refreshData?.data?.token || refreshData?.token)
    //       ) {
    //         const newToken = refreshData?.data?.token || refreshData?.token;
    //         // actualizar token y user si viene
    //         localStorage.setItem("token", newToken);
    //         if (refreshData?.data) {
    //           const existingUserStr = localStorage.getItem("user");
    //           const existingUser = existingUserStr
    //             ? JSON.parse(existingUserStr)
    //             : {};
    //           const mergedUser = { ...existingUser, ...refreshData.data };
    //           localStorage.setItem("user", JSON.stringify(mergedUser));
    //         }
    //         // reintentar la petición original con el nuevo token
    //         const retryHeaders = {
    //           ...headers,
    //           Authorization: `Bearer ${newToken}`,
    //         };
    //         response = await doRequest(retryHeaders);
    //       }
    //     }
    //   } catch {
    //     // Si falla el refresh, propagar 401
    //   }
    // }

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
      console.log(
        "Enviando petición a:",
        `${this.baseChatUrl}api/temporary-rooms`
      );
      console.log("Datos enviados:", data);

      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      console.log("Status de respuesta:", response.status);
      console.log("Headers de respuesta:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error del servidor:", errorText);
        throw new Error(
          `Error del servidor: ${response.status} - ${errorText}`
        );
      }

      const result = await response.json();
      console.log("Resultado parseado:", result);
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

  // Método para actualizar la duración de una sala
  async updateRoomDuration(roomId, durationMinutes) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/${roomId}/duration`,
        {
          method: "PATCH",
          body: JSON.stringify({ duration: durationMinutes }),
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
      console.error("Error al actualizar duración de la sala:", error);
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
      const response = await fetch(
        `${API_BASECHAT_URL}api/messages/user/${from}/${to}?limit=${limit}&offset=${offset}`,
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
      console.log('👤 Usuario actual para conversaciones:', user);

      if (!user) {
        console.warn("No hay usuario autenticado");
        return [];
      }

      // Usar el nombre completo si está disponible, sino usar username
      const displayName = user.nombre && user.apellido
        ? `${user.nombre} ${user.apellido}`
        : (user.username || user.email);

      console.log('🔍 Buscando conversaciones para:', displayName);

      const response = await fetch(
        `${this.baseChatUrl}api/temporary-conversations/my-conversations?username=${encodeURIComponent(displayName)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error en respuesta:', errorData);
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      console.log('✅ Conversaciones obtenidas:', result);
      return result;
    } catch (error) {
      console.error("Error al obtener conversaciones asignadas:", error);
      return []; // Retornar array vacío en caso de error
    }
  }

  // Obtener TODAS las conversaciones asignadas (solo para admin)
  async getAllAssignedConversations() {
    try {
      const response = await fetch(
        `${this.baseChatUrl}api/temporary-conversations/all`,
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
      console.error("Error al obtener todas las conversaciones:", error);
      throw error;
    }
  }

  // Actualizar una conversación asignada
  async updateAssignedConversation(conversationId, data) {
    try {
      const response = await fetch(
        `${this.baseChatUrl}api/temporary-conversations/${conversationId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
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
      const response = await fetch(
        `${this.baseChatUrl}api/temporary-conversations/${conversationId}`,
        {
          method: "DELETE",
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
      console.error("Error al eliminar conversación:", error);
      throw error;
    }
  }
}

export default new ApiService();
