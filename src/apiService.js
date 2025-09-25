// Servicio para conectar con la API de Angular
const API_BASE_URL = "https://apisozarusac.com/BackendJava/";

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
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
}

export default new ApiService();
