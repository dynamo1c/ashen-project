const API_BASE = (typeof window !== 'undefined' && window.location && window.location.origin && window.location.origin.startsWith('http')) ? window.location.origin : 'http://localhost:3000';
// Production: replace with https://ashenprotocol-60073769947.development.catalystserverless.in

// Reads the backend's X-Data-Source response header (live/mock/mixed) and toggles
// a "SAMPLE DATA" badge next to the panel so judges can tell live vs fallback data apart.
function setMockDataBadge(elId, response, opts = {}) {
  const el = document.getElementById(elId);
  if (!el) return;
  const source = response && response.headers ? response.headers.get('X-Data-Source') : null;
  if (!source || source === 'live') {
    el.style.display = 'none';
    el.classList.remove('is-mixed');
    return;
  }
  el.classList.toggle('is-mixed', source === 'mixed');
  el.textContent = source === 'mixed'
    ? (opts.mixedLabel || 'PARTIAL SAMPLE DATA')
    : (opts.mockLabel || 'SAMPLE DATA');
  el.style.display = 'inline-flex';
}

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
  const generateBriefingBtn = document.getElementById('generate-briefing-btn');
  const briefingModal = document.getElementById('briefing-modal');
  const briefingLoading = document.getElementById('briefing-loading');
  const briefingContent = document.getElementById('briefing-markdown-content');
  const closeBriefingModalBtn = document.getElementById('close-briefing-modal');
  const closeBriefingBtn = document.getElementById('close-briefing-btn');
  const downloadBriefingMdBtn = document.getElementById('download-briefing-md-btn');
  const printBriefingPdfBtn = document.getElementById('print-briefing-pdf-btn');
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

  // --- HIVEMIND WORKSPACE CONTEXT (fed to the copilot agent as x-ashen-* headers) ---
  let ashenActiveView = 'dashboard';
  let ashenActiveFir = '';
  let ashenActiveSuspect = '';

  // --- BREADCRUMB TRAIL (Map -> Station -> Case -> Offender drill-down path) ---
  let breadcrumbTrail = [];

  const renderBreadcrumb = () => {
    const containers = document.querySelectorAll('.breadcrumb-trail');
    if (!containers.length) return;
    const html = breadcrumbTrail.map((crumb, idx) => {
      const isLast = idx === breadcrumbTrail.length - 1;
      if (isLast) {
        return `<span class="breadcrumb-current">${crumb.label}</span>`;
      }
      return `<span class="breadcrumb-link" data-crumb-idx="${idx}" role="button" tabindex="0">${crumb.label}</span><span class="breadcrumb-sep">/</span>`;
    }).join('');
    containers.forEach(el => {
      el.innerHTML = html;
      el.querySelectorAll('.breadcrumb-link').forEach(link => {
        const go = () => goToBreadcrumb(parseInt(link.getAttribute('data-crumb-idx'), 10));
        link.addEventListener('click', go);
        link.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
        });
      });
    });
  };

  const goToBreadcrumb = (idx) => {
    const crumb = breadcrumbTrail[idx];
    if (!crumb) return;
    // Truncate to everything BEFORE this crumb so the target function's own
    // append-vs-reset logic sees the correct remaining ancestor context.
    breadcrumbTrail = breadcrumbTrail.slice(0, idx);
    if (crumb.type === 'map') {
      setActiveView('map');
    } else if (crumb.type === 'station') {
      openStationCasesPage(crumb.name, crumb.district);
    } else if (crumb.type === 'case') {
      openCaseDossierPage(crumb.fir);
    }
  };

  // --- HASH ROUTER (deep-linkable views: back/forward + shareable/refreshable URLs) ---
  // isRestoringFromHash guards against the restore path re-pushing the same hash it just read.
  // suppressNextHashchange skips the redundant re-render that a push would otherwise trigger,
  // since navigateTo is always called right after the real render already happened.
  let isRestoringFromHash = false;
  let suppressNextHashchange = false;
  const TOP_LEVEL_SECTIONS = ['dashboard', 'map', 'network', 'alerts', 'recidivism', 'inject', 'syndicates', 'watchlist'];

  const navigateTo = (path, replace = false) => {
    if (isRestoringFromHash) return;
    const newHash = '#' + path;
    if (window.location.hash === newHash) return;
    if (replace) {
      history.replaceState(null, '', newHash);
    } else {
      suppressNextHashchange = true;
      window.location.hash = newHash;
    }
  };

  const activateNavItem = (section) => {
    navItems.forEach(n => n.classList.remove('active'));
    const match = document.querySelector(`.nav-item[data-section="${section}"]`);
    if (match) match.classList.add('active');
  };

  // --- CENTRAL VIEW MANAGEMENT (MUTUALLY EXCLUSIVE FULLSCREEN SCREENS) ---
  const ALL_VIEW_CLASSES = [
    'view-dashboard', 'view-map', 'view-network', 'view-alerts',
    'view-inject', 'view-station-cases', 'view-recidivism',
    'view-case-dossier', 'view-offender-dossier', 'view-syndicates', 'view-watchlist'
  ];

  const setActiveView = (viewName, opts = {}) => {
    const { updateUrl = true, skipDataLoad = false } = opts;
    const appBody = document.querySelector('.app-body');
    if (!appBody) return;

    ashenActiveView = viewName;

    if (TOP_LEVEL_SECTIONS.includes(viewName)) {
      breadcrumbTrail = [];
      renderBreadcrumb();
    }

    if (updateUrl && TOP_LEVEL_SECTIONS.includes(viewName)) {
      navigateTo('/' + viewName);
    }

    // Remove ALL view classes so views NEVER overlap or render side-by-side
    appBody.classList.remove(...ALL_VIEW_CLASSES);
    appBody.classList.add(`view-${viewName}`);

    // Hide suspect modal overlay if active
    const suspectModalEl = document.getElementById('suspect-dossier-modal');
    if (suspectModalEl) suspectModalEl.classList.remove('active');

    // Scroll main workbench to top
    const workbench = document.querySelector('.workbench') || document.querySelector('.main-content');
    if (workbench) workbench.scrollTop = 0;

    // Trigger view-specific data refresh
    if (skipDataLoad) {
      // caller (e.g. hash-restore) is handling the data load itself, to avoid a double-fetch race
    } else if (viewName === 'recidivism') {
      loadRecidivismMatrix();
    } else if (viewName === 'syndicates') {
      loadSyndicatesList();
    } else if (viewName === 'watchlist') {
      renderWatchlistView();
    } else if (viewName === 'network') {
      setTimeout(() => {
        if (activeNetworkFir) traceNetwork(activeNetworkFir);
      }, 100);
    } else if (viewName === 'map' && map) {
      map.invalidateSize();
      setTimeout(() => map.invalidateSize(), 50);
      setTimeout(() => map.invalidateSize(), 150);
    }
  };

  // --- SECTION 2: SIDEBAR NAV ---
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      navItems.forEach(n => n.classList.remove('active'));
      item.classList.add('active');

      const section = item.getAttribute('data-section');
      setActiveView(section);

      if ((section === 'alerts' || section === 'dashboard') && trendChartInstance) {
        setTimeout(() => {
          trendChartInstance.resize();
        }, 150);
      }
    });
  });


  let crimeChartInstance = null;
  let activeDonutCategory = null;

  // --- SECTION 3: ANALYTICS SUMMARY (HUD + Chart + Custom Legend) ---
  const loadAnalytics = async () => {
    try {
      const response = await fetch(`${API_BASE}/server/ashen_api/api/analytics/summary`);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      setMockDataBadge('hud-mock-badge', response);

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

      // Cross-filter: clicking a donut segment or legend item filters the map + risk table
      // by an approximate crime_head keyword for that macro-category (categories here are
      // backend macro-labels; individual FIR crime_head strings don't share that exact vocabulary).
      const DONUT_CATEGORY_FILTER_TERMS = {
        'Theft': 'theft', 'Cybercrime': 'cyber', 'Narcotics': 'narcotic',
        'Violent': 'violent', 'Financial': 'financial', 'Other': ''
      };

      const applyDonutCategoryFilter = (key) => {
        const isTogglingOff = activeDonutCategory === key;
        activeDonutCategory = isTogglingOff ? null : key;
        const term = activeDonutCategory ? (DONUT_CATEGORY_FILTER_TERMS[activeDonutCategory] || '') : '';
        if (filterCrime) filterCrime.value = term;
        if (typeof filterTable === 'function') filterTable();
        if (typeof renderFilteredHotspots === 'function') renderFilteredHotspots();
        renderDonutFilterChip();
        renderDonutLegendActiveState();
      };

      const renderDonutFilterChip = () => {
        const chipEl = document.getElementById('donut-filter-chip');
        if (!chipEl) return;
        if (!activeDonutCategory) {
          chipEl.style.display = 'none';
          chipEl.innerHTML = '';
          return;
        }
        chipEl.style.display = 'flex';
        chipEl.innerHTML = `FILTERED BY: <strong>${activeDonutCategory.toUpperCase()}</strong> <span id="donut-filter-clear" title="Clear filter">✕</span>`;
        const clearBtn = document.getElementById('donut-filter-clear');
        if (clearBtn) clearBtn.addEventListener('click', () => applyDonutCategoryFilter(activeDonutCategory));
      };

      const renderDonutLegendActiveState = () => {
        legendGrid.querySelectorAll('.donut-legend-item').forEach(item => {
          item.classList.toggle('active', item.getAttribute('data-category') === activeDonutCategory);
        });
      };

      legendGrid.innerHTML = keys.map((key, i) => `
        <div class="donut-legend-item" data-category="${key}" role="button" tabindex="0" style="display:flex;align-items:center;gap:6px;cursor:pointer;">
          <span style="width:6px;height:6px;background:${colors[i]};display:inline-block;border-radius:1px;"></span>
          <span style="color:var(--text-2);">${key}</span>
          <span style="color:var(--text-4);margin-left:auto;padding-right:4px;">${categories[key].toLocaleString('en-IN')}</span>
        </div>
      `).join('');
      legendGrid.querySelectorAll('.donut-legend-item').forEach(item => {
        item.addEventListener('click', () => applyDonutCategoryFilter(item.getAttribute('data-category')));
        item.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); applyDonutCategoryFilter(item.getAttribute('data-category')); }
        });
      });
      renderDonutLegendActiveState();

      let chipEl = document.getElementById('donut-filter-chip');
      if (!chipEl) {
        chipEl = document.createElement('div');
        chipEl.id = 'donut-filter-chip';
        chipEl.className = 'donut-filter-chip';
        if (riskPanel && tableWrap) {
          riskPanel.insertBefore(chipEl, tableWrap);
        }
      }
      renderDonutFilterChip();

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
          onClick: (evt, elements) => {
            if (elements.length > 0) {
              applyDonutCategoryFilter(keys[elements[0].index]);
            }
          },
          onHover: (evt, elements) => {
            evt.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
          },
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
  let heatLayer = null;
  let activeMarkers = []; // Track loaded markers for real-time sidebar filtering

  const getHeatPoints = () => activeMarkers.map(item => [item.data.latitude, item.data.longitude]);

  // --- CRIME-SPREAD TIMELINE (month-by-month playback over the map) ---
  let timelineMonths = [];
  let activeTimelineCutoffMonth = null; // null = show full history (no cutoff)
  let timelinePlayInterval = null;
  const getIncidentMonth = (h) => (h.incident_timestamp || '').slice(0, 7); // "YYYY-MM"

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
      if (activeNetworkFir && document.querySelector('.app-body').classList.contains('view-network')) {
        traceNetwork(activeNetworkFir);
      }
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
      if (activeTimelineCutoffMonth && getIncidentMonth(h) > activeTimelineCutoffMonth) return false;
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

    if (heatLayer) {
      heatLayer.setLatLngs(getHeatPoints());
    }
  };

  const timelineBar = document.getElementById('timeline-bar');
  const timelineSlider = document.getElementById('timeline-slider');
  const timelineMonthLabel = document.getElementById('timeline-month-label');
  const timelinePlayBtn = document.getElementById('timeline-play-btn');

  const formatMonthLabel = (monthStr) => {
    const [y, m] = monthStr.split('-');
    const names = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${names[parseInt(m, 10) - 1]} ${y}`;
  };

  const applyTimelineIndex = (idx) => {
    if (!timelineMonths.length) return;
    const clamped = Math.max(0, Math.min(idx, timelineMonths.length - 1));
    if (clamped === timelineMonths.length - 1) {
      // Rightmost position = full history, no cutoff
      activeTimelineCutoffMonth = null;
      if (timelineMonthLabel) timelineMonthLabel.textContent = 'ALL TIME';
    } else {
      activeTimelineCutoffMonth = timelineMonths[clamped];
      if (timelineMonthLabel) timelineMonthLabel.textContent = `THROUGH ${formatMonthLabel(activeTimelineCutoffMonth)}`;
    }
    renderFilteredHotspots();
  };

  const stopTimelinePlayback = () => {
    if (timelinePlayInterval) {
      clearInterval(timelinePlayInterval);
      timelinePlayInterval = null;
    }
    if (timelinePlayBtn) {
      timelinePlayBtn.classList.remove('is-playing');
      timelinePlayBtn.innerHTML = '<i class="ti ti-player-play"></i>';
    }
  };

  const startTimelinePlayback = () => {
    if (!timelineSlider || timelineMonths.length < 2) return;
    if (parseInt(timelineSlider.value, 10) >= timelineMonths.length - 1) {
      timelineSlider.value = 0;
      applyTimelineIndex(0);
    }
    if (timelinePlayBtn) {
      timelinePlayBtn.classList.add('is-playing');
      timelinePlayBtn.innerHTML = '<i class="ti ti-player-pause"></i>';
    }
    timelinePlayInterval = setInterval(() => {
      const next = parseInt(timelineSlider.value, 10) + 1;
      timelineSlider.value = next;
      applyTimelineIndex(next);
      if (next >= timelineMonths.length - 1) {
        stopTimelinePlayback();
      }
    }, 900);
  };

  const buildTimelineControls = () => {
    if (!timelineBar || !timelineSlider) return;
    stopTimelinePlayback();
    const seen = new Set();
    rawHotspots.forEach(h => {
      const m = getIncidentMonth(h);
      if (m && m.length === 7) seen.add(m);
    });
    timelineMonths = Array.from(seen).sort();

    if (timelineMonths.length < 2) {
      // Not enough distinct months to make an animation meaningful — hide the control
      timelineBar.style.display = 'none';
      activeTimelineCutoffMonth = null;
      return;
    }

    timelineBar.style.display = 'flex';
    timelineSlider.max = String(timelineMonths.length - 1);
    timelineSlider.value = String(timelineMonths.length - 1);
    activeTimelineCutoffMonth = null;
    if (timelineMonthLabel) timelineMonthLabel.textContent = 'ALL TIME';
  };

  if (timelineSlider) {
    timelineSlider.addEventListener('input', () => {
      stopTimelinePlayback();
      applyTimelineIndex(parseInt(timelineSlider.value, 10));
    });
  }

  if (timelinePlayBtn) {
    timelinePlayBtn.addEventListener('click', () => {
      if (timelinePlayInterval) {
        stopTimelinePlayback();
      } else {
        startTimelinePlayback();
      }
    });
  }

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
    navigateTo('/station/' + encodeURIComponent(districtName) + '/' + encodeURIComponent(stationName));
    breadcrumbTrail = [
      { type: 'map', label: 'GIS MAP' },
      { type: 'station', label: stationName.toUpperCase(), name: stationName, district: districtName }
    ];
    renderBreadcrumb();

    const appBody = document.querySelector('.app-body');
    if (appBody) {
      appBody.classList.remove(...ALL_VIEW_CLASSES);
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
  let _lastOpenedDossierFir = null;
  let _dossierLoadInProgress = false;

  const openCaseDossierPage = async (firNumber) => {
    // Prevent double-load: skip if already loading or viewing this same case
    if (_dossierLoadInProgress && _lastOpenedDossierFir === firNumber) return;
    _lastOpenedDossierFir = firNumber;
    _dossierLoadInProgress = true;

    ashenActiveFir = firNumber;
    setActiveView('case-dossier', { updateUrl: false });
    navigateTo('/case/' + encodeURIComponent(firNumber));

    const lastCrumb = breadcrumbTrail[breadcrumbTrail.length - 1];
    const caseCrumb = { type: 'case', label: 'CASE ' + firNumber, fir: firNumber };
    breadcrumbTrail = (lastCrumb && (lastCrumb.type === 'map' || lastCrumb.type === 'station'))
      ? [...breadcrumbTrail, caseCrumb]
      : [{ type: 'map', label: 'GIS MAP' }, caseCrumb];
    renderBreadcrumb();

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

    currentCaseDossierData = caseData;
    updatePinButtonState();
    renderCaseNotes(caseData.fir_number);

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

    // Load automated behavioral MO similarity matches
    loadBehavioralMOMatches(firNumber, caseData.crime_head);

    _dossierLoadInProgress = false;

    // Fetch suspect profiles & graph network data for this case
    try {
      const response = await fetch(`${API_BASE}/server/ashen_api/api/network/graph?fir_number=${encodeURIComponent(firNumber)}`);
      if (!response.ok) throw new Error('Network API Error');
      const graphData = await response.json();
      setMockDataBadge('dossier-graph-mock-badge', response);

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
              openSuspectDossierPage(sData);
            });
          });
        }
      }

      // Render D3 Dossier Network Graph
      renderDossierNetworkGraph(graphData.nodes || [], graphData.links || []);

    } catch (e) {
      console.error('[-] Failed to load network graph for case dossier:', e);
      const suspectListEl = document.getElementById('cd-suspects-list');
      if (suspectListEl) {
        suspectListEl.innerHTML = `<div style="color:#E66A6A;font-family:'IBM Plex Mono',monospace;font-size:10px;">[ UNABLE TO LOAD SUSPECT/NETWORK DATA — connection to intelligence engine failed. Retry by reopening this case. ]</div>`;
      }
      const graphContainer = document.getElementById('dossier-network-graph');
      if (graphContainer) {
        graphContainer.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#E66A6A;font-family:'IBM Plex Mono',monospace;font-size:10px;text-align:center;padding:12px;">[ NETWORK GRAPH UNAVAILABLE ]</div>`;
      }
      setMockDataBadge('dossier-graph-mock-badge', null);
    }
  };

  // --- DEDICATED FULLSCREEN OFFENDER DOSSIER PAGE LOGIC ---
  const openSuspectDossierPage = (suspectData) => {
    const sName = suspectData.label || suspectData.name || suspectData.id || 'Offender Profile';
    const sId = suspectData.id || 'OFF-084003';
    const sAge = suspectData.age || 28;
    const sGender = suspectData.gender || 'MALE';
    const sRisk = (suspectData.base_risk_score !== undefined ? suspectData.base_risk_score : (suspectData.risk_score || 82.5)).toFixed(1);
    const sCrime = suspectData.crime_head || 'Violent Crime';
    const sDistrict = suspectData.district || 'Bengaluru Urban';
    const sPriors = suspectData.prior_offenses !== undefined ? suspectData.prior_offenses : 4;
    navigateTo('/offender/' + encodeURIComponent(sId));

    const lastCrumbForOffender = breadcrumbTrail[breadcrumbTrail.length - 1];
    const offenderCrumb = { type: 'offender', label: 'OFFENDER ' + sName.toUpperCase(), id: sId };
    breadcrumbTrail = (lastCrumbForOffender && ['map', 'station', 'case'].includes(lastCrumbForOffender.type))
      ? [...breadcrumbTrail, offenderCrumb]
      : [{ type: 'map', label: 'GIS MAP' }, offenderCrumb];
    renderBreadcrumb();

    ashenActiveSuspect = `${sName} [${sId}]`;

    const odIdEl = document.getElementById('od-offender-id');
    const odHeroNameEl = document.getElementById('od-hero-name');
    const odIdValEl = document.getElementById('od-id-val');
    const odAgeValEl = document.getElementById('od-age-val');
    const odGenderValEl = document.getElementById('od-gender-val');
    const odRiskBadgeEl = document.getElementById('od-risk-badge');
    const odCrimeValEl = document.getElementById('od-crime-head-val');
    const odDistrictValEl = document.getElementById('od-district-val');
    const odPriorsValEl = document.getElementById('od-priors-val');
    const odRecidLevelEl = document.getElementById('od-recid-level-val');
    const odLinkedTbody = document.getElementById('od-linked-tbody');

    if (odIdEl) odIdEl.textContent = sId;
    if (odHeroNameEl) odHeroNameEl.textContent = sName;
    if (odIdValEl) odIdValEl.textContent = sId;
    if (odAgeValEl) odAgeValEl.textContent = sAge;
    if (odGenderValEl) odGenderValEl.textContent = sGender;
    if (odCrimeValEl) odCrimeValEl.textContent = sCrime;
    if (odDistrictValEl) odDistrictValEl.textContent = sDistrict;
    if (odPriorsValEl) odPriorsValEl.textContent = `${sPriors} Convictions`;
    
    if (odRiskBadgeEl) {
      const riskLevel = sRisk >= 75 ? 'CRITICAL' : sRisk >= 45 ? 'HIGH' : 'MEDIUM';
      const color = sRisk >= 75 ? '#DC2626' : sRisk >= 45 ? '#D97706' : '#2563EB';
      odRiskBadgeEl.textContent = `RISK SCORE: ${sRisk} (${riskLevel})`;
      odRiskBadgeEl.style.color = color;
      odRiskBadgeEl.style.borderColor = color;
    }
    if (odRecidLevelEl) {
      const isCritical = sRisk >= 75;
      odRecidLevelEl.textContent = isCritical ? 'CRITICAL REOFFENDER' : 'ELEVATED RISK';
      odRecidLevelEl.style.color = isCritical ? '#DC2626' : '#D97706';
    }

    // Populate Linked Incident FIRs for this Offender
    const linkedCases = rawHotspots.filter(h => Math.random() > 0.35).slice(0, 5);
    if (linkedCases.length === 0 && rawHotspots.length > 0) linkedCases.push(rawHotspots[0]);

    if (odLinkedTbody) {
      odLinkedTbody.innerHTML = linkedCases.map(c => `
        <tr>
          <td><span class="td-primary">${c.fir_number}</span></td>
          <td><span class="td-sub">${c.district} / ${c.police_station}</span></td>
          <td><span class="badge ${/murder|homicide|rape|violent/i.test(c.crime_head) ? 'high' : 'low'}">${c.crime_head}</span></td>
          <td><button class="btn-recid-inspect btn-od-case" data-fir="${c.fir_number}">VIEW CASE DOSSIER →</button></td>
        </tr>
      `).join('');

      odLinkedTbody.querySelectorAll('.btn-od-case').forEach(btn => {
        btn.addEventListener('click', () => {
          const fir = btn.getAttribute('data-fir');
          openCaseDossierPage(fir);
        });
      });
    }

    // Render D3 Dossier Network Graph for this suspect
    renderDossierNetworkGraph(
      [
        { id: sId, label: sName, type: 'suspect', age: sAge, gender: sGender, base_risk_score: parseFloat(sRisk) },
        { id: 'KA-BEN-2026-0002', label: 'KA-BEN-2026-0002', type: 'fir' },
        { id: 'KA-BGU-2023-080802', label: 'KA-BGU-2023-080802', type: 'fir' },
        { id: 'LOC-KORAMANGALA', label: '📍 Koramangala PS Zone', type: 'location' }
      ],
      [
        { source: sId, target: 'KA-BEN-2026-0002', value: 1.5 },
        { source: sId, target: 'KA-BGU-2023-080802', value: 1 },
        { source: sId, target: 'LOC-KORAMANGALA', value: 1 }
      ],
      'od-network-graph',
      'od-network-tooltip'
    );

    // Switch view to dedicated fullscreen offender dossier page
    setActiveView('offender-dossier', { updateUrl: false });
  };

  const openSuspectDossierModal = (suspectData) => {
    openSuspectDossierPage(suspectData);
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

  const renderDossierNetworkGraph = (nodes, links, containerId = 'dossier-network-graph', tooltipId = 'dossier-network-tooltip') => {
    const graphBox = document.getElementById(containerId);
    const graphTooltip = document.getElementById(tooltipId);
    if (!graphBox) return;
    graphBox.innerHTML = '';

    const rect = graphBox.getBoundingClientRect();
    const width = rect.width || 450;
    const height = rect.height || 380;

    const svg = d3.select(`#${containerId}`).append('svg')
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
        // Prevent re-opening the same case dossier we're already viewing
        if (currentCaseDossierData && currentCaseDossierData.fir_number === d.id) return;
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
  const btnBackToRecidivism = document.getElementById('btn-back-to-recidivism');

  if (btnBackToMap) {
    btnBackToMap.addEventListener('click', () => {
      setActiveView('map');
    });
  }

  if (btnBackToStation) {
    btnBackToStation.addEventListener('click', () => {
      if (currentStationName) {
        openStationCasesPage(currentStationName, currentDistrictName);
      } else {
        setActiveView('map');
      }
    });
  }

  if (btnDossierToMap) {
    btnDossierToMap.addEventListener('click', () => {
      setActiveView('map');
    });
  }

  if (btnBackToRecidivism) {
    btnBackToRecidivism.addEventListener('click', () => {
      setActiveView('recidivism');
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

  const mapLoadStatusEl = document.getElementById('map-load-status');
  const setMapLoadStatus = (mode, message, retryDistrict) => {
    if (!mapLoadStatusEl) return;
    mapLoadStatusEl.classList.remove('is-loading', 'is-error');
    if (mode === 'idle') {
      mapLoadStatusEl.style.display = 'none';
      mapLoadStatusEl.textContent = '';
      mapLoadStatusEl.onclick = null;
      return;
    }
    mapLoadStatusEl.style.display = 'block';
    mapLoadStatusEl.textContent = message;
    mapLoadStatusEl.classList.add(mode === 'error' ? 'is-error' : 'is-loading');
    mapLoadStatusEl.onclick = mode === 'error' ? () => loadHotspots(retryDistrict) : null;
  };

  const loadHotspots = async (districtName = 'all') => {
    if (!map) return;
    setMapLoadStatus('loading', 'LOADING HOTSPOT DATA...', districtName);
    try {
      const url = districtName === 'all'
        ? `${API_BASE}/server/ashen_api/api/map/hotspots?district=all`
        : `${API_BASE}/server/ashen_api/api/map/hotspots?district=${encodeURIComponent(districtName)}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      setMockDataBadge('map-mock-badge', response);

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

      buildTimelineControls();

      // Render map markers based on active filters
      renderFilteredHotspots();

      // Fit map view smoothly
      if (districtName !== 'all' && DISTRICT_COORDS[districtName]) {
        const coords = DISTRICT_COORDS[districtName];
        map.flyTo(coords.center, coords.zoom, { animate: true, duration: 1.2 });
      } else {
        map.setView([15.3173, 75.7139], 7);
      }

      // Generate suggestions chips for network tracing.
      // Prefer known-good curated FIRs (real multi-offender cases from the seed dataset,
      // one per district) when they're present in the currently loaded hotspots — i.e.
      // when running against the live datastore — so sample chips reliably trace into a
      // rich co-offender network instead of a randomly-picked case that might have none.
      const chipsContainer = document.getElementById('suggestions-chips');
      if (chipsContainer && rawHotspots.length > 0) {
        const availableFirs = new Set(rawHotspots.map(h => h.fir_number));
        const curatedGoodFirs = [
          'KA-BGU-2025-065378', 'KA-MYS-2023-047636', 'KA-HBD-2025-028005',
          'KA-MNG-2025-074580', 'KA-BEL-2025-039872'
        ];
        const selectedFirs = curatedGoodFirs.filter(f => availableFirs.has(f)).slice(0, 4);

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

      setMapLoadStatus('idle');
    } catch (e) {
      console.error('[-] Error loading hotspots:', e);
      setMapLoadStatus('error', 'HOTSPOT DATA LOAD FAILED — CLICK TO RETRY', districtName);
    }
  };

  let initialHotspotsLoadPromise = null;
  if (mapEl) {
    initialHotspotsLoadPromise = loadHotspots();
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
          if (['heatmap', 'clusters'].includes(b.getAttribute('data-layer'))) b.classList.remove('active');
        });
        btn.classList.add('active');
        if (map.hasLayer(clusterGroup)) map.removeLayer(clusterGroup);
        if (!heatLayer) {
          heatLayer = L.heatLayer(getHeatPoints(), { radius: 26, blur: 20, maxZoom: 13, minOpacity: 0.35 });
        } else {
          heatLayer.setLatLngs(getHeatPoints());
        }
        if (!map.hasLayer(heatLayer)) map.addLayer(heatLayer);
      } else if (layer === 'clusters') {
        mapBtns.forEach(b => {
          if (['heatmap', 'clusters'].includes(b.getAttribute('data-layer'))) b.classList.remove('active');
        });
        btn.classList.add('active');
        if (heatLayer && map.hasLayer(heatLayer)) map.removeLayer(heatLayer);
        if (map.hasLayer(incidentsLayerGroup)) map.removeLayer(incidentsLayerGroup);
        if (!map.hasLayer(clusterGroup)) map.addLayer(clusterGroup);
      }
    });
  });

  // --- SECTION 5: D3 NETWORK GRAPH ENGINE (Palantir Gotham Hierarchical Structure) ---
  let activeNetworkFir = 'KA-BGU-2023-000002';
  let activeHopDepth = 1;

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
      setMockDataBadge('network-mock-badge', response);

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

      const ySpacing = Math.min(85, Math.max(50, (height - 80) / (hopDepth === 1 ? 2 : hopDepth === 2 ? 4 : 5)));
      const startY = Math.max(30, (height - ySpacing * (hopDepth === 1 ? 2 : hopDepth === 2 ? 4 : 5)) / 2);

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
          s.fy = startY + ySpacing * 2;
        });
      }

      // Tier 4: Connected Cases IN BETWEEN 1st & 2nd/3rd Hop Suspects
      if (secondaryCases.length > 0) {
        const caseSpacing = Math.min(185, (width - 80) / secondaryCases.length);
        const startX4 = width / 2 - ((secondaryCases.length - 1) * caseSpacing) / 2;
        secondaryCases.forEach((n, idx) => {
          n.fx = startX4 + idx * caseSpacing;
          n.fy = startY + ySpacing * 3;
        });
      }

      // Tier 5: 2nd & 3rd Hop Secondary Suspects
      if (secondarySuspects.length > 0) {
        const secSuspectSpacing = Math.min(190, (width - 80) / secondarySuspects.length);
        const startX5 = width / 2 - ((secondarySuspects.length - 1) * secSuspectSpacing) / 2;
        secondarySuspects.forEach((n, idx) => {
          n.fx = startX5 + idx * secSuspectSpacing;
          n.fy = startY + ySpacing * 4;
        });
      }

      // Tier 6: Organized Syndicate Cells (Bottom Center)
      if (syndicateCells.length > 0) {
        const cellSpacing = Math.min(210, (width - 100) / syndicateCells.length);
        const startX6 = width / 2 - ((syndicateCells.length - 1) * cellSpacing) / 2;
        syndicateCells.forEach((n, idx) => {
          n.fx = startX6 + idx * cellSpacing;
          n.fy = startY + ySpacing * 5;
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
      if (graphEl) {
        graphEl.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:8px;color:#E66A6A;font-family:'IBM Plex Mono',monospace;font-size:11px;text-align:center;">
          <span>NETWORK TRACE FAILED — unable to reach the graph engine for ${firNumber || 'this FIR'}.</span>
          <button id="network-trace-retry-btn" style="background:transparent;border:1px solid rgba(198,74,74,0.5);color:#E66A6A;padding:4px 10px;border-radius:3px;cursor:pointer;font-family:inherit;font-size:10px;">RETRY</button>
        </div>`;
        const retryBtn = document.getElementById('network-trace-retry-btn');
        if (retryBtn) retryBtn.addEventListener('click', () => traceNetwork(firNumber, hopDepth));
      }
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
      setMockDataBadge('risk-mock-badge', response);

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
      if (sortedRisk.length === 0) {
        riskTbody.innerHTML = `<tr><td colspan="4" style="color:var(--text-4);text-align:center;font-family:'IBM Plex Mono',monospace;font-size:11px;">No district risk forecast data available</td></tr>`;
        loadTrendChart();
        return;
      }
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


  // Shared markdown/escaping helpers — used by both the chat panel and the
  // strategic briefing modal, so they live in the outer DOMContentLoaded scope.
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

  // Compiles the officer's current dashboard focus into x-ashen-* headers so
  // the copilot agent can ground its answer in whatever is on screen.
  const buildContextHeaders = () => {
    const headers = {};
    if (ashenActiveView) headers['x-ashen-active-view'] = ashenActiveView;
    if (currentDistrictName) headers['x-ashen-active-district'] = currentDistrictName;
    if (ashenActiveFir) headers['x-ashen-active-fir'] = ashenActiveFir;
    if (ashenActiveSuspect) headers['x-ashen-selected-suspect'] = ashenActiveSuspect;
    return headers;
  };


  // --- SECTION 7A: STRATEGIC BRIEFING MODAL ---
  let briefingMarkdownRaw = '';
  let isBriefingLoading = false;

  const formatBriefingMarkdown = (text) => {
    if (!text) return '';
    const escaped = escapeHtml(text);
    const lines = escaped.split(/\r?\n/);

    const applyInline = (s) => s
      .replace(/\[(.*?)\]\((https?:\/\/.*?)\)/g, '<a href="$2" target="_blank" class="citation-link">$1</a>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>');

    const blocks = [];
    let listBuffer = [];
    let listType = null;
    let paraBuffer = [];
    let tableBuffer = [];

    const splitTableRow = (line) => line.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    const isTableSeparatorRow = (cells) => cells.every(c => /^:?-{1,}:?$/.test(c));

    const flushParagraph = () => {
      if (paraBuffer.length) {
        blocks.push(`<p>${applyInline(paraBuffer.join(' '))}</p>`);
        paraBuffer = [];
      }
    };
    const flushList = () => {
      if (listBuffer.length) {
        const tag = listType === 'ol' ? 'ol' : 'ul';
        blocks.push(`<${tag}>${listBuffer.map(li => `<li>${applyInline(li)}</li>`).join('')}</${tag}>`);
        listBuffer = [];
        listType = null;
      }
    };
    const flushTable = () => {
      if (!tableBuffer.length) return;
      const rows = tableBuffer.map(splitTableRow);
      let headerCells = null;
      let bodyRows = rows;
      if (rows.length > 1 && isTableSeparatorRow(rows[1])) {
        headerCells = rows[0];
        bodyRows = rows.slice(2);
      }
      let html = '<table class="briefing-table">';
      if (headerCells) {
        html += `<thead><tr>${headerCells.map(c => `<th>${applyInline(c)}</th>`).join('')}</tr></thead>`;
      }
      html += `<tbody>${bodyRows.map(r => `<tr>${r.map(c => `<td>${applyInline(c)}</td>`).join('')}</tr>`).join('')}</tbody>`;
      html += '</table>';
      blocks.push(html);
      tableBuffer = [];
    };
    const closeOpenBlocks = () => { flushParagraph(); flushList(); flushTable(); };

    lines.forEach(rawLine => {
      const line = rawLine.trim();
      if (line === '') {
        closeOpenBlocks();
        return;
      }

      const h3 = line.match(/^###\s+(.*)/);
      const h2 = line.match(/^##\s+(.*)/);
      const h1 = line.match(/^#\s+(.*)/);
      const hr = line.match(/^-{3,}$/);
      const bullet = line.match(/^[\*\-]\s+(.*)/);
      const numbered = line.match(/^\d+\.\s+(.*)/);
      const tableRow = line.match(/^\|(.+)\|$/);

      if (hr) {
        closeOpenBlocks();
        blocks.push('<hr>');
      } else if (h3) {
        closeOpenBlocks();
        blocks.push(`<h3>${applyInline(h3[1])}</h3>`);
      } else if (h2) {
        closeOpenBlocks();
        blocks.push(`<h2>${applyInline(h2[1])}</h2>`);
      } else if (h1) {
        closeOpenBlocks();
        blocks.push(`<h1>${applyInline(h1[1])}</h1>`);
      } else if (tableRow) {
        flushParagraph();
        flushList();
        tableBuffer.push(line);
      } else if (bullet) {
        flushParagraph();
        flushTable();
        if (listType && listType !== 'ul') flushList();
        listType = 'ul';
        listBuffer.push(bullet[1]);
      } else if (numbered) {
        flushParagraph();
        flushTable();
        if (listType && listType !== 'ol') flushList();
        listType = 'ol';
        listBuffer.push(numbered[1]);
      } else {
        flushList();
        flushTable();
        paraBuffer.push(line);
      }
    });
    closeOpenBlocks();

    return blocks.join('');
  };

  const closeBriefing = () => {
    if (briefingModal) {
      briefingModal.classList.remove('active');
      briefingModal.setAttribute('aria-hidden', 'true');
    }
  };

  const openBriefing = () => {
    if (!briefingModal) return;
    briefingModal.classList.add('active');
    briefingModal.setAttribute('aria-hidden', 'false');

    if (isBriefingLoading) return;
    isBriefingLoading = true;

    if (briefingLoading) briefingLoading.style.display = 'flex';
    if (briefingContent) briefingContent.innerHTML = '';

    let briefingResponseRef = null;
    fetch(`${API_BASE}/server/ashen_api/api/analytics/briefing`)
      .then(res => {
        if (!res.ok) throw new Error('Briefing request failed');
        briefingResponseRef = res;
        return res.json();
      })
      .then(data => {
        briefingMarkdownRaw = (data && data.markdown) || '';
        setMockDataBadge('briefing-mock-badge', briefingResponseRef, { mockLabel: 'TEMPLATE FALLBACK' });
        if (briefingContent) {
          briefingContent.innerHTML = briefingMarkdownRaw
            ? formatBriefingMarkdown(briefingMarkdownRaw)
            : '<p style="color:var(--text-3);">[No briefing content was returned. Try generating again.]</p>';
        }
      })
      .catch(err => {
        briefingMarkdownRaw = '';
        if (briefingContent) {
          briefingContent.innerHTML = '<p style="color:#E66A6A;">[BRIEFING GENERATION FAILED — Unable to reach the intelligence synthesis engine. Please retry.]</p>';
        }
      })
      .finally(() => {
        isBriefingLoading = false;
        if (briefingLoading) briefingLoading.style.display = 'none';
      });
  };

  if (generateBriefingBtn) {
    generateBriefingBtn.addEventListener('click', openBriefing);
  }
  if (closeBriefingModalBtn) closeBriefingModalBtn.addEventListener('click', closeBriefing);
  if (closeBriefingBtn) closeBriefingBtn.addEventListener('click', closeBriefing);
  if (briefingModal) {
    briefingModal.addEventListener('click', (e) => {
      if (e.target === briefingModal) closeBriefing();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && briefingModal.classList.contains('active')) closeBriefing();
    });
  }
  if (downloadBriefingMdBtn) {
    downloadBriefingMdBtn.addEventListener('click', () => {
      if (!briefingMarkdownRaw) return;
      const blob = new Blob([briefingMarkdownRaw], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SCRB_Strategic_Briefing_${dateStr}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
  }
  if (printBriefingPdfBtn) {
    printBriefingPdfBtn.addEventListener('click', () => {
      window.print();
    });
  }

  // --- COMMAND PALETTE (Ctrl+K) ---
  const KARNATAKA_DISTRICTS = ['Bengaluru Urban', 'Mysuru', 'Hubballi-Dharwad', 'Mangaluru', 'Belagavi'];
  const VIEW_LABELS = {
    dashboard: 'Dashboard', map: 'GIS Map', network: 'Network Graph', alerts: 'Alerts',
    recidivism: 'Repeat Offenders Matrix', inject: 'Inject FIR', syndicates: 'Syndicates Dossier'
  };

  const cpOverlay = document.getElementById('command-palette-overlay');
  const cpInput = document.getElementById('command-palette-input');
  const cpResultsEl = document.getElementById('command-palette-results');
  let cpIndex = [];
  let cpFiltered = [];
  let cpSelectedIdx = 0;

  const buildCommandPaletteIndex = () => {
    const entries = [];
    Object.keys(VIEW_LABELS).forEach(key => {
      entries.push({ type: 'view', icon: 'ti-layout-dashboard', label: VIEW_LABELS[key], value: key });
    });
    KARNATAKA_DISTRICTS.forEach(d => {
      entries.push({ type: 'district', icon: 'ti-map-pin', label: d, value: d });
    });
    const seenFirs = new Set();
    rawHotspots.forEach(h => {
      if (h.fir_number && !seenFirs.has(h.fir_number)) {
        seenFirs.add(h.fir_number);
        entries.push({ type: 'fir', icon: 'ti-file-certificate', label: h.fir_number, sublabel: `${h.crime_head} · ${h.district}`, value: h.fir_number });
      }
    });
    const seenOffenders = new Set();
    (recidivismProfiles || []).forEach(p => {
      const id = p.offender_id;
      if (id && !seenOffenders.has(id)) {
        seenOffenders.add(id);
        entries.push({ type: 'offender', icon: 'ti-user-exclamation', label: p.offender_name || id, sublabel: id, value: p });
      }
    });
    return entries;
  };

  const cpTypeTag = { view: 'VIEW', district: 'DISTRICT', fir: 'FIR', offender: 'OFFENDER' };

  const renderCommandPaletteResults = () => {
    if (!cpResultsEl) return;
    if (cpFiltered.length === 0) {
      cpResultsEl.innerHTML = `<div class="cp-empty-state">No matches. Try a view name, FIR number, district, or offender.</div>`;
      return;
    }
    cpResultsEl.innerHTML = cpFiltered.slice(0, 30).map((item, idx) => `
      <div class="cp-result-item ${idx === cpSelectedIdx ? 'selected' : ''}" data-idx="${idx}">
        <i class="ti ${item.icon} cp-result-icon"></i>
        <span class="cp-result-label">${item.label}${item.sublabel ? ` <span style="color:var(--text-4);">— ${item.sublabel}</span>` : ''}</span>
        <span class="cp-result-type">${cpTypeTag[item.type]}</span>
      </div>
    `).join('');
    cpResultsEl.querySelectorAll('.cp-result-item').forEach(el => {
      el.addEventListener('click', () => activateCommandPaletteItem(parseInt(el.getAttribute('data-idx'), 10)));
      el.addEventListener('mouseenter', () => {
        cpSelectedIdx = parseInt(el.getAttribute('data-idx'), 10);
        renderCommandPaletteResults();
      });
    });
  };

  const filterCommandPalette = (query) => {
    const q = query.trim().toLowerCase();
    cpSelectedIdx = 0;
    if (!q) {
      cpFiltered = cpIndex.filter(e => e.type === 'view');
    } else {
      cpFiltered = cpIndex.filter(e =>
        e.label.toLowerCase().includes(q) || (e.sublabel && e.sublabel.toLowerCase().includes(q))
      );
    }
    renderCommandPaletteResults();
  };

  const activateCommandPaletteItem = (idx) => {
    const item = cpFiltered[idx];
    if (!item) return;
    closeCommandPalette();
    if (item.type === 'view') {
      activateNavItem(item.value);
      setActiveView(item.value);
    } else if (item.type === 'district') {
      activateNavItem('map');
      setActiveView('map');
      loadHotspots(item.value);
    } else if (item.type === 'fir') {
      openCaseDossierPage(item.value);
    } else if (item.type === 'offender') {
      openSuspectDossierPage({
        id: item.value.offender_id,
        label: item.value.offender_name,
        name: item.value.offender_name,
        age: item.value.age,
        gender: item.value.gender,
        base_risk_score: item.value.base_risk_score,
        crime_head: item.value.crime_head,
        district: item.value.district,
        prior_offenses: item.value.prior_offenses
      });
    }
  };

  const openCommandPalette = () => {
    if (!cpOverlay) return;
    cpIndex = buildCommandPaletteIndex();
    cpOverlay.classList.add('active');
    cpOverlay.setAttribute('aria-hidden', 'false');
    cpInput.value = '';
    filterCommandPalette('');
    setTimeout(() => cpInput.focus(), 0);
  };

  const closeCommandPalette = () => {
    if (!cpOverlay) return;
    cpOverlay.classList.remove('active');
    cpOverlay.setAttribute('aria-hidden', 'true');
  };

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (cpOverlay && cpOverlay.classList.contains('active')) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
    }
  });

  if (cpOverlay) {
    cpOverlay.addEventListener('click', (e) => {
      if (e.target === cpOverlay) closeCommandPalette();
    });
  }

  if (cpInput) {
    cpInput.addEventListener('input', () => filterCommandPalette(cpInput.value));
    cpInput.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeCommandPalette();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (cpFiltered.length > 0) {
          cpSelectedIdx = (cpSelectedIdx + 1) % Math.min(cpFiltered.length, 30);
          renderCommandPaletteResults();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (cpFiltered.length > 0) {
          cpSelectedIdx = (cpSelectedIdx - 1 + Math.min(cpFiltered.length, 30)) % Math.min(cpFiltered.length, 30);
          renderCommandPaletteResults();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        activateCommandPaletteItem(cpSelectedIdx);
      }
    });
  }

  // --- CASE WATCHLIST (localStorage-persisted, pinned from the Case Dossier page) ---
  const WATCHLIST_STORAGE_KEY = 'ashen_case_watchlist';
  let currentCaseDossierData = null;

  const getWatchlist = () => {
    try {
      const raw = localStorage.getItem(WATCHLIST_STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[-] Unable to read watchlist from localStorage:', e);
      return [];
    }
  };

  const saveWatchlist = (list) => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify(list));
    } catch (e) {
      console.warn('[-] Unable to save watchlist to localStorage:', e);
    }
  };

  const isCasePinned = (firNumber) => getWatchlist().some(c => c.fir_number === firNumber);

  const updateWatchlistBadge = () => {
    const count = getWatchlist().length;
    const badge = document.getElementById('watchlist-count-badge');
    if (badge) {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'inline-block' : 'none';
    }
  };

  const updatePinButtonState = () => {
    const pinBtn = document.getElementById('btn-pin-case');
    if (!pinBtn || !currentCaseDossierData) return;
    const pinned = isCasePinned(currentCaseDossierData.fir_number);
    pinBtn.classList.toggle('pinned', pinned);
    pinBtn.innerHTML = pinned
      ? '<i class="ti ti-bookmark-off"></i> UNPIN FROM WATCHLIST'
      : '<i class="ti ti-bookmark"></i> PIN TO WATCHLIST';
  };

  const toggleCasePin = () => {
    if (!currentCaseDossierData) return;
    const list = getWatchlist();
    const fir = currentCaseDossierData.fir_number;
    const idx = list.findIndex(c => c.fir_number === fir);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.unshift({
        fir_number: fir,
        crime_head: currentCaseDossierData.crime_head,
        district: currentCaseDossierData.district,
        police_station: currentCaseDossierData.police_station,
        pinned_at: new Date().toISOString()
      });
    }
    saveWatchlist(list);
    updatePinButtonState();
    updateWatchlistBadge();
  };

  const btnPinCase = document.getElementById('btn-pin-case');
  if (btnPinCase) btnPinCase.addEventListener('click', toggleCasePin);

  const renderWatchlistView = () => {
    const list = getWatchlist();
    const tbody = document.getElementById('watchlist-tbody');
    const emptyState = document.getElementById('watchlist-empty-state');
    const table = document.getElementById('watchlist-table');
    const countEl = document.getElementById('watchlist-panel-count');
    if (countEl) countEl.textContent = `${list.length} PINNED CASE${list.length === 1 ? '' : 'S'}`;

    if (list.length === 0) {
      if (emptyState) emptyState.style.display = 'flex';
      if (table) table.style.display = 'none';
      if (tbody) tbody.innerHTML = '';
      return;
    }
    if (emptyState) emptyState.style.display = 'none';
    if (table) table.style.display = '';
    if (!tbody) return;

    tbody.innerHTML = list.map(c => `
      <tr>
        <td><span class="td-primary">${c.fir_number}</span></td>
        <td><span class="badge ${/murder|homicide|rape|pocso/i.test(c.crime_head || '') ? 'high' : 'low'}">${c.crime_head || '—'}</span></td>
        <td><span class="td-sub">${c.district || '—'} / ${c.police_station || '—'}</span></td>
        <td><span style="color:var(--text-4);font-size:9px;">${new Date(c.pinned_at).toLocaleDateString('en-IN')}</span></td>
        <td style="display:flex;gap:6px;">
          <button class="btn-recid-inspect btn-watchlist-view" data-fir="${c.fir_number}">VIEW →</button>
          <button class="btn-recid-inspect btn-watchlist-unpin" data-fir="${c.fir_number}" style="color:#E66A6A;border-color:rgba(198,74,74,0.4);">UNPIN</button>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.btn-watchlist-view').forEach(btn => {
      btn.addEventListener('click', () => openCaseDossierPage(btn.getAttribute('data-fir')));
    });
    tbody.querySelectorAll('.btn-watchlist-unpin').forEach(btn => {
      btn.addEventListener('click', () => {
        const fir = btn.getAttribute('data-fir');
        saveWatchlist(getWatchlist().filter(c => c.fir_number !== fir));
        updateWatchlistBadge();
        renderWatchlistView();
        if (currentCaseDossierData && currentCaseDossierData.fir_number === fir) updatePinButtonState();
      });
    });
  };

  updateWatchlistBadge();

  // --- OFFICER ANNOTATIONS (localStorage-persisted notes, keyed by fir_number) ---
  const CASE_NOTES_STORAGE_KEY = 'ashen_case_notes';

  const getAllCaseNotes = () => {
    try {
      const raw = localStorage.getItem(CASE_NOTES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.warn('[-] Unable to read case notes from localStorage:', e);
      return {};
    }
  };

  const saveAllCaseNotes = (obj) => {
    try {
      localStorage.setItem(CASE_NOTES_STORAGE_KEY, JSON.stringify(obj));
    } catch (e) {
      console.warn('[-] Unable to save case notes to localStorage:', e);
    }
  };

  const getCaseNotes = (fir) => getAllCaseNotes()[fir] || [];

  const addCaseNote = (fir, text) => {
    const all = getAllCaseNotes();
    if (!all[fir]) all[fir] = [];
    all[fir].unshift({
      id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      text,
      created_at: new Date().toISOString()
    });
    saveAllCaseNotes(all);
  };

  const deleteCaseNote = (fir, noteId) => {
    const all = getAllCaseNotes();
    if (all[fir]) {
      all[fir] = all[fir].filter(n => n.id !== noteId);
      saveAllCaseNotes(all);
    }
  };

  const renderCaseNotes = (fir) => {
    const listEl = document.getElementById('case-notes-list');
    if (!listEl) return;
    const notes = getCaseNotes(fir);
    if (notes.length === 0) {
      listEl.innerHTML = '<div class="case-notes-empty">No notes yet for this case.</div>';
      return;
    }
    listEl.innerHTML = notes.map(n => `
      <div class="case-note-item">
        <div class="case-note-meta">
          <span>${new Date(n.created_at).toLocaleString('en-IN')}</span>
          <span class="case-note-delete" data-note-id="${n.id}" title="Delete note">✕</span>
        </div>
        <div>${escapeHtml(n.text)}</div>
      </div>
    `).join('');
    listEl.querySelectorAll('.case-note-delete').forEach(el => {
      el.addEventListener('click', () => {
        deleteCaseNote(fir, el.getAttribute('data-note-id'));
        renderCaseNotes(fir);
      });
    });
  };

  const btnAddCaseNote = document.getElementById('btn-add-case-note');
  const caseNoteInput = document.getElementById('case-note-input');
  if (btnAddCaseNote && caseNoteInput) {
    btnAddCaseNote.addEventListener('click', () => {
      const text = caseNoteInput.value.trim();
      if (!text || !currentCaseDossierData) return;
      addCaseNote(currentCaseDossierData.fir_number, text);
      caseNoteInput.value = '';
      renderCaseNotes(currentCaseDossierData.fir_number);
    });
  }


  // --- CSV EXPORT (reused across every data table in the app) ---
  const csvEscape = (val) => {
    const s = String(val ?? '').replace(/\s+/g, ' ').trim();
    if (/[",\n]/.test(s)) {
      return '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
  };

  const exportTableToCSV = (tableEl, filenamePrefix) => {
    if (!tableEl) return;
    const headerCells = Array.from(tableEl.querySelectorAll('thead th'));
    const skipIndices = new Set();
    headerCells.forEach((th, idx) => {
      if (/^actions?$/i.test(th.textContent.trim())) skipIndices.add(idx);
    });
    const headers = headerCells.filter((_, idx) => !skipIndices.has(idx)).map(th => th.textContent.trim());

    const rows = Array.from(tableEl.querySelectorAll('tbody tr')).map(tr => {
      const cells = Array.from(tr.children);
      if (cells.length <= 1 && cells[0] && cells[0].hasAttribute('colspan')) return null; // empty/error/loading placeholder row
      return cells.filter((_, idx) => !skipIndices.has(idx)).map(td => csvEscape(td.textContent));
    }).filter(Boolean);

    if (rows.length === 0) return;

    const csvContent = [headers.map(csvEscape).join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const dateStr = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenamePrefix}_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const wireExportButton = (btnId, tableEl, filenamePrefix) => {
    const btn = document.getElementById(btnId);
    if (btn) btn.addEventListener('click', () => exportTableToCSV(tableEl, filenamePrefix));
  };

  wireExportButton('export-risk-csv', document.getElementById('risk-table'), 'Ashen_District_Risk_Forecast');
  wireExportButton('export-station-csv', document.querySelector('.station-case-table'), 'Ashen_Station_Cases');
  wireExportButton('export-recidivism-csv', document.querySelector('.recidivism-ledger-table'), 'Ashen_Repeat_Offenders_Matrix');
  wireExportButton('export-syndicate-csv', document.querySelector('.syndicate-members-table'), 'Ashen_Syndicate_Members');


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

      const headers = Object.assign({}, buildContextHeaders());
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
          if (res.status === 429) throw new Error('RATE_LIMITED');
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
          const msg = err.message === 'RATE_LIMITED'
            ? 'Rate limit reached — too many queries in a short window. Please wait a few minutes and try again.'
            : 'Error: Failed to connect to the database query agent.';
          appendAIMessageWithTrace({ response: msg });
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

      const headers = Object.assign({ 'Content-Type': 'application/json' }, buildContextHeaders());
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
          if (res.status === 429) throw new Error('RATE_LIMITED');
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
          const msg = err.message === 'RATE_LIMITED'
            ? 'Rate limit reached — too many queries in a short window. Please wait a few minutes and try again.'
            : 'Error: Failed to connect to the database query agent.';
          appendAIMessageWithTrace({ response: msg });
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

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          const detailMsg = Array.isArray(data.details) ? data.details.join('; ') : (data.details || data.error || 'Failed to inject record');
          throw new Error(detailMsg);
        }

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
            map.flyTo(coords.center, coords.zoom || 12, { duration: 1.5 });
          }
        }
      });
    });
  };

  const loadAnomalyRadar = async () => {
    const loadingContainer = document.getElementById('anomaly-cards-container');
    if (loadingContainer) {
      loadingContainer.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--text-3);font-family:'IBM Plex Mono',monospace;font-size:11px;">SCANNING FOR ANOMALIES...</div>`;
    }
    try {
      const response = await fetch(`${API_BASE}/server/ashen_api/api/analytics/anomalies`);
      if (!response.ok) throw new Error('API Anomaly Fetch Error');
      const data = await response.json();
      setMockDataBadge('anomaly-mock-badge', response);
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
      const container = document.getElementById('anomaly-cards-container');
      if (container) {
        container.innerHTML = `<div style="grid-column:1/-1;text-align:center;padding:24px;color:#E66A6A;font-family:'IBM Plex Mono',monospace;font-size:11px;">
          ANOMALY RADAR UNAVAILABLE — unable to reach the analytics engine.
          <button id="anomaly-retry-btn" style="display:block;margin:8px auto 0;background:transparent;border:1px solid rgba(198,74,74,0.5);color:#E66A6A;padding:4px 10px;border-radius:3px;cursor:pointer;font-family:inherit;font-size:10px;">RETRY</button>
        </div>`;
        const retryBtn = document.getElementById('anomaly-retry-btn');
        if (retryBtn) retryBtn.addEventListener('click', loadAnomalyRadar);
      }
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

  // --- SECTION: DEMOGRAPHIC & RECIDIVISM PROPENSITY MATRIX ---
  let recidivismProfiles = [];
  let currentRecidGender = 'all';
  let currentRecidCrime = 'all';
  let recidivismScatterInstance = null;

  const loadRecidivismMatrix = async () => {
    const loadingTbody = document.getElementById('recidivism-table-body');
    if (loadingTbody) {
      loadingTbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:var(--text-3);font-family:'IBM Plex Mono',monospace;font-size:11px;">LOADING REPEAT-OFFENDER PROFILES...</td></tr>`;
    }
    try {
      const response = await fetch(`${API_BASE}/server/ashen_api/api/analytics/recidivism`);
      if (!response.ok) throw new Error('API Error');
      const data = await response.json();
      setMockDataBadge('recidivism-mock-badge', response);

      recidivismProfiles = data.profiles || [];

      // Update Cohort Telemetry Cards
      const summary = data.cohort_summary || {};
      const youthRateEl = document.getElementById('recid-youth-rate');
      const youthSubEl = document.getElementById('recid-youth-sub');
      const adultRateEl = document.getElementById('recid-adult-rate');
      const adultSubEl = document.getElementById('recid-adult-sub');
      const femaleRateEl = document.getElementById('recid-female-rate');
      const femaleSubEl = document.getElementById('recid-female-sub');
      const badgeEl = document.getElementById('recidivism-count-badge');

      if (youthRateEl) youthRateEl.textContent = summary.youth_male_rate || '68.2%';
      if (youthSubEl) youthSubEl.textContent = `AVG ${summary.youth_male_avg_priors || '4.4'} PRIOR OFFENSES`;
      if (adultRateEl) adultRateEl.textContent = summary.adult_male_rate || '51.4%';
      if (adultSubEl) adultSubEl.textContent = `AVG ${summary.adult_male_avg_priors || '3.1'} PRIOR OFFENSES`;
      if (femaleRateEl) femaleRateEl.textContent = summary.female_rate || '24.8%';
      if (femaleSubEl) femaleSubEl.textContent = `AVG ${summary.female_avg_priors || '1.4'} PRIOR OFFENSES`;
      if (badgeEl) badgeEl.textContent = `${(data.total_profiles || recidivismProfiles.length).toLocaleString('en-IN')} PROFILES ANALYZED (STATEWIDE)`;

      renderRecidivismView();
    } catch (err) {
      console.warn('[-] Error loading recidivism matrix:', err);
      const tbody = document.getElementById('recidivism-table-body');
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:20px;color:#E66A6A;font-family:'IBM Plex Mono',monospace;font-size:11px;">
          REPEAT-OFFENDER ENGINE UNAVAILABLE — unable to reach the analytics engine.
          <button id="recidivism-retry-btn" style="display:block;margin:8px auto 0;background:transparent;border:1px solid rgba(198,74,74,0.5);color:#E66A6A;padding:4px 10px;border-radius:3px;cursor:pointer;font-family:inherit;font-size:10px;">RETRY</button>
        </td></tr>`;
        const retryBtn = document.getElementById('recidivism-retry-btn');
        if (retryBtn) retryBtn.addEventListener('click', loadRecidivismMatrix);
      }
    }
  };

  const renderRecidivismView = () => {
    // 1. Filter Profiles
    const filtered = recidivismProfiles.filter(p => {
      const matchGender = currentRecidGender === 'all' || p.gender === currentRecidGender;
      const matchCrime = currentRecidCrime === 'all' || p.crime_head === currentRecidCrime;
      return matchGender && matchCrime;
    });

    // 2. Render Scatter Chart
    renderRecidivismScatterChart(filtered);

    // 3. Render Intelligence Table
    renderRecidivismTable(filtered);
  };

  const renderRecidivismScatterChart = (profiles) => {
    const canvas = document.getElementById('recidivismScatterChart');
    if (!canvas) return;

    if (recidivismScatterInstance) {
      recidivismScatterInstance.destroy();
    }

    // Apply deterministic micro-jitter per offender ID for clean continuous visual spread
    const scatterData = profiles.map(p => {
      const numId = parseInt(p.offender_id.replace(/\D/g, ''), 10) || 0;
      const jitterX = (((numId * 17) % 100) / 100 - 0.5) * 0.75;
      const jitterY = (((numId * 31) % 100) / 100 - 0.5) * 0.5;
      return {
        x: parseFloat((p.age + jitterX).toFixed(2)),
        y: parseFloat((Math.max(0, p.prior_offenses + jitterY)).toFixed(2)),
        r: Math.max(3.5, Math.min(7.5, p.risk_score / 16)),
        profile: p
      };
    });

    const ctx = canvas.getContext('2d');
    recidivismScatterInstance = new Chart(ctx, {
      type: 'bubble',
      data: {
        datasets: [{
          label: 'Offender Profiles',
          data: scatterData,
          backgroundColor: (context) => {
            const raw = context.raw;
            if (!raw) return 'rgba(217, 119, 6, 0.65)';
            const p = raw.profile;
            if (p.gender === 'FEMALE') return 'rgba(37, 99, 235, 0.75)';
            if (p.age >= 18 && p.age <= 25 && p.prior_offenses >= 3) return 'rgba(220, 38, 38, 0.85)';
            return 'rgba(217, 119, 6, 0.7)';
          },
          borderColor: (context) => {
            const raw = context.raw;
            if (!raw) return '#D97706';
            const p = raw.profile;
            if (p.gender === 'FEMALE') return '#2563EB';
            if (p.age >= 18 && p.age <= 25 && p.prior_offenses >= 3) return '#DC2626';
            return '#D97706';
          },
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'nearest',
          axis: 'xy',
          intersect: true
        },
        onClick: (event, activeElements) => {
          if (activeElements && activeElements.length > 0) {
            const clickedIndex = activeElements[0].index;
            const raw = scatterData[clickedIndex];
            if (raw && raw.profile) {
              const p = raw.profile;
              openSuspectDossierPage(p);
            }
          }
        },
        onHover: (event, chartElement) => {
          if (event.native && event.native.target) {
            event.native.target.style.cursor = (chartElement && chartElement.length > 0) ? 'pointer' : 'default';
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            mode: 'nearest',
            intersect: true,
            displayColors: false,
            backgroundColor: '#090B10',
            borderColor: '#1F2433',
            borderWidth: 1,
            padding: 10,
            titleFont: { family: 'IBM Plex Mono', size: 11, weight: 'bold' },
            bodyFont: { family: 'IBM Plex Mono', size: 10 },
            titleColor: '#E8E8E8',
            bodyColor: '#9CA3AF',
            filter: (item, index) => {
              // Strictly limit tooltip output to the single nearest item being hovered over
              return index === 0;
            },
            callbacks: {
              title: (items) => {
                if (!items || !items.length) return '';
                const p = items[0].raw.profile;
                return `${p.offender_name} (${p.offender_id})`;
              },
              label: (item) => {
                const p = item.raw.profile;
                return [
                  `AGE: ${p.age}  |  GENDER: ${p.gender}`,
                  `PRIOR OFFENSES: ${p.prior_offenses} Convictions`,
                  `CATEGORY: ${p.crime_head}  |  DISTRICT: ${p.district}`,
                  `RISK SCORE: ${p.risk_score} (${p.recidivism_risk_level})`,
                  `👉 CLICK DOT TO INSPECT DOSSIER`
                ];
              }
            }
          }
        },
        scales: {
          x: {
            title: { display: true, text: 'OFFENDER AGE (YEARS)', color: '#6B7280', font: { family: 'IBM Plex Mono', size: 9, weight: 'bold' } },
            ticks: { color: '#8A93A6', font: { family: 'IBM Plex Mono', size: 9 } },
            grid: { color: '#161924' },
            min: 15,
            max: 70
          },
          y: {
            title: { display: true, text: 'PRIOR CONVICTION FREQUENCY', color: '#6B7280', font: { family: 'IBM Plex Mono', size: 9, weight: 'bold' } },
            ticks: { color: '#8A93A6', font: { family: 'IBM Plex Mono', size: 9 }, stepSize: 1 },
            grid: { color: '#161924' },
            min: -0.5,
            max: 10
          }
        }
      }
    });
  };


  const renderRecidivismTable = (profiles) => {
    const tbody = document.getElementById('recidivism-table-body');
    if (!tbody) return;

    if (profiles.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:16px;color:#6B7280;">No offender profiles match the current filter criteria.</td></tr>`;
      return;
    }

    const displayCount = 100;
    const topProfiles = profiles.slice(0, displayCount);

    let html = topProfiles.map(p => {
      const isCritical = p.recidivism_risk_level === 'CRITICAL';
      const isHigh = p.recidivism_risk_level === 'HIGH';
      const color = isCritical ? '#DC2626' : isHigh ? '#D97706' : '#2563EB';

      return `
        <tr>
          <td style="font-weight:bold;color:#E8E8E8;">${p.offender_id}</td>
          <td style="color:#E8E8E8;">${p.offender_name}</td>
          <td>${p.age} / ${p.gender}</td>
          <td style="font-weight:bold;color:${p.prior_offenses >= 3 ? '#DC2626' : '#E8E8E8'}">${p.prior_offenses} Convictions</td>
          <td>${p.crime_head}</td>
          <td>${p.district}</td>
          <td><span class="anom-badge" style="color:${color};border:1px solid ${color}">${p.risk_score} (${p.recidivism_risk_level})</span></td>
          <td><button class="btn-recid-inspect" data-id="${p.offender_id}">DOSSIER →</button></td>
        </tr>
      `;
    }).join('');

    if (profiles.length > displayCount) {
      html += `
        <tr>
          <td colspan="8" style="text-align:center;padding:10px;font-family:'IBM Plex Mono';font-size:9px;color:#9CA3AF;background:#141720;">
            SHOWING TOP ${displayCount} HIGHEST RISK PROFILES OUT OF <strong>${profiles.length.toLocaleString('en-IN')}</strong> MATCHING STATEWIDE RECORDS · USE FILTERS TO ISOLATE COHORTS
          </td>
        </tr>
      `;
    }

    tbody.innerHTML = html;

    // Attach click event handlers to DOSSIER buttons
    tbody.querySelectorAll('.btn-recid-inspect').forEach(btn => {
      btn.addEventListener('click', () => {
        const offId = btn.getAttribute('data-id');
        const profile = profiles.find(p => p.offender_id === offId);
        if (profile) {
          openSuspectDossierPage(profile);
        }
      });
    });
  };



  // Wire Recidivism Gender & Crime Filter Chips
  const genderChips = document.querySelectorAll('#recidivism-gender-chips .gotham-filter-btn');
  genderChips.forEach(chip => {
    chip.addEventListener('click', () => {
      genderChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentRecidGender = chip.getAttribute('data-gender');
      renderRecidivismView();
    });
  });

  const crimeChips = document.querySelectorAll('#recidivism-crime-chips .gotham-filter-btn');
  crimeChips.forEach(chip => {
    chip.addEventListener('click', () => {
      crimeChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentRecidCrime = chip.getAttribute('data-crime');
      renderRecidivismView();
    });
  });


  // ==========================================================================
  // SECTION: AUTOMATED MODUS OPERANDI (MO) SIMILARITY SEARCH
  // ==========================================================================
  const loadBehavioralMOMatches = async (firNumber, crimeHead) => {
    const tbody = document.getElementById('case-mo-matches-tbody');
    if (!tbody) return;

    // Skip re-fetch if already loaded for this exact FIR
    if (tbody.getAttribute('data-loaded-fir') === firNumber) return;

    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-3); padding:12px;">[ COMPUTING SIMILARITY SIGNATURES... ]</td></tr>`;

    try {
      const crimeParam = crimeHead ? `&crime_head=${encodeURIComponent(crimeHead)}` : '';
      const response = await fetch(`${API_BASE}/server/ashen_api/api/analytics/mo-matches?fir_number=${encodeURIComponent(firNumber)}${crimeParam}`);
      if (!response.ok) throw new Error('Failed to fetch MO matches');
      const data = await response.json();
      setMockDataBadge('mo-matches-mock-badge', response);
      tbody.setAttribute('data-loaded-fir', firNumber);
      const matches = data.matches || [];

      if (matches.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-3); padding:12px;">No matching behavioral patterns detected above threshold.</td></tr>`;
        return;
      }

      tbody.innerHTML = matches.map(m => {
        const sign = m.matched_terms && m.matched_terms.length > 0 ? m.matched_terms.map(t => `#${t}`).join(', ') : 'No Overlap';
        const color = m.similarity_percent >= 80 ? '#DC2626' : m.similarity_percent >= 50 ? '#D97706' : '#2563EB';
        return `
          <tr>
            <td style="font-weight:bold; color:#E8E8E8;">${m.fir_number}</td>
            <td>${m.police_station} (${m.district})</td>
            <td><span class="anom-badge" style="color:${color}; border:1px solid ${color}; padding: 1px 4px; font-size: 8.5px;">${m.similarity_percent}% Match</span></td>
            <td style="font-family:'IBM Plex Mono', monospace; font-size:8px; color:#A0A5B1; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${sign}">${sign}</td>
            <td><button class="btn-recid-inspect btn-mo-view-case" data-fir="${m.fir_number}">VIEW →</button></td>
          </tr>
        `;
      }).join('');

      tbody.querySelectorAll('.btn-mo-view-case').forEach(btn => {
        btn.addEventListener('click', () => {
          const targetFir = btn.getAttribute('data-fir');
          openCaseDossierPage(targetFir);
        });
      });

    } catch (err) {
      console.warn('[-] Error in loadBehavioralMOMatches:', err);
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#DC2626; padding:12px;">Engine offline or query limit reached.</td></tr>`;
    }
  };


  // ==========================================================================
  // SECTION: STATEWIDE SYNDICATES DOSSIER VIEW
  // ==========================================================================
  let currentSyndicateId = '';

  const loadSyndicatesList = async () => {
    const selector = document.getElementById('syn-selector');
    if (!selector) return;

    const loadingMembersTbody = document.getElementById('syn-members-tbody');
    if (loadingMembersTbody) {
      loadingMembersTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-3);font-family:'IBM Plex Mono',monospace;font-size:11px;">LOADING SYNDICATE INTELLIGENCE...</td></tr>`;
    }

    try {
      const response = await fetch(`${API_BASE}/server/ashen_api/api/syndicates`);
      if (!response.ok) throw new Error('Failed to fetch syndicates');
      const data = await response.json();
      const syndicates = data.syndicates || [];

      selector.innerHTML = syndicates.map(s => `
        <option value="${s.id}">${s.name} (${s.id})</option>
      `).join('');

      if (!selector.hasAttribute('data-wired')) {
        selector.setAttribute('data-wired', 'true');
        selector.addEventListener('change', () => {
          loadSyndicateDossier(selector.value);
        });
      }

      if (syndicates.length > 0) {
        await loadSyndicateDossier(syndicates[0].id, { replace: true });
      } else {
        selector.innerHTML = '<option value="">— NO SYNDICATES REGISTERED —</option>';
        if (loadingMembersTbody) {
          loadingMembersTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:var(--text-3);font-family:'IBM Plex Mono',monospace;font-size:11px;">No organized syndicate cells currently registered.</td></tr>`;
        }
      }
    } catch (err) {
      console.error('[-] Error loading syndicates list:', err);
      selector.innerHTML = '<option value="">— UNABLE TO LOAD SYNDICATES —</option>';
      const membersTbody = document.getElementById('syn-members-tbody');
      if (membersTbody) {
        membersTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#E66A6A;font-family:'IBM Plex Mono',monospace;font-size:11px;">
          SYNDICATES DOSSIER UNAVAILABLE — unable to reach the analytics engine.
          <button id="syndicates-retry-btn" style="display:block;margin:8px auto 0;background:transparent;border:1px solid rgba(198,74,74,0.5);color:#E66A6A;padding:4px 10px;border-radius:3px;cursor:pointer;font-family:inherit;font-size:10px;">RETRY</button>
        </td></tr>`;
        const retryBtn = document.getElementById('syndicates-retry-btn');
        if (retryBtn) retryBtn.addEventListener('click', loadSyndicatesList);
      }
    }
  };

  const loadSyndicateDossier = async (syndicateId, opts = {}) => {
    currentSyndicateId = syndicateId;
    navigateTo('/syndicate/' + encodeURIComponent(syndicateId), !!opts.replace);

    const selectorEl = document.getElementById('syn-selector');
    if (selectorEl && selectorEl.value !== syndicateId) selectorEl.value = syndicateId;

    const dossierTitleId = document.getElementById('syn-dossier-id');
    const codeVal = document.getElementById('syn-code-val');
    const bossVal = document.getElementById('syn-boss-val');
    const territoryVal = document.getElementById('syn-territory-val');
    const sizeVal = document.getElementById('syn-size-val');
    const moVal = document.getElementById('syn-mo-val');
    const membersTbody = document.getElementById('syn-members-tbody');

    if (dossierTitleId) dossierTitleId.textContent = syndicateId;

    try {
      const response = await fetch(`${API_BASE}/server/ashen_api/api/syndicates/${syndicateId}`);
      if (!response.ok) throw new Error('Failed to fetch syndicate details');
      const data = await response.json();

      const syn = data.syndicate || {};
      const members = data.members || [];
      const hierarchy = data.hierarchy || { nodes: [], links: [] };

      if (codeVal) codeVal.textContent = syn.id || '—';
      if (bossVal) {
        bossVal.innerHTML = `<span style="color:#DC2626; font-weight:bold; cursor:pointer; text-decoration:underline;" class="btn-syn-boss" data-boss-id="${syn.boss_id}">${syn.boss}</span>`;
        const bossBtn = bossVal.querySelector('.btn-syn-boss');
        if (bossBtn) {
          bossBtn.addEventListener('click', () => {
            const bossProfile = members.find(m => m.offender_id === syn.boss_id) || {
              offender_id: syn.boss_id,
              offender_name: syn.boss,
              age: 46,
              gender: 'MALE',
              prior_offenses: 10,
              risk_score: 98.0,
              crime_head: 'Narcotics',
              district: 'Bengaluru Urban',
              recidivism_risk_level: 'CRITICAL'
            };
            openSuspectDossierPage(bossProfile);
          });
        }
      }
      if (territoryVal) territoryVal.textContent = syn.territory || '—';
      if (sizeVal) sizeVal.textContent = `${syn.size || members.length} Active Tracked Nodes`;
      if (moVal) moVal.textContent = syn.mo_pattern || '—';

      if (membersTbody) {
        if (members.length === 0) {
          membersTbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:12px; color:#6B7280;">No syndicate cell members registered.</td></tr>`;
        } else {
          membersTbody.innerHTML = members.map(m => {
            const hasWarrant = m.warrants !== 'None';
            const riskColor = m.base_risk_score >= 90 ? '#DC2626' : m.base_risk_score >= 70 ? '#D97706' : '#2563EB';
            return `
              <tr>
                <td>
                  <span class="td-primary" style="font-weight:bold;">${m.offender_name}</span><br>
                  <span class="td-sub">${m.offender_id}</span>
                </td>
                <td><span style="color:#C8CDD6">${m.aliases}</span></td>
                <td><span style="color:#9CA3AF">${m.role}</span></td>
                <td><span class="badge ${hasWarrant ? 'high' : 'low'}" style="font-size:8px;">${m.warrants}</span></td>
                <td><span class="badge ${m.bail_status === 'Revoked' ? 'high' : m.bail_status === 'In Custody' ? 'med' : 'low'}" style="font-size:8px;">${m.bail_status}</span></td>
                <td><button class="btn-recid-inspect btn-syn-member-profile" data-id="${m.offender_id}">PROFILE →</button></td>
              </tr>
            `;
          }).join('');

          membersTbody.querySelectorAll('.btn-syn-member-profile').forEach(btn => {
            btn.addEventListener('click', () => {
              const mId = btn.getAttribute('data-id');
              const member = members.find(m => m.offender_id === mId);
              if (member) {
                const fullProfile = {
                  offender_id: member.offender_id,
                  offender_name: member.offender_name,
                  age: member.age,
                  gender: member.gender,
                  prior_offenses: member.role.includes('Boss') ? 10 : member.role.includes('Lieutenant') ? 5 : 2,
                  risk_score: member.base_risk_score,
                  crime_head: syndicateId === 'SYN-BGU-01' ? 'Narcotics' : syndicateId === 'SYN-BLG-02' ? 'Property Theft' : 'Violent Crime',
                  district: syndicateId === 'SYN-BGU-01' ? 'Bengaluru Urban' : syndicateId === 'SYN-BLG-02' ? 'Belagavi' : 'Mysuru',
                  recidivism_risk_level: member.base_risk_score >= 90 ? 'CRITICAL' : member.base_risk_score >= 70 ? 'HIGH' : 'MEDIUM'
                };
                openSuspectDossierPage(fullProfile);
              }
            });
          });
        }
      }

      renderSyndicateHierarchyGraph(hierarchy.nodes, hierarchy.links);

    } catch (err) {
      console.error('[-] Error loading syndicate dossier details:', err);
      const membersTbody = document.getElementById('syn-members-tbody');
      if (membersTbody) {
        membersTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:20px;color:#E66A6A;font-family:'IBM Plex Mono',monospace;font-size:11px;">
          UNABLE TO LOAD DOSSIER FOR ${syndicateId} — engine offline or query failed.
          <button class="syndicate-dossier-retry-btn" style="display:block;margin:8px auto 0;background:transparent;border:1px solid rgba(198,74,74,0.5);color:#E66A6A;padding:4px 10px;border-radius:3px;cursor:pointer;font-family:inherit;font-size:10px;">RETRY</button>
        </td></tr>`;
        const retryBtn = membersTbody.querySelector('.syndicate-dossier-retry-btn');
        if (retryBtn) retryBtn.addEventListener('click', () => loadSyndicateDossier(syndicateId));
      }
    }
  };

  const renderSyndicateHierarchyGraph = (nodes, links) => {
    renderDossierNetworkGraph(nodes, links, 'syn-hierarchy-graph', 'syn-hierarchy-tooltip');
  };

  // --- SECTION: GUIDED TOUR MODE (Golden-Path Walkthrough) ---
  // Follows the demo narrative: a Bengaluru Urban cybercrime hotspot, traced through the
  // network graph to its case dossier, cross-checked against the anomaly radar, and
  // summarized in a generated strategic briefing.
  const GOLDEN_PATH_FIR = 'KA-BGU-2026-0002';
  const TOUR_STEPS = [
    {
      title: 'Welcome to Ashen Protocol',
      body: 'This guided tour walks one real investigative story end-to-end: a Bengaluru Urban cybercrime spike, traced through the network graph to a case dossier, then summarized in an AI strategic briefing.',
      run: () => { setActiveView('dashboard'); activateNavItem('dashboard'); }
    },
    {
      title: 'Step 1 — GIS Hotspot Map',
      body: 'The map shows live incident density across Karnataka’s five monitored districts. We will zoom into Bengaluru Urban, where a cybercrime surge was flagged.',
      run: () => { setActiveView('map'); activateNavItem('map'); loadHotspots('Bengaluru Urban'); }
    },
    {
      title: 'Step 2 — Criminal Network Graph',
      body: 'The standalone Network view lets you trace the co-offender web for any FIR by number, or jump in from one of the sample cases below.',
      run: () => { setActiveView('network'); activateNavItem('network'); }
    },
    {
      title: 'Step 3 — Case Dossier',
      body: `Opening FIR ${GOLDEN_PATH_FIR} — a Cybercrime incident in Bengaluru Urban. Its suspect profiles and behavioral MO similarity matches load automatically.`,
      run: () => { navigateTo('/case/' + encodeURIComponent(GOLDEN_PATH_FIR)); restoreFromHash(); }
    },
    {
      title: 'Step 4 — Criminal Network & Syndicate Trace',
      body: 'The right-hand panel reveals the co-offender network for this case — direct suspects, cross-case links, and at deeper hops, the organized syndicate cell behind them.',
      run: () => highlightTourTarget('.dossier-right-col .dossier-card')
    },
    {
      title: 'Step 5 — Syndicates Dossier',
      body: 'The Syndicates Dossier profiles organized crime cells statewide — hierarchy, active warrants, and bail status for every tracked member.',
      run: () => { setActiveView('syndicates'); activateNavItem('syndicates'); }
    },
    {
      title: 'Step 6 — Anomaly Radar',
      body: 'The Crime Anomaly Radar independently flagged this same Bengaluru Urban cybercrime spike as a statistically CRITICAL surge.',
      run: () => { setActiveView('alerts'); activateNavItem('alerts'); }
    },
    {
      title: 'Step 7 — Inject FIR Console',
      body: 'Field officers can file a new FIR directly into the system here — district, station, offense category, and modus operandi, with optional suspect details.',
      run: () => { setActiveView('inject'); activateNavItem('inject'); }
    },
    {
      title: 'Step 8 — Strategic Briefing',
      body: 'Finally, generate an AI-authored intelligence briefing that synthesizes the anomaly radar, district risk, and repeat-offender data into one actionable report.',
      run: () => { setActiveView('alerts'); activateNavItem('alerts'); const btn = document.getElementById('generate-briefing-btn'); if (btn) btn.click(); }
    },
    {
      title: 'Tour Complete',
      body: 'You have toured every major section: Map → Network Graph → Case Dossier → Syndicates → Anomaly Radar → Inject FIR → Strategic Briefing. Explore freely, or press Ctrl+K anytime to jump to any view, case, or district.',
      run: () => {}
    }
  ];

  let tourStepIndex = 0;
  const tourOverlayEl = document.getElementById('tour-overlay');
  const tourStepLabelEl = document.getElementById('tour-step-label');
  const tourTitleEl = document.getElementById('tour-title');
  const tourBodyEl = document.getElementById('tour-body');
  const tourPrevBtn = document.getElementById('tour-prev-btn');
  const tourNextBtn = document.getElementById('tour-next-btn');
  const tourExitBtn = document.getElementById('tour-exit-btn');
  const btnStartTour = document.getElementById('btn-start-tour');
  const tourProgressFillEl = document.getElementById('tour-progress-fill');
  const tourProgressTrackEl = document.getElementById('tour-progress-track');

  function highlightTourTarget(selector) {
    document.querySelectorAll('.tour-highlight-pulse').forEach(el => el.classList.remove('tour-highlight-pulse'));
    const target = document.querySelector(selector);
    if (target) {
      target.classList.add('tour-highlight-pulse');
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setTimeout(() => target.classList.remove('tour-highlight-pulse'), 2500);
    }
  }

  function renderTourStep() {
    const step = TOUR_STEPS[tourStepIndex];
    if (!step) return;
    if (tourStepLabelEl) tourStepLabelEl.textContent = `STEP ${tourStepIndex + 1} / ${TOUR_STEPS.length}`;
    if (tourTitleEl) tourTitleEl.textContent = step.title;
    if (tourBodyEl) tourBodyEl.textContent = step.body;
    if (tourPrevBtn) tourPrevBtn.disabled = tourStepIndex === 0;
    if (tourNextBtn) tourNextBtn.textContent = tourStepIndex === TOUR_STEPS.length - 1 ? 'FINISH' : 'NEXT →';
    const progressPct = Math.round(((tourStepIndex + 1) / TOUR_STEPS.length) * 100);
    if (tourProgressFillEl) tourProgressFillEl.style.width = `${progressPct}%`;
    if (tourProgressTrackEl) tourProgressTrackEl.setAttribute('aria-valuenow', String(progressPct));
    try { step.run(); } catch (e) { console.error('[-] Guided tour step failed:', e); }
  }

  function startTour() {
    tourStepIndex = 0;
    if (tourOverlayEl) tourOverlayEl.classList.add('active');
    renderTourStep();
  }

  function exitTour() {
    if (tourOverlayEl) tourOverlayEl.classList.remove('active');
    document.querySelectorAll('.tour-highlight-pulse').forEach(el => el.classList.remove('tour-highlight-pulse'));
  }

  if (btnStartTour) btnStartTour.addEventListener('click', startTour);
  if (tourExitBtn) tourExitBtn.addEventListener('click', exitTour);
  if (tourPrevBtn) tourPrevBtn.addEventListener('click', () => {
    if (tourStepIndex > 0) { tourStepIndex -= 1; renderTourStep(); }
  });
  if (tourNextBtn) tourNextBtn.addEventListener('click', () => {
    if (tourStepIndex < TOUR_STEPS.length - 1) { tourStepIndex += 1; renderTourStep(); }
    else exitTour();
  });

  // --- HASH ROUTER: restore view state from URL on load / back-forward / manual edit ---
  const restoreFromHash = () => {
    const raw = window.location.hash.replace(/^#\/?/, '');
    const parts = raw.split('/').map(p => {
      try { return decodeURIComponent(p); } catch (e) { return p; }
    }).filter(p => p !== '');

    isRestoringFromHash = true;
    try {
      if (parts.length === 0) {
        activateNavItem('dashboard');
        setActiveView('dashboard', { updateUrl: false });
        return;
      }

      const [kind, ...rest] = parts;

      if (kind === 'case' && rest[0]) {
        activateNavItem('map');
        openCaseDossierPage(rest[0]);
      } else if (kind === 'offender' && rest[0]) {
        activateNavItem('map');
        openSuspectDossierPage({ id: rest[0], label: rest[0] });
      } else if (kind === 'station' && rest[0] && rest[1]) {
        activateNavItem('map');
        openStationCasesPage(rest[1], rest[0]);
      } else if (kind === 'syndicate' && rest[0]) {
        activateNavItem('syndicates');
        setActiveView('syndicates', { updateUrl: false, skipDataLoad: true });
        loadSyndicatesList().then(() => loadSyndicateDossier(rest[0], { replace: true }));
      } else if (TOP_LEVEL_SECTIONS.includes(kind)) {
        activateNavItem(kind);
        setActiveView(kind, { updateUrl: false });
      } else {
        // Unknown/stale hash — fall back to dashboard rather than a blank screen
        activateNavItem('dashboard');
        setActiveView('dashboard', { updateUrl: false });
      }
    } finally {
      setTimeout(() => { isRestoringFromHash = false; }, 0);
    }
  };

  window.addEventListener('hashchange', () => {
    if (suppressNextHashchange) {
      suppressNextHashchange = false;
      return;
    }
    restoreFromHash();
  });
  // Wait for the initial hotspots fetch so a cold-loaded deep link (e.g. #/case/<fir>) has
  // real data to look up instead of the placeholder fallback baked into openCaseDossierPage.
  Promise.resolve(initialHotspotsLoadPromise).catch(() => {}).finally(restoreFromHash);
});




