// (1) Supabase Setup (gunakan UMD build yang sudah dipanggil di <head>)
const supabaseUrl = 'https://bntqvdqkaikkhlmfxovj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJudHF2ZHFrYWlra2hsbWZ4b3ZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MjU1NTIsImV4cCI6MjA2NDIwMTU1Mn0.jG_Mt1-3861ItE2WzpYKKg7So_WKI506c8F9RTPIl44';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

// (2) DOM Elements
const menuToggle        = document.getElementById('hamburger');
const dropdownMenu      = document.getElementById('menu');
const loginButton       = document.getElementById('loginButton');
const loginDropdown     = document.getElementById('loginDropdown');
const languageSelect    = document.getElementById('language');
const currencySelect    = document.getElementById('currency');
const lightBtn          = document.getElementById('lightBtn');
const darkBtn           = document.getElementById('darkBtn');
const mountainContainer = document.getElementById('mountainContainer');
const loadMoreBtn       = document.getElementById('loadMoreBtn');
const favoriteContainer = document.getElementById('favorite-container');

// (3) Menu Toggle
if (menuToggle && dropdownMenu) {
  menuToggle.addEventListener('click', () =>
    dropdownMenu.classList.toggle('menu-visible')
  );
  document.addEventListener('click', e => {
    if (!menuToggle.contains(e.target) && !dropdownMenu.contains(e.target)) {
      dropdownMenu.classList.remove('menu-visible');
    }
  });
}

// (4) Login Dropdown
if (loginButton && loginDropdown) {
  loginButton.addEventListener('click', () => {
    loginDropdown.style.display =
      loginDropdown.style.display === 'block' ? 'none' : 'block';
  });
  document.addEventListener('click', e => {
    if (!loginButton.contains(e.target) && !loginDropdown.contains(e.target)) {
      loginDropdown.style.display = 'none';
    }
  });
}

// (5) Language & Currency Selector
if (languageSelect && currencySelect) {
  languageSelect.value = localStorage.getItem('language') || 'en';
  currencySelect.value = localStorage.getItem('currency') || 'usd';
  languageSelect.addEventListener('change', () =>
    localStorage.setItem('language', languageSelect.value)
  );
  currencySelect.addEventListener('change', () =>
    localStorage.setItem('currency', currencySelect.value)
  );
}

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

  const btn = event?.currentTarget ||
    Array.from(document.querySelectorAll('.tab')).find(x => x.textContent.trim() === tabName);
  if (btn) btn.classList.add('active');

  if (tabName === 'Favorite') renderFavorites();
  if (tabName === 'Maps') {
    setTimeout(() => {
      if (typeof initMap === 'function') initMap();
      if (window.map) map.resize();
    }, 100);
  }
}

// (8) On Load
document.addEventListener('DOMContentLoaded', () => {
  // Terapkan tema terakhir
  setTheme(localStorage.getItem('theme') || 'light');

  // Inisialisasi mountain rendering dan tab default
  initMountainRendering();
  openTab(null, 'Mountain');
});

// (9) Fungsi Bantu: Ambil nilai filter dari dropdown
function getCurrentFilters() {
  return {
    type:          document.getElementById('type-sort')?.value      || '',
    country:       document.getElementById('country-sort')?.value   || '',
    destination:   document.getElementById('destination-sort')?.value|| '',
    difficulty:    document.getElementById('difficulty-sort')?.value || '',
    season:        document.getElementById('season-sort')?.value     || ''
  };
}

// (10) Mountain Rendering + Pagination
let loaded = 0;
const batch = 6;
const apiKey = '3187c49861f858e524980ea8dd0d43c6';

async function renderMountains() {
  // Blur mountainContainer dulu sebelum load ulang
  // agar tidak tercampur dengan loadMore lebih lanjut
  if (loaded === 0) {
    mountainContainer.innerHTML = '';
    loadMoreBtn.style.display = 'block';
  }

  const filters = getCurrentFilters();
  let query = supabase.from('mountains').select('*').eq('is_active', true);

  if (filters.type && filters.type !== 'type') query = query.eq('type', filters.type);
  if (filters.country && filters.country !== 'global') query = query.eq('country', filters.country);
  if (filters.destination && filters.destination !== 'trending') query = query.eq('destination', filters.destination);
  if (filters.difficulty && filters.difficulty !== 'level') query = query.eq('difficulty', filters.difficulty);
  if (filters.season && filters.season !== 'any') query = query.contains('season', [filters.season]);

  // Panggil Supabase dengan range untuk pagination
  const { data, error } = await query.range(loaded, loaded + batch - 1);

  if (error) {
    console.error("Supabase error:", error.message);
    mountainContainer.innerHTML = "<p>Error loading data.</p>";
    return;
  }

  // Render tiap gunung
  for (const m of data) {
    const w = await fetchWeather(m.lat, m.lon);
    mountainContainer.appendChild(createMountainCard(m, w));
  }

  loaded += data.length;
  if (data.length < batch) {
    // Kalau data hasil < batch, sembunyikan tombol Load More
    loadMoreBtn.style.display = 'none';
  }
}

// (11) Init Mountain & Filter Event
function initMountainRendering() {
  // Panggil pertama kali
  renderMountains();

  // Pagination: tombol Load More
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', renderMountains);
  }

  // Event change untuk dropdown filter
  document.querySelectorAll(".sort-options-container select").forEach(select => {
    select.addEventListener("change", () => {
      loaded = 0;
      renderMountains();
    });
  });
}

// (12) Fetch Weather dari OpenWeatherMap
async function fetchWeather(lat, lon) {
  try {
    const res = await fetch(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}` +
      `&appid=${apiKey}&units=metric`
    );
    const d = await res.json();
    if (d.main) {
      return {
        temperature: `${Math.round(d.main.temp)}°C`,
        weather:     d.weather?.[0]?.main || 'N/A',
        icon:        d.weather?.[0]?.icon || ''
      };
    }
    return { temperature: 'N/A', weather: 'N/A', icon: '' };
  } catch (err) {
    return { temperature: 'N/A', weather: 'N/A', icon: '' };
  }
}

// (13) Favorites (LocalStorage)
function getFavorites() {
  return JSON.parse(localStorage.getItem('favorites')) || [];
}
function saveFavorites(favs) {
  localStorage.setItem('favorites', JSON.stringify(favs));
}
function isFavorite(id) {
  return getFavorites().includes(id);
}

// (14) Render Favorites Tab
async function renderFavorites() {
  if (favoriteContainer) favoriteContainer.innerHTML = '';
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

// (15) Mountain Card Generator (dipakai untuk "Mountain" & "Favorite")
function createMountainCard(m, w) {
  const card = document.createElement('div');
  card.className = 'mountain-card';

  // Klik kartunya → ke halaman detail (m.link)
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
        <img src="https://openweathermap.org/img/wn/${w.icon}.png" alt="${w.weather}" class="weather-icon"/>
        ${w.temperature} | ${w.weather}
      </div>
    </div>
  `;

  // Toggle Favorite icon
  const favEl = card.querySelector('.favorite-icon');
  if (favEl) {
    favEl.addEventListener('click', e => {
      e.stopPropagation(); // cegah efek klik menuju detail
      let favs = getFavorites();
      if (favs.includes(m.id)) {
        favs = favs.filter(x => x !== m.id);
      } else {
        favs.push(m.id);
      }
      saveFavorites(favs);
      renderFavorites();  // update tab Favorite
    });
  }

  return card;
}