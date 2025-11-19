// Servicio para conectar con la API (múltiples backends según sede)
// URLs para CHICLAYO / PIURA
const API_BASE_URL_CHICLAYO = "https://apisozarusac.com/BackendJava/";
const API_BASECHAT_URL_CHICLAYO = "https://apisozarusac.com/BackendChat/";
//const API_BASECHAT_URL_CHICLAYO = "http://localhost:8747/";

// URLs para LIMA
const API_BASE_URL_LIMA = "https://apisozarusac.com/BackendJavaMidas/";
const API_BASECHAT_URL_LIMA = "https://apisozarusac.com/BackendChat/";
//const API_BASECHAT_URL_LIMA = "http://localhost:8747/";

class ApiService {
  constructor() {
    // URLs por defecto (CHICLAYO/PIURA)
    this.baseUrl = API_BASE_URL_CHICLAYO;
    this.baseChatUrl = API_BASECHAT_URL_CHICLAYO;
    this.currentSede = 'CHICLAYO_PIURA';

    // Debug: mostrar las URLs que se están usando (comentado para evitar logs duplicados)
    // console.log("API_BASE_URL:", this.baseUrl);
    // console.log("API_BASECHAT_URL:", this.baseChatUrl);
  }

  // Método para cambiar la sede y actualizar las URLs
  setSede(sede) {
    const previousSede = this.currentSede;

    if (sede === 'LIMA') {
      this.baseUrl = API_BASE_URL_LIMA;
      this.baseChatUrl = API_BASECHAT_URL_LIMA;
      this.currentSede = 'LIMA';
    } else {
      this.baseUrl = API_BASE_URL_CHICLAYO;
      this.baseChatUrl = API_BASECHAT_URL_CHICLAYO;
      this.currentSede = 'CHICLAYO_PIURA';
    }

    // Guardar la sede seleccionada en localStorage
    localStorage.setItem('selectedSede', sede);

    // Solo mostrar mensaje si la sede realmente cambió
    if (previousSede !== this.currentSede) {
      console.log(`✅ Sede cambiada a: ${this.currentSede}`);
    }
  }

  // Método para obtener la sede actual
  getCurrentSede() {
    return this.currentSede;
  }

  // Método helper para obtener la URL base según la sede
  getBaseUrlForSede(sede) {
    if (sede === 'LIMA') {
      return API_BASE_URL_LIMA;
    }
    return API_BASE_URL_CHICLAYO;
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
  async login(credentials, sede = 'CHICLAYO_PIURA') {
    try {
      // Cambiar la sede antes de hacer el login
      this.setSede(sede);

      // Crear objeto de credenciales sin la sede para enviar a la API
      const loginCredentials = {
        username: credentials.username,
        password: credentials.password
      };

      const response = await fetch(
        `${this.baseUrl}api/authentication/sign-in`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(loginCredentials),
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
        selectedSede: sede, // Guardar la sede seleccionada
      };

      // Guardar en localStorage como lo hace Angular
      localStorage.setItem("token", data.data.token);
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("selectedSede", sede);

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
    localStorage.removeItem("selectedSede");
    // Resetear a la sede por defecto
    this.setSede('CHICLAYO_PIURA');
  }

  // Método para verificar si hay un token válido
  isAuthenticated() {
    const token = localStorage.getItem("token");
    const user = this.getCurrentUser();

    // Si hay usuario autenticado, restaurar la sede guardada
    if (token && user) {
      const savedSede = localStorage.getItem("selectedSede") || 'CHICLAYO_PIURA';
      this.setSede(savedSede);
      return true;
    }
    return false;
  }

  // Variable para evitar múltiples intentos de refresh simultáneos
  _refreshPromise = null;

  // Método para renovar el token
  async refreshToken() {
    // Si ya hay un refresh en progreso, esperar a que termine
    if (this._refreshPromise) {
      console.log('⏳ Ya hay un refresh en progreso, esperando...');
      return this._refreshPromise;
    }

    this._refreshPromise = (async () => {
      try {
        const currentToken = localStorage.getItem("token");
        if (!currentToken) {
          console.error('❌ No hay token para renovar');
          throw new Error('No hay token para renovar');
        }

        console.log('🔄 Intentando renovar token...');

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

        console.log(`📡 Respuesta de refresh-token: ${refreshResp.status}`);

        // 🔥 Si el refresh falla, verificar el tipo de error
        if (!refreshResp.ok) {
          let errorData = null;
          try {
            errorData = await refreshResp.json();
          } catch {
            const errorText = await refreshResp.text();
            console.error(`❌ Error ${refreshResp.status} al renovar token:`, errorText);
          }

          // Si el backend devuelve rpta: 0 con mensaje de token inválido, cerrar sesión
          if (errorData?.rpta === 0) {
            const errorMsg = errorData.msg || '';
            console.error('❌ Error al renovar token:', errorMsg);

            // Verificar si es un error de token inválido/expirado
            if (
              errorMsg.includes('inválido') ||
              errorMsg.includes('invalido') ||
              errorMsg.includes('expirado') ||
              errorMsg.includes('Token') ||
              refreshResp.status === 400
            ) {
              console.error('❌ Token no se puede renovar. Cerrando sesión.');
              this.logout();
              window.location.href = '/';
              throw new Error('Token no se puede renovar');
            }
          }

          // Para otros errores (401, 403, 500, etc.), también cerrar sesión
          if (refreshResp.status === 401 || refreshResp.status === 403) {
            console.error('❌ Token no se puede renovar (401/403). Cerrando sesión.');
            this.logout();
            window.location.href = '/';
            throw new Error('Token no se puede renovar');
          }

          throw new Error(`Error ${refreshResp.status} al renovar token`);
        }

        const refreshData = await refreshResp.json();
        console.log('📦 Datos de refresh:', refreshData);

        if (refreshData?.rpta === 1 && refreshData?.data?.token) {
          const newToken = refreshData.data.token;

          console.log('✅ Token renovado exitosamente');

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
          console.error('❌ Respuesta de refresh token inválida:', refreshData);
          throw new Error('Respuesta de refresh token inválida');
        }
      } catch (error) {
        console.error('❌ Error al renovar token:', error);
        // Si el error no es de logout, limpiar sesión
        if (!error.message?.includes('Token no se puede renovar')) {
          this.logout();
          window.location.href = '/';
        }
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

    // 🔥 Manejo de errores 400, 401 y 403
    if (response.status === 400) {
      // 400 = Verificar si es un error de token inválido del backend
      try {
        const errorData = await response.clone().json();
        if (errorData?.rpta === 0) {
          const errorMsg = errorData.msg || '';

          // Si el mensaje indica token inválido/expirado, intentar renovar
          if (
            errorMsg.includes('inválido') ||
            errorMsg.includes('invalido') ||
            errorMsg.includes('expirado') ||
            errorMsg.includes('Token')
          ) {
            console.log('⚠️ Error 400 con token inválido detectado, intentando renovar...');
            try {
              const newToken = await this.refreshToken();

              // Reintentar la petición original con el nuevo token
              const retryHeaders = {
                ...headers,
                Authorization: `Bearer ${newToken}`,
              };

              response = await doRequest(retryHeaders);

              // Si aún falla después del refresh, cerrar sesión
              if (response.status === 401 || response.status === 403 || response.status === 400) {
                console.error('❌ Error después de renovar token. Cerrando sesión.');
                this.logout();
                window.location.href = '/';
              }
            } catch (error) {
              console.error('❌ Error al renovar token:', error);
              this.logout();
              window.location.href = '/';
            }
          }
        }
      } catch (e) {
        // Si no se puede parsear el JSON, continuar normalmente
      }
    } else if (response.status === 401) {
      // 401 = Token expirado o inválido → Intentar renovar
      console.log('⚠️ Error 401 detectado, intentando renovar token...');
      try {
        const newToken = await this.refreshToken();

        // Reintentar la petición original con el nuevo token
        const retryHeaders = {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        };

        response = await doRequest(retryHeaders);

        // Si aún falla después del refresh, cerrar sesión
        if (response.status === 401 || response.status === 403) {
          console.error('❌ Error 401/403 después de renovar token. Cerrando sesión.');
          this.logout();
          window.location.href = '/';
        }
      } catch (error) {
        console.error('❌ Error al renovar token:', error);
        // Si falla el refresh, limpiar sesión
        this.logout();
        window.location.href = '/';
      }
    } else if (response.status === 403) {
      // 403 = Sin permisos o token expirado definitivamente → Cerrar sesión directamente
      console.error('❌ Error 403: Acceso denegado. Cerrando sesión.');
      this.logout();
      window.location.href = '/';
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
        let errorMessage = `Error del servidor: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          const errorText = await response.text();
          errorMessage = errorText || errorMessage;
        }
        const error = new Error(errorMessage);
        error.response = { data: { message: errorMessage } };
        throw error;
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

  // Método para eliminar un usuario de una sala
  async removeUserFromRoom(roomCode, username) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/${roomCode}/remove-user`,
        {
          method: "POST",
          body: JSON.stringify({ username }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al eliminar usuario de sala:", error);
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

  async getAdminRooms(page = 1, limit = 10, search = '') {
    try {
      // Obtener el usuario actual para incluir su displayName
      const user = this.getCurrentUser();
      const displayName = user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : (user?.username || user?.email);

      // Construir query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      if (displayName) {
        params.append('username', displayName);
      }

      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/admin/rooms?${params.toString()}`,
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
      // Obtener username (displayName) desde localStorage
      const user = JSON.parse(localStorage.getItem("user") || "{}");
      const displayName = user.nombre && user.apellido
        ? `${user.nombre} ${user.apellido}`
        : user.username;

      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/user/current-room?username=${encodeURIComponent(displayName)}`,
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

      // Si la sala está inactiva o no existe, retornar array vacío sin error
      if (response.status === 404) {
        console.log(`ℹ️ Sala ${roomCode} no encontrada o inactiva`);
        return [];
      }

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al obtener usuarios de la sala:", error);
      // Retornar array vacío en lugar de lanzar error
      return [];
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
      const response = await fetch(`${this.baseChatUrl}api/messages`, {
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
        `${this.baseChatUrl}api/messages/user/${from}/${to}?limit=${limit}&offset=${offset}`,
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

  // 🔥 NUEVO: Obtener mensajes entre usuarios ordenados por ID (para evitar problemas con sentAt corrupto)
  async getUserMessagesOrderedById(from, to, limit = 50, offset = 0) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/messages/user/${from}/${to}/by-id?limit=${limit}&offset=${offset}`,
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
      console.error("Error al obtener mensajes entre usuarios (ordenados por ID):", error);
      throw error;
    }
  }


  // Obtener mensajes de una sala
  async getRoomMessages(roomCode, limit = 50, offset = 0) {
    try {

      const response = await fetch(
        `${this.baseChatUrl}api/messages/room/${roomCode}?limit=${limit}&offset=${offset}`,
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

  // 🔥 NUEVO: Obtener mensajes de una sala ordenados por ID (para evitar problemas con sentAt corrupto)
  async getRoomMessagesOrderedById(roomCode, limit = 50, offset = 0) {
    try {
      const response = await fetch(
        `${this.baseChatUrl}api/messages/room/${roomCode}/by-id?limit=${limit}&offset=${offset}`,
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
      console.error("Error al obtener mensajes de la sala (ordenados por ID):", error);
      throw error;
    }
  }

  // Obtener mensajes de un hilo
  async getThreadMessages(threadId, limit = 100, offset = 0) {
    try {
      const response = await fetch(
        `${this.baseChatUrl}api/messages/thread/${threadId}?limit=${limit}&offset=${offset}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener mensajes del hilo: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error al obtener mensajes del hilo:", error);
      throw error;
    }
  }

  // Incrementar contador de respuestas en hilo
  async incrementThreadCount(messageId) {
    try {
      const response = await fetch(
        `${this.baseChatUrl}api/messages/${messageId}/increment-thread`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error al incrementar contador de hilo: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error al incrementar contador de hilo:", error);
      throw error;
    }
  }

  // Editar un mensaje (con soporte para multimedia)
  async editMessage(messageId, username, newText, mediaType = null, mediaData = null, fileName = null, fileSize = null) {
    try {
      const body = {
        username,
        message: newText
      };

      // 🔥 Agregar campos multimedia si se proporcionan
      if (mediaType !== null) body.mediaType = mediaType;
      if (mediaData !== null) body.mediaData = mediaData;
      if (fileName !== null) body.fileName = fileName;
      if (fileSize !== null) body.fileSize = fileSize;

      const response = await fetch(`${this.baseChatUrl}api/messages/${messageId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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

  // Eliminar un mensaje (ADMIN puede eliminar cualquier mensaje)
  async deleteMessage(messageId, username, isAdmin = false, deletedBy = null) {
    try {
      const body = {
        username,
        isAdmin,
        deletedBy
      };

      const response = await fetch(`${this.baseChatUrl}api/messages/${messageId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
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
      console.error("Error al eliminar mensaje:", error);
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
      // Obtener el usuario actual para calcular unreadCount correctamente
      const user = this.getCurrentUser();
      const displayName = user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : (user?.username || user?.email);

      // ✅ Pasar username como query param para calcular unreadCount correctamente
      const url = displayName
        ? `${this.baseChatUrl}api/temporary-conversations/all?username=${encodeURIComponent(displayName)}`
        : `${this.baseChatUrl}api/temporary-conversations/all`;

      const response = await this.fetchWithAuth(url, {
        method: "GET",
      });

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

  // 🔥 NUEVO: Obtener conversaciones asignadas con paginación
  async getAssignedConversationsPaginated(page = 1, limit = 10) {
    try {
      const user = this.getCurrentUser();
      const displayName = user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : (user?.username || user?.email);

      if (!displayName) {
        throw new Error('Usuario no encontrado');
      }

      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-conversations/assigned/list?username=${encodeURIComponent(displayName)}&page=${page}&limit=${limit}`,
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
      console.error("Error al obtener conversaciones asignadas paginadas:", error);
      throw error;
    }
  }

  // 🔥 NUEVO: Obtener salas del usuario con paginación
  async getUserRoomsPaginated(page = 1, limit = 10) {
    try {
      const user = this.getCurrentUser();
      const username = user?.username;

      if (!username) {
        throw new Error('Usuario no encontrado');
      }

      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/temporary-rooms/user/list?username=${encodeURIComponent(username)}&page=${page}&limit=${limit}`,
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
      console.error("Error al obtener salas del usuario paginadas:", error);
      throw error;
    }
  }

  // 🔥 NUEVO: Obtener conversaciones de monitoreo (de otros usuarios) con paginación
  async getMonitoringConversations(page = 1, limit = 10) {
    try {
      // Obtener el usuario actual
      const user = this.getCurrentUser();

      if (!user) {
        return { data: [], total: 0, page, limit, totalPages: 0 };
      }

      // Usar el nombre completo si está disponible, sino usar username
      const displayName = user.nombre && user.apellido
        ? `${user.nombre} ${user.apellido}`
        : (user.username || user.email);

      // ✅ Pasar username como query param para filtrar correctamente
      const url = displayName
        ? `${this.baseChatUrl}api/temporary-conversations/monitoring/list?username=${encodeURIComponent(displayName)}&page=${page}&limit=${limit}`
        : `${this.baseChatUrl}api/temporary-conversations/monitoring/list?page=${page}&limit=${limit}`;

      const response = await this.fetchWithAuth(url, {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al obtener conversaciones de monitoreo:", error);
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

  // Buscar mensajes por ID de usuario
  async searchMessagesByUserId(userId, searchTerm) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return [];
      }

      const response = await fetch(
        `${this.baseChatUrl}api/messages/search-by-user/${encodeURIComponent(userId)}?q=${encodeURIComponent(searchTerm)}`,
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
      console.error("Error al buscar mensajes por userId:", error);
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

  // 🔥 NUEVO: Obtener conteos de mensajes no leídos para todas las salas del usuario
  async getUnreadCounts() {
    try {
      const token = localStorage.getItem("token");
      const user = this.getCurrentUser();
      
      if (!token || !user) {
        throw new Error("No hay token de autenticación o usuario");
      }

      // Calcular el username de la misma forma que en useAuth
      const username = user.nombre && user.apellido
        ? `${user.nombre} ${user.apellido}`
        : user.username || user.email;

      const response = await fetch(
        `${this.baseChatUrl}api/messages/unread-counts?username=${encodeURIComponent(username)}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
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
      console.error("Error al obtener conteos de mensajes no leídos:", error);
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
  async getUsersFromBackend(page = 0, size = 10, sede = null) {
    try {
      // 🔥 Usar la sede especificada o la actual
      const baseUrl = sede ? this.getBaseUrlForSede(sede) : this.baseUrl;

      console.log(`📋 Obteniendo usuarios de ${baseUrl}api/user/listar?page=${page}&size=${size}`);

      // ✅ Usar fetchWithAuth para renovación automática de token
      const response = await this.fetchWithAuth(
        `${baseUrl}api/user/listar?page=${page}&size=${size}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Error del servidor al obtener usuarios:", {
          status: response.status,
          errorData
        });
        throw new Error(
          errorData.msg || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();

      // Validar que la respuesta sea exitosa (rpta === 1)
      if (result.rpta !== 1) {
        console.warn("⚠️ Respuesta no exitosa del servidor:", result.msg);
        return [];
      }

      // Retornar solo los usuarios del data, filtrando usuarios válidos
      const users = result.data?.users || [];
      console.log(`✅ Se obtuvieron ${users.length} usuarios`);
      return users.filter(user => user && user.username); // Filtrar usuarios inválidos
    } catch (error) {
      console.error("❌ Error al obtener usuarios del backend:", error);
      // No retornar array vacío, lanzar el error para que se maneje en el componente
      throw error;
    }
  }

  // Buscar usuarios en el backend Java
  async searchUsersFromBackend(query, page = 0, size = 10, sede = null) {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      // 🔥 Usar la sede especificada o la actual
      const baseUrl = sede ? this.getBaseUrlForSede(sede) : this.baseUrl;

      // ✅ Usar fetchWithAuth para renovación automática de token
      const response = await this.fetchWithAuth(
        `${baseUrl}api/user/buscar?page=${page}&size=${size}&query=${encodeURIComponent(query)}`,
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

  // ==================== FAVORITOS DE SALAS ====================

  // Alternar favorito (agregar o quitar)
  async toggleRoomFavorite(username, roomCode, roomId) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/room-favorites/toggle`,
        {
          method: "POST",
          body: JSON.stringify({ username, roomCode, roomId }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al alternar favorito:", error);
      throw error;
    }
  }

  // Obtener favoritos de un usuario
  async getUserFavorites(username) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/room-favorites/user/${encodeURIComponent(username)}`,
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
      console.error("Error al obtener favoritos:", error);
      throw error;
    }
  }

  // Obtener códigos de salas favoritas
  async getUserFavoriteRoomCodes(username) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/room-favorites/codes/${encodeURIComponent(username)}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result.roomCodes || [];
    } catch (error) {
      console.error("Error al obtener códigos de favoritos:", error);
      return [];
    }
  }

  // Verificar si una sala es favorita
  async isRoomFavorite(username, roomCode) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/room-favorites/check?username=${encodeURIComponent(username)}&roomCode=${encodeURIComponent(roomCode)}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result.isFavorite || false;
    } catch (error) {
      console.error("Error al verificar favorito:", error);
      return false;
    }
  }

  // ==================== FAVORITOS DE CONVERSACIONES ====================

  // Alternar favorito de conversación (agregar o quitar)
  async toggleConversationFavorite(username, conversationId) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/conversation-favorites/toggle`,
        {
          method: "POST",
          body: JSON.stringify({ username, conversationId }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al alternar favorito de conversación:", error);
      throw error;
    }
  }

  // Obtener favoritos de conversaciones de un usuario
  async getUserConversationFavorites(username) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/conversation-favorites/user/${encodeURIComponent(username)}`,
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
      console.error("Error al obtener favoritos de conversaciones:", error);
      throw error;
    }
  }

  // Obtener IDs de conversaciones favoritas
  async getUserFavoriteConversationIds(username) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/conversation-favorites/ids/${encodeURIComponent(username)}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result.conversationIds || [];
    } catch (error) {
      console.error("Error al obtener IDs de favoritos de conversaciones:", error);
      return [];
    }
  }

  // Verificar si una conversación es favorita
  async isConversationFavorite(username, conversationId) {
    try {
      const response = await this.fetchWithAuth(
        `${this.baseChatUrl}api/conversation-favorites/check?username=${encodeURIComponent(username)}&conversationId=${conversationId}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result.isFavorite || false;
    } catch (error) {
      console.error("Error al verificar favorito de conversación:", error);
      return false;
    }
  }
  // 🔥 NUEVO: Obtener conteo de mensajes no leídos para un usuario en una sala
  async getUnreadCountForUserInRoom(roomCode, username) {
    try {
      const response = await fetch(
        `${this.baseChatUrl}api/messages/unread-count/${encodeURIComponent(roomCode)}/${encodeURIComponent(username)}`,
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
      return result.unreadCount || 0;
    } catch (error) {
      console.error("Error al obtener conteo de mensajes no leídos:", error);
      return 0; // Retornar 0 en caso de error
    }
  }

  // 🔥 NUEVO: Obtener conteo de mensajes no leídos para múltiples salas
  async getUnreadCountsForUserInRooms(roomCodes, username) {
    try {
      const response = await fetch(
        `${this.baseChatUrl}api/messages/unread-counts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ roomCodes, username }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      return result.unreadCounts || {};
    } catch (error) {
      console.error("Error al obtener conteos de mensajes no leídos:", error);
      return {}; // Retornar objeto vacío en caso de error
    }
  }
}

export default new ApiService();
