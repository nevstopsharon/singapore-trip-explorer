import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { mapConfig } from './map-config.js';
import './styles.css';
import { tripDays, tripMeta, stayRegions } from './data.js';

const app = document.querySelector('#app');

let activeDayIndex = 0;
let selectedStopIndex = 0;
let map = null;
let markers = [];
let routeLine = null;
let regionCircles = {};
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const isPublicPlace = place => place.type !== 'stay' && Number.isFinite(place.lat) && Number.isFinite(place.lng);

app.innerHTML = `
  <main class="app-shell">
    <section class="explorer">
      <header class="topbar">
        <div>
          <p class="eyebrow">TRIP EXPLORER</p>
          <h1>${escapeHtml(tripMeta.title)}</h1>
        </div>
        <div class="trip-meta" aria-label="Trip details">
          <span class="meta-pill">${escapeHtml(tripMeta.dates)}</span>
          <span class="meta-pill">Singapore</span>
          <span class="meta-pill">OpenStreetMap</span>
        </div>
      </header>

      <section class="trip-brief" aria-label="行程与住宿说明">
        <p><strong>${escapeHtml(tripMeta.subtitle)}</strong></p>
        <p>固定：12.12 全天环球影城；12.13 下午至 12.14 中午仅住宿内部活动。只安排景点和商场，不安排餐馆。</p>
        <p class="privacy-note">${escapeHtml(tripMeta.privacy)} 12.14–12.17 酒店待定。时间为参考，可按天气和体力调整。</p>
      </section>

      <div class="day-tabs-wrap">
        <nav class="day-tabs" id="dayTabs" aria-label="按日期切换行程"></nav>
        <p class="tabs-hint">左右滑动查看全部日期 · 12.17 起仅住宿</p>
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
            <div class="legend">虚线是游览顺序，不是道路<br>住宿区域不生成导航</div>
          </div>
        </aside>
      </div>

      <footer class="footer-note">
        <span>Singapore Trip Explorer · 2026</span>
        <span>建议行程 · ${escapeHtml(tripMeta.updated)} 更新 · 景点票务与时刻以官网为准</span>
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
    <button class="day-tab ${index === activeDayIndex ? 'active' : ''} ${day.mode === 'stay-only' ? 'stay-tab' : ''}" data-day-index="${index}" aria-pressed="${index === activeDayIndex}">
      <span class="d1">Day ${index + 1}</span>
      <span class="d2">${day.shortDate} · ${day.weekday}${day.mode === 'stay-only' ? ' · 住宿' : ''}</span>
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
      <h2>Day ${activeDayIndex + 1} · ${escapeHtml(day.title)}</h2>
      <p>${escapeHtml(day.note)}</p>
      <p class="stay-summary">住宿：${escapeHtml(day.stay)} · 仅区域信息</p>
    </div>
    <span class="date-badge">${day.shortDate} ${day.weekday}</span>
  `;

  mapOverlay.innerHTML = `
    <strong>${escapeHtml(day.title)}</strong>
    <p>${day.mode === 'stay-only' ? '仅区域示意 · 无游览计划' : `${day.places.filter(isPublicPlace).length} 个公共游览点 · 住宿不精确定位`}</p>
  `;

  timeline.innerHTML = day.places.map((place, index) => `
    <button class="stop-card ${index === selectedStopIndex ? 'selected' : ''}" data-stop-index="${index}">
      <div class="stop-row">
        <span class="stop-index ${place.type === 'stay' ? 'stay-index' : ''}">${place.type === 'stay' ? '宿' : index + 1}</span>
        <div>
          <div class="stop-time">${escapeHtml(place.time)}</div>
          <div class="stop-title">${escapeHtml(place.zh)}${place.optional ? '<span class="optional-tag">可选</span>' : ''}</div>
          <div class="stop-en">${escapeHtml(place.name)}</div>
        </div>
        <span class="stop-area">${escapeHtml(place.area)}</span>
      </div>
      <span class="stop-desc">${escapeHtml(place.desc)}</span>
    </button>
  `).join('');

  timeline.querySelectorAll('.stop-card').forEach((button) => {
    button.addEventListener('click', () => {
      selectedStopIndex = Number(button.dataset.stopIndex);
      renderDayDetails();
      focusStop(selectedStopIndex);
    });
  });

  const publicPlaces = day.places.filter(isPublicPlace);
  routeButton.hidden = publicPlaces.length === 0;
  if (publicPlaces.length > 1) {
    routeButton.href = buildGoogleDirectionsUrl(publicPlaces);
    routeButton.textContent = 'Google Maps 查看公共地点顺序';
  } else if (publicPlaces.length === 1) {
    routeButton.href = navigationUrl(publicPlaces[0]);
    routeButton.textContent = 'Google Maps 导航至景点';
  } else {
    routeButton.removeAttribute('href');
  }
}

function navigationUrl(place) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${place.lat},${place.lng}`)}&travelmode=transit`;
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
  Object.values(regionCircles).forEach(circle => circle.remove());
  regionCircles = {};
  if (routeLine) routeLine.remove();
  routeLine = null;
}

function renderMapForDay() {
  if (!map) return;
  clearMapObjects();
  const day = tripDays[activeDayIndex];
  day.places.filter(place => place.type === 'stay' && place.region).forEach(place => {
    if (regionCircles[place.region]) return;
    const region = stayRegions[place.region];
    const circle = L.circle(region.center, {
      radius: region.radius, color: '#64748b', weight: 2, dashArray: '6 7', fillOpacity: 0.07
    }).addTo(map);
    const label = document.createElement('div');
    label.textContent = `${region.label} · 仅区域示意，不是住宿位置`;
    circle.bindPopup(label);
    regionCircles[place.region] = circle;
  });
  day.places.forEach((place, index) => {
    if (!isPublicPlace(place)) return;
    const marker = L.marker([place.lat, place.lng], {
      title: place.zh, icon: makeMarkerIcon(index, index === selectedStopIndex)
    }).addTo(map);
    const content = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = place.zh;
    const detail = document.createElement('p');
    detail.textContent = `${place.time} · ${place.area} · ${place.name}`;
    const description = document.createElement('p');
    description.textContent = place.desc;
    const link = document.createElement('a');
    link.textContent = '打开 Google Maps 导航';
    link.href = navigationUrl(place);
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    content.append(title, detail, description, link);
    if (place.official) {
      const official = document.createElement('a');
      official.href = place.official;
      official.textContent = '官网／票务与开放信息';
      official.target = '_blank';
      official.rel = 'noopener noreferrer';
      official.className = 'official-link';
      content.append(official);
    }
    marker.bindPopup(content);
    marker.on('click', () => {
      selectedStopIndex = index;
      renderDayDetails();
      focusStop(index);
    });
    markers[index] = marker;
  });
  const coordinates = day.places.filter(isPublicPlace).map(p => [p.lat, p.lng]);
  if (coordinates.length > 1) routeLine = L.polyline(coordinates, {
    color: '#d99512', weight: 3, dashArray: '6 9', opacity: 0.85
  }).addTo(map);
  const bounds = coordinates.length ? L.latLngBounds(coordinates) : L.latLngBounds([]);
  Object.values(regionCircles).forEach(circle => bounds.extend(circle.getBounds()));
  if (bounds.isValid()) map.fitBounds(bounds, {
    paddingTopLeft: [36, 110], paddingBottomRight: [36, 36], maxZoom: 15
  });
  else map.setView([1.32, 103.83], 11);
  focusStop(selectedStopIndex, false, false);
}

function focusStop(index, openInfo = true, pan = true) {
  if (!map) return;
  const place = tripDays[activeDayIndex].places[index];
  if (place.type === 'stay') {
    map.closePopup();
    if (pan && regionCircles[place.region]) {
      map.fitBounds(regionCircles[place.region].getBounds(), { padding: [45, 100], maxZoom: 12 });
      if (openInfo) regionCircles[place.region].openPopup();
    }
    return;
  }
  if (!markers[index]) return;
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
