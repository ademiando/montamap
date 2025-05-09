const hamburger = document.getElementById('hamburger');
const menu = document.getElementById('menu');
const lightBtn = document.getElementById('lightBtn');
const darkBtn = document.getElementById('darkBtn');

hamburger.addEventListener('click', () => {
  menu.classList.toggle('hidden');
});

lightBtn.addEventListener('click', () => {
  document.body.style.backgroundColor = '#f5f5f5';
});

darkBtn.addEventListener('click', () => {
  document.body.style.backgroundColor = '#1e1e1e';
});