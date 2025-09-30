import { useState, useEffect } from "react";
import apiService from "../apiService";

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const checkAuth = () => {
      if (apiService.isAuthenticated()) {
        const currentUser = apiService.getCurrentUser();
        setUser(currentUser);
        const displayName =
          currentUser.nombre && currentUser.apellido
            ? `${currentUser.nombre} ${currentUser.apellido}`
            : currentUser.username || currentUser.email;
        setUsername(displayName);
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
    logout,
    refreshAuth,
  };
};
