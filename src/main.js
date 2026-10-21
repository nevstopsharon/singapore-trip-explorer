import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mapConfig } from './map-config.js';
import './styles.css';
import { tripDays } from './data.js';

const app = document.querySelector('#app');

let activeDayIndex = 0;
let selectedStopIndex = 0;
let map = null;
let markers = [];
let routeLine = null;

app.innerHTML = `
  <main class="app-shell">
    <section class="explorer">
      <header class="topbar">
        <div>
          <p class="eyebrow">TRIP EXPLORER</p>
          <h1>新加坡 · 8 天城市探索</h1>
        </div>
        <div class="trip-meta" aria-label="Trip details">
          <span class="meta-pill">2026.12.10–12.17</span>
          <span class="meta-pill">Singapore</span>
          <span class="meta-pill">OpenStreetMap</span>
        </div>
      </header>

      <div class="day-tabs-wrap">
        <nav class="day-tabs" id="dayTabs" aria-label="按日期切换行程"></nav>
      </div>

      <div class="main-grid">
        <section class="map-panel" aria-label="新加坡旅行地图">
          <div id="map"></div>
          <div class="map-overlay" id="mapOverlay"></div>
          <div id="mapError" class="map-error" hidden></div>
        </section>

        <aside class="itinerary-panel">
          <div class="day-heading" id="dayHeading"></div>
          <div class="timeline" id="timeline"></div>
          <div class="panel-footer">
            <a class="route-button" id="routeButton" target="_blank" rel="noreferrer">在 Google Maps 查看当天步行路线</a>
            <div class="legend">点击地点卡片可定位地图<br>虚线仅表示当天游览顺序</div>
          </div>
        </aside>
      </div>

      <footer class="footer-note">
        <span>Singapore Trip Explorer · 2026</span>
        <span>行程为可编辑初版，景点营业时间与预约请出发前复核</span>
      </footer>
    </section>
  </main>
`;

const dayTabs = document.querySelector('#dayTabs');
const timeline = document.querySelector('#timeline');
const dayHeading = document.querySelector('#dayHeading');
const mapOverlay = document.querySelector('#mapOverlay');
const mapError = document.querySelector('#mapError');
const routeButton = document.querySelector('#routeButton');

function renderDayTabs() {
  dayTabs.innerHTML = tripDays.map((day, index) => `
    <button class="day-tab ${index === activeDayIndex ? 'active' : ''}" data-day-index="${index}" aria-pressed="${index === activeDayIndex}">
      <span class="d1">Day ${index + 1}</span>
      <span class="d2">${day.shortDate} · ${day.weekday}</span>
    </button>
  `).join('');

  dayTabs.querySelectorAll('.day-tab').forEach((button) => {
    button.addEventListener('click', () => {
      activeDayIndex = Number(button.dataset.dayIndex);
      selectedStopIndex = 0;
      render();
      const active = dayTabs.querySelector('.day-tab.active');
      active?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    });
  });
}

function renderDayDetails() {
  const day = tripDays[activeDayIndex];
  dayHeading.innerHTML = `
    <div>
      <h2>Day ${activeDayIndex + 1} · ${day.title}</h2>
      <p>${day.note}</p>
    </div>
    <span class="date-badge">${day.shortDate} ${day.weekday}</span>
  `;

  mapOverlay.innerHTML = `
    <strong>${day.title}</strong>
    <p>${day.places[0].area} → ${day.places[day.places.length - 1].area} · ${day.places.length} 个停靠点</p>
  `;

  timeline.innerHTML = day.places.map((place, index) => `
    <button class="stop-card ${index === selectedStopIndex ? 'selected' : ''}" data-stop-index="${index}">
      <div class="stop-row">
        <span class="stop-index">${index + 1}</span>
        <div>
          <div class="stop-time">${place.time}</div>
          <div class="stop-title">${place.zh}</div>
          <div class="stop-en">${place.name}</div>
        </div>
        <span class="stop-area">${place.area}</span>
      </div>
    </button>
  `).join('');

  timeline.querySelectorAll('.stop-card').forEach((button) => {
    button.addEventListener('click', () => {
      selectedStopIndex = Number(button.dataset.stopIndex);
      renderDayDetails();
      focusStop(selectedStopIndex);
    });
  });

  routeButton.href = buildGoogleDirectionsUrl(day.places);
}

function buildGoogleDirectionsUrl(places) {
  const origin = encodeURIComponent(`${places[0].lat},${places[0].lng}`);
  const destination = encodeURIComponent(`${places[places.length - 1].lat},${places[places.length - 1].lng}`);
  const waypoints = places.slice(1, -1).map(p => `${p.lat},${p.lng}`).join('|');
  const waypointQuery = waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : '';
  return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}${waypointQuery}&travelmode=walking`;
}


function makeMarkerIcon(index, selected = false) {
  return L.divIcon({
    className: 'trip-marker',
    html: `<span class="trip-marker-dot ${selected ? 'is-selected' : ''}">${index + 1}</span>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -18]
  });
}

function clearMapObjects() {
  markers.forEach(marker => marker.remove());
  markers = [];
  if (routeLine) routeLine.remove();
  routeLine = null;
}

function renderMapForDay() {
  if (!map) return;
  clearMapObjects();
  const day = tripDays[activeDayIndex];
  day.places.forEach((place, index) => {
    const marker = L.marker([place.lat, place.lng], {
      title: place.zh, icon: makeMarkerIcon(index, index === selectedStopIndex)
    }).addTo(map);
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = place.zh;
    const detail = document.createElement('p');
    detail.textContent = `${place.time} · ${place.area} · ${place.name}`;
    const link = document.createElement('a');
    link.textContent = '打开 Google Maps 导航';
    link.href = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.lat},${place.lng}`)}&travelmode=transit`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    content.append(title, detail, link);
    marker.bindPopup(content);
    marker.on('click', () => {
      selectedStopIndex = index;
      renderDayDetails();
      focusStop(index);
    });
    markers.push(marker);
  });
  routeLine = L.polyline(day.places.map(p => [p.lat, p.lng]), {
    color: '#d99512', weight: 3, dashArray: '6 9', opacity: 0.85
  }).addTo(map);
  map.fitBounds(L.latLngBounds(day.places.map(p => [p.lat, p.lng])), {
    paddingTopLeft: [36, 110], paddingBottomRight: [36, 36], maxZoom: 15
  });
  focusStop(selectedStopIndex, false, false);
}

function focusStop(index, openInfo = true, pan = true) {
  if (!map || !markers[index]) return;
  markers.forEach((marker, i) => {
    marker.setIcon(makeMarkerIcon(i, i === index));
    marker.setZIndexOffset(i === index ? 1000 : 0);
  });
  if (pan) map.panTo(markers[index].getLatLng());
  if (openInfo) markers[index].openPopup();
}

function render() {
  renderDayTabs();
  renderDayDetails();
  renderMapForDay();
}

function loadMap() {
  map = L.map('map', { zoomControl: false }).setView([1.3521, 103.8198], 12);
  L.control.zoom({ position: 'bottomleft' }).addTo(map);
  const tiles = L.tileLayer(mapConfig.tileUrl, {
    maxZoom: mapConfig.maxZoom, attribution: mapConfig.attribution
  }).addTo(map);
  const status = document.createElement('div');
  status.className = 'tile-status';
  status.hidden = true;
  status.textContent = '部分底图未能加载，请检查网络；仍可点击地点打开 Google Maps。';
  document.querySelector('.map-panel').append(status);
  let tileFailed = false;
  tiles.on('loading', () => { tileFailed = false; });
  tiles.on('tileerror', () => { tileFailed = true; status.hidden = false; });
  tiles.on('load', () => { status.hidden = !tileFailed; });
  new ResizeObserver(() => map.invalidateSize()).observe(document.querySelector('#map'));
  renderMapForDay();
}

render();
loadMap();
