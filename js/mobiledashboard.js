/**
 * js/mobiledashboard.js
 * Mobile PWA Dashboard Controller
 */

var sessionUser = JSON.parse(localStorage.getItem('afc_user') || 'null');

function initMobileDashboard() {
  if (!sessionUser) {
    window.location.href = '/login.html';
    return;
  }

  document.getElementById('mobBranch').innerText = sessionUser.branch;

  var isAdmin = (
    sessionUser.role === 'Admin' ||
    sessionUser.role === 'Head Office' ||
    sessionUser.role === 'Super Admin' ||
    sessionUser.role === 'Branch Manager'
  );
  if (isAdmin) {
    var adminNav = document.getElementById('mobNavAdmin');
    if (adminNav) adminNav.classList.remove('d-none');
  }

  var hour = new Date().getHours();
  var greeting = "Good Evening";
  var icon = "🌙";
  if (hour < 12) { greeting = "Good Morning"; icon = "☀️"; }
  else if (hour < 18) { greeting = "Good Afternoon"; icon = "👋"; }

  document.getElementById('mobGreeting').innerHTML = greeting + ', ' + sessionUser.name.split(' ')[0] + ' ' + icon;

  fetchDashboardMetrics();
  setupPullToRefresh();
}

function switchActivityTab(tabName) {
  document.getElementById('tabBtnActive').classList.remove('active');
  document.getElementById('tabBtnDelivered').classList.remove('active');
  document.getElementById('viewActive').classList.remove('active');
  document.getElementById('viewDelivered').classList.remove('active');

  if (tabName === 'active') {
    document.getElementById('tabBtnActive').classList.add('active');
    document.getElementById('viewActive').classList.add('active');
  } else {
    document.getElementById('tabBtnDelivered').classList.add('active');
    document.getElementById('viewDelivered').classList.add('active');
  }
}

function openBottomSheet(id) {
  document.getElementById(id).classList.add('active');
}

function closeBottomSheet(e, id) {
  if (e === 'force' || (e && e.target && e.target.id === id)) {
    document.getElementById(id).classList.remove('active');
  }
}

function setupPullToRefresh() {
  const scrollArea = document.getElementById('mainScrollArea');
  const ptrContainer = document.getElementById('ptrContainer');
  if (!scrollArea || !ptrContainer) return;

  let startY = 0;
  let isPulling = false;

  scrollArea.addEventListener('touchstart', (e) => {
    if (scrollArea.scrollTop === 0) {
      startY = e.touches[0].clientY;
      isPulling = true;
    }
  }, { passive: true });

  scrollArea.addEventListener('touchmove', (e) => {
    if (!isPulling) return;
    const currentY = e.touches[0].clientY;
    if (currentY > startY + 20 && scrollArea.scrollTop === 0) {
      ptrContainer.classList.add('active');
    }
  }, { passive: true });

  scrollArea.addEventListener('touchend', async () => {
    if (isPulling && ptrContainer.classList.contains('active')) {
      ptrContainer.classList.add('refreshing');
      await fetchDashboardMetrics();
      ptrContainer.classList.remove('active', 'refreshing');
    }
    isPulling = false;
  });
}

async function fetchDashboardMetrics() {
  try {
    const data = await AFC_API.call("getDashboardSummary", {
      branch: sessionUser.branch,
      role: sessionUser.role
    });

    if (!data.success && data.totalBookings === undefined) {
      throw new Error(data.message || "Failed to retrieve data.");
    }

    document.getElementById('statTotal').innerText = data.totalBookings || 0;
    document.getElementById('statTransit').innerText = data.inTransit || 0;
    document.getElementById('statDelivered').innerText = data.delivered || 0;
    document.getElementById('statExceptions').innerText = data.exceptions || 0;

    var pendingCount = data.pendingInbounds || 0;
    var statPendingEl = document.getElementById('statPending');
    if (pendingCount > 0) {
      statPendingEl.innerHTML = pendingCount + '<span class="live-dot" style="margin-left: 6px;"></span>';
      document.getElementById('pendingCardWrapper').classList.add('alert-state');
    } else {
      statPendingEl.innerText = pendingCount;
      document.getElementById('pendingCardWrapper').classList.remove('alert-state');
    }

    if (typeof processNotifications === 'function') {
      processNotifications(data.recentDelivered);
    }

    var activeView = document.getElementById('viewActive');
    var deliveredView = document.getElementById('viewDelivered');
    activeView.innerHTML = '';
    deliveredView.innerHTML = '';

    if (!data.recentBookings || data.recentBookings.length === 0) {
      activeView.innerHTML = `<div class="empty-state"><i class="bi bi-box-seam"></i><p>No active shipments</p></div>`;
      deliveredView.innerHTML = `<div class="empty-state"><i class="bi bi-inbox"></i><p>No past shipments</p></div>`;
      return;
    }

    let activeCount = 0;
    let deliveredCount = 0;

    data.recentBookings.forEach(function (b) {
      var sUpper = String(b.status).toUpperCase();
      var badgeStyle = "background: #eff6ff; color: #3b82f6; border-color: #bfdbfe;";
      var isDelivered = false;

      if (sUpper.includes('DELIVERED')) {
        badgeStyle = "background: #ecfdf5; color: #10b981; border-color: #d1fae5;";
        isDelivered = true;
      } else if (sUpper.includes('RETURN') || sUpper.includes('CANCEL') || sUpper.includes('FAIL') || sUpper.includes('HOLD') || sUpper.includes('EXCEPTION')) {
        badgeStyle = "background: #fef2f2; color: #ef4444; border-color: #fecaca;";
      } else if (sUpper.includes('BOOK') || sUpper.includes('PENDING') || sUpper.includes('NEW') || sUpper.includes('PICKED UP')) {
        badgeStyle = "background: #fffbeb; color: #d97706; border-color: #fde68a;";
      }

      var rawStatus = b.status || "Unknown";
      var displayStatus = rawStatus.length > 20 ? rawStatus.substring(0, 20) + '...' : rawStatus;

      var div = document.createElement('div');
      div.className = 'activity-card';
      div.onclick = function () { openPackageModal(b.id); };

      div.innerHTML = `
        <div class="ac-top">
          <span class="ac-id"><i class="bi bi-box-seam-fill" style="margin-right: 8px;"></i>${b.id}</span>
          <span class="status-badge" style="${badgeStyle}">${displayStatus}</span>
        </div>
        <div class="ac-dest"><i class="bi bi-geo-alt"></i> ${b.destination}</div>
      `;

      if (isDelivered) {
        deliveredView.appendChild(div);
        deliveredCount++;
      } else {
        activeView.appendChild(div);
        activeCount++;
      }
    });

    if (activeCount === 0) {
      activeView.innerHTML = `<div class="empty-state"><i class="bi bi-box-seam"></i><p>No active shipments</p></div>`;
    }
    if (deliveredCount === 0) {
      deliveredView.innerHTML = `<div class="empty-state"><i class="bi bi-inbox"></i><p>No past shipments found</p></div>`;
    }
  } catch (error) {
    document.getElementById('viewActive').innerHTML =
      '<div class="empty-state" style="color: #ef4444; border-color: #fca5a5;">' +
      '<i class="bi bi-exclamation-triangle" style="color: #ef4444;"></i>' +
      '<p>Failed to load: ' + error.message + '</p></div>';
  }
}

function logoutSystem() {
  localStorage.removeItem('afc_user');
  localStorage.removeItem('afc_last_active');
  window.location.href = '/login.html';
}

document.addEventListener('DOMContentLoaded', initMobileDashboard);
