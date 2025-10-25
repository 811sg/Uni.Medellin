// 🔒 Control de visibilidad de opciones según el rol
document.addEventListener("DOMContentLoaded", () => {
  const rol = localStorage.getItem("rol");
  const nombre = localStorage.getItem("nombre");

  // Si no hay sesión, redirigir al login
  if (!rol) {
    window.location.href = "/HTML/registro.html";
    return;
  }

  // Mostrar nombre del usuario si hay un elemento con esa clase
  const userName = document.querySelector(".user-name");
  if (userName && nombre) {
    userName.textContent = nombre;
  }

  // Buscar el botón del panel de profesores
  const botonProfesores = document.getElementById("boton-profesores");

  if (botonProfesores) {
    if (rol === "estudiante") {
      botonProfesores.style.display = "none";
    } else if (rol === "docente") {
      botonProfesores.style.display = "inline-block";
    }
  }

  // Botón de cerrar sesión (si existe)
  const logoutBtn = document.getElementById("logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      localStorage.clear();
      window.location.href = "/HTML/registro.html";
    });
  }
});
