import { useState, useEffect } from "react";
import apiService from "../apiService";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true); // Estado de carga inicial
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);

      if (apiService.isAuthenticated()) {
        const currentUser = apiService.getCurrentUser();

        //  SELF-HEALING: Rectificar username si es un nombre completo (sesión antigua)
        // Si el username tiene espacios o no es puramente numérico, es un nombre
        if (currentUser.username && (currentUser.username.includes(" ") || isNaN(currentUser.username))) {
          console.warn("⚠️ Sesión antigua detectada (nombre como username). Rectificando...");
          try {
            const newToken = await apiService.refreshToken();
            if (newToken) {
              const updatedUser = apiService.getCurrentUser();
              console.log("✅ Sesión rectificada con éxito:", updatedUser.username);
              setUser(updatedUser);
              setUsername(updatedUser.username);
            }
          } catch (err) {
            console.error("❌ No se pudo rectificar la sesión automáticamente:", err);
            // Si falla el auto-fix y el username sigue mal, podrías forzar logout
            // apiService.logout(); 
          }
        } else {
          setUser(currentUser);
          setUsername(currentUser.username || currentUser.email);
        }

        setIsAuthenticated(true);

        const isUserAdmin =
          currentUser.role &&
          currentUser.role.toString().toUpperCase().trim() === "ADMIN";
        setIsAdmin(isUserAdmin);
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setUsername("");
        setIsAdmin(false);
      }

      setIsLoading(false);
    };

    // Verificar autenticación inicial
    checkAuth();

    // Escuchar cambios en localStorage
    const handleStorageChange = (e) => {
      if (e.key === "user" || e.key === "token") {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [refreshTrigger]);

  // Método para forzar actualización del estado de autenticación
  const refreshAuth = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  const logout = () => {
    apiService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setUsername("");
    setIsAdmin(false);
  };

  return {
    isAuthenticated,
    user,
    username,
    isAdmin,
    isLoading,
    logout,
    refreshAuth,
  };
};

