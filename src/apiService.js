// Servicio para conectar con la API (múltiples backends según sede)
// URLs para CHICLAYO / PIURA
const API_BASE_URL_CHICLAYO = "https://apisozarusac.com/BackendJava/";
const API_BASECHAT_URL_CHICLAYO = "https://apisozarusac.com/BackendChat/";
//const API_BASECHAT_URL_CHICLAYO = "http://localhost:8747/"; // Solo para desarrollo local

// URLs para LIMA
const API_BASE_URL_LIMA = "https://apisozarusac.com/BackendJavaMidas/";
const API_BASECHAT_URL_LIMA = "https://apisozarusac.com/BackendChat/";
//const API_BASECHAT_URL_LIMA = "http://localhost:8747/"; // Solo para desarrollo local

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
      const getFormData = () => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('category', category);
        return formData;
      };

      const token = localStorage.getItem('token');

      // Función helper para realizar la petición
      const doUpload = async (authToken) => {
        return await fetch(`${this.baseUrl}api/files/upload`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          body: getFormData(), // Crear nuevo FormData para cada intento
        });
      };

      let response = await doUpload(token);

      // 🔥 Manejo de errores 400, 401 y 403 (similar a fetchWithAuth)
      if (response.status === 401 || response.status === 403 || response.status === 400) {
        let shouldRetry = false;

        // Si es 400, verificar si es por token inválido
        if (response.status === 400) {
          try {
            const errorData = await response.clone().json();
            if (errorData?.rpta === 0) {
              const errorMsg = errorData.msg || '';
              if (
                errorMsg.includes('inválido') ||
                errorMsg.includes('invalido') ||
                errorMsg.includes('expirado') ||
                errorMsg.includes('Token')
              ) {
                shouldRetry = true;
              }
            }
          } catch (e) {
            // Ignorar error de parseo
          }
        } else {
          // 401 o 403 siempre intentan refresh
          shouldRetry = true;
        }

        if (shouldRetry) {
          console.log(`⚠️ Error ${response.status} en upload, intentando renovar token...`);
          try {
            const newToken = await this.refreshToken();

            // Reintentar con el nuevo token
            response = await doUpload(newToken);

            if (response.status === 401 || response.status === 403) {
              console.error('❌ Error al subir archivo tras renovar token.');
              this.logout();
              window.location.href = '/';
              throw new Error('Sesión expirada');
            }
          } catch (refreshError) {
            console.error('❌ Error al renovar token para subir archivo:', refreshError);
            this.logout();
            window.location.href = '/';
            throw new Error('Sesión expirada');
          }
        }
      }

      if (!response.ok) {
        let errorMessage = 'Error al subir archivo';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.msg || errorMessage;
        } catch { }
        throw new Error(errorMessage);
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
        const currentUser = this.getCurrentUser();

        if (!currentToken) {
          console.error('❌ No hay token para renovar');
          throw new Error('No hay token para renovar');
        }

        console.log('🔄 Intentando renovar token...');

        // ✅ PASO 1: Intentar renovar con el endpoint /refresh-token
        let refreshResp = await fetch(
          `${this.baseUrl}api/authentication/refresh-token`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${currentToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        console.log(`📡 Respuesta de refresh-token: ${refreshResp.status}`);

        // ✅ PASO 2: Si refresh-token falla (401/403), intentar con /renew-token
        if (refreshResp.status === 401 || refreshResp.status === 403) {
          console.warn('⚠️ refresh-token falló (token expirado). Intentando con renew-token...');

          // Verificar que tengamos username para el renew
          if (!currentUser?.username) {
            console.error('❌ No hay username disponible para renovar token');
            this.logout();
            window.location.href = '/';
            throw new Error('No se puede renovar token sin username');
          }

          // ✅ NUEVO: Llamar a /renew-token como fallback
          console.log(`🔄 Intentando renew-token para usuario:`, currentUser.username); // 🔥 DEBUG
          console.log(`📡 URL: ${this.baseUrl}api/authentication/renew-token`); // 🔥 DEBUG

          refreshResp = await fetch(
            `${this.baseUrl}api/authentication/renew-token`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                username: currentUser.username
              }),
            }
          );

          console.log(`📡 Respuesta de renew-token status: ${refreshResp.status}`);
        }

        // ✅ PASO 3: Si aún falla, verificar el tipo de error
        if (!refreshResp.ok) {
          let errorData = null;
          try {
            errorData = await refreshResp.json();
          } catch {
            const errorText = await refreshResp.text();
            console.error(`❌ Error ${refreshResp.status} al renovar token:`, errorText);
          }

          // Si el backend devuelve rpta: 0 con mensaje de error
          if (errorData?.rpta === 0) {
            const errorMsg = errorData.msg || '';
            console.error('❌ Error al renovar token:', errorMsg);

            // Verificar si es un error crítico
            if (
              errorMsg.includes('inválido') ||
              errorMsg.includes('invalido') ||
              errorMsg.includes('expirado') ||
              errorMsg.includes('Token') ||
              errorMsg.includes('Usuario no encontrado') ||
              refreshResp.status === 400
            ) {
              console.error('❌ Token no se puede renovar. Cerrando sesión.');
              this.logout();
              window.location.href = '/';
              throw new Error('Token no se puede renovar');
            }
          }

          // Para otros errores (401, 403 después de renew-token), cerrar sesión
          if (refreshResp.status === 401 || refreshResp.status === 403) {
            console.error('❌ Token no se puede renovar después de intentar renew-token. Cerrando sesión.');
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
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      let shouldRetry = false;

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
              shouldRetry = true;
            }
          }
        } catch (e) {
          // Si no se puede parsear el JSON, continuar normalmente
        }
      } else {
        // 401 y 403 siempre intentan refresh
        shouldRetry = true;
      }

      if (shouldRetry) {
        console.log(`⚠️ Error ${response.status} detectado, intentando renovar token...`);
        try {
          const newToken = await this.refreshToken();

          // Reintentar la petición original con el nuevo token
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${newToken}`,
          };

          response = await doRequest(retryHeaders);

          // Si aún falla después del refresh, cerrar sesión
          console.error('❌ Error después de renovar token. Cerrando sesión.');
          this.logout();
          window.location.href = '/';

        } catch (error) {
          console.error('❌ Error al renovar token:', error);
          this.logout();
          window.location.href = '/';
        }
      }
    }

    return response;
  }

  //  NUEVO: Helper para peticiones a BackendChat SIN Authorization header
  // Esto evita CORS preflight ya que no enviamos headers custom
  async fetchChatApi(endpoint, options = {}) {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    // Remover explícitamente Authorization si existe
    delete headers.Authorization;

    return await fetch(endpoint, {
      ...(options || {}),
      headers,
    });
  }

  // Helper para peticiones a BackendChat CON Authorization header (para endpoints protegidos)
  async fetchChatApiWithAuth(endpoint, options = {}) {
    const token = localStorage.getItem("token");

    const headers = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    // Agregar token si existe
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return await fetch(endpoint, {
      ...(options || {}),
      headers,
    });
  }

  // Método para crear conversación temporal
  async createTemporaryConversation(data) {
    try {
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
  // Método para unirse a sala
  async joinRoom(data) {
    try {
      const response = await this.fetchChatApi(
        `${this.baseChatUrl}api/temporary-rooms/join`,
        {
          method: "POST",
          body: JSON.stringify(data),
        }
      );

      // Si no es OK, lanzar el error con detalles para que lo capture el hook
      if (!response.ok) {
        const errorData = await response.json();
        const error = new Error(errorData.message || `Error ${response.status}`);
        error.response = { data: errorData }; // Adjuntar respuesta para validación
        throw error;
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al unirse a sala:", error);
      throw error;
    }
  }

  // Método para aprobar solicitud de ingreso
  async approveJoinRequest(roomCode, username) {
    try {
      const response = await this.fetchChatApi(
        `${this.baseChatUrl}api/temporary-rooms/${roomCode}/approve-join`,
        {
          method: "POST",
          body: JSON.stringify({ username }),
        }
      );
      if (!response.ok) throw new Error("Error al aprobar usuario");
      return await response.json();
    } catch (error) {
      console.error("Error approving join request:", error);
      throw error;
    }
  }

  // 🔥 NUEVO: Método para agregar usuario directamente a sala (bypassing pending) - Para admins
  async addUserDirectlyToRoom(roomCode, username) {
    try {
      const response = await this.fetchChatApi(
        `${this.baseChatUrl}api/temporary-rooms/${roomCode}/add-user`,
        {
          method: "POST",
          body: JSON.stringify({ username }),
        }
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al agregar usuario");
      }
      return await response.json();
    } catch (error) {
      console.error("Error adding user directly:", error);
      throw error;
    }
  }

  // Método para rechazar solicitud de ingreso
  async rejectJoinRequest(roomCode, username) {
    try {
      const response = await this.fetchChatApi(
        `${this.baseChatUrl}api/temporary-rooms/${roomCode}/reject-join`,
        {
          method: "POST",
          body: JSON.stringify({ username }),
        }
      );
      if (!response.ok) throw new Error("Error al rechazar usuario");
      return await response.json();
    } catch (error) {
      console.error("Error rejecting join request:", error);
      throw error;
    }
  }

  // Método para eliminar un usuario de una sala
  async removeUserFromRoom(roomCode, username, removedBy) {
    try {
      // Trim the username to handle trailing spaces from displayName
      const trimmedUsername = username?.trim();

      console.log(`🗑️ Removing user from room: ${roomCode}, username: "${trimmedUsername}", removedBy: "${removedBy}"`);

      const response = await this.fetchChatApi(
        `${this.baseChatUrl}api/temporary-rooms/${roomCode}/remove-user`,
        {
          method: "POST",
          body: JSON.stringify({
            username: trimmedUsername,
            removedBy: removedBy // Optional: who performed the action
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        console.error("❌ Remove user error response:", result);
        throw new Error(result.message || result.error || `Error del servidor: ${response.status}`);
      }

      console.log("✅ Remove user success:", result);
      return result;
    } catch (error) {
      console.error("Error al eliminar usuario de sala:", error);
      throw error;
    }
  }

  // Método para obtener información de sala por código
  async getRoomByCode(roomCode) {
    try {
      const response = await this.fetchChatApi(
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
      // Obtener el usuario actual para incluir su displayName y role
      const user = this.getCurrentUser();
      const displayName = user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : (user?.username || user?.email);

      const role = user?.role; // 👈 Obtener el rol

      // Construir query params
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (search && search.trim()) {
        params.append('search', search.trim());
      }

      if (displayName) {
        params.append('displayName', displayName);
      }

      if (role) {
        params.append('role', role); // 👈 Enviar el rol
      }

      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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

      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
  async getUserMessages(from, to, limit = 10, offset = 0) {
    try {
      // ✅ Usar fetchWithAuth para renovación automática de token
      const response = await this.fetchChatApi(
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
  async getUserMessagesOrderedById(from, to, limit = 10, offset = 0, isGroup = false, roomCode = null) {
    try {
      let url = `${this.baseChatUrl}api/messages/user/${from}/${to}/by-id?limit=${limit}&offset=${offset}`;

      // 🔥 Agregar parámetros de filtro si existen
      if (isGroup !== undefined) url += `&isGroup=${isGroup}`;
      if (roomCode) url += `&roomCode=${roomCode}`;

      const response = await this.fetchChatApi(
        url,
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
  async getRoomMessages(roomCode, limit = 10, offset = 0) {
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
  async getRoomMessagesOrderedById(roomCode, limit = 10, offset = 0, isGroup = true, username = null) {
    try {
      let url = `${this.baseChatUrl}api/messages/room/${roomCode}/by-id?limit=${limit}&offset=${offset}`;

      // 🔥 Agregar parámetros de filtro
      if (isGroup !== undefined) url += `&isGroup=${isGroup}`;
      if (username) url += `&username=${encodeURIComponent(username)}`;

      const response = await fetch(
        url,
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

  // 🔥 NUEVO: Obtener mensajes alrededor de un messageId específico (para jump-to-message en grupos)
  async getMessagesAroundId(roomCode, messageId, limit = 30) {
    try {
      const response = await fetch(
        `${this.baseChatUrl}api/messages/room/${roomCode}/around/${messageId}?limit=${limit}`,
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
          `Error del servidor: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error al obtener mensajes alrededor del ID:", error);
      throw error;
    }
  }

  // 🔥 NUEVO: Obtener mensajes alrededor de un messageId para chats individuales
  async getUserMessagesAroundId(from, to, messageId, limit = 30) {
    try {
      const response = await this.fetchChatApi(
        `${this.baseChatUrl}api/messages/user/${from}/${to}/around/${messageId}?limit=${limit}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Error del servidor: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error al obtener mensajes de usuario alrededor del ID:", error);
      throw error;
    }
  }

  // 🔥 NUEVO: Obtener mensajes alrededor de un messageId genérico (para búsqueda WhatsApp)
  // Este endpoint detecta automáticamente si es grupo o chat directo
  async getMessagesAroundById(messageId, before = 25, after = 25) {
    try {
      const url = `${this.baseChatUrl}api/messages/around/${messageId}?before=${before}&after=${after}`;
      console.log('🔍 getMessagesAroundById URL:', url);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Error del servidor: ${response.status} - ${JSON.stringify(errorData)}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error al obtener mensajes alrededor del ID:", error);
      throw error;
    }
  }


  async getThreadMessages(threadId, limit = 100, offset = 0, order = 'ASC') {
    try {
      const response = await fetch(
        `${this.baseChatUrl}api/messages/thread/${threadId}?limit=${limit}&offset=${offset}&order=${order}`,
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

  // Obtener lista de hilos padres de un grupo/sala (Con paginación)
  async getRoomThreads(roomCode, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const url = `${this.baseChatUrl}api/messages/room/${roomCode}/threads?page=${page}&limit=${limit}&offset=${offset}`;
      console.log('📡 getRoomThreads URL:', url);

      const response = await fetch(
        url,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener hilos de la sala: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error al obtener hilos de la sala:", error);
      throw error;
    }
  }

  // Obtener lista de hilos padres de un chat directo (Con paginación)
  async getUserThreads(from, to, page = 1, limit = 50) {
    try {
      const offset = (page - 1) * limit;
      const url = `${this.baseChatUrl}api/messages/user/${encodeURIComponent(from)}/${encodeURIComponent(to)}/threads?page=${page}&limit=${limit}&offset=${offset}`;
      console.log('📡 getUserThreads URL:', url);

      const response = await fetch(
        url,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Error al obtener hilos del chat: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error al obtener hilos del chat:", error);
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

  // 🔥 NUEVO: Obtener lista de quiénes leyeron un mensaje (lazy loading)
  async getMessageReadBy(messageId) {
    try {
      const response = await this.fetchChatApi(
        `${this.baseChatUrl}api/messages/${messageId}/read-by`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        if (response.status === 404) return { readBy: [], readByCount: 0 };
        throw new Error(`Error del servidor: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error al obtener readBy del mensaje:", error);
      return { readBy: [], readByCount: 0 };
    }
  }

  // 🔥 NUEVO: Obtener un mensaje específico por ID (para mensajes fijados antiguos)
  async getMessageById(messageId, roomCode = null) {
    try {
      let url = `${this.baseChatUrl}api/messages/${messageId}`;
      if (roomCode) {
        url += `?roomCode=${roomCode}`;
      }

      const response = await this.fetchChatApi(
        url,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        // Si no existe (404), retornamos null silenciosamente
        if (response.status === 404) return null;
        throw new Error(`Error del servidor: ${response.status}`);
      }

      // Verificar si hay contenido antes de parsear
      if (response.status === 204) return null;
      const contentLength = response.headers.get("content-length");
      if (contentLength === "0") return null;

      return await response.json();
    } catch (error) {
      console.error("Error al obtener mensaje por ID:", error);
      return null;
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

      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
  // Obtener TODAS las conversaciones asignadas (solo para admin) con paginación y búsqueda
  async getAllAssignedConversations(page = 1, limit = 20, search = '') {
    try {
      // Obtener el usuario actual para calcular unreadCount correctamente
      const user = this.getCurrentUser();
      const displayName = user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : (user?.username || user?.email);

      // 🔥 IMPORTANTE: Enviar el rol del usuario para que el backend muestre todas las conversaciones a admins
      const userRole = user?.role || '';

      // ✅ Pasar username, role, search, page y limit como query params
      let url = `${this.baseChatUrl}api/temporary-conversations/all`;
      const params = [];
      if (displayName) params.push(`username=${encodeURIComponent(displayName)}`);
      if (userRole) params.push(`role=${encodeURIComponent(userRole)}`);
      if (search) params.push(`search=${encodeURIComponent(search)}`);
      params.push(`page=${page}`);
      params.push(`limit=${limit}`);
      if (params.length > 0) url += `?${params.join('&')}`;

      const response = await this.fetchChatApi(url, {
        method: "GET",
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      const result = await response.json();
      return result; // { data: [], total, page, totalPages }
    } catch (error) {
      console.error("Error al obtener todas las conversaciones:", error);
      throw error;
    }
  }

  // 🔥 NUEVO: Obtener conversaciones asignadas con paginación
  async getAssignedConversationsPaginated(page = 1, limit = 10, search = '') {
    try {
      const user = this.getCurrentUser();
      const displayName = user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : (user?.username || user?.email);

      if (!displayName) {
        throw new Error('Usuario no encontrado');
      }

      // Construir URL con parámetros
      let url = `${this.baseChatUrl}api/temporary-conversations/assigned/list?username=${encodeURIComponent(displayName)}&page=${page}&limit=${limit}`;

      // 🔥 NUEVO: Agregar parámetro de búsqueda si existe
      if (search && search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const response = await this.fetchChatApi(url, {
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
      console.error("Error al obtener conversaciones asignadas paginadas:", error);
      throw error;
    }
  }

  // 🔥 NUEVO: Obtener salas del usuario con paginación
  async getUserRoomsPaginated(page = 1, limit = 10, search = '') {
    try {
      const user = this.getCurrentUser();
      // 🔥 IMPORTANTE: Usar el displayName (nombre completo) porque el backend busca por displayName en los members
      const displayName = user?.nombre && user?.apellido
        ? `${user.nombre} ${user.apellido}`
        : (user?.username || user?.email);

      if (!displayName) {
        throw new Error('Usuario no encontrado');
      }

      // Construir URL con parámetros
      let url = `${this.baseChatUrl}api/temporary-rooms/user/list?username=${encodeURIComponent(displayName)}&page=${page}&limit=${limit}`;

      // 🔥 NUEVO: Agregar parámetro de búsqueda si existe
      if (search && search.trim()) {
        url += `&search=${encodeURIComponent(search.trim())}`;
      }

      const response = await this.fetchChatApi(url, {
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
      console.error("❌ Error al obtener salas del usuario paginadas:", error);
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

      const response = await this.fetchChatApi(url, {
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
  async searchMessages(searchTerm, page = 1, limit = 20) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return { data: [], total: 0 };
      }

      const user = this.getCurrentUser();
      const username = user?.username || user?.email;

      const response = await fetch(
        `${this.baseChatUrl}api/messages/search/${encodeURIComponent(username)}?q=${encodeURIComponent(searchTerm)}&page=${page}&limit=${limit}`,
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
      return { data: [], total: 0 };
    }
  }

  // Método para buscar menciones
  async searchMentions(username, roomCode, limit = 20, offset = 0) {
    if (!username) return { data: [] };

    const queryParams = new URLSearchParams({
      username,
      limit: limit.toString(),
      offset: offset.toString()
    });

    if (roomCode) {
      queryParams.append('roomCode', roomCode);
    }

    try {
      const response = await fetch(`${this.baseChatUrl}api/messages/mentions?${queryParams.toString()}`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Error del servidor: ${response.status}`
        );
      }

      return await response.json();
    } catch (error) {
      console.error("Error al buscar menciones:", error);
      return { data: [], total: 0 };
    }
  }

  // 🔥 NUEVO: Búsqueda tipo WhatsApp - buscar en todos los mensajes del usuario
  async searchAllMessages(username, searchTerm, limit = 15, offset = 0) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return { results: [], total: 0, hasMore: false, nextOffset: 0, groupedByConversation: {} };
      }

      if (!username) {
        console.error('searchAllMessages: username es requerido');
        return { results: [], total: 0, hasMore: false, nextOffset: 0, groupedByConversation: {} };
      }

      const url = `${this.baseChatUrl}api/messages/search-all/${encodeURIComponent(username)}?q=${encodeURIComponent(searchTerm)}&limit=${limit}&offset=${offset}`;
      console.log('🔍 searchAllMessages URL:', url);

      const response = await fetch(url, {
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

      return await response.json();
    } catch (error) {
      console.error("Error al buscar mensajes:", error);
      return { results: [], total: 0, hasMore: false, nextOffset: 0, groupedByConversation: {} };
    }
  }

  // Buscar salas/grupos por nombre
  async searchRooms(searchTerm, page = 1, limit = 20) {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return { data: [], total: 0 };
      }

      const user = this.getCurrentUser();
      const isPrivilegedUser = ['ADMIN', 'JEFEPISO', 'PROGRAMADOR', 'SUPERADMIN'].includes(user?.role);

      let result;
      if (isPrivilegedUser) {
        result = await this.getAdminRooms(page, limit, searchTerm);
      } else {
        result = await this.getUserRoomsPaginated(page, limit, searchTerm);
        // Normalizar respuesta para que tenga el mismo formato
        result = {
          data: result.rooms || [],
          total: result.total || 0,
          page: result.page || page,
          limit: result.limit || limit
        };
      }

      return result;
    } catch (error) {
      console.error("Error al buscar salas:", error);
      return { data: [], total: 0 };
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


  // 🔥 NUEVO: Obtener mensajes de sala ANTES de un ID específico
  async getRoomMessagesBeforeId(roomCode, beforeId, limit = 20) {
    try {
      if (!roomCode || !beforeId) return { data: [] };

      const response = await fetch(`${this.baseChatUrl}api/messages/room/${encodeURIComponent(roomCode)}/before/${beforeId}?limit=${limit}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error al obtener mensajes room before ID:", error);
      return { data: [] };
    }
  }

  // 🔥 NUEVO: Obtener mensajes privados ANTES de un ID específico
  async getUserMessagesBeforeId(username, to, beforeId, limit = 20) {
    try {
      if (!username || !to || !beforeId) return { data: [] };

      const response = await fetch(
        `${this.baseChatUrl}api/messages/user/${encodeURIComponent(username)}/${encodeURIComponent(to)}/before/${beforeId}?limit=${limit}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error al obtener mensajes user before ID:", error);
      return { data: [] };
    }
  }

  // 🔥 NUEVO: Obtener mensajes de sala DESPUÉS de un ID específico (Forward Pagination)
  async getRoomMessagesAfterId(roomCode, afterId, limit = 20) {
    try {
      if (!roomCode || !afterId) return { data: [] };

      const response = await fetch(
        `${this.baseChatUrl}api/messages/room/${roomCode}/after/${afterId}?limit=${limit}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error al obtener mensajes room after ID:", error);
      return { data: [] };
    }
  }

  // 🔥 NUEVO: Obtener mensajes privados DESPUÉS de un ID específico (Forward Pagination)
  async getUserMessagesAfterId(username, to, afterId, limit = 20) {
    try {
      if (!username || !to || !afterId) return { data: [] };

      const response = await fetch(
        `${this.baseChatUrl}api/messages/user/${encodeURIComponent(username)}/${encodeURIComponent(to)}/after/${afterId}?limit=${limit}`,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) throw new Error(`Error: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error("Error al obtener mensajes user after ID:", error);
      return { data: [] };
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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

  // 🔥 NUEVO: Obtener grupos favoritos con datos completos (para sección FAVORITOS)
  async getUserFavoriteRoomsWithData(username) {
    try {
      const response = await this.fetchChatApi(
        `${this.baseChatUrl}api/room-favorites/full/${encodeURIComponent(username)}`,
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error al obtener favoritos con datos:", error);
      return [];
    }
  }

  // Verificar si una sala es favorita
  async isRoomFavorite(username, roomCode) {
    try {
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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
      const response = await this.fetchChatApi(
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

  // ==================== BÚSQUEDAS RECIENTES ====================

  // Guardar búsqueda reciente
  async saveRecentSearch(username, searchTerm, searchType = 'general', resultCount = 0) {
    try {
      const response = await this.fetchChatApiWithAuth(
        `${this.baseChatUrl}api/recent-searches`,
        {
          method: "POST",
          body: JSON.stringify({
            username,
            searchTerm,
            searchType,
            resultCount
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al guardar búsqueda reciente:", error);
      // No lanzar error para no interrumpir la búsqueda
      return null;
    }
  }

  // Obtener búsquedas recientes de un usuario
  async getRecentSearches(username, limit = 10) {
    try {
      const response = await this.fetchChatApiWithAuth(
        `${this.baseChatUrl}api/recent-searches/${encodeURIComponent(username)}?limit=${limit}`,
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
      console.error("Error al obtener búsquedas recientes:", error);
      return [];
    }
  }

  // Obtener búsquedas recientes filtradas por tipo
  async getRecentSearchesByType(username, searchType, limit = 10) {
    try {
      const response = await this.fetchChatApiWithAuth(
        `${this.baseChatUrl}api/recent-searches/${encodeURIComponent(username)}/type/${searchType}?limit=${limit}`,
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
      console.error("Error al obtener búsquedas recientes por tipo:", error);
      return [];
    }
  }

  // Obtener estadísticas de búsquedas
  async getSearchStats(username) {
    try {
      const response = await this.fetchChatApiWithAuth(
        `${this.baseChatUrl}api/recent-searches/${encodeURIComponent(username)}/stats`,
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
      console.error("Error al obtener estadísticas de búsquedas:", error);
      return null;
    }
  }

  // Eliminar búsqueda específica
  async deleteRecentSearch(searchId) {
    try {
      const response = await this.fetchChatApiWithAuth(
        `${this.baseChatUrl}api/recent-searches/${searchId}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al eliminar búsqueda reciente:", error);
      throw error;
    }
  }

  // Limpiar todas las búsquedas de un usuario
  async clearRecentSearches(username) {
    try {
      const response = await this.fetchChatApiWithAuth(
        `${this.baseChatUrl}api/recent-searches/clear/${encodeURIComponent(username)}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al limpiar búsquedas recientes:", error);
      throw error;
    }
  }

  // Limpiar búsquedas antiguas (admin)
  async cleanOldSearches(daysOld = 30) {
    try {
      const response = await this.fetchChatApiWithAuth(
        `${this.baseChatUrl}api/recent-searches/clean-old`,
        {
          method: "POST",
          body: JSON.stringify({ daysOld }),
        }
      );

      if (!response.ok) {
        throw new Error(`Error del servidor: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error("Error al limpiar búsquedas antiguas:", error);
      throw error;
    }
  }
  // 🔥 NUEVO: Marcar hilo como leído
  async markThreadAsRead(threadId, username) {
    try {
      const response = await this.fetchChatApi(
        `${this.baseChatUrl}api/messages/thread/${threadId}/read`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ username }),
        }
      );

      return await response.json();
    } catch (error) {
      console.error("Error al marcar hilo como leído:", error);
      return { success: false };
    }
  }
}

export default new ApiService();