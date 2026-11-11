// auth-guard.js - Unified Session & Auto-Redirect Guard (Desktop & Mobile PWA)
(function () {
  const THREE_HOURS_MS = 3 * 60 * 60 * 1000; // 3 Hours (Sign-out threshold)
  const REOPEN_THRESHOLD_MS = 60 * 1000;    // 1 Minute (Background resume threshold)

  const pathParts = window.location.pathname.split('/');
  const currentPage = (pathParts[pathParts.length - 1] || 'index.html').toLowerCase();
  const isLoginPage = currentPage === 'login.html';
  const isDashboardPage = currentPage === 'mobiledashboard.html' || currentPage === 'dashboard.html';

  function getHomeUrl() {
    return window.innerWidth <= 900 ? '/mobiledashboard.html' : '/dashboard.html';
  }

  function validateSession() {
    try {
      const sessionUser = localStorage.getItem('afc_user');
      const lastActive = localStorage.getItem('afc_last_active');
      const now = Date.now();

      // 1. If not logged in, redirect to login
      if (!sessionUser) {
        if (!isLoginPage) {
          window.location.href = '/login.html';
        }
        return;
      }

      if (lastActive) {
        const elapsed = now - parseInt(lastActive, 10);

        // 2. Inactive for more than 3 hours -> Auto Sign-Out
        if (elapsed > THREE_HOURS_MS) {
          localStorage.removeItem('afc_user');
          localStorage.removeItem('afc_last_active');
          if (!isLoginPage) {
            window.location.href = '/login.html';
          }
          return;
        }

        // 3. Re-opened on mobile after backgrounding -> Redirect to appropriate Dashboard
        if (window.innerWidth <= 900 && elapsed > REOPEN_THRESHOLD_MS && !isDashboardPage && !isLoginPage) {
          localStorage.setItem('afc_last_active', now.toString());
          window.location.href = getHomeUrl();
          return;
        }
      }

      // 4. If already logged in and visiting login.html, route to dashboard
      if (isLoginPage && sessionUser) {
        window.location.href = getHomeUrl();
        return;
      }

      // Update active timestamp during continuous use
      localStorage.setItem('afc_last_active', now.toString());
    } catch (e) {
      console.warn('Session storage access warning:', e);
    }
  }

  validateSession();

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      validateSession();
    }
  });

  window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
      validateSession();
    }
  });
})();
