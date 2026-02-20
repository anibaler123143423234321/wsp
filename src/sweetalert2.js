// Función para cargar SweetAlert2 dinámicamente
export const loadSweetAlert2 = () => {
  return new Promise((resolve, reject) => {
    // Verificar si ya está cargado
    if (window.Swal) {
      resolve(window.Swal);
      return;
    }

    // Cargar CSS
    const linkElement = document.createElement('link');
    linkElement.rel = 'stylesheet';
    linkElement.href = 'https://cdn.jsdelivr.net/npm/sweetalert2@11/dist/sweetalert2.min.css';
    document.head.appendChild(linkElement);

    // Cargar JS
    const scriptElement = document.createElement('script');
    scriptElement.src = 'https://cdn.jsdelivr.net/npm/sweetalert2@11';
    scriptElement.async = true;

    scriptElement.onload = () => {
      resolve(window.Swal);
    };

    scriptElement.onerror = () => {
      reject(new Error('No se pudo cargar SweetAlert2'));
    };

    document.head.appendChild(scriptElement);
  });
};

// Función para mostrar una alerta de confirmación
export const showConfirmAlert = async (title, text, icon = 'warning') => {
  const Swal = await loadSweetAlert2();

  return Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonColor: 'ff453a',
    cancelButtonColor: '#d33',
    confirmButtonText: 'Sí, eliminar',
    cancelButtonText: 'Cancelar',
    background: '#2a3942',
    color: '#e9edef',
    customClass: {
      popup: 'swal-custom-popup',
      title: 'swal-custom-title',
      content: 'swal-custom-content',
      confirmButton: 'swal-custom-confirm',
      cancelButton: 'swal-custom-cancel'
    }
  });
};

// Función para mostrar una alerta de éxito
export const showSuccessAlert = async (title, text) => {
  const Swal = await loadSweetAlert2();

  return Swal.fire({
    title,
    text,
    icon: 'success',
    confirmButtonColor: 'ff453a',
    background: '#2a3942',
    color: '#e9edef',
    timer: 2000,
    timerProgressBar: true,
    customClass: {
      popup: 'swal-custom-popup',
      title: 'swal-custom-title',
      content: 'swal-custom-content',
      confirmButton: 'swal-custom-confirm'
    }
  });
};

// Función para mostrar una alerta de error
export const showErrorAlert = async (title, text) => {
  const Swal = await loadSweetAlert2();

  return Swal.fire({
    title,
    text,
    icon: 'error',
    confirmButtonColor: 'ff453a',
    background: '#2a3942',
    color: '#e9edef',
    customClass: {
      popup: 'swal-custom-popup',
      title: 'swal-custom-title',
      content: 'swal-custom-content',
      confirmButton: 'swal-custom-confirm'
    }
  });
};

// Función para mostrar una alerta con progreso
export const showProgressAlert = async (title, text) => {
  const Swal = await loadSweetAlert2();

  return Swal.fire({
    title,
    text,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
    background: '#2a3942',
    color: '#e9edef',
    customClass: {
      popup: 'swal-custom-popup',
      title: 'swal-custom-title',
      content: 'swal-custom-content'
    }
  });
};

// Función para actualizar el progreso de una alerta
export const updateProgressAlert = async (title, text, progress) => {
  const Swal = await loadSweetAlert2();

  if (Swal.isVisible()) {
    Swal.update({
      title,
      text: `${text} (${Math.round(progress)}%)`,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }
};

// Función para cerrar una alerta
export const closeAlert = async () => {
  const Swal = await loadSweetAlert2();

  if (Swal.isVisible()) {
    Swal.close();
  }
};

// Función para mostrar información HTML (ej. lista de miembros)
export const showInfoAlert = async (title, htmlContent) => {
  const Swal = await loadSweetAlert2();

  return Swal.fire({
    title,
    html: htmlContent,
    icon: 'info',
    confirmButtonColor: 'ff453a',
    background: '#2a3942',
    color: '#e9edef',
    customClass: {
      popup: 'swal-custom-popup',
      title: 'swal-custom-title',
      content: 'swal-custom-content',
      confirmButton: 'swal-custom-confirm'
    }
  });
};
