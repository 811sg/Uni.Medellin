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


// 🔹 Abre la información desde el ícono dentro del login
openInfo.addEventListener('click', () => {
  loginCard.classList.add('fade-out');
  setTimeout(() => {
    loginCard.classList.add('hidden');
    infoCard.classList.remove('hidden', 'fade-out');
    infoCard.classList.add('fade-in');
  }, 400);
});

// 🔹 Cierra información y vuelve al login
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

// 🔹 Cuando se envía el formulario de registro, vuelve al login
registerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  registerCard.classList.add('fade-out');
  setTimeout(() => {
    registerCard.classList.add('hidden');
    loginCard.classList.remove('hidden', 'fade-out');
    loginCard.classList.add('fade-in');
  }, 400);
});

// 🔹 Cuando se inicia sesión, redirige a principal.html
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  loginCard.classList.add('fade-out');
  setTimeout(() => {
    window.location.href = "/HTML/principal.html";
  }, 400);
});

// 🔹 Abre la tarjeta de recuperación desde login
forgotLink.addEventListener('click', (e) => {
  e.preventDefault();
  loginCard.classList.add('fade-out');
  setTimeout(() => {
    loginCard.classList.add('hidden');
    recoverCard.classList.remove('hidden', 'fade-out');
    recoverCard.classList.add('fade-in');
  }, 400);
});

// 🔹 Al confirmar recuperación, vuelve al login
recoverForm.addEventListener('submit', (e) => {
  e.preventDefault();
  recoverCard.classList.add('fade-out');
  setTimeout(() => {
    recoverCard.classList.add('hidden');
    loginCard.classList.remove('hidden', 'fade-out');
    loginCard.classList.add('fade-in');
  }, 400);
});
