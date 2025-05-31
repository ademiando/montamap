// (1) Supabase Setup
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
const supabaseUrl = 'https://bntqvdqkaikkhlmfxovj.supabase.co';
const supabaseKey = 'eyJhbGciOi...'; // Potong di sini untuk keamanan publik
const supabase = createClient(supabaseUrl, supabaseKey);

// (2) DOM Elements
const menuToggle = document.getElementById('hamburger');
const dropdownMenu = document.getElementById('menu');
const loginButton = document.getElementById('loginButton');
const loginDropdown = document.getElementById('loginDropdown');
const languageSelect = document.getElementById('language');
const currencySelect = document.getElementById('currency');
const lightBtn = document.getElementById('lightBtn');
const darkBtn = document.getElementById('darkBtn');
const mountainContainer = document.getElementById('mountainContainer');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const favoriteContainer = document.getElementById('favorite-container');

// (3) Menu Toggle
menuToggle?.addEventListener('click', () => dropdownMenu?.classList.toggle('menu-visible'));
document.addEventListener('click', e => {
  if (!menuToggle?.contains(e.target) && !dropdownMenu?.contains(e.target)) {
    dropdownMenu?.classList.remove('menu-visible');
  }
});

// (4) Login Dropdown
loginButton?.addEventListener('click', () => {
  loginDropdown.style.display = loginDropdown.style.display === 'block' ? 'none' : 'block';
});
document.addEventListener('click', e => {
  if (!loginButton?.contains(e.target) && !loginDropdown?.contains(e.target)) {
    loginDropdown.style.display = 'none';
  }
});

// (5) Language & Currency
languageSelect.value = localStorage.getItem('language') || 'en';
currencySelect.value = localStorage.getItem('currency') || 'usd';
languageSelect?.addEventListener('change', () => localStorage.setItem('language', languageSelect.value));
currencySelect?.addEventListener('change', () => localStorage.setItem('currency', currencySelect.value));

// (6) Theme Mode
function setTheme(mode) {
  document.documentElement.classList.toggle('dark', mode === 'dark');
  localStorage.setItem('theme', mode);
  lightBtn?.classList.toggle('active', mode === 'light');
  darkBtn?.classList.toggle('active', mode === 'dark');
}
lightBtn?.addEventListener('click', () => setTheme('light'));
darkBtn?.addEventListener('click', () => setTheme('dark'));

// (7) Tab Navigation
function openTab(event, tabName) {
  document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  const pane = document.getElementById(tabName);
  if (pane) pane.style.display = 'block';

  const btn = event?.currentTarget || Array.from(document.querySelectorAll('.tab')).find(x => x.textContent.trim() === tabName);
  if (btn) btn.classList.add('active');

  if (tabName === 'Favorite') renderFavorites();
  if (tabName === 'Maps') {
    setTimeout(() => {
      initMap?.();
      map?.resize();
    }, 100);
  }
}

// (8) On Load
document.addEventListener('DOMContentLoaded', () => {
  setTheme(localStorage.getItem('theme') || 'light');
  openTab(null, 'Mountain');
  initMountainRendering();
});

// (9) Mountain Rendering
let loaded = 0;
const batch = 6;
const apiKey = '3187c49861f858e524980ea8dd0d43c6';

async function renderMountains() {
  const filters = getCurrentFilters();
  let query = supabase.from('mountains').select('*').eq('is_active', true);

  if (filters.type && filters.type !== 'type') query = query.eq('type', filters.type);
  if (filters.country && filters.country !== 'global') query = query.eq('country', filters.country);
  if (filters.destination && filters.destination !== 'trending') query = query.eq('destination', filters.destination);
  if (filters.difficulty && filters.difficulty !== 'level') query = query.eq('difficulty', filters.difficulty);
  if (filters.season && filters.season !== 'any') query = query.contains('season', [filters.season]);

  const { data, error } = await query.range(loaded, loaded + batch - 1);
  if (error) {
    console.error("Supabase error:", error.message);
    mountainContainer.innerHTML = "<p>Error loading data.</p>";
    return;
  }

  for (const m of data) {
    const w = await fetchWeather(m.lat, m.lon);
    mountainContainer.appendChild(createMountainCard(m, w));
  }

  loaded += batch;
  if (data.length < batch) loadMoreBtn.style.display = 'none';
}

// (10) Init Mountain & Filters
function initMountainRendering() {
  renderMountains();
  loadMoreBtn?.addEventListener('click', renderMountains);
  document.querySelectorAll(".sort-options-container select").forEach(select => {
    select.addEventListener("change", () => {
      loaded = 0;
      mountainContainer.innerHTML = '';
      loadMoreBtn.style.display = 'block';
      renderMountains();
    });
  });
}

// (11) Weather Fetcher
async function fetchWeather(lat, lon) {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
    const d = await res.json();
    return d.main ? {
      temperature: `${Math.round(d.main.temp)}°C`,
      weather: d.weather?.[0]?.main || 'N/A',
      icon: d.weather?.[0]?.icon || ''
    } : { temperature: 'N/A', weather: 'N/A', icon: '' };
  } catch {
    return { temperature: 'N/A', weather: 'N/A', icon: '' };
  }
}

// (12) Favorites
function getFavorites() {
  return JSON.parse(localStorage.getItem('favorites')) || [];
}
function saveFavorites(favs) {
  localStorage.setItem('favorites', JSON.stringify(favs));
}
function isFavorite(id) {
  return getFavorites().includes(id);
}

// (13) Render Favorites
async function renderFavorites() {
  favoriteContainer.innerHTML = '';
  const favs = getFavorites();
  if (!favs.length) {
    favoriteContainer.textContent = 'No favorites yet.';
    return;
  }

  const { data, error } = await supabase.from('mountains').select('*').in('id', favs);
  if (error) {
    console.error("Supabase error:", error.message);
    favoriteContainer.innerHTML = "<p>Error loading favorites.</p>";
    return;
  }

  for (const m of data) {
    const w = await fetchWeather(m.lat, m.lon);
    favoriteContainer.appendChild(createMountainCard(m, w));
  }
}

// (14) Mountain Card
function createMountainCard(m, w) {
  const card = document.createElement('div');
  card.className = 'mountain-card';
  card.addEventListener('click', () => {
    window.location.href = `https://montamap.com/${m.link}`;
  });

  card.innerHTML = `
    <img src="${m.image}" alt="${m.name}" class="mountain-image"/>
    <div class="favorite-icon" title="${isFavorite(m.id) ? 'Unfavorite' : 'Favorite'}">
      ${isFavorite(m.id) ? '★' : '☆'}
    </div>
    <div class="gradient-overlay"></div>
    <div class="mountain-info">
      <div class="mountain-name">${m.name}</div>
      <div class="mountain-details">
        ${m.city}<br/>
        <span class="${m.status === 'Open' ? 'status-open' : 'status-closed'}">
          Status: ${m.status}
        </span><br/>
        Elevation: ${m.elevation}<br/>
        Temp: ${w.temperature}, ${w.weather}
      </div>
    </div>
  `;
  return card;
}