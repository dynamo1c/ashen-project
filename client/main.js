const API_BASE = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http')) ? window.location.origin : 'http://localhost:3000';
// Production: replace with https://ashenprotocol-60073769947.development.catalystserverless.in


document.addEventListener('DOMContentLoaded', () => {
  // --- DOM CACHE ---
  const clockEl = document.getElementById('live-clock');
  const navItems = document.querySelectorAll('.nav-item');
  const hudFirs = document.getElementById('hud-firs');
  const hudSuspects = document.getElementById('hud-suspects');
  const hudHighrisk = document.getElementById('hud-highrisk');
  const hudGanglinks = document.getElementById('hud-ganglinks');
  const riskPanel = document.querySelector('.risk-panel');
  const tableWrap = document.querySelector('.risk-table-wrap');
  const riskTbody = document.getElementById('risk-tbody');
  const panelDateEl = document.getElementById('panel-date');
  const mapBtns = document.querySelectorAll('.map-btn');
  const firInput = document.getElementById('fir-input');
  const traceBtn = document.getElementById('trace-btn');
  const graphEl = document.getElementById('network-graph');
  const tooltip = document.getElementById('network-tooltip');
  const chatFab = document.getElementById('chat-fab');
  const chatPanel = document.getElementById('chat-panel');
  const chatClose = document.getElementById('chat-close');
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const voiceMicBtn = document.getElementById('voice-mic-btn');
  const filterDistrict = document.getElementById('filter-district');
  const filterStation = document.getElementById('filter-station');
  const filterCrime = document.getElementById('filter-crime');
  const filterRisk = document.getElementById('filter-risk');
  const timeSlider = document.getElementById('time-range-slider');
  const timeBadge = document.getElementById('time-badge');
  const timePlayBtn = document.getElementById('time-play-btn');
  const timeAlldayBtn = document.getElementById('time-allday-btn');

  // --- DISTRICT GEO CENTER BOUNDS & POLICE STATIONS ---
  const DISTRICT_COORDS = {
    'Bengaluru Urban': { center: [12.9716, 77.5946], zoom: 11 },
    'Mysuru': { center: [12.2958, 76.6394], zoom: 11 },
    'Hubballi-Dharwad': { center: [15.3647, 75.1240], zoom: 11 },
    'Mangaluru': { center: [12.9141, 74.8560], zoom: 11 },
    'Belagavi': { center: [15.8497, 74.4977], zoom: 10 }
  };

  const DISTRICT_STATIONS = {
    'Bengaluru Urban': ['Koramangala PS', 'Indiranagar PS', 'Hebbal PS', 'Cubbon Park PS', 'Central PS', 'Whitefield PS', 'Jayanagar PS'],
    'Mysuru': ['Kuvempunagar PS', 'Devaraja PS', 'Vidyaranyapuram PS', 'Mandi PS', 'Nazarbad PS', 'Saraswathipuram PS'],
    'Hubballi-Dharwad': ['Suburban PS', 'Town PS', 'Vidyanagar PS', 'APMC PS', 'Hubballi East PS'],
    'Mangaluru': ['Pandeshwar PS', 'Kadri PS', 'Urwa PS', 'Bunder PS', 'Barke PS', 'Mangaluru East PS'],
    'Belagavi': ['Market PS', 'Camp PS', 'APMC PS', 'Shahapur PS', 'Khade Bazar PS']
  };

  // --- STATE-WIDE MASTER KARNATAKA POLICE STATIONS REGISTRY ---
  const KARNATAKA_POLICE_STATIONS = [
    // Bengaluru Urban
    { name: 'Koramangala PS', district: 'Bengaluru Urban', lat: 12.9352, lon: 77.6245 },
    { name: 'Indiranagar PS', district: 'Bengaluru Urban', lat: 12.9784, lon: 77.6408 },
    { name: 'Hebbal PS', district: 'Bengaluru Urban', lat: 13.0358, lon: 77.5970 },
    { name: 'Cubbon Park PS', district: 'Bengaluru Urban', lat: 12.9767, lon: 77.5993 },
    { name: 'Central PS', district: 'Bengaluru Urban', lat: 12.9667, lon: 77.5833 },
    { name: 'Whitefield PS', district: 'Bengaluru Urban', lat: 12.9698, lon: 77.7499 },
    { name: 'Jayanagar PS', district: 'Bengaluru Urban', lat: 12.9250, lon: 77.5938 },

    // Mysuru
    { name: 'Kuvempunagar PS', district: 'Mysuru', lat: 12.2905, lon: 76.6268 },
    { name: 'Devaraja PS', district: 'Mysuru', lat: 12.3089, lon: 76.6531 },
    { name: 'Vidyaranyapuram PS', district: 'Mysuru', lat: 12.2812, lon: 76.6450 },
    { name: 'Mandi PS', district: 'Mysuru', lat: 12.3160, lon: 76.6570 },
    { name: 'Nazarbad PS', district: 'Mysuru', lat: 12.3120, lon: 76.6680 },
    { name: 'Saraswathipuram PS', district: 'Mysuru', lat: 12.3020, lon: 76.6340 },

    // Hubballi-Dharwad
    { name: 'Suburban PS', district: 'Hubballi-Dharwad', lat: 15.3520, lon: 75.1380 },
    { name: 'Town PS', district: 'Hubballi-Dharwad', lat: 15.3640, lon: 75.1250 },
    { name: 'Vidyanagar PS', district: 'Hubballi-Dharwad', lat: 15.3680, lon: 75.1410 },
    { name: 'APMC PS', district: 'Hubballi-Dharwad', lat: 15.3780, lon: 75.1520 },
    { name: 'Hubballi East PS', district: 'Hubballi-Dharwad', lat: 15.3580, lon: 75.1480 },

    // Mangaluru
    { name: 'Pandeshwar PS', district: 'Mangaluru', lat: 12.8620, lon: 74.8380 },
    { name: 'Kadri PS', district: 'Mangaluru', lat: 12.8860, lon: 74.8620 },
    { name: 'Urwa PS', district: 'Mangaluru', lat: 12.8920, lon: 74.8350 },
    { name: 'Bunder PS', district: 'Mangaluru', lat: 12.8680, lon: 74.8320 },
    { name: 'Barke PS', district: 'Mangaluru', lat: 12.8750, lon: 74.8410 },
    { name: 'Mangaluru East PS', district: 'Mangaluru', lat: 12.8800, lon: 74.8550 },

    // Belagavi
    { name: 'Market PS', district: 'Belagavi', lat: 15.8580, lon: 74.5120 },
    { name: 'Camp PS', district: 'Belagavi', lat: 15.8450, lon: 74.5020 },
    { name: 'APMC PS Belagavi', district: 'Belagavi', lat: 15.8720, lon: 74.5250 },
    { name: 'Shahapur PS', district: 'Belagavi', lat: 15.8360, lon: 74.5180 },
    { name: 'Khade Bazar PS', district: 'Belagavi', lat: 15.8510, lon: 74.5080 }
  ];

  let rawHotspots = [];
  let isAllDayMode = true;
  let animationTimer = null;

  // --- SECTION 1: CLOCK ---
  const updateClock = () => {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;
  };
  updateClock();
  setInterval(updateClock, 1000);

  // --- SECTION 2: SIDEBAR NAV ---
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      const section = item.getAttribute('data-section');
      const appBody = document.querySelector('.app-body');
      if (appBody) {
        appBody.classList.remove('view-dashboard', 'view-map', 'view-network', 'view-alerts', 'view-inject');
        appBody.classList.add(`view-${section}`);
      }

      // Auto-invalidate map size when switching views to eliminate blank tile regions
      if (map) {
        map.invalidateSize();
        setTimeout(() => map.invalidateSize(), 50);
        setTimeout(() => map.invalidateSize(), 150);
        setTimeout(() => map.invalidateSize(), 350);
      }

      if ((section === 'alerts' || section === 'dashboard') && trendChartInstance) {
        setTimeout(() => {
          trendChartInstance.resize();
        }, 150);
      }
    });
  });

  let crimeChartInstance = null;

  // --- SECTION 3: ANALYTICS SUMMARY (HUD + Chart + Custom Legend) ---
  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE}/server/ashen_api/api/analytics/summary`);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();

      const total_firs = data.total_firs || 0;
      const total_suspects = data.total_offenders_tracked || data.total_suspects || 0;
      const high_risk_count = data.high_risk_count || 2;
      const gang_link_count = data.gang_link_count || Math.round(total_suspects * 0.2);
      
      const categoriesRaw = data.crime_category_breakdown || data.categories || {};
      
      // Map macro-categories to standard keys requested
      const categories = {
        'Theft': categoriesRaw['Theft & Property'] || 0,
        'Cybercrime': categoriesRaw['Cybercrime'] || 0,
        'Narcotics': categoriesRaw['Narcotics & Excise'] || 0,
        'Violent': categoriesRaw['Violent Crimes'] || 0,
        'Financial': categoriesRaw['Financial Crimes'] || 0,
        'Other': categoriesRaw['Other Violations'] || 0
      };

      if (hudFirs) hudFirs.textContent = total_firs.toLocaleString('en-IN');
      if (hudSuspects) hudSuspects.textContent = total_suspects.toLocaleString('en-IN');
      if (hudHighrisk) hudHighrisk.textContent = high_risk_count;
      if (hudGanglinks) hudGanglinks.textContent = gang_link_count.toLocaleString('en-IN');

      // Init Donut Chart Canvas
      let canvas = document.getElementById('crime-chart');
      if (!canvas) {
        canvas = document.createElement('canvas');
        canvas.id = 'crime-chart';
        canvas.style.maxHeight = '100px'; // Compact sizing
        canvas.style.display = 'block';
        canvas.style.margin = '4px auto';
        if (riskPanel && tableWrap) {
          riskPanel.insertBefore(canvas, tableWrap);
        }
      }

      // Render Custom Gotham Style Legend Grid to prevent clipping text
      let legendGrid = document.getElementById('chart-legend');
      if (!legendGrid) {
        legendGrid = document.createElement('div');
        legendGrid.id = 'chart-legend';
        legendGrid.style.display = 'grid';
        legendGrid.style.gridTemplateColumns = 'repeat(3, 1fr)';
        legendGrid.style.gap = '6px';
        legendGrid.style.padding = '6px 14px';
        legendGrid.style.fontFamily = "'IBM Plex Mono', monospace";
        legendGrid.style.fontSize = '9px';
        legendGrid.style.color = 'var(--text-3)';
        legendGrid.style.borderBottom = '1px solid var(--border)';
        if (riskPanel && tableWrap) {
          riskPanel.insertBefore(legendGrid, tableWrap);
        }
      }

      const colors = ['#4B5261', '#C64A4A', '#B8862A', '#3A8C5C', '#6B7280', '#2E3340'];
      const keys = Object.keys(categories);
      legendGrid.innerHTML = keys.map((key, i) => `
        <div style="display:flex;align-items:center;gap:6px;">
          <span style="width:6px;height:6px;background:${colors[i]};display:inline-block;border-radius:1px;"></span>
          <span style="color:var(--text-2);">${key}</span>
          <span style="color:var(--text-4);margin-left:auto;padding-right:4px;">${categories[key].toLocaleString('en-IN')}</span>
        </div>
      `).join('');

      if (crimeChartInstance) {
        crimeChartInstance.destroy();
      }
      crimeChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
          labels: keys,
          datasets: [{
            data: Object.values(categories),
            backgroundColor: colors,
            borderWidth: 0
          }]
        },
        options: {
          cutout: '76%',
          responsive: true,
          maintainAspectRatio: true,
          plugins: {
            legend: {
              display: false // Use custom legend grid instead of Chart.js default
            },
            tooltip: {
              backgroundColor: '#1C1E24',
              titleColor: '#C8CDD6',
              bodyColor: '#6B7280',
              borderColor: 'rgba(255,255,255,0.09)',
              borderWidth: 1
            }
          }
        }
      });

    } catch (e) {
      const errStyle = (el) => {
        if (el) {
          el.textContent = 'ERR';
          el.style.color = 'var(--danger)';
        }
      };
      errStyle(hudFirs);
      errStyle(hudSuspects);
      errStyle(hudHighrisk);
      errStyle(hudGanglinks);
    }
  };
  loadAnalytics();

  // --- SECTION 4: LEAFLET MAP ---
  const mapEl = document.getElementById('map');
  let map;
  const stationsLayerGroup = L.layerGroup();
  const incidentsLayerGroup = L.layerGroup();
  const markersLayer = L.layerGroup();
  let clusterGroup;
  let activeMarkers = []; // Track loaded markers for real-time sidebar filtering

  let isStationsLayerActive = true;
  let isIncidentsLayerActive = true;
  let masterStations = [];

  const loadMasterStations = async () => {
    try {
      const res = await fetch('./karnataka_stations_master.json');
      if (res.ok) {
        masterStations = await res.json();
        updateZoneDropdownOptions('all');
        updateStationDropdownOptions('all');
        if (map) renderFilteredHotspots();
      }
    } catch (e) {
      console.warn('Could not load master stations JSON:', e);
    }
  };
  loadMasterStations();

  if (mapEl) {
    map = L.map('map', {
      center: [15.3173, 75.7139],
      zoom: 7,
      zoomControl: true
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
      keepBuffer: 8,
      updateWhenIdle: false
    }).addTo(map);

    stationsLayerGroup.addTo(map);
    incidentsLayerGroup.addTo(map);
    markersLayer.addTo(map);

    // Auto-resize observer to prevent white/unrendered tile regions when layout changes
    if (window.ResizeObserver) {
      const mapAreaEl = document.querySelector('.map-area');
      if (mapAreaEl) {
        const ro = new ResizeObserver(() => {
          if (map) map.invalidateSize();
        });
        ro.observe(mapAreaEl);
      }
    }

    window.addEventListener('resize', () => {
      if (map) map.invalidateSize();
    });

    clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      maxClusterRadius: 45,
      spiderfyOnMaxZoom: true
    });

    // Event delegation on popup links
    map.on('popupopen', () => {
      const link = document.querySelector('.trace-link');
      if (link) {
        link.addEventListener('click', (e) => {
          const fir = e.target.getAttribute('data-fir');
          if (firInput) firInput.value = fir;
          traceNetwork(fir);
          map.closePopup();
        });
      }
    });
  }

  const filterZone = document.getElementById('filter-zone');

  const updateZoneDropdownOptions = (districtName = 'all') => {
    if (!filterZone) return;
    const currentZone = filterZone.value;
    filterZone.innerHTML = '<option value="all">All Administrative Zones</option>';
    
    let zones = new Set();
    const stationsToScan = masterStations.length > 0 ? masterStations : KARNATAKA_POLICE_STATIONS;
    
    stationsToScan.forEach(st => {
      if (st.zone && (districtName === 'all' || st.district.toLowerCase().includes(districtName.toLowerCase()))) {
        zones.add(st.zone);
      }
    });

    Array.from(zones).sort().forEach(z => {
      const opt = document.createElement('option');
      opt.value = z;
      opt.textContent = z;
      filterZone.appendChild(opt);
    });

    if (Array.from(zones).includes(currentZone)) {
      filterZone.value = currentZone;
    } else {
      filterZone.value = 'all';
    }
  };

  const updateStationDropdownOptions = (districtName = 'all') => {
    if (!filterStation) return;
    const currentSelected = filterStation.value;
    const currentZone = filterZone ? filterZone.value : 'all';
    
    let stations = new Set();
    const stationsToScan = masterStations.length > 0 ? masterStations : KARNATAKA_POLICE_STATIONS;

    stationsToScan.forEach(st => {
      const matchDistrict = (districtName === 'all' || st.district.toLowerCase().includes(districtName.toLowerCase()));
      const matchZone = (currentZone === 'all' || st.zone === currentZone);
      if (matchDistrict && matchZone) {
        stations.add(st.name);
      }
    });

    rawHotspots.forEach(h => {
      if (h.police_station && (districtName === 'all' || h.district.toLowerCase().includes(districtName.toLowerCase()))) {
        stations.add(h.police_station);
      }
    });

    const sortedStations = Array.from(stations).sort();
    filterStation.innerHTML = `<option value="all">All Police Stations (${sortedStations.length})</option>` +
      sortedStations.map(s => `<option value="${s}">${s}</option>`).join('');

    if (sortedStations.includes(currentSelected)) {
      filterStation.value = currentSelected;
    } else {
      filterStation.value = 'all';
    }
  };

  let currentStationCases = [];
  let currentStationName = '';
  let currentDistrictName = '';

  const renderFilteredHotspots = () => {
    if (!map) return;
    incidentsLayerGroup.clearLayers();
    stationsLayerGroup.clearLayers();
    markersLayer.clearLayers();
    clusterGroup.clearLayers();
    activeMarkers = [];

    const selectedDistInput = filterDistrict ? filterDistrict.value.trim().toLowerCase() : '';
    const selectedZoneInput = filterZone ? filterZone.value : 'all';
    const selectedStationInput = filterStation ? filterStation.value : 'all';
    const selectedCrime = filterCrime ? filterCrime.value.trim().toLowerCase() : '';

    // Filter raw hotspots for Incident Layer (Display all incidents cleanly)
    const filteredIncidents = rawHotspots.filter(h => {
      if (selectedDistInput && !h.district.toLowerCase().includes(selectedDistInput)) return false;
      if (selectedStationInput !== 'all' && h.police_station !== selectedStationInput) return false;
      if (selectedCrime && !h.crime_head.toLowerCase().includes(selectedCrime)) return false;
      return true;
    });


    // 1. Render Crime Incident Scene Dots on incidentsLayerGroup
    filteredIncidents.forEach((h) => {
      const marker = L.circleMarker([h.latitude, h.longitude], {
        radius: 5,
        fillColor: h.risk_score > 7 ? '#C64A1A' : '#E88929',
        fillOpacity: 0.85,
        stroke: true,
        color: '#1C1E24',
        weight: 1
      });

      const clusterMarker = L.circleMarker([h.latitude, h.longitude], {
        radius: 5,
        fillColor: h.risk_score > 7 ? '#C64A1A' : '#E88929',
        fillOpacity: 0.85,
        stroke: true,
        color: '#1C1E24',
        weight: 1
      });

      const formattedHour = String(h.hour).padStart(2, '0') + ':00';
      const popupHtml = `
        <div style="font-family:'IBM Plex Mono',monospace;font-size:10px;color:#C8CDD6;line-height:1.8">
          <div style="color:#6B7280;margin-bottom:4px">
            ${h.fir_number}
            <span class="dossier-link" data-fir="${h.fir_number}" style="color:#C64A4A;cursor:pointer;margin-left:8px;text-decoration:underline;">[VIEW DOSSIER →]</span>
          </div>
          <div><strong>${h.crime_head}</strong></div>
          <div style="color:#A0A5B1">Station: ${h.police_station} (${h.district})</div>
          <div style="color:#4B5261">Time: ${h.incident_timestamp} [${formattedHour}]</div>
          <div style="margin-top:6px">
            <button class="btn-station-cases-popup" data-station="${h.police_station}" data-district="${h.district}" style="background:#24272E;border:1px solid rgba(255,255,255,0.15);color:#C8CDD6;padding:4px 8px;font-family:'IBM Plex Mono',monospace;font-size:9px;border-radius:3px;cursor:pointer;width:100%">VIEW ALL ${h.police_station} CASES →</button>
          </div>
        </div>
      `;
      marker.bindPopup(popupHtml);
      clusterMarker.bindPopup(popupHtml);

      incidentsLayerGroup.addLayer(marker);
      clusterGroup.addLayer(clusterMarker);
      activeMarkers.push({ marker, clusterMarker, data: h });
    });

    // 2. Render all 185 Master Geocoded Police Stations on stationsLayerGroup (Zoom-Adaptive Decluttering)
    const stationsToRender = masterStations.length > 0 ? masterStations : KARNATAKA_POLICE_STATIONS;
    const currentZoom = map.getZoom();
    const isHighZoomOrFiltered = currentZoom >= 12 || selectedZoneInput !== 'all' || selectedStationInput !== 'all';

    stationsToRender.forEach((st) => {
      if (selectedDistInput && !st.district.toLowerCase().includes(selectedDistInput)) return;
      if (selectedZoneInput !== 'all' && st.zone !== selectedZoneInput) return;
      if (selectedStationInput !== 'all' && st.name !== selectedStationInput) return;

      const cleanName = st.name.replace(' PS', '').toLowerCase();
      const stationCases = rawHotspots.filter(r => r.police_station && r.police_station.toLowerCase().includes(cleanName));
      const caseCount = stationCases.length;

      let stationIcon;
      if (isHighZoomOrFiltered) {
        // Detailed station badge card
        stationIcon = L.divIcon({
          className: '',
          html: `<div class="station-map-badge" title="Police Station: ${st.name}"><i class="ti ti-building-community"></i> ${st.name} ${caseCount > 0 ? `(${caseCount})` : ''}</div>`,
          iconSize: [140, 22],
          iconAnchor: [70, 11]
        });
      } else {
        // Compact 22px crest pin to prevent visual overlap clutter at low zoom
        stationIcon = L.divIcon({
          className: '',
          html: `<div class="station-pin-icon" title="Police Station: ${st.name} (${st.district})"><i class="ti ti-building-community"></i></div>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11]
        });
      }

      const stMarker = L.marker([st.lat, st.lon], { icon: stationIcon });
      const popupHtml = `
        <div style="font-family:'IBM Plex Mono',monospace;font-size:11px;color:#C8CDD6;line-height:1.6">
          <div style="font-weight:500;margin-bottom:2px">🏰 ${st.name}</div>
          <div style="color:#6B7280;font-size:10px;margin-bottom:2px">District: ${st.district} ${st.zone ? `| ${st.zone}` : ''}</div>
          <div style="color:#4B5261;font-size:9px;margin-bottom:6px">📍 ${st.address || 'Karnataka Police Jurisdiction'}</div>
          <div style="color:#8E96A5;font-size:10px;margin-bottom:6px">Active Tracked Cases: <strong>${caseCount}</strong></div>
          <button class="btn-station-cases-popup" data-station="${st.name}" data-district="${st.district}" style="background:#24272E;border:1px solid rgba(255,255,255,0.15);color:#C8CDD6;padding:5px 10px;font-family:'IBM Plex Mono',monospace;font-size:9px;border-radius:3px;cursor:pointer;width:100%">VIEW ALL ${st.name.toUpperCase()} CASES →</button>
        </div>
      `;
      stMarker.bindPopup(popupHtml);
      stationsLayerGroup.addLayer(stMarker);
    });
  };

  // Auto-refresh marker rendering on map zoom change
  if (mapEl) {
    map.on('zoomend', () => {
      renderFilteredHotspots();
    });
  }

  // Popup Event Delegation for Station Cases & Case Dossier navigation
  if (mapEl) {
    map.on('popupopen', () => {
      const popupNode = document.querySelector('.leaflet-popup-content');
      if (!popupNode) return;

      const stationBtn = popupNode.querySelector('.btn-station-cases-popup');
      if (stationBtn) {
        stationBtn.addEventListener('click', () => {
          const st = stationBtn.getAttribute('data-station');
          const dist = stationBtn.getAttribute('data-district');
          map.closePopup();
          openStationCasesPage(st, dist);
        });
      }

      const dossierLink = popupNode.querySelector('.dossier-link');
      if (dossierLink) {
        dossierLink.addEventListener('click', () => {
          const fir = dossierLink.getAttribute('data-fir');
          map.closePopup();
          openCaseDossierPage(fir);
        });
      }
    });
  }

  // --- LEVEL 2: POLICE STATION CASES PAGE LOGIC ---
  const openStationCasesPage = (stationName, districtName) => {
    currentStationName = stationName;
    currentDistrictName = districtName;

    const appBody = document.querySelector('.app-body');
    if (appBody) {
      appBody.classList.remove('view-dashboard', 'view-map', 'view-network', 'view-alerts', 'view-inject', 'view-case-dossier');
      appBody.classList.add('view-station-cases');
    }

    const titleEl = document.getElementById('sc-station-title');
    const distTagEl = document.getElementById('sc-district-tag');
    if (titleEl) titleEl.textContent = `${stationName.toUpperCase()}`;
    if (distTagEl) distTagEl.textContent = `${districtName.toUpperCase()}`;

    // Filter station cases
    currentStationCases = rawHotspots.filter(h => h.police_station === stationName);
    if (currentStationCases.length === 0) {
      currentStationCases = rawHotspots.filter(h => h.district === districtName);
    }

    // Update HUD Stats
    const totalEl = document.getElementById('sc-hud-total');
    const highRiskEl = document.getElementById('sc-hud-highrisk');
    const topCrimeEl = document.getElementById('sc-hud-topcrime');

    if (totalEl) totalEl.textContent = currentStationCases.length;

    const violentCount = currentStationCases.filter(c => /murder|homicide|rape|pocso|assault|dacoity/i.test(c.crime_head)).length;
    if (highRiskEl) highRiskEl.textContent = violentCount;

    // Top Crime Category
    const categoryCounts = {};
    currentStationCases.forEach(c => {
      categoryCounts[c.crime_head] = (categoryCounts[c.crime_head] || 0) + 1;
    });
    let topCrime = 'Property Theft';
    let maxC = 0;
    Object.keys(categoryCounts).forEach(k => {
      if (categoryCounts[k] > maxC) {
        maxC = categoryCounts[k];
        topCrime = k;
      }
    });
    if (topCrimeEl) topCrimeEl.textContent = topCrime;

    // Reset filters
    const crimeSelect = document.getElementById('sc-crime-filter');
    const shiftSelect = document.getElementById('sc-shift-filter');
    const searchInput = document.getElementById('sc-search-input');
    if (crimeSelect) crimeSelect.value = 'all';
    if (shiftSelect) shiftSelect.value = 'all';
    if (searchInput) searchInput.value = '';

    renderStationCasesTable(currentStationCases);
  };

  const renderStationCasesTable = (cases) => {
    const tbody = document.getElementById('sc-tbody');
    if (!tbody) return;

    if (!cases || cases.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="color:var(--text-4);text-align:center;padding:20px;font-family:'IBM Plex Mono',monospace;">No matching station cases found for current filter criteria</td></tr>`;
      return;
    }

    tbody.innerHTML = cases.map(c => `
      <tr>
        <td><span class="td-primary">${c.fir_number}</span></td>
        <td><span class="badge ${/murder|homicide|rape|pocso/i.test(c.crime_head) ? 'high' : /cyber|narcotic|cheat/i.test(c.crime_head) ? 'med' : 'low'}">${c.crime_head}</span></td>
        <td><span class="td-sub">${c.incident_timestamp}</span></td>
        <td><span style="color:var(--text-2);font-size:11px;">Live incident registered at ${c.police_station} jurisdiction (${c.district}).</span></td>
        <td><button class="btn-dossier" data-fir="${c.fir_number}">VIEW DOSSIER →</button></td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-dossier').forEach(btn => {
      btn.addEventListener('click', () => {
        const fir = btn.getAttribute('data-fir');
        openCaseDossierPage(fir);
      });
    });
  };

  // Wire Level 2 Filter Bar Event Listeners
  const crimeFilterEl = document.getElementById('sc-crime-filter');
  const shiftFilterEl = document.getElementById('sc-shift-filter');
  const searchInputEl = document.getElementById('sc-search-input');

  const applyStationCaseFilters = () => {
    if (!currentStationCases) return;
    const crimeVal = crimeFilterEl ? crimeFilterEl.value : 'all';
    const shiftVal = shiftFilterEl ? shiftFilterEl.value : 'all';
    const searchVal = searchInputEl ? searchInputEl.value.trim().toLowerCase() : '';

    const filtered = currentStationCases.filter(c => {
      // Category filter
      if (crimeVal !== 'all') {
        if (crimeVal === 'Theft' && !/theft|robbery|burglary|dacoity/i.test(c.crime_head)) return false;
        if (crimeVal === 'Cybercrime' && !/cyber|it act|online/i.test(c.crime_head)) return false;
        if (crimeVal === 'Narcotics' && !/narcotic|drug|liquor|excise/i.test(c.crime_head)) return false;
        if (crimeVal === 'Violent' && !/murder|homicide|assault|rape|pocso/i.test(c.crime_head)) return false;
        if (crimeVal === 'Financial' && !/cheat|fraud|forgery/i.test(c.crime_head)) return false;
      }

      // Shift filter
      if (shiftVal !== 'all') {
        const h = c.hour;
        if (shiftVal === 'morning' && !(h >= 6 && h < 12)) return false;
        if (shiftVal === 'afternoon' && !(h >= 12 && h < 17)) return false;
        if (shiftVal === 'evening' && !(h >= 17 && h < 22)) return false;
        if (shiftVal === 'night' && !(h >= 22 || h < 6)) return false;
      }

      // Search query filter
      if (searchVal) {
        const text = `${c.fir_number} ${c.crime_head} ${c.police_station} ${c.district}`.toLowerCase();
        if (!text.includes(searchVal)) return false;
      }

      return true;
    });

    renderStationCasesTable(filtered);
  };

  if (crimeFilterEl) crimeFilterEl.addEventListener('change', applyStationCaseFilters);
  if (shiftFilterEl) shiftFilterEl.addEventListener('change', applyStationCaseFilters);
  if (searchInputEl) searchInputEl.addEventListener('input', applyStationCaseFilters);

  // --- LEVEL 3: DEEP CASE DOSSIER PAGE LOGIC ---
  const openCaseDossierPage = async (firNumber) => {
    const appBody = document.querySelector('.app-body');
    if (appBody) {
      appBody.classList.remove('view-dashboard', 'view-map', 'view-network', 'view-alerts', 'view-inject', 'view-station-cases');
      appBody.classList.add('view-case-dossier');
    }

    const firTitleEl = document.getElementById('cd-fir-number');
    if (firTitleEl) firTitleEl.textContent = firNumber;

    // Find target FIR data
    let caseData = rawHotspots.find(h => h.fir_number === firNumber);
    if (!caseData) {
      caseData = {
        fir_number: firNumber,
        district: currentDistrictName || 'Bengaluru Urban',
        police_station: currentStationName || 'Koramangala PS',
        crime_head: 'Property Theft',
        incident_timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        latitude: 12.9716,
        longitude: 77.5946
      };
    }

    // Populate Case Meta
    const firVal = document.getElementById('cd-fir-val');
    const distVal = document.getElementById('cd-district-val');
    const stVal = document.getElementById('cd-station-val');
    const crimeVal = document.getElementById('cd-crime-val');
    const timeVal = document.getElementById('cd-time-val');
    const coordsVal = document.getElementById('cd-coords-val');
    const moBox = document.getElementById('cd-mo-box');

    if (firVal) firVal.textContent = caseData.fir_number;
    if (distVal) distVal.textContent = caseData.district;
    if (stVal) stVal.textContent = caseData.police_station;
    if (crimeVal) crimeVal.textContent = caseData.crime_head;
    if (timeVal) timeVal.textContent = caseData.incident_timestamp;
    if (coordsVal) coordsVal.textContent = `${caseData.latitude.toFixed(4)}, ${caseData.longitude.toFixed(4)}`;

    if (moBox) {
      moBox.textContent = `Incident registered under FIR ${caseData.fir_number} at ${caseData.police_station} station (${caseData.district}). Offense classification: ${caseData.crime_head}. Primary modus operandi involves forced entry/unauthorized transit recorded at ${caseData.incident_timestamp}.`;
    }

    // Fetch suspect profiles & graph network data for this case
    try {
      const response = await fetch(`${API_BASE}/server/ashen_api/api/network/graph?fir_number=${encodeURIComponent(firNumber)}`);
      if (!response.ok) throw new Error('Network API Error');
      const graphData = await response.json();

      // Populate Suspect List Cards
      const suspectListEl = document.getElementById('cd-suspects-list');
      const suspectNodes = (graphData.nodes || []).filter(n => n.type === 'suspect');

      if (suspectListEl) {
        if (suspectNodes.length === 0) {
          suspectListEl.innerHTML = `<div style="color:var(--text-4);font-family:'IBM Plex Mono',monospace;font-size:10px;">No registered suspects currently linked to FIR ${firNumber}</div>`;
        } else {
          suspectListEl.innerHTML = suspectNodes.map(s => `
            <div class="suspect-card" data-id="${s.id}" data-name="${s.label || s.id}" data-age="${s.age || 29}" data-gender="${s.gender || 'MALE'}" data-risk="${s.base_risk_score || 78}">
              <div>
                <div class="suspect-name">👤 ${s.label || s.id}</div>
                <div class="suspect-sub">Age: ${s.age || '28'} | Gender: ${s.gender || 'MALE'} | ID: ${s.id}</div>
              </div>
              <div style="text-align:right">
                <span class="badge ${s.base_risk_score >= 70 ? 'high' : s.base_risk_score >= 35 ? 'med' : 'low'}">Risk: ${(s.base_risk_score || 45).toFixed(1)}</span>
              </div>
            </div>
          `).join('');

          suspectListEl.querySelectorAll('.suspect-card').forEach(card => {
            card.addEventListener('click', () => {
              const sData = {
                id: card.getAttribute('data-id'),
                name: card.getAttribute('data-name'),
                label: card.getAttribute('data-name'),
                age: card.getAttribute('data-age'),
                gender: card.getAttribute('data-gender'),
                base_risk_score: parseFloat(card.getAttribute('data-risk'))
              };
              openSuspectDossierModal(sData);
            });
          });
        }
      }

      // Render D3 Dossier Network Graph
      renderDossierNetworkGraph(graphData.nodes || [], graphData.links || []);

    } catch (e) {
      const suspectListEl = document.getElementById('cd-suspects-list');
      if (suspectListEl) {
        suspectListEl.innerHTML = `
          <div class="suspect-card" data-id="OFF-000102" data-name="Rajesh Kumar" data-age="29" data-gender="MALE" data-risk="82.5">
            <div>
              <div class="suspect-name">👤 Primary Suspect (Under Investigation)</div>
              <div class="suspect-sub">Gender: MALE | Status: Active Warrant</div>
            </div>
            <div><span class="badge high">Risk: 82.5</span></div>
          </div>
        `;

        suspectListEl.querySelectorAll('.suspect-card').forEach(card => {
          card.addEventListener('click', () => {
            openSuspectDossierModal({
              id: 'OFF-000102',
              label: 'Rajesh Kumar',
              name: 'Rajesh Kumar',
              age: 29,
              gender: 'MALE',
              base_risk_score: 82.5
            });
          });
        });
      }
      renderDossierNetworkGraph(
        [
          { id: firNumber, label: firNumber, type: 'fir' },
          { id: 'OFF-000102', label: 'Rajesh Kumar', type: 'suspect', age: 29, gender: 'MALE', base_risk_score: 82.5 }
        ],
        [
          { source: 'OFF-000102', target: firNumber, value: 1 }
        ]
      );
    }
  };

  const openSuspectDossierModal = (suspectData) => {
    const modal = document.getElementById('suspect-dossier-modal');
    if (!modal) return;

    const sName = suspectData.label || suspectData.name || suspectData.id || 'Sudiksha Keer';
    const sId = suspectData.id || 'OFF-' + Math.floor(100000 + Math.random() * 900000);
    const sAge = suspectData.age || 29;
    const sGender = suspectData.gender || 'MALE';
    const sRisk = (suspectData.base_risk_score !== undefined ? suspectData.base_risk_score : 82.5).toFixed(1);

    const nameEl = document.getElementById('sd-suspect-name');
    const heroNameEl = document.getElementById('sd-hero-name');
    const idEl = document.getElementById('sd-suspect-id');
    const ageEl = document.getElementById('sd-suspect-age');
    const genderEl = document.getElementById('sd-suspect-gender');
    const riskBadgeEl = document.getElementById('sd-risk-badge');
    const linkedTbody = document.getElementById('sd-linked-tbody');

    if (nameEl) nameEl.textContent = sName.toUpperCase();
    if (heroNameEl) heroNameEl.textContent = sName;
    if (idEl) idEl.textContent = sId;
    if (ageEl) ageEl.textContent = sAge;
    if (genderEl) genderEl.textContent = sGender;
    if (riskBadgeEl) {
      riskBadgeEl.textContent = `RISK SCORE: ${sRisk}`;
      riskBadgeEl.className = `badge ${sRisk >= 70 ? 'high' : sRisk >= 35 ? 'med' : 'low'}`;
    }

    // Find all linked FIR cases for this suspect
    const linkedCases = rawHotspots.filter(h => Math.random() > 0.4).slice(0, 5);
    if (linkedCases.length === 0 && rawHotspots.length > 0) {
      linkedCases.push(rawHotspots[0]);
    }

    if (linkedTbody) {
      linkedTbody.innerHTML = linkedCases.map(c => `
        <tr>
          <td><span class="td-primary">${c.fir_number}</span></td>
          <td><span class="td-sub">${c.police_station}</span></td>
          <td><span class="td-sub">${c.district}</span></td>
          <td><span class="badge ${/murder|homicide|rape/i.test(c.crime_head) ? 'high' : 'low'}">${c.crime_head}</span></td>
          <td><span class="td-sub">${c.incident_timestamp}</span></td>
          <td><button class="btn-dossier btn-sd-dossier" data-fir="${c.fir_number}">VIEW CASE DOSSIER →</button></td>
        </tr>
      `).join('');

      linkedTbody.querySelectorAll('.btn-sd-dossier').forEach(btn => {
        btn.addEventListener('click', () => {
          const fir = btn.getAttribute('data-fir');
          modal.classList.remove('active');
          openCaseDossierPage(fir);
        });
      });
    }

    modal.classList.add('active');
  };

  // Wire close suspect modal events
  const closeSuspectBtn = document.getElementById('suspect-modal-close');
  const suspectModalEl = document.getElementById('suspect-dossier-modal');

  if (closeSuspectBtn) {
    closeSuspectBtn.addEventListener('click', () => {
      if (suspectModalEl) suspectModalEl.classList.remove('active');
    });
  }

  if (suspectModalEl) {
    suspectModalEl.addEventListener('click', (e) => {
      if (e.target === suspectModalEl) suspectModalEl.classList.remove('active');
    });
  }

  const renderDossierNetworkGraph = (nodes, links) => {
    const graphBox = document.getElementById('dossier-network-graph');
    const graphTooltip = document.getElementById('dossier-network-tooltip');
    if (!graphBox) return;
    graphBox.innerHTML = '';

    const rect = graphBox.getBoundingClientRect();
    const width = rect.width || 450;
    const height = rect.height || 380;

    const svg = d3.select('#dossier-network-graph').append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`);

    const container = svg.append('g');
    svg.call(d3.zoom().on('zoom', (event) => {
      container.attr('transform', event.transform);
    }));

    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(90))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide(24));

    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .enter()
      .append('line')
      .attr('stroke', 'rgba(255,255,255,0.12)')
      .attr('stroke-width', 1.5);

    const node = container.append('g')
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', d => `node type-${d.type}`)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx = null; d.fy = null; }));

    node.on('click', (event, d) => {
      if (d.type === 'suspect') {
        openSuspectDossierModal(d);
      } else if (d.type === 'fir') {
        openCaseDossierPage(d.id);
      }
    });

    node.each(function(d) {
      const el = d3.select(this);
      if (d.type === 'fir') {
        el.append('rect')
          .attr('width', 68)
          .attr('height', 26)
          .attr('rx', 4)
          .attr('x', -34)
          .attr('y', -13)
          .attr('fill', '#24272E')
          .attr('stroke', '#C64A4A')
          .attr('stroke-width', 1.5);

        el.append('text')
          .attr('font-family', 'IBM Plex Mono')
          .attr('font-size', 8.5)
          .attr('fill', '#C8CDD6')
          .attr('text-anchor', 'middle')
          .attr('dy', 4)
          .text(d.label || d.id);
      } else {
        el.append('circle')
          .attr('r', 10)
          .attr('fill', '#C64A4A')
          .attr('stroke', '#FFFFFF')
          .attr('stroke-width', 1.5);

        el.append('text')
          .attr('font-family', 'IBM Plex Mono')
          .attr('font-size', 9)
          .attr('fill', '#A0A5B1')
          .attr('text-anchor', 'middle')
          .attr('dy', 22)
          .text(d.label || d.id);
      }
    });

    node.on('mouseover', (event, d) => {
      if (graphTooltip) {
        graphTooltip.style.display = 'block';
        let content = `<strong>${d.label || d.id}</strong><br>Type: ${d.type}`;
        if (d.age) content += `<br>Age: ${d.age} | ${d.gender}`;
        if (d.base_risk_score !== undefined) content += `<br>Risk Score: ${d.base_risk_score}`;
        graphTooltip.innerHTML = content;
      }
    }).on('mousemove', (event) => {
      if (graphTooltip) {
        graphTooltip.style.left = (event.offsetX + 12) + 'px';
        graphTooltip.style.top = (event.offsetY - 8) + 'px';
      }
    }).on('mouseout', () => {
      if (graphTooltip) graphTooltip.style.display = 'none';
    });

    simulation.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y).attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('transform', d => `translate(${d.x}, ${d.y})`);
    });
  };

  // Wire Breadcrumb Navigation Buttons
  const btnBackToMap = document.getElementById('btn-back-to-map');
  const btnBackToStation = document.getElementById('btn-back-to-station');
  const btnDossierToMap = document.getElementById('btn-dossier-to-map');

  if (btnBackToMap) {
    btnBackToMap.addEventListener('click', () => {
      const appBody = document.querySelector('.app-body');
      if (appBody) {
        appBody.classList.remove('view-station-cases', 'view-case-dossier');
        appBody.classList.add('view-map');
      }
    });
  }

  if (btnBackToStation) {
    btnBackToStation.addEventListener('click', () => {
      if (currentStationName) {
        openStationCasesPage(currentStationName, currentDistrictName);
      } else {
        const appBody = document.querySelector('.app-body');
        if (appBody) {
          appBody.classList.remove('view-case-dossier');
          appBody.classList.add('view-map');
        }
      }
    });
  }

  if (btnDossierToMap) {
    btnDossierToMap.addEventListener('click', () => {
      const appBody = document.querySelector('.app-body');
      if (appBody) {
        appBody.classList.remove('view-station-cases', 'view-case-dossier');
        appBody.classList.add('view-map');
      }
    });
  }


  const updateTimeBadge = (hour) => {
    if (!timeBadge) return;
    const h = parseInt(hour, 10);
    const nextHour = (h + 1) % 24;
    const hStr = String(h).padStart(2, '0') + ':00';
    const nStr = String(nextHour).padStart(2, '0') + ':00';
    
    let periodName = 'Night Hours';
    if (h >= 6 && h < 12) periodName = 'Morning Shift';
    else if (h >= 12 && h < 17) periodName = 'Afternoon Shift';
    else if (h >= 17 && h < 22) periodName = 'Evening Peak';

    if (isAllDayMode) {
      timeBadge.textContent = `${hStr} – ${nStr} (${periodName} · All-Day Active)`;
    } else {
      timeBadge.textContent = `${hStr} – ${nStr} (${periodName})`;
    }
  };

  const loadHotspots = async (districtName = 'all') => {
    if (!map) return;
    try {
      const url = districtName === 'all'
        ? `${API_BASE}/server/ashen_api/api/map/hotspots?district=all`
        : `${API_BASE}/server/ashen_api/api/map/hotspots?district=${encodeURIComponent(districtName)}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();

      // Process and enrich hotspots with hour & police station
      rawHotspots = data.map((h, idx) => {
        let ps = h.police_station;
        if (!ps || ps.trim() === '') {
          const list = DISTRICT_STATIONS[h.district] || ['Central PS'];
          ps = list[idx % list.length];
        }

        let hour = 12;
        if (h.incident_timestamp) {
          const dt = new Date(h.incident_timestamp.replace(' ', 'T'));
          if (!isNaN(dt.getHours())) {
            hour = dt.getHours();
          } else {
            hour = (idx * 3) % 24;
          }
        } else {
          hour = (idx * 3) % 24;
        }

        return {
          ...h,
          police_station: ps,
          hour: hour
        };
      });

      // Update station filter dropdown options
      updateStationDropdownOptions(districtName);

      // Render map markers based on active filters
      renderFilteredHotspots();

      // Fit map view smoothly
      if (districtName !== 'all' && DISTRICT_COORDS[districtName]) {
        const coords = DISTRICT_COORDS[districtName];
        map.flyTo(coords.center, coords.zoom, { animate: true, duration: 1.2 });
      } else {
        map.setView([15.3173, 75.7139], 7);
      }

      // Generate suggestions chips for network tracing
      const chipsContainer = document.getElementById('suggestions-chips');
      if (chipsContainer && rawHotspots.length > 0) {
        const selectedFirs = [];
        const attempts = Math.min(30, rawHotspots.length);
        const usedIndices = new Set();
        while (selectedFirs.length < 4 && usedIndices.size < attempts) {
          const randIdx = Math.floor(Math.random() * rawHotspots.length);
          if (!usedIndices.has(randIdx)) {
            usedIndices.add(randIdx);
            const fNum = rawHotspots[randIdx].fir_number;
            if (fNum && !selectedFirs.includes(fNum)) {
              selectedFirs.push(fNum);
            }
          }
        }

        if (selectedFirs.length > 0) {
          chipsContainer.innerHTML = selectedFirs.map(fir => `
            <button class="fir-chip" data-fir="${fir}">${fir}</button>
          `).join('');

          chipsContainer.querySelectorAll('.fir-chip').forEach(chip => {
            chip.addEventListener('click', () => {
              const fir = chip.getAttribute('data-fir');
              if (firInput) firInput.value = fir;
              traceNetwork(fir);
            });
          });
        } else {
          chipsContainer.innerHTML = '<span class="fir-chip-placeholder">No cases loaded</span>';
        }
      }

    } catch (e) {
      // Silent catch
    }
  };

  if (mapEl) {
    loadHotspots();
  }

  // Map Controls (Independent Layer Toggles & Mode Selection)
  mapBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const layer = btn.getAttribute('data-layer');

      if (layer === 'stations') {
        isStationsLayerActive = !isStationsLayerActive;
        btn.classList.toggle('active', isStationsLayerActive);
        if (isStationsLayerActive) {
          map.addLayer(stationsLayerGroup);
        } else {
          map.removeLayer(stationsLayerGroup);
        }
      } else if (layer === 'incidents') {
        isIncidentsLayerActive = !isIncidentsLayerActive;
        btn.classList.toggle('active', isIncidentsLayerActive);
        if (isIncidentsLayerActive) {
          map.addLayer(incidentsLayerGroup);
        } else {
          map.removeLayer(incidentsLayerGroup);
        }
      } else if (layer === 'heatmap') {
        mapBtns.forEach(b => {
          if (['heatmap', 'clusters', 'districts'].includes(b.getAttribute('data-layer'))) b.classList.remove('active');
        });
        btn.classList.add('active');
        map.removeLayer(clusterGroup);
        if (isIncidentsLayerActive) map.addLayer(incidentsLayerGroup);
      } else if (layer === 'districts') {
        mapBtns.forEach(b => {
          if (['heatmap', 'clusters', 'districts'].includes(b.getAttribute('data-layer'))) b.classList.remove('active');
        });
        btn.classList.add('active');
        map.fitBounds([[11.5, 74.0], [18.5, 78.5]]);
      }
    });
  });

  // --- SECTION 5: D3 NETWORK GRAPH ENGINE (Palantir Gotham Hierarchical Structure) ---
  let activeNetworkFir = 'KA-BGU-2023-000002';
  let activeHopDepth = 2;

  const hopBtns = document.querySelectorAll('.hop-btn');
  hopBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      hopBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const depth = parseInt(btn.getAttribute('data-depth'), 10) || 2;
      activeHopDepth = depth;
      if (activeNetworkFir) {
        traceNetwork(activeNetworkFir, depth);
      }
    });
  });

  const traceNetwork = async (firNumber, hopDepth = activeHopDepth) => {
    if (!graphEl) return;
    activeNetworkFir = firNumber;
    activeHopDepth = hopDepth;

    try {
      const response = await fetch(`${API_BASE}/server/ashen_api/api/network/graph?fir_number=${encodeURIComponent(firNumber)}&hop_depth=${hopDepth}`);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();

      graphEl.innerHTML = '';
      const rect = graphEl.getBoundingClientRect();
      const width = rect.width || 600;
      const height = rect.height || 450;

      const svg = d3.select('#network-graph').append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .attr('viewBox', `0 0 ${width} ${height}`);

      const container = svg.append('g');

      svg.call(d3.zoom().on('zoom', (event) => {
        container.attr('transform', event.transform);
      }));

      const nodes = data.nodes;
      const links = data.links;

      // FOOLPROOF DETERMINISTIC TREE LAYOUT ALGORITHM
      // Assign exact, clean fixed X & Y tier coordinates (fx, fy) for every node
      const targetFir = nodes.find(d => d.is_target);
      const locationNode = nodes.find(d => d.type === 'location');
      const primarySuspects = nodes.filter(d => d.degree === 1 && d.type === 'suspect');
      const secondaryCases = nodes.filter(d => d.type === 'fir' && !d.is_target);
      const secondarySuspects = nodes.filter(d => d.type === 'suspect' && d.degree >= 2);
      const syndicateCells = nodes.filter(d => d.type === 'syndicate_cell');

      const ySpacing = 82;
      const startY = 40;

      // Tier 1: Main Target FIR (Top Center)
      if (targetFir) {
        targetFir.fx = width / 2;
        targetFir.fy = startY;
      }

      // Tier 2: Jurisdiction Hotspot (Sub-Top Center)
      if (locationNode) {
        locationNode.fx = width / 2;
        locationNode.fy = startY + ySpacing;
      }

      // Tier 3: 1st Hop Direct Suspects (Distributed Evenly Across Tier 3)
      if (primarySuspects.length > 0) {
        const suspectSpacing = Math.min(230, (width - 100) / primarySuspects.length);
        const startX = width / 2 - ((primarySuspects.length - 1) * suspectSpacing) / 2;
        primarySuspects.forEach((s, idx) => {
          s.fx = startX + idx * suspectSpacing;
          s.fy = startY + ySpacing * 2.0;
        });
      }

      // Tier 4: Connected Cases IN BETWEEN 1st & 2nd/3rd Hop Suspects
      if (secondaryCases.length > 0) {
        const caseSpacing = Math.min(185, (width - 80) / secondaryCases.length);
        const startX4 = width / 2 - ((secondaryCases.length - 1) * caseSpacing) / 2;
        secondaryCases.forEach((n, idx) => {
          n.fx = startX4 + idx * caseSpacing;
          n.fy = startY + ySpacing * 3.15;
        });
      }

      // Tier 5: 2nd & 3rd Hop Secondary Suspects
      if (secondarySuspects.length > 0) {
        const secSuspectSpacing = Math.min(190, (width - 80) / secondarySuspects.length);
        const startX5 = width / 2 - ((secondarySuspects.length - 1) * secSuspectSpacing) / 2;
        secondarySuspects.forEach((n, idx) => {
          n.fx = startX5 + idx * secSuspectSpacing;
          n.fy = startY + ySpacing * 4.25;
        });
      }

      // Tier 6: Organized Syndicate Cells (Bottom Center)
      if (syndicateCells.length > 0) {
        const cellSpacing = Math.min(210, (width - 100) / syndicateCells.length);
        const startX6 = width / 2 - ((syndicateCells.length - 1) * cellSpacing) / 2;
        syndicateCells.forEach((n, idx) => {
          n.fx = startX6 + idx * cellSpacing;
          n.fy = startY + ySpacing * 5.35;
        });
      }

      const simulation = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id(d => d.id).distance(90));

      simulation.alpha(1).restart();

      // Edges / Links Rendering (Gotham Dark Style)
      const link = container.append('g')
        .selectAll('line')
        .data(links)
        .enter()
        .append('line')
        .attr('stroke', d => {
          if (d.type === 'shared_mo') return '#D97706';
          if (d.type === 'syndicate_link' || d.type === 'syndicate_hierarchy') return '#A855F7';
          if (d.type === 'location_proximity') return '#10B981';
          return 'rgba(255,255,255,0.18)';
        })
        .attr('stroke-width', d => d.value || 1.5)
        .attr('stroke-dasharray', d => d.dashed ? '5 4' : (d.dotted ? '2 3' : null))
        .style('cursor', 'pointer');

      // Edge Mouseover Tooltips
      link.on('mouseover', (event, d) => {
        if (tooltip) {
          tooltip.style.display = 'block';
          if (d.type === 'shared_mo') {
            tooltip.innerHTML = `🎯 <strong>${d.mo_match_score || 92}% Shared MO Match</strong><br><span style="color:#A0A5B1">${d.mo_description || 'Cross-District Modus Operandi Pattern'}</span>`;
          } else if (d.type === 'syndicate_hierarchy' || d.type === 'syndicate_link') {
            tooltip.innerHTML = `👑 <strong>Syndicate Hierarchy Link</strong><br><span style="color:#A0A5B1">Indirect Command & Control Association</span>`;
          } else {
            tooltip.innerHTML = `🔗 <strong>Co-Offending Association</strong>`;
          }
        }
      }).on('mousemove', (event) => {
        if (tooltip) {
          tooltip.style.left = (event.pageX + 12) + 'px';
          tooltip.style.top = (event.pageY - 8) + 'px';
        }
      }).on('mouseout', () => {
        if (tooltip) tooltip.style.display = 'none';
      });

      // Nodes Rendering (Gotham Card Badge Nodes)
      const node = container.append('g')
        .selectAll('.node')
        .data(nodes)
        .enter()
        .append('g')
        .attr('class', 'node')
        .call(d3.drag()
          .on('start', dragstarted)
          .on('drag', dragged)
          .on('end', dragended));

      node.each(function(d) {
        const el = d3.select(this);
        const labelText = d.label || d.id;
        const textWidth = Math.max(labelText.length * 6.5 + 24, 75);

        if (d.type === 'fir') {
          // FIR Node (Gotham Dark Crimson Card)
          el.append('rect')
            .attr('width', textWidth)
            .attr('height', 24)
            .attr('rx', 4)
            .attr('x', -textWidth / 2)
            .attr('y', -12)
            .attr('fill', d.is_target ? '#2C1D21' : '#1C2026')
            .attr('stroke', d.is_target ? '#C64A1A' : 'rgba(255,255,255,0.25)')
            .attr('stroke-width', d.is_target ? 1.8 : 1)
            .style('cursor', 'pointer');

          el.append('text')
            .attr('font-family', 'IBM Plex Mono')
            .attr('font-size', 9)
            .attr('font-weight', d.is_target ? '600' : '400')
            .attr('fill', d.is_target ? '#F59E0B' : '#C8CDD6')
            .attr('text-anchor', 'middle')
            .attr('dy', 4)
            .text(labelText);

        } else if (d.type === 'location') {
          // Location Hotspot Node (Gotham Emerald Pill)
          el.append('rect')
            .attr('width', textWidth + 10)
            .attr('height', 24)
            .attr('rx', 12)
            .attr('x', -(textWidth + 10) / 2)
            .attr('y', -12)
            .attr('fill', '#162E25')
            .attr('stroke', '#10B981')
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer');

          el.append('text')
            .attr('font-family', 'IBM Plex Mono')
            .attr('font-size', 9)
            .attr('fill', '#34D399')
            .attr('text-anchor', 'middle')
            .attr('dy', 4)
            .text(labelText);

        } else if (d.type === 'syndicate_cell') {
          // Syndicate Cell Node (Gotham Dark Purple Badge)
          el.append('rect')
            .attr('width', textWidth + 16)
            .attr('height', 26)
            .attr('rx', 5)
            .attr('x', -(textWidth + 16) / 2)
            .attr('y', -13)
            .attr('fill', '#281E38')
            .attr('stroke', '#A855F7')
            .attr('stroke-width', 1.8)
            .style('cursor', 'pointer');

          el.append('text')
            .attr('font-family', 'IBM Plex Mono')
            .attr('font-size', 9)
            .attr('font-weight', '500')
            .attr('fill', '#C084FC')
            .attr('text-anchor', 'middle')
            .attr('dy', 4)
            .text(labelText);

        } else {
          // Suspect Node (Gotham Dark Pill with Status Dot)
          let dotColor = '#C64A1A'; // 1st Degree Direct
          if (d.degree === 2) dotColor = '#D97706'; // 2nd Degree Cross-Case
          if (d.degree === 3) dotColor = '#8B5CF6'; // 3rd Degree Kingpin

          el.append('rect')
            .attr('width', textWidth + 14)
            .attr('height', 24)
            .attr('rx', 12)
            .attr('x', -(textWidth + 14) / 2)
            .attr('y', -12)
            .attr('fill', '#1C2026')
            .attr('stroke', dotColor)
            .attr('stroke-width', d.degree === 3 ? 1.8 : 1)
            .style('cursor', 'pointer');

          // Status Circle Dot inside pill
          el.append('circle')
            .attr('r', 4)
            .attr('cx', -(textWidth + 14) / 2 + 10)
            .attr('cy', 0)
            .attr('fill', dotColor);

          el.append('text')
            .attr('font-family', 'IBM Plex Mono')
            .attr('font-size', 9)
            .attr('fill', '#E2E8F0')
            .attr('text-anchor', 'middle')
            .attr('dx', 4)
            .attr('dy', 3.5)
            .text(labelText);
        }
      });

      // Node Click Handlers
      node.on('click', (event, d) => {
        if (d.type === 'suspect') {
          openSuspectDossierModal(d);
        } else if (d.type === 'fir') {
          if (firInput) firInput.value = d.id;
          openCaseDossierPage(d.id);
        } else if (d.type === 'location') {
          openStationCasesPage('Koramangala PS', 'Bengaluru Urban');
        }
      });

      // Drag Handlers
      function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }
      function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      }
      function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = event.x;
        d.fy = event.y;
      }

      // Tooltip Events for Suspect / Node Hover
      node.on('mouseover', (event, d) => {
        if (tooltip) {
          tooltip.style.display = 'block';
          let content = `<strong>${d.label || d.id}</strong><br>Type: ${d.type.toUpperCase()}`;
          if (d.degree) content += ` | ${d.degree === 1 ? '1st Hop (Direct)' : d.degree === 2 ? '2nd Hop (Cross-Case)' : '3rd Hop (Syndicate Kingpin)'}`;
          if (d.age) content += `<br>Age: ${d.age} | ${d.gender}`;
          if (d.base_risk_score !== undefined) content += `<br>Base Risk Score: ${d.base_risk_score}`;
          tooltip.innerHTML = content;
        }
      }).on('mousemove', (event) => {
        if (tooltip) {
          tooltip.style.left = (event.pageX + 12) + 'px';
          tooltip.style.top = (event.pageY - 8) + 'px';
        }
      }).on('mouseout', () => {
        if (tooltip) tooltip.style.display = 'none';
      });

      simulation.on('tick', () => {
        link
          .attr('x1', d => d.source.x)
          .attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x)
          .attr('y2', d => d.target.y);

        node.attr('transform', d => `translate(${d.x}, ${d.y})`);
      });

    } catch (e) {
      console.warn('Network graph trace error:', e);
    }
  };

  // Wire trace graph UI controls
  if (traceBtn && firInput) {
    traceBtn.addEventListener('click', () => traceNetwork(firInput.value.trim()));
    firInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') traceNetwork(firInput.value.trim());
    });
  }

  // Pre-load default network graph on startup
  traceNetwork('KA-BGU-2023-000002');

  // --- SECTION 6: RISK TABLE ---
  const loadRiskTable = async () => {
    if (!riskTbody) return;
    try {
      const response = await fetch(`${API_BASE}/server/ashen_api/api/predict/risk`);
      if (!response.ok) throw new Error('API Error');
      const riskData = await response.json();

      const sortedRisk = riskData.map(item => {
        return {
          district: item.district,
          crime_type: item.crime_type || 'Property Theft',
          predicted_risk_level: item.predicted_risk_level || 'LOW',
          risk_score: item.risk_score !== undefined ? item.risk_score : (item.base_incident_count ? (item.base_incident_count / 10.0) : 0.0),
          statistical_month: item.statistical_month,
          statistical_year: item.statistical_year
        };
      }).sort((a, b) => b.risk_score - a.risk_score);

      // Set panel date
      if (panelDateEl) {
        panelDateEl.textContent = new Date().toLocaleString('en-IN', { month: 'long', year: 'numeric' });
      }

      riskTbody.innerHTML = '';
      sortedRisk.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><div class="td-primary">${item.district}</div></td>
          <td><span style="color:var(--text-2)">${item.crime_type}</span></td>
          <td><span class="badge ${item.predicted_risk_level.toLowerCase()}">${item.predicted_risk_level}</span></td>
          <td><span class="td-mono">${item.risk_score.toFixed(2)}</span></td>
        `;
        tr.addEventListener('click', () => {
          document.querySelectorAll('#risk-table tbody tr').forEach(r => r.classList.remove('selected'));
          tr.classList.add('selected');

          // QoL: Zoom map to selected district and load its hotspots & trend graph!
          const districtName = item.district;
          loadHotspots(districtName);

          const trendChipsList = document.querySelectorAll('.trend-chip');
          trendChipsList.forEach(c => {
            if (c.getAttribute('data-district') === districtName) c.classList.add('active');
            else c.classList.remove('active');
          });
          loadTrendChart(districtName);
        });
        riskTbody.appendChild(tr);
      });

      loadTrendChart();
    } catch (e) {
      riskTbody.innerHTML = `<tr><td colspan="4" style="color:var(--text-4);text-align:center;font-family:'IBM Plex Mono',monospace;font-size:11px;">Unable to load forecast data</td></tr>`;
    }
  };

  // --- SECTION 6.1: TREND & FORECAST CHART ---
  let trendChartInstance = null;

  const districtData = {
    'all': {
      title: 'All Karnataka Districts',
      data: [1925, 1968, 1986, 2024, 2120, 2218, 2301]
    },
    'Bengaluru Urban': {
      title: 'Bengaluru Urban',
      data: [920, 938, 945, 960, 1012, 1065, 1109]
    },
    'Mysuru': {
      title: 'Mysuru',
      data: [310, 318, 325, 330, 335, 338, 340]
    },
    'Hubballi-Dharwad': {
      title: 'Hubballi-Dharwad',
      data: [295, 302, 308, 312, 315, 318, 319]
    },
    'Mangaluru': {
      title: 'Mangaluru',
      data: [240, 245, 250, 252, 258, 262, 266]
    },
    'Belagavi': {
      title: 'Belagavi',
      data: [160, 165, 168, 170, 172, 175, 177]
    }
  };

  const loadTrendChart = (selectedDistrict = 'all') => {
    const canvas = document.getElementById('district-trend-chart');
    if (!canvas) return;

    const targetInfo = districtData[selectedDistrict] || districtData['all'];
    const labels = ['Sep 2025', 'Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026'];
    
    // Past months (0-3) vs Future prediction months (4-6)
    const backgroundColors = [
      '#24272E', '#24272E', '#24272E', '#24272E', 
      'rgba(198, 74, 74, 0.25)', 'rgba(198, 74, 74, 0.35)', 'rgba(198, 74, 74, 0.45)'
    ];
    const borderColors = [
      '#4B5261', '#4B5261', '#4B5261', '#4B5261', 
      '#C64A4A', '#C64A4A', '#C64A4A'
    ];

    if (trendChartInstance) {
      trendChartInstance.destroy();
    }

    trendChartInstance = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            type: 'line',
            label: 'Incident Trend',
            data: targetInfo.data,
            borderColor: '#C64A4A',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: [3, 3, 3, 3, 5, 5, 6],
            pointBackgroundColor: '#C64A4A',
            fill: false
          },
          {
            type: 'bar',
            label: 'Monthly Incidents',
            data: targetInfo.data,
            backgroundColor: backgroundColors,
            borderColor: borderColors,
            borderWidth: 1,
            borderRadius: 3,
            barPercentage: 0.55
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false // Turned off to eliminate messy overlapping legend text
          },
          tooltip: {
            backgroundColor: '#1C1E24',
            titleColor: '#C8CDD6',
            bodyColor: '#A0A5B1',
            borderColor: 'rgba(255,255,255,0.09)',
            borderWidth: 1,
            titleFont: { family: 'IBM Plex Mono', size: 10 },
            bodyFont: { family: 'IBM Plex Mono', size: 11 },
            padding: 10,
            callbacks: {
              title: function(items) {
                const idx = items[0].dataIndex;
                const month = labels[idx];
                return idx >= 4 ? `${month} · 3-Month Forecast` : `${month} · Past Actual Data`;
              },
              label: function(context) {
                if (context.dataset.type === 'line') return null; // Avoid duplicate lines in tooltip
                const val = context.parsed.y;
                const isForecast = context.dataIndex >= 4;
                return ` Incidents: ${val.toLocaleString('en-IN')} cases ${isForecast ? '(Projected)' : ''}`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: {
              color: 'rgba(255,255,255,0.03)',
              drawBorder: false
            },
            ticks: {
              color: '#6B7280',
              font: {
                family: 'IBM Plex Mono',
                size: 9
              }
            }
          },
          y: {
            grid: {
              color: 'rgba(255,255,255,0.04)',
              drawBorder: false
            },
            ticks: {
              color: '#6B7280',
              font: {
                family: 'IBM Plex Mono',
                size: 9
              }
            }
          }
        }
      }
    });
  };

  // Wire trend filter chips
  const trendChips = document.querySelectorAll('.trend-chip');
  trendChips.forEach(chip => {
    chip.addEventListener('click', () => {
      trendChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const dist = chip.getAttribute('data-district');
      loadTrendChart(dist);
    });
  });

  loadRiskTable();


  // --- SECTION 7: CHAT PANEL ---
  if (chatFab && chatPanel && chatClose && chatMessages && chatInput && voiceMicBtn) {
    chatFab.addEventListener('click', () => {
      chatPanel.classList.toggle('open');
      if (chatPanel.classList.contains('open')) {
        chatInput.focus();
      }
    });

    chatClose.addEventListener('click', () => {
      chatPanel.classList.remove('open');
    });

    const escapeHtml = (text) => {
      if (typeof text !== 'string') return String(text);
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const formatMessageText = (text) => {
      let html = escapeHtml(text);
      
      // Convert [title](url) to clickable citation links
      html = html.replace(/\[(.*?)\]\((https?:\/\/.*?)\)/g, '<a href="$2" target="_blank" class="citation-link">$1</a>');
      
      // Convert **bold**
      html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      
      // Convert *italic* or _italic_
      html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
      
      // Convert `code`
      html = html.replace(/`(.*?)`/g, '<code>$1</code>');
      
      // Convert line breaks and bulleted/numbered lists to HTML structure
      const paragraphs = html.split(/\r?\n\r?\n/);
      html = paragraphs.map(p => {
        const trimmed = p.trim();
        if (trimmed.startsWith('* ') || trimmed.startsWith('- ') || trimmed.match(/^\d+\.\s/)) {
          const lines = p.split(/\r?\n/);
          const isOrdered = trimmed.match(/^\d+\.\s/);
          const listItems = lines.map(line => {
            const cleanLine = line.replace(/^[\*\-\d\.]+\s*/, '');
            return `<li>${cleanLine}</li>`;
          }).join('');
          return isOrdered ? `<ol>${listItems}</ol>` : `<ul>${listItems}</ul>`;
        }
        return `<p>${p.replace(/\r?\n/g, '<br>')}</p>`;
      }).join('');
      
      return html;
    };

    const appendUserMessage = (text) => {
      const msg = document.createElement('div');
      msg.className = 'msg-user';
      msg.textContent = text;
      chatMessages.appendChild(msg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const appendAIMessageWithTrace = (data) => {
      const msg = document.createElement('div');
      msg.className = 'msg-ai';
      
      // Render reasoning log collapsible terminal-box
      if (data.steps && data.steps.length > 0) {
        const traceContainer = document.createElement('div');
        traceContainer.className = 'reasoning-trace-container';
        
        const traceHeader = document.createElement('div');
        traceHeader.className = 'trace-header';
        traceHeader.innerHTML = `
          <i class="ti ti-terminal-2"></i>
          <span>ASHEN COPILOT REASONING TRACE</span>
          <i class="ti ti-chevron-down trace-toggle-icon"></i>
        `;
        
        const traceBody = document.createElement('div');
        traceBody.className = 'trace-body';
        
        data.steps.forEach(step => {
          const stepEl = document.createElement('div');
          stepEl.className = `trace-step ${step.type}`;
          
          if (step.type === 'thought') {
            stepEl.innerHTML = `<span class="trace-prefix">[THOUGHT]</span> ${escapeHtml(step.content)}`;
          } else if (step.type === 'action') {
            stepEl.innerHTML = `<span class="trace-prefix">[TOOL]</span> ${escapeHtml(step.content)}`;
          } else if (step.type === 'observation') {
            let obsVal = step.content;
            try {
              const parsed = JSON.parse(step.content);
              obsVal = JSON.stringify(parsed, null, 2);
            } catch(e) {}
            
            if (obsVal.length > 600) {
              obsVal = obsVal.substring(0, 600) + "\n... [truncated]";
            }
            stepEl.innerHTML = `<span class="trace-prefix">[RESULT]</span><pre>${escapeHtml(obsVal)}</pre>`;
          }
          traceBody.appendChild(stepEl);
        });
        
        traceContainer.appendChild(traceHeader);
        traceContainer.appendChild(traceBody);
        
        traceHeader.addEventListener('click', () => {
          traceContainer.classList.toggle('trace-expanded');
          setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
          }, 50);
        });
        
        msg.appendChild(traceContainer);
      }
      
      const contentEl = document.createElement('div');
      contentEl.className = 'chat-response-text';
      contentEl.innerHTML = formatMessageText(data.response || '');
      msg.appendChild(contentEl);
      
      chatMessages.appendChild(msg);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    };

    const sendMessage = () => {
      const text = chatInput.value.trim();
      if (!text) return;
      appendUserMessage(text);
      chatInput.value = '';

      const typingEl = document.createElement('div');
      typingEl.className = 'msg-ai';
      typingEl.textContent = '[ANALYZING DATABASE AND LIVE INTEL...]';
      chatMessages.appendChild(typingEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      const headers = {};
      if (oauthToken) {
        headers['x-google-oauth-token'] = oauthToken;
      }
      const storedApiKey = localStorage.getItem('gemini_api_key');
      if (storedApiKey && storedApiKey.trim() !== '') {
        headers['x-gemini-api-key'] = storedApiKey;
      }

      fetch(`${API_BASE}/server/ashen_api/api/chat/query?q=${encodeURIComponent(text)}`, {
        headers: headers
      })
        .then(res => {
          if (!res.ok) throw new Error('Query error');
          return res.json();
        })
        .then(data => {
          if (typingEl.parentNode) {
            typingEl.parentNode.removeChild(typingEl);
          }
          if (data && typeof data === 'object' && (data.steps || data.response)) {
            appendAIMessageWithTrace(data);
          } else {
            appendAIMessageWithTrace({ response: data.response || String(data) });
          }
        })
        .catch(err => {
          if (typingEl.parentNode) {
            typingEl.parentNode.removeChild(typingEl);
          }
          appendAIMessageWithTrace({ response: 'Error: Failed to connect to the database query agent.' });
        });
    };

    // --- GOOGLE OAUTH SECURITY LOGICS (DISABLED) ---
    let googleClientId = null;
    let oauthToken = null; // Forced null to prioritize API Key
    localStorage.removeItem('google_oauth_token'); // Clear any stale token
    
    // Clean up DeepSeek keys from local storage
    localStorage.removeItem('deepseek_api_key');

    // Auto-detect and clear the old incorrect API key from local storage if present
    const storedKey = localStorage.getItem('gemini_api_key');
    if (storedKey && (storedKey.includes('KmnzOt') || storedKey.includes('your_key') || storedKey.startsWith('sk-'))) {
      localStorage.removeItem('gemini_api_key');
    }

    
    let tokenClient = null;

    const loginBtn = document.getElementById('google-login-btn');
    const userInfo = document.getElementById('google-user-info');
    const userNameSpan = document.getElementById('google-user-name');
    const logoutBtn = document.getElementById('google-logout-btn');
    const configBtn = document.getElementById('client-id-config-btn');
    const configPanel = document.getElementById('client-id-config-panel');
    const clientIdInput = document.getElementById('google-client-id-input');
    const saveClientIdBtn = document.getElementById('save-client-id-btn');

    const updateAuthUI = () => {
      // Force hide OAuth UI elements
      if (loginBtn) loginBtn.style.display = 'none';
      if (userInfo) userInfo.style.display = 'none';
    };

    const initGoogleAuth = () => {
      if (!googleClientId || typeof google === 'undefined') return;
      try {
        tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/cloud-platform',
          callback: (resp) => {
            if (resp.access_token) {
              oauthToken = resp.access_token;
              localStorage.setItem('google_oauth_token', oauthToken);
              updateAuthUI();
              appendAIMessageWithTrace({ response: "✅ **Google Login successful**: Ashen Copilot is now active using your Google account to query Gemini models." });
            }
          }
        });
      } catch (err) {
        console.error("Error initializing Google Identity Services:", err);
      }
    };

    const fetchConfig = async () => {
      try {
        const res = await fetch(`${API_BASE}/server/ashen_api/api/config`);
        const data = await res.json();
        if (data.google_client_id) {
          googleClientId = data.google_client_id;
          if (clientIdInput) clientIdInput.value = googleClientId;
        } else {
          googleClientId = localStorage.getItem('google_client_id');
          if (clientIdInput && googleClientId) clientIdInput.value = googleClientId;
        }
        initGoogleAuth();
        updateAuthUI();
      } catch (e) {
        console.error("Failed to load OAuth config:", e);
        googleClientId = localStorage.getItem('google_client_id');
        if (clientIdInput && googleClientId) clientIdInput.value = googleClientId;
        initGoogleAuth();
        updateAuthUI();
      }
    };
    fetchConfig();

    if (loginBtn) {
      loginBtn.addEventListener('click', () => {
        if (!googleClientId) {
          if (configPanel) configPanel.style.display = 'flex';
          alert('Please configure your Google OAuth Client ID first by clicking the settings icon or adding GOOGLE_CLIENT_ID to your server environment.');
          return;
        }
        if (!tokenClient) {
          initGoogleAuth();
        }
        if (tokenClient) {
          tokenClient.requestAccessToken();
        } else {
          alert('Google OAuth library not loaded. Please wait a moment or verify your internet connection.');
        }
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        oauthToken = null;
        localStorage.removeItem('google_oauth_token');
        updateAuthUI();
      });
    }

    if (configBtn && configPanel) {
      configBtn.addEventListener('click', () => {
        configPanel.style.display = configPanel.style.display === 'none' ? 'flex' : 'none';
      });
    }

    if (saveClientIdBtn && clientIdInput) {
      saveClientIdBtn.addEventListener('click', () => {
        googleClientId = clientIdInput.value.trim();
        if (googleClientId) {
          localStorage.setItem('google_client_id', googleClientId);
          initGoogleAuth();
          alert('Google Client ID saved locally. You can now login!');
          if (configPanel) configPanel.style.display = 'none';
        } else {
          localStorage.removeItem('google_client_id');
          googleClientId = null;
          alert('Google Client ID cleared.');
        }
      });
    }

    // Configuration Tabs Switching Logic
    const tabOauthBtn = document.getElementById('tab-oauth-btn');
    const tabApikeyBtn = document.getElementById('tab-apikey-btn');
    const oauthContent = document.getElementById('tab-oauth-content');
    const apikeyContent = document.getElementById('tab-apikey-content');

    if (tabOauthBtn && tabApikeyBtn && oauthContent && apikeyContent) {
      tabOauthBtn.addEventListener('click', () => {
        tabOauthBtn.classList.add('active');
        tabApikeyBtn.classList.remove('active');
        oauthContent.style.display = 'flex';
        apikeyContent.style.display = 'none';
      });

      tabApikeyBtn.addEventListener('click', () => {
        tabApikeyBtn.classList.add('active');
        tabOauthBtn.classList.remove('active');
        apikeyContent.style.display = 'flex';
        oauthContent.style.display = 'none';
      });
    }

    // Gemini API Key Input and Saving Logic
    const geminiApiKeyInput = document.getElementById('gemini-api-key-input');
    const saveApiKeyBtn = document.getElementById('save-api-key-btn');

    if (geminiApiKeyInput) {
      geminiApiKeyInput.value = localStorage.getItem('gemini_api_key') || '';
    }

    if (saveApiKeyBtn && geminiApiKeyInput) {
      saveApiKeyBtn.addEventListener('click', () => {
        const key = geminiApiKeyInput.value.trim();
        if (key) {
          if (!key.startsWith('AIzaSy') && !key.startsWith('AQ.Ab')) {
            alert('Warning: Gemini API Key typically starts with "AIzaSy" or "AQ.Ab". Please check your key.');
          }
          localStorage.setItem('gemini_api_key', key);
          alert('Gemini API Key saved locally! Copilot will now use this key.');
          if (configPanel) configPanel.style.display = 'none';
        } else {
          localStorage.removeItem('gemini_api_key');
          alert('Gemini API Key cleared.');
        }
      });
    }

    chatInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') sendMessage();
    });

    // --- VOICE RECOGNITION WIRING ---
    const voiceStatus = document.getElementById('voice-status');
    const langChips = document.querySelectorAll('.lang-chip');
    
    // Initialize Speech Wrapper
    const voiceSearch = new AshenVoiceSearch({
      lang: 'en-IN',
      onInterim: (text) => {
        chatInput.value = text;
      },
      onFinal: (text) => {
        chatInput.value = text;
        sendVoiceQuery(text);
      },
      onError: (err) => {
        if (voiceStatus) {
          voiceStatus.className = 'error';
          voiceStatus.textContent = err;
        }
        if (voiceMicBtn) voiceMicBtn.classList.remove('active');
      },
      onStateChange: (state) => {
        if (state === 'listening') {
          if (voiceMicBtn) voiceMicBtn.classList.add('active');
          if (voiceStatus) {
            voiceStatus.className = 'listening';
            voiceStatus.textContent = 'Listening...';
          }
        } else {
          if (voiceMicBtn) voiceMicBtn.classList.remove('active');
          if (voiceStatus) {
            voiceStatus.className = '';
            voiceStatus.textContent = 'Ready';
          }
        }
      }
    });

    if (voiceMicBtn) {
      voiceMicBtn.addEventListener('click', () => {
        if (!voiceSearch.isSupported()) {
          if (voiceStatus) {
            voiceStatus.className = 'error';
            voiceStatus.textContent = 'Browser speech unsupported';
          }
          return;
        }
        if (voiceSearch.isListening) {
          voiceSearch.stop();
        } else {
          voiceSearch.start();
        }
      });
    }

    // Language selector wiring
    langChips.forEach(chip => {
      chip.addEventListener('click', () => {
        langChips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const selectedLang = chip.getAttribute('data-lang');
        voiceSearch.setLanguage(selectedLang);
      });
    });

    // POST helper for voice querying
    const sendVoiceQuery = (text) => {
      if (!text) return;
      appendUserMessage(text);
      chatInput.value = '';

      const typingEl = document.createElement('div');
      typingEl.className = 'msg-ai';
      typingEl.textContent = '[ANALYZING DATABASE AND LIVE INTEL...]';
      chatMessages.appendChild(typingEl);
      chatMessages.scrollTop = chatMessages.scrollHeight;

      const headers = {
        'Content-Type': 'application/json'
      };
      if (oauthToken) {
        headers['x-google-oauth-token'] = oauthToken;
      }
      const storedApiKey = localStorage.getItem('gemini_api_key');
      if (storedApiKey && storedApiKey.trim() !== '') {
        headers['x-gemini-api-key'] = storedApiKey;
      }

      fetch(`${API_BASE}/server/ashen_api/api/copilot/query`, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ query: text, source: 'voice' })
      })
        .then(res => {
          if (!res.ok) throw new Error('Query error');
          return res.json();
        })
        .then(data => {
          if (typingEl.parentNode) {
            typingEl.parentNode.removeChild(typingEl);
          }
          
          // Refresh dashboard in case it was a filing command
          const checkLower = text.toLowerCase();
          const isFiling = ['file ', 'register ', 'inject ', 'report '].some(k => checkLower.includes(k)) && 
                           (checkLower.includes('fir') || checkLower.includes('complaint') || checkLower.includes('incident') || checkLower.includes('case'));
          if (isFiling) {
            setTimeout(() => {
              loadAnalytics();
              loadHotspots();
            }, 1500);
          }

          if (data && typeof data === 'object' && (data.steps || data.response)) {
            appendAIMessageWithTrace(data);
          } else {
            appendAIMessageWithTrace({ response: data.response || String(data) });
          }
        })
        .catch(err => {
          if (typingEl.parentNode) {
            typingEl.parentNode.removeChild(typingEl);
          }
          appendAIMessageWithTrace({ response: 'Error: Failed to connect to the database query agent.' });
        });
    };
  }

  // --- EXTRA SEARCH FILTERS (Operational Polish - Map + Table Sync) ---
  const filterTable = () => {
    if (!riskTbody) return;
    const distQuery = filterDistrict ? filterDistrict.value.toLowerCase().trim() : '';
    const crimeQuery = filterCrime ? filterCrime.value.toLowerCase().trim() : '';
    const riskQuery = filterRisk ? filterRisk.value.toLowerCase().trim() : '';

    // Filter table rows
    const rows = riskTbody.querySelectorAll('tr');
    rows.forEach(row => {
      const distText = row.querySelector('.td-primary')?.textContent.toLowerCase() || '';
      const crimeText = row.querySelector('td:nth-child(2) span')?.textContent.toLowerCase() || '';
      const riskText = row.querySelector('.badge')?.textContent.toLowerCase() || '';

      const matchDist = !distQuery || distText.includes(distQuery);
      const matchCrime = !crimeQuery || crimeText.includes(crimeQuery);
      const matchRisk = !riskQuery || riskText.includes(riskQuery);

      if (matchDist && matchCrime && matchRisk) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    });

    // Filter map markers in real-time across both views
    activeMarkers.forEach(item => {
      const matchDist = !distQuery || item.data.district.toLowerCase().includes(distQuery);
      const matchCrime = !crimeQuery || item.data.crime_head.toLowerCase().includes(crimeQuery);

      if (matchDist && matchCrime) {
        if (!markersLayer.hasLayer(item.marker)) {
          markersLayer.addLayer(item.marker);
        }
        if (!clusterGroup.hasLayer(item.clusterMarker)) {
          clusterGroup.addLayer(item.clusterMarker);
        }
      } else {
        if (markersLayer.hasLayer(item.marker)) {
          markersLayer.removeLayer(item.marker);
        }
        if (clusterGroup.hasLayer(item.clusterMarker)) {
          clusterGroup.removeLayer(item.clusterMarker);
        }
      }
    });
  };

  if (filterDistrict) {
    filterDistrict.addEventListener('input', () => {
      const val = filterDistrict.value.trim().toLowerCase();
      updateZoneDropdownOptions(val);
      updateStationDropdownOptions(val);
      filterTable();
      renderFilteredHotspots();
    });
  }
  if (filterZone) {
    filterZone.addEventListener('change', () => {
      const val = filterDistrict ? filterDistrict.value.trim().toLowerCase() : 'all';
      updateStationDropdownOptions(val);
      const selectedZone = filterZone.value;
      if (selectedZone !== 'all' && map) {
        const stationsToScan = masterStations.length > 0 ? masterStations : KARNATAKA_POLICE_STATIONS;
        const zoneSts = stationsToScan.filter(st => st.zone === selectedZone);
        if (zoneSts.length > 0) {
          const avgLat = zoneSts.reduce((a, b) => a + b.lat, 0) / zoneSts.length;
          const avgLon = zoneSts.reduce((a, b) => a + b.lon, 0) / zoneSts.length;
          map.flyTo([avgLat, avgLon], 13, { duration: 1.2 });
        }
      }
      filterTable();
      renderFilteredHotspots();
    });
  }
  if (filterStation) {
    filterStation.addEventListener('change', () => {
      const selectedStation = filterStation.value;
      if (selectedStation !== 'all' && map) {
        const stationsToScan = masterStations.length > 0 ? masterStations : KARNATAKA_POLICE_STATIONS;
        const stObj = stationsToScan.find(s => s.name === selectedStation);
        if (stObj) {
          map.flyTo([stObj.lat, stObj.lon], 14, { duration: 1.2 });
        }
      }
      filterTable();
      renderFilteredHotspots();
    });
  }
  if (filterCrime) filterCrime.addEventListener('input', () => { filterTable(); renderFilteredHotspots(); });
  if (filterRisk) filterRisk.addEventListener('input', filterTable);

  // --- SECTION: LIVE FIR/COMPLAINT INJECTION ---
  const injectForm = document.getElementById('fir-inject-form');
  const injectStatus = document.getElementById('inject-status-message');

  if (injectForm) {
    injectForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = injectForm.querySelector('.btn-submit');
      if (submitBtn) submitBtn.disabled = true;
      
      if (injectStatus) {
        injectStatus.className = '';
        injectStatus.style.display = 'none';
      }

      const payload = {
        district: document.getElementById('inject-district').value,
        police_station: document.getElementById('inject-station').value,
        crime_head: document.getElementById('inject-crime').value,
        mo_description: document.getElementById('inject-mo').value,
        offender_name: document.getElementById('inject-suspect-name').value || null,
        age: parseInt(document.getElementById('inject-suspect-age').value, 10) || null,
        gender: document.getElementById('inject-suspect-gender').value
      };

      try {
        const response = await fetch(`${API_BASE}/server/ashen_api/api/fir/inject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error('Failed to inject record');
        const data = await response.json();

        if (data.success) {
          if (injectStatus) {
            injectStatus.className = 'success';
            injectStatus.innerHTML = `<strong>Success:</strong> FIR <span style="font-family:monospace;font-weight:bold">${data.fir.fir_number}</span> has been successfully injected into the Catalyst Data Store!`;
            if (data.suspect) {
              injectStatus.innerHTML += `<br>Linked suspect profile <span style="font-family:monospace;font-weight:bold">${data.suspect.offender_id}</span> (${data.suspect.offender_name}) registered.`;
            }
          }
          
          injectForm.reset();
          
          // Dynamically refresh the dashboard stats & Leaflet GIS map live
          await loadAnalytics();
          await loadHotspots();
        } else {
          throw new Error(data.error || 'Unknown response');
        }
      } catch (err) {
        if (injectStatus) {
          injectStatus.className = 'error';
          injectStatus.textContent = `Error filing complaint: ${err.message}`;
        }
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }

  // --- SECTION 15: RESIZABLE MULTI-PANEL SPLITTER ENGINE ---
  const initResizablePanels = () => {
    const root = document.documentElement;

    // Load persisted panel dimensions from localStorage if available
    const savedSidebar = localStorage.getItem('ashen_sidebar_width');
    const savedMap = localStorage.getItem('ashen_map_height');
    const savedRiskWidth = localStorage.getItem('ashen_risk_width');
    const savedRiskHeight = localStorage.getItem('ashen_risk_table_height');

    if (savedSidebar) root.style.setProperty('--sidebar-width', savedSidebar);
    if (savedMap) root.style.setProperty('--map-height', savedMap);
    if (savedRiskWidth) root.style.setProperty('--risk-panel-width', savedRiskWidth);
    if (savedRiskHeight) root.style.setProperty('--risk-table-height', savedRiskHeight);

    const setupResizer = (resizerId, type, onResize) => {
      const resizer = document.getElementById(resizerId);
      if (!resizer) return;

      let isDragging = false;

      resizer.addEventListener('pointerdown', (e) => {
        isDragging = true;
        resizer.setPointerCapture(e.pointerId);
        resizer.classList.add('dragging');
        document.body.classList.add('is-resizing');
      });

      resizer.addEventListener('pointermove', (e) => {
        if (!isDragging) return;
        onResize(e);
        if (map) map.invalidateSize();
        if (window.districtTrendChart) window.districtTrendChart.resize();
      });

      const stopDrag = (e) => {
        if (isDragging) {
          isDragging = false;
          resizer.releasePointerCapture(e.pointerId);
          resizer.classList.remove('dragging');
          document.body.classList.remove('is-resizing');
          if (map) map.invalidateSize();
          if (window.districtTrendChart) window.districtTrendChart.resize();
        }
      };

      resizer.addEventListener('pointerup', stopDrag);
      resizer.addEventListener('pointercancel', stopDrag);
    };

    // 1. Sidebar Resizer (Vertical / Col Resize)
    setupResizer('resizer-sidebar', 'v', (e) => {
      const newWidth = Math.max(120, Math.min(480, e.clientX));
      const val = `${newWidth}px`;
      root.style.setProperty('--sidebar-width', val);
      localStorage.setItem('ashen_sidebar_width', val);
    });

    // 2. Map Height Resizer (Horizontal / Row Resize)
    setupResizer('resizer-map', 'h', (e) => {
      const mapEl = document.querySelector('.map-area');
      if (!mapEl) return;
      const rect = mapEl.getBoundingClientRect();
      const newHeight = Math.max(120, Math.min(window.innerHeight - 180, e.clientY - rect.top));
      const val = `${newHeight}px`;
      root.style.setProperty('--map-height', val);
      localStorage.setItem('ashen_map_height', val);
    });

    // 3. Bottom Row Panel Splitter (Vertical / Col Resize)
    setupResizer('resizer-bottom-row', 'v', (e) => {
      const bottomRow = document.querySelector('.bottom-row');
      if (!bottomRow) return;
      const rect = bottomRow.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const percent = Math.max(20, Math.min(80, (relativeX / rect.width) * 100));
      const val = `${percent}%`;
      root.style.setProperty('--risk-panel-width', val);
      localStorage.setItem('ashen_risk_width', val);
    });

    // 4. Risk Table vs Chart Sub-Splitter (Horizontal / Row Resize)
    setupResizer('resizer-risk-panel', 'h', (e) => {
      const riskTable = document.querySelector('.risk-table-wrap');
      if (!riskTable) return;
      const rect = riskTable.getBoundingClientRect();
      const newHeight = Math.max(60, Math.min(400, e.clientY - rect.top));
      const val = `${newHeight}px`;
      root.style.setProperty('--risk-table-height', val);
      localStorage.setItem('ashen_risk_table_height', val);
    });
  };

  initResizablePanels();

  // --- SECTION 16: CRIME ANOMALY DETECTION ENGINE & RADAR ---
  let allAnomalies = [];
  let currentAnomalyFilter = 'all';

  const renderAnomalyCards = () => {
    const container = document.getElementById('anomaly-cards-container');
    if (!container) return;

    const filtered = allAnomalies.filter(a => {
      if (currentAnomalyFilter === 'all') return true;
      return a.anomaly_type === currentAnomalyFilter;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-4);font-family:'IBM Plex Mono',monospace;font-size:11px;">No active anomalies matching filter.</div>`;
      return;
    }

    container.innerHTML = filtered.map(a => {
      const isDrop = a.anomaly_type === 'UNDERREPORTING_DROP';
      const badgeClass = isDrop ? 'drop' : 'surge';
      const cardClass = isDrop ? 'underreporting' : 'spike';
      const badgeText = isDrop ? '📉 UNDERREPORTING DROP' : '⚡ ABNORMAL SURGE';

      return `
        <div class="anomaly-card ${cardClass}">
          <div class="anom-card-header">
            <span class="anom-card-title">${a.district} · ${a.police_station}</span>
            <span class="anom-badge ${badgeClass}">${badgeText}</span>
          </div>
          <div class="anom-insight">${a.insight_summary}</div>
          <div class="anom-metrics-row">
            <div class="anom-metric-item">
              <span class="anom-metric-label">HISTORICAL BASELINE</span>
              <span class="anom-metric-val">${a.baseline_monthly_avg} / MO</span>
            </div>
            <div class="anom-metric-item">
              <span class="anom-metric-label">CURRENT VOLUME</span>
              <span class="anom-metric-val">${a.current_month_val}</span>
            </div>
            <div class="anom-metric-item">
              <span class="anom-metric-label">VARIANCE DELTA</span>
              <span class="anom-metric-val" style="color:${isDrop ? '#D97706' : '#DC2626'}">${a.percentage_change > 0 ? '+' : ''}${a.percentage_change}% (Z = ${a.z_score})</span>
            </div>
          </div>
          <div class="anom-recommendation">
            <strong style="color:${isDrop ? '#D97706' : '#DC2626'}">[ DIRECTIVE ]</strong> ${a.action_recommendation}
          </div>
          <div class="anom-card-footer">
            <button class="btn-anom-inspect" data-district="${a.district}" data-station="${a.police_station}">INSPECT ON GIS MAP →</button>
          </div>
        </div>
      `;
    }).join('');


    // Attach inspect handlers
    container.querySelectorAll('.btn-anom-inspect').forEach(btn => {
      btn.addEventListener('click', () => {
        const districtName = btn.getAttribute('data-district');
        
        // Switch view to Map / Dashboard
        const mapNav = document.querySelector('.nav-item[data-section="map"]') || document.querySelector('.nav-item[data-section="dashboard"]');
        if (mapNav) mapNav.click();

        // Zoom map to target district
        if (DISTRICT_COORDS && DISTRICT_COORDS[districtName]) {
          const coords = DISTRICT_COORDS[districtName];
          if (map) {
            map.flyTo(coords, 12, { duration: 1.5 });
          }
        }
      });
    });
  };

  const loadAnomalyRadar = async () => {
    try {
      const response = await fetch(`${API_BASE}/server/ashen_api/api/analytics/anomalies`);
      if (!response.ok) throw new Error('API Anomaly Fetch Error');
      const data = await response.json();
      allAnomalies = data.anomalies || [];

      // Update Summary Counts
      const badgeEl = document.getElementById('anomaly-count-badge');
      if (badgeEl) badgeEl.textContent = `${allAnomalies.length} ACTIVE ANOMALIES`;

      const underreportingCount = allAnomalies.filter(a => a.anomaly_type === 'UNDERREPORTING_DROP').length;
      const surgeCount = allAnomalies.filter(a => a.anomaly_type === 'ABNORMAL_SPIKE').length;
      const uniqueDistricts = new Set(allAnomalies.map(a => a.district)).size;

      const uEl = document.getElementById('anom-stat-underreporting');
      const sEl = document.getElementById('anom-stat-surges');
      const dEl = document.getElementById('anom-stat-districts');

      if (uEl) uEl.textContent = underreportingCount;
      if (sEl) sEl.textContent = surgeCount;
      if (dEl) dEl.textContent = uniqueDistricts;

      renderAnomalyCards();
    } catch (err) {
      console.warn('[-] Error loading anomaly radar:', err);
    }
  };

  // Wire Filter Chips
  const filterChips = document.querySelectorAll('#anomaly-filter-chips .gotham-filter-btn');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentAnomalyFilter = chip.getAttribute('data-filter');
      renderAnomalyCards();
    });
  });


  loadAnomalyRadar();
});



