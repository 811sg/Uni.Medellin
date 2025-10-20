const closeInfo = document.getElementById('closeInfo');
const infoCard = document.getElementById('infoCard');
const loginCard = document.getElementById('loginCard');

closeInfo.addEventListener('click', () => {
  infoCard.classList.add('fade-out');
  setTimeout(() => {
    infoCard.style.display = 'none';
    loginCard.classList.remove('hidden');
    loginCard.classList.add('fade-in');
  }, 400);
});
