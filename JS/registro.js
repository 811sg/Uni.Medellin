const closeInfo = document.getElementById('closeInfo');
const infoCard = document.getElementById('infoCard');
const loginCard = document.getElementById('loginCard');
const registerCard = document.getElementById('registerCard');
const recoverCard = document.getElementById('recoverCard');
const openRegister = document.getElementById('openRegister');
const registerForm = document.getElementById('registerForm');
const loginForm = document.getElementById('loginForm');
const recoverForm = document.getElementById('recoverForm');
const forgotLink = document.querySelector('.forgot');
const openInfo = document.getElementById('openInfo');

// =====================
// 🧭 ANIMACIONES
// =====================

// 🔹 Abre la información
openInfo.addEventListener('click', () => {
  loginCard.classList.add('fade-out');
  setTimeout(() => {
    loginCard.classList.add('hidden');
    infoCard.classList.remove('hidden', 'fade-out');
    infoCard.classList.add('fade-in');
  }, 400);
});

// 🔹 Cierra la información
closeInfo.addEventListener('click', () => {
  infoCard.classList.add('fade-out');
  setTimeout(() => {
    infoCard.classList.add('hidden');
    loginCard.classList.remove('hidden', 'fade-out');
    loginCard.classList.add('fade-in');
  }, 400);
});

// 🔹 Abre registro desde login
openRegister.addEventListener('click', () => {
  loginCard.classList.add('fade-out');
  setTimeout(() => {
    loginCard.classList.add('hidden');
    registerCard.classList.remove('hidden', 'fade-out');
    registerCard.classList.add('fade-in');
  }, 400);
});

// =====================
// 🧾 REGISTRO
// =====================
registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const nombre = document.getElementById("nombre").value.trim();
  const correo = document.getElementById("correo").value.trim();
  const contrasena = document.getElementById("contrasena").value.trim();

  if (!correo.includes("@soydocente") && !correo.includes("@soyestudiante")) {
    alert("❌ Usa tu correo institucional (@soydocente o @soyestudiante)");
    return;
  }

  try {
    const res = await fetch("http://localhost:3001/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombre, correo, contrasena }),
    });

    const msg = await res.text();

    if (res.ok) {
      alert("✅ " + msg);
      registerCard.classList.add('fade-out');
      setTimeout(() => {
        registerCard.classList.add('hidden');
        loginCard.classList.remove('hidden', 'fade-out');
        loginCard.classList.add('fade-in');
      }, 400);
    } else {
      alert("⚠️ " + msg);
    }
  } catch (error) {
    console.error(error);
    alert("❌ Error al conectar con el servidor.");
  }
});

// =====================
// 🔑 LOGIN REAL (guarda el rol y el nombre)
// =====================
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const correo = document.getElementById("usuario").value.trim();
  const contrasena = document.getElementById("password").value.trim();

  if (!correo || !contrasena) {
    alert("⚠️ Ingresa tu correo y contraseña.");
    return;
  }

  try {
    const res = await fetch("http://localhost:3001/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, contrasena }),
    });

    if (!res.ok) {
      const msg = await res.text();
      alert(msg); // Solo muestra errores
      return;
    }

    const data = await res.json();

    // 🧠 Guardar información en localStorage
    localStorage.setItem("rol", data.rol);
    localStorage.setItem("nombre", data.nombre);

    // 🔹 Redirigir directamente según rol
    loginCard.classList.add("fade-out");
    setTimeout(() => {
      window.location.href = "/HTML/principal.html";
    }, 400);
  } catch (error) {
    console.error(error);
    alert("❌ Error al conectar con el servidor.");
  }
});

// =====================
// 🔁 RECUPERAR CONTRASEÑA
// =====================
forgotLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginCard.classList.add('fade-out');
  setTimeout(() => {
    loginCard.classList.add('hidden');
    recoverCard.classList.remove('hidden', 'fade-out');
    recoverCard.classList.add('fade-in');
  }, 400);
});

recoverForm.addEventListener('submit', (e) => {
  e.preventDefault();
  recoverCard.classList.add('fade-out');
  setTimeout(() => {
    recoverCard.classList.add('hidden');
    loginCard.classList.remove('hidden', 'fade-out');
    loginCard.classList.add('fade-in');
  }, 400);
});
