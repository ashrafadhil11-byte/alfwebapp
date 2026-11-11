/**
 * js/sidebar.js
 * Shared Desktop Sidebar Navigation, Role Visibility & Page Routing
 * Replaces GAS `google.script.run.include(...)` with clean multi-page navigation on Vercel.
 */

(function () {
  function initSidebar() {
    const sessionUser = window.AFC_API ? window.AFC_API.getUser() : JSON.parse(localStorage.getItem('afc_user') || 'null');
    if (!sessionUser) return;

    if (document.getElementById('sidebar')) {
      document.body.classList.add('has-desktop-sidebar');
    }

    const navName = document.getElementById('navName');
    if (navName) navName.innerText = sessionUser.name || 'User';

    const navBranch = document.getElementById('navBranch');
    if (navBranch) navBranch.innerText = sessionUser.branch || 'Branch';

    const isAdmin = (
      sessionUser.role === 'Admin' ||
      sessionUser.role === 'Head Office' ||
      sessionUser.role === 'Super Admin'
    );

    const navAdmin = document.getElementById('nav-admin');
    if (navAdmin && isAdmin) {
      navAdmin.classList.remove('d-none');
    }

    const navConsol = document.getElementById('nav-consol');
    if (navConsol) {
      navConsol.classList.remove('d-none');
    }
  }

  document.addEventListener('DOMContentLoaded', initSidebar);

  // Global navigation helpers used across all desktop HTML views
  window.toggleSidebar = function () {
    const sb = document.getElementById('sidebar');
    const mc = document.getElementById('mainContent');
    if (sb) sb.classList.toggle('collapsed');
    if (mc) mc.classList.toggle('expanded');
  };

  window.returnToDashboard = function () {
    window.location.href = window.innerWidth <= 900 ? '/mobiledashboard.html' : '/dashboard.html';
  };

  window.loadDashboard = function () {
    window.location.href = window.innerWidth <= 900 ? '/mobiledashboard.html' : '/dashboard.html';
  };

  window.loadBookingForm = function () {
    window.location.href = window.innerWidth <= 900 ? '/mobilebooking.html' : '/booking.html';
  };

  window.loadTransfers = function () {
    window.location.href = '/transfers.html';
  };

  window.loadStatusUpdate = function () {
    window.location.href = window.innerWidth <= 900 ? '/mstatusupdate.html' : '/statusupdate.html';
  };

  window.loadConsolidation = function () {
    window.location.href = '/consolidation.html';
  };

  window.loadConsolidationPanel = function () {
    window.location.href = '/consolidation.html';
  };

  window.loadAdminPanel = function () {
    window.location.href = '/adminpanel.html';
  };

  window.logoutSystem = function () {
    localStorage.removeItem('afc_user');
    localStorage.removeItem('afc_last_active');
    window.location.href = '/login.html';
  };
})();
