/**
 * js/dashboard.js
 * Modern Command Center Controller for dashboard.html
 * Self-contained with built-in Google Apps Script API client & navigation helpers.
 */

const GOOGLE_API_URL = window.GOOGLE_API_URL || "https://script.google.com/macros/s/AKfycbwycWJw0iiCfF9ZFfj3rNpBsfiITySuJrvlSgmFW10aFBR1Qx0xwmTv30jRlZW83f-oSw/exec";
window.GOOGLE_API_URL = GOOGLE_API_URL;

if (!window.AFC_API) {
  window.AFC_API = {
    endpoint: GOOGLE_API_URL,
    async call(action, payload = {}) {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
        body: JSON.stringify({ action, ...payload })
      });
      return await response.json();
    }
  };
}

if (!window.google || !window.google.script) {
  function createDashboardGasRunner(successHandler = null, failureHandler = null) {
    const invoke = async (action, payload) => {
      try {
        const res = await window.AFC_API.call(action, payload);
        if (successHandler) successHandler(res);
      } catch (err) {
        if (failureHandler) failureHandler(err);
        else console.error('API Error [' + action + ']:', err);
      }
    };
    return {
      withSuccessHandler(fn) { return createDashboardGasRunner(fn, failureHandler); },
      withFailureHandler(fn) { return createDashboardGasRunner(successHandler, fn); },
      getDashboardSummary(branch, role) { return invoke("getDashboardSummary", { branch, role }); },
      fetchCompleteTracking(searchQuery) { return invoke("fetchCompleteTracking", { searchQuery }); }
    };
  }
  window.google = {
    script: {
      get run() { return createDashboardGasRunner(); }
    }
  };
}

var sessionUser = JSON.parse(localStorage.getItem('afc_user') || 'null');
var activeDeliveryPkg = null;
var cachedRecentBookings = [];
var activeCategoryFilter = 'ALL';

var quotes = [
  'Real-time telemetry across Salalah, Duqm & international corridors.',
  'Deliver joy, one package at a time.',
  'Every package is a promise — tracked from origin to doorstep.'
];

function formatDateToDDMMMYYYY(dateInput) {
  if (!dateInput) return 'N/A';
  var d = new Date(dateInput);
  if (isNaN(d.getTime())) return String(dateInput);
  var day = String(d.getDate()).padStart(2, '0');
  var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return day + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear();
}

// Instant keyboard shortcut '/' to focus search (no sluggish animation on keyboard shortcut)
document.addEventListener('keydown', function (e) {
  if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    var sInput = document.getElementById('searchInput');
    if (sInput) sInput.focus();
  }
});

function initializeDashboard() {
  if (!sessionUser) return;

  var navName = document.getElementById('navName');
  if (navName) navName.innerText = sessionUser.name;
  var navBranch = document.getElementById('navBranch');
  if (navBranch) navBranch.innerText = sessionUser.branch;

  var navAdmin = document.getElementById('nav-admin');
  if (navAdmin && (sessionUser.role === 'Admin' || sessionUser.role === 'Head Office' || sessionUser.role === 'Super Admin')) {
    navAdmin.classList.remove('d-none');
  }

  var hour = new Date().getHours();
  var greeting = "Good evening";
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";

  var firstName = (sessionUser.name || 'Operator').split(' ')[0];
  var welcomeEl = document.getElementById('welcomeMsg');
  if (welcomeEl) welcomeEl.innerText = greeting + ', ' + firstName;

  var quoteEl = document.getElementById('quoteMsg');
  if (quoteEl) quoteEl.innerText = quotes[Math.floor(Math.random() * quotes.length)];

  fetchDashboardMetrics();
}

initializeDashboard();

function logoutSystem() {
  localStorage.removeItem('afc_user');
  localStorage.removeItem('afc_last_active');
  window.location.href = '/login.html';
}

function toggleNotifications(e) {
  e.stopPropagation();
  var dropdown = document.getElementById('notifDropdown');
  var bellBtn = document.getElementById('bellBtn');
  if (dropdown.classList.contains('show')) {
    dropdown.classList.remove('show');
    bellBtn.classList.remove('active');
  } else {
    dropdown.classList.add('show');
    bellBtn.classList.add('active');
  }
}

document.addEventListener('click', function (e) {
  var wrapper = document.getElementById('notifWrapper');
  if (wrapper && !wrapper.contains(e.target)) {
    var dd = document.getElementById('notifDropdown');
    var bb = document.getElementById('bellBtn');
    if (dd) dd.classList.remove('show');
    if (bb) bb.classList.remove('active');
  }
});

function triggerDeliveryPopup(pkg) {
  activeDeliveryPkg = pkg;
  document.getElementById('alertAwb').innerText = pkg.id;
  document.getElementById('alertDest').innerText = pkg.dest || "Destination";
  document.getElementById('deliveryAlertOverlay').classList.add('active');
}

function markDeliveryRead() {
  if (activeDeliveryPkg && activeDeliveryPkg.id) {
    var readIds = JSON.parse(localStorage.getItem('afc_read_deliveries') || '[]');
    if (!readIds.includes(activeDeliveryPkg.id)) {
      readIds.push(activeDeliveryPkg.id);
      localStorage.setItem('afc_read_deliveries', JSON.stringify(readIds));
    }
    AFC_API.call('markNotificationRead', { bookingID: activeDeliveryPkg.id }).catch(function () {});
  }
  document.getElementById('deliveryAlertOverlay').classList.remove('active');
  activeDeliveryPkg = null;
  fetchDashboardMetrics();
}

function notifyPartyAction() {
  if (!activeDeliveryPkg) return;
  var phoneRaw = activeDeliveryPkg.shipperPhone || "";
  var cleanPhone = phoneRaw.replace(/[^0-9]/g, "");
  if (!cleanPhone || cleanPhone.length < 8) return;

  var shipperName = activeDeliveryPkg.shipperName || "Customer";
  var awb = activeDeliveryPkg.id;
  var dest = activeDeliveryPkg.dest;
  var message = "Hello *" + shipperName + "*! Great news! Your shipment with *Al-Farha Cargo* has been DELIVERED.\n\nBooking ID: " + awb + "\nDestination: " + dest + "\n\nThank you for choosing Al-Farha Cargo!";
  window.open("https://wa.me/" + cleanPhone + "?text=" + encodeURIComponent(message), '_blank');
  markDeliveryRead();
}

function filterTableByCategory(cat) {
  activeCategoryFilter = cat;
  ['ALL', 'TRANSIT', 'DELIVERED', 'EXCEPTION'].forEach(function (c) {
    var btn = document.getElementById('filterBtn-' + c);
    if (btn) btn.classList.toggle('active', c === cat);
  });
  renderRecentShipmentsTable();
}

function filterByCorridorText(destText) {
  var inp = document.getElementById('inlineTableSearch');
  if (inp) {
    inp.value = inp.value === destText ? '' : destText;
    renderRecentShipmentsTable();
  }
}

function renderCorridorBreakdown(bookings) {
  var container = document.getElementById('corridorBreakdown');
  if (!container) return;
  if (!bookings || bookings.length === 0) {
    container.innerHTML = '<div style="color: var(--text-muted); font-size: 0.8rem;">No recent corridors</div>';
    return;
  }
  var counts = {};
  bookings.forEach(function (b) {
    var d = String(b.destination || 'Unknown').trim();
    counts[d] = (counts[d] || 0) + 1;
  });
  var sorted = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; }).slice(0, 6);
  container.innerHTML = sorted.map(function (dest) {
    var safeDest = dest.replace(/'/g, "\'");
    return '<div class="corridor-item btn-press" onclick="filterByCorridorText(\'' + safeDest + '\')">' +
      '<span class="corridor-name"><i class="bi bi-geo-alt-fill text-primary me-1"></i>' + dest + '</span>' +
      '<span class="corridor-count">' + counts[dest] + '</span>' +
      '</div>';
  }).join('');
}

function renderRecentShipmentsTable() {
  var tbody = document.getElementById('recentTableBody');
  if (!tbody) return;
  var query = (document.getElementById('inlineTableSearch') ? document.getElementById('inlineTableSearch').value : '').trim().toLowerCase();

  var filtered = (cachedRecentBookings || []).filter(function (b) {
    var sUpper = String(b.status || '').toUpperCase();
    var isDeliv = sUpper.includes('DELIVERED');
    var isExc = sUpper.includes('RETURN') || sUpper.includes('CANCEL') || sUpper.includes('FAIL') || sUpper.includes('HOLD') || sUpper.includes('EXCEPTION');
    if (activeCategoryFilter === 'DELIVERED' && !isDeliv) return false;
    if (activeCategoryFilter === 'EXCEPTION' && !isExc) return false;
    if (activeCategoryFilter === 'TRANSIT' && (isDeliv || isExc)) return false;

    if (query) {
      var hay = (String(b.id) + ' ' + String(b.destination) + ' ' + String(b.status)).toLowerCase();
      if (!hay.includes(query)) return false;
    }
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 36px;">No matching shipments in this view.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map(function (b) {
    var sUpper = String(b.status || '').toUpperCase();
    var badgeStyle = "background: #eff6ff; color: #2563eb; border-color: #bfdbfe;";
    var icon = "bi-truck";
    if (sUpper.includes('DELIVERED')) {
      badgeStyle = "background: #ecfdf5; color: #059669; border-color: #a7f3d0;";
      icon = "bi-check2-circle";
    } else if (sUpper.includes('RETURN') || sUpper.includes('CANCEL') || sUpper.includes('FAIL') || sUpper.includes('HOLD') || sUpper.includes('EXCEPTION')) {
      badgeStyle = "background: #fef2f2; color: #dc2626; border-color: #fecaca;";
      icon = "bi-exclamation-triangle-fill";
    } else if (sUpper.includes('BOOK') || sUpper.includes('PENDING')) {
      badgeStyle = "background: #fffbeb; color: #d97706; border-color: #fde68a;";
      icon = "bi-box-seam";
    }
    var safeId = String(b.id).replace(/'/g, "\'");
    return '<tr onclick="trackSpecificAwb(\'' + safeId + '\')">' +
      '<td><span class="awb-mono-chip"><i class="bi bi-box-seam-fill"></i>' + b.id + '</span></td>' +
      '<td style="font-weight: 500; color: var(--text-primary);"><i class="bi bi-geo-alt text-muted me-1"></i>' + b.destination + '</td>' +
      '<td><span class="status-badge" style="' + badgeStyle + '"><i class="bi ' + icon + '"></i>' + b.status + '</span></td>' +
      '<td style="text-align: right; font-family: \'Lexend\', sans-serif; font-size: 0.78rem; font-weight: 600; color: var(--brand-primary);">Inspect &rarr;</td>' +
      '</tr>';
  }).join('');
}

function trackSpecificAwb(awb) {
  var sInput = document.getElementById('searchInput');
  if (sInput) {
    sInput.value = awb;
    executeSearch();
  }
}

function fetchDashboardMetrics() {
  google.script.run
    .withSuccessHandler(function (data) {
      var total = data.totalBookings || 0;
      var transit = data.inTransit || 0;
      var delivered = data.delivered || 0;
      var exceptions = data.exceptions || 0;

      document.getElementById('statTotal').innerText = total;
      document.getElementById('statTransit').innerText = transit;
      document.getElementById('statDelivered').innerText = delivered;
      document.getElementById('statExceptions').innerText = exceptions;

      if (total > 0) {
        var delivPct = Math.round((delivered / total) * 100);
        var transPct = Math.round((transit / total) * 100);
        var excPct = Math.max(4, Math.round((exceptions / total) * 100));
        var dPctEl = document.getElementById('statDeliveredPct');
        var tPctEl = document.getElementById('statTransitPct');
        if (dPctEl) dPctEl.innerText = delivPct + '% Rate';
        if (tPctEl) tPctEl.innerText = transPct + '% Active';
        var barD = document.getElementById('barDelivered');
        var barT = document.getElementById('barTransit');
        var barE = document.getElementById('barExceptions');
        if (barD) barD.style.width = delivPct + '%';
        if (barT) barT.style.width = transPct + '%';
        if (barE) barE.style.width = excPct + '%';
      }

      var pendingCount = data.pendingInbounds || 0;
      var statPendingEl = document.getElementById('statPending');
      var pendingCardEl = document.getElementById('pendingCardWrapper');
      if (pendingCount > 0) {
        statPendingEl.innerHTML = pendingCount + '<span class="live-dot"></span>';
        pendingCardEl.classList.add('alert-state');
      } else {
        statPendingEl.innerText = pendingCount;
        pendingCardEl.classList.remove('alert-state');
      }

      var bellBadge = document.getElementById('bellBadge');
      var notifList = document.getElementById('notifList');
      var countLabel = document.getElementById('notifCountLabel');

      if (data.recentDelivered && data.recentDelivered.length > 0) {
        var seenDeliveries = JSON.parse(localStorage.getItem('afc_read_deliveries') || '[]');
        var unreadDeliveries = data.recentDelivered.filter(function (item) {
          return !seenDeliveries.includes(item.id);
        });

        if (unreadDeliveries.length > 0) {
          bellBadge.innerText = unreadDeliveries.length;
          bellBadge.classList.add('show');
          countLabel.innerText = unreadDeliveries.length + " New";

          notifList.innerHTML = '';
          unreadDeliveries.forEach(function (item) {
            var div = document.createElement('div');
            div.className = 'notif-item';
            div.onclick = function () { triggerDeliveryPopup(item); };
            div.innerHTML = '<div class="notif-icon"><i class="bi bi-box-seam-fill"></i></div><div class="notif-content"><span class="notif-title">' + item.id + ' Delivered</span><span class="notif-desc">Arrived at ' + item.dest + '</span></div>';
            notifList.appendChild(div);
          });
        } else {
          bellBadge.classList.remove('show');
          countLabel.innerText = "0 New";
          notifList.innerHTML = '<div class="notif-empty">No unread deliveries</div>';
        }
      } else {
        bellBadge.classList.remove('show');
        countLabel.innerText = "0 New";
        notifList.innerHTML = '<div class="notif-empty">No unread deliveries</div>';
      }

      cachedRecentBookings = data.recentBookings || [];
      renderCorridorBreakdown(cachedRecentBookings);
      renderRecentShipmentsTable();
    })
    .withFailureHandler(function (error) {
      document.getElementById('recentTableBody').innerHTML = '<tr><td colspan="4" style="text-align: center; color: #dc2626; padding: 24px;">Error loading telemetry: ' + error.message + '</td></tr>';
    })
    .getDashboardSummary(sessionUser.branch, sessionUser.role);
}

function executeSearch() {
  var searchVal = document.getElementById('searchInput').value.trim();
  var btn = document.getElementById('searchBtn');
  var alertBox = document.getElementById('searchAlert');
  if (!searchVal) return;

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
  alertBox.style.display = 'none';

  google.script.run
    .withSuccessHandler(function (res) {
      btn.disabled = false;
      btn.innerHTML = 'Track';
      if (res.success) {
        renderTrackingData(res.details, res.history);
        document.getElementById('trackingModalOverlay').classList.add('active');
        document.getElementById('searchInput').value = '';
      } else {
        alertBox.innerHTML = '<i class="bi bi-exclamation-triangle-fill me-1"></i> ' + res.message;
        alertBox.style.display = 'block';
      }
    })
    .withFailureHandler(function (error) {
      btn.disabled = false;
      btn.innerHTML = 'Track';
      alertBox.innerHTML = '<i class="bi bi-wifi-off me-1"></i> Connection Error: ' + error.message;
      alertBox.style.display = 'block';
    })
    .fetchCompleteTracking(searchVal);
}

function closeTrackingModal() {
  document.getElementById('trackingModalOverlay').classList.remove('active');
}

document.getElementById('trackingModalOverlay').addEventListener('click', function (e) {
  if (e.target === this) closeTrackingModal();
});

function renderTrackingData(pkg, history) {
  document.getElementById('lblAwb').innerHTML = '<i class="bi bi-box-seam-fill" style="color: var(--brand-primary);"></i> ' + pkg.id;
  var badge = document.getElementById('lblStatusBadge');
  var s = String(pkg.status || '').toLowerCase();

  if (s.includes('delivered')) {
    badge.innerHTML = '<i class="bi bi-check2-circle" style="color: #10b981;"></i> Delivered';
  } else if (s.includes('cancel') || s.includes('return') || s.includes('fail') || s.includes('hold') || s.includes('exception')) {
    badge.innerHTML = '<i class="bi bi-exclamation-circle" style="color: #ef4444;"></i> Exception';
  } else {
    badge.innerHTML = '<i class="bi bi-arrow-repeat" style="color: var(--brand-primary);"></i> ' + pkg.status;
  }

  var originParts = String(pkg.origin || '').split(',');
  var originCity = originParts[0] ? originParts[0].trim() : '---';
  var originCountry = originParts[1] ? originParts[1].trim() : '';

  var destParts = String(pkg.dest || '').split(',');
  var destCity = destParts[0] ? destParts[0].trim() : '---';
  var destCountry = destParts[1] ? destParts[1].trim() : '';

  document.getElementById('lblRoute').innerHTML = '<div class="route-display"><div class="route-point"><span class="route-city">' + originCity + '</span>' + (originCountry ? '<span class="route-country">' + originCountry + '</span>' : '') + '</div><div class="route-divider"><i class="bi bi-airplane-engines-fill" style="color: var(--brand-primary);"></i></div><div class="route-point"><span class="route-city">' + destCity + '</span>' + (destCountry ? '<span class="route-country">' + destCountry + '</span>' : '') + '</div></div>';
  document.getElementById('stepperLabelOrigin').innerHTML = '<span class="stepper-loc-city">' + originCity + '</span>' + (originCountry ? '<span class="stepper-loc-country">' + originCountry + '</span>' : '');
  document.getElementById('stepperLabelTransit').innerHTML = '<span class="stepper-transit">In-Transit</span>';
  document.getElementById('stepperLabelDest').innerHTML = '<span class="stepper-loc-city">' + destCity + '</span>' + (destCountry ? '<span class="stepper-loc-country">' + destCountry + '</span>' : '');

  document.getElementById('lblDate').innerText = formatDateToDDMMMYYYY(pkg.date);
  document.getElementById('lblShipper').innerText = pkg.shipper || 'N/A';
  document.getElementById('lblConsignee').innerText = pkg.consignee || 'N/A';
  document.getElementById('lblWeightOnly').innerText = (pkg.weight || '0') + ' KG';
  document.getElementById('lblPcsOnly').innerText = (pkg.pcs || '1') + ' PCS';
  document.getElementById('lblType').innerText = pkg.type || pkg.pkgType || 'Parcel';

  var agent = pkg.fwdAgent || pkg.carrier || '';
  var docket = pkg.fwdDocket || pkg.docket || '';
  if (agent && agent !== 'N/A' && docket && docket !== 'N/A') {
    document.getElementById('lbl3rdPartyName').innerText = agent;
    document.getElementById('lbl3rdPartyDocket').innerText = 'AWB: ' + docket;
  } else {
    document.getElementById('lbl3rdPartyName').innerText = "Internal Network";
    document.getElementById('lbl3rdPartyDocket').innerText = "Direct Al-Farha Linehaul";
  }

  updateStepper(pkg.status);

  var tlContainer = document.getElementById('timelineContainer');
  tlContainer.innerHTML = '';

  if (!history || history.length === 0) {
    tlContainer.innerHTML = '<div style="text-align: center; padding: 36px 20px; color: #94a3b8;">No scan events recorded yet.</div>';
  } else {
    history.forEach(function (event, index) {
      var div = document.createElement('div');
      div.className = index === 0 ? 'timeline-row newest' : 'timeline-row';

      var d = event.date ? new Date(event.date) : new Date();
      var day = String(d.getDate()).padStart(2, '0');
      var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      var dateOnly = day + ' ' + monthNames[d.getMonth()];
      var timeOnly = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      var rmk = (event.remark || "").trim();
      var showRemark = rmk !== "" && !rmk.startsWith("Verified via") && !rmk.startsWith("Auto-fetched from");
      var remarkHtml = showRemark ? '<span><i class="bi bi-chat-left-text"></i> ' + rmk + '</span>' : '';

      div.innerHTML = '<div class="time-col"><span class="tl-date">' + dateOnly + '</span><span class="tl-time">' + timeOnly + '</span></div><div class="node-col"><div class="node-line"></div><div class="node-dot"></div></div><div class="content-col"><div class="tl-card"><span class="tl-status">' + event.status + '</span><div class="tl-meta"><span><i class="bi bi-geo-alt"></i> ' + (event.location || 'Network Hub') + '</span>' + remarkHtml + '</div></div></div>';
      tlContainer.appendChild(div);
    });
  }
}

function updateStepper(statusStr) {
  var s = String(statusStr || '').toLowerCase();
  var stepperWrapper = document.getElementById('stepperWrapper');
  var stepperLine = document.getElementById('stepperLine');
  stepperWrapper.className = 'stepper';
  var progress = 0;

  if (s.includes('delivered')) { stepperWrapper.classList.add('state-delivered'); progress = 100; }
  else if (s.includes('return') || s.includes('cancel') || s.includes('fail') || s.includes('exception') || s.includes('hold')) { stepperWrapper.classList.add('state-exception'); progress = 50; }
  else if (s === 'pending' || s === 'booked' || s === 'new' || s.includes('picked up')) { stepperWrapper.classList.add('state-booked'); progress = 15; }
  else { stepperWrapper.classList.add('state-transit'); progress = 55; }

  setTimeout(function () { stepperLine.style.width = progress + '%'; }, 60);
}

function returnToDashboard() { window.location.href = '/dashboard.html'; }
function loadBookingForm() { window.location.href = '/booking.html'; }
function loadTransfers() { window.location.href = '/transfers.html'; }
function loadStatusUpdate() { window.location.href = '/statusupdate.html'; }
function loadConsolidation() { window.location.href = '/consolidation.html'; }
function loadAdminPanel() { window.location.href = '/adminpanel.html'; }
