/**
 * js/index.js
 * Splash Screen Service Worker Registration & Device-Aware Router
 */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(() => console.log('ServiceWorker registered'))
      .catch(err => console.log('ServiceWorker registration failed: ', err));
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    const sessionUser = localStorage.getItem('afc_user');

    if (sessionUser) {
      if (window.innerWidth <= 900) {
        window.location.href = '/mobiledashboard.html';
      } else {
        window.location.href = '/dashboard.html';
      }
    } else {
      window.location.href = '/login.html';
    }
  }, 800);
});
