/**
 * js/login.js
 * Authentication Controller for Al-Farha Cargo Portal
 */

async function processLogin() {
  const userId = document.getElementById('userId').value.trim();
  const pin = document.getElementById('pin').value.trim();
  const alertDiv = document.getElementById('login-alert');
  const loginBtn = document.getElementById('loginBtn');

  if (!userId || !pin) {
    alertDiv.className = 'custom-alert alert-danger';
    alertDiv.innerHTML = '<i class="bi bi-exclamation-triangle-fill" style="font-size:1.1rem;"></i> Please enter both ID and PIN.';
    alertDiv.style.display = 'flex';

    alertDiv.style.animation = 'none';
    alertDiv.offsetHeight;
    alertDiv.style.animation = null;
    return;
  }

  alertDiv.style.display = 'none';
  loginBtn.innerHTML = '<i class="bi bi-arrow-repeat loading-spinner" style="font-size: 1.4rem;"></i> <span>Authenticating...</span>';
  loginBtn.disabled = true;

  try {
    const data = await AFC_API.call("authenticate", { userId, pin });

    if (data.success) {
      loginBtn.innerHTML = '<i class="bi bi-check-circle-fill" style="font-size: 1.4rem;"></i> <span>Success!</span>';
      loginBtn.style.background = '#10b981';
      loginBtn.style.boxShadow = '0 10px 20px -5px rgba(16, 185, 129, 0.4)';

      localStorage.setItem('afc_user', JSON.stringify(data.user));
      localStorage.setItem('afc_last_active', Date.now().toString());

      setTimeout(() => {
        if (window.innerWidth <= 900) {
          window.location.href = '/mobiledashboard.html';
        } else {
          window.location.href = '/dashboard.html';
        }
      }, 400);
    } else {
      throw new Error(data.message || 'Invalid credentials.');
    }
  } catch (error) {
    alertDiv.className = 'custom-alert alert-danger';
    alertDiv.innerHTML = `<i class="bi bi-x-circle-fill" style="font-size:1.1rem;"></i> <span>${error.message || 'Network Error. Please check connection.'}</span>`;
    alertDiv.style.display = 'flex';

    loginBtn.innerHTML = '<span>Secure Sign In</span> <i class="bi bi-arrow-right-short" style="font-size: 1.4rem;"></i>';
    loginBtn.disabled = false;

    alertDiv.style.animation = 'none';
    alertDiv.offsetHeight;
    alertDiv.style.animation = null;
  }
}

function triggerForgotPassword() {
  const alertDiv = document.getElementById('login-alert');
  if (!alertDiv) return;
  alertDiv.className = 'custom-alert alert-info';
  alertDiv.innerHTML = '<i class="bi bi-info-circle-fill" style="font-size:1.1rem;"></i> <span>Please contact your Branch Manager or Head Office to reset your PIN securely.</span>';
  alertDiv.style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  const pinInput = document.getElementById('pin');
  const userIdInput = document.getElementById('userId');
  if (pinInput) {
    pinInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') processLogin();
    });
  }
  if (userIdInput) {
    userIdInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter' && pinInput) pinInput.focus();
    });
  }
});
