// notifications.js - Persistent Notification Manager for Al-Farha PWA

const DISMISSED_KEY = 'afc_dismissed_notifications';
let activeDeliveryPkg = null;
let currentDeliveries = []; // Caches the current API fetch

// Local memory for instant UI updates
function getDismissedIDs() {
  return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
}

// Filters the API data and builds the UI
function processNotifications(recentDelivered) {
  if (!recentDelivered) return;
  currentDeliveries = recentDelivered;
  
  const dismissedIDs = getDismissedIDs();
  
  // Filter out any ID that has been dismissed (either locally or globally)
  const unread = recentDelivered.filter(item => !dismissedIDs.includes(item.id));
  
  const badge = document.getElementById('mobBellBadge');
  const notifList = document.getElementById('mobNotifList');
  
  if (!badge || !notifList) return;

  if (unread.length > 0) {
    badge.innerText = unread.length;
    badge.classList.add('show');
    notifList.innerHTML = '';
    
    unread.forEach(item => {
      const div = document.createElement('div');
      div.className = 'notif-item';
      div.onclick = function() { 
        triggerDeliveryPopup(item); 
        if(typeof closeBottomSheet === 'function') closeBottomSheet('force', 'notifSheet'); 
      };
      div.innerHTML = `
        <div class="notif-icon"><i class="bi bi-box-seam"></i></div>
        <div class="notif-details">
          <span class="notif-awb">${item.id} Delivered</span>
          <span class="notif-msg">${item.dest}</span>
        </div>`;
      notifList.appendChild(div);
    });
  } else {
    badge.classList.remove('show');
    notifList.innerHTML = '<div style="text-align: center; color: #94a3b8; padding: 40px 20px;"><i class="bi bi-bell-slash" style="font-size: 2rem; margin-bottom:10px; display:block;"></i> All caught up!</div>';
  }
}

function triggerDeliveryPopup(pkg) {
  activeDeliveryPkg = pkg;
  document.querySelector('#mobDeliveryAlert .alert-title').innerText = pkg.id + ' Delivered!';
  document.getElementById('alertDescText').innerText = `Destination: ${pkg.dest}`;
  document.getElementById('mobDeliveryAlert').classList.add('active');
}

// The New Cross-Device Syncing Function
async function markDeliveryRead() {
  if (!activeDeliveryPkg || !activeDeliveryPkg.id) return;
  
  const pkgId = activeDeliveryPkg.id;

  // 1. Instant Local Update (Makes the UI feel fast)
  const dismissed = getDismissedIDs();
  if (!dismissed.includes(pkgId)) {
    dismissed.push(pkgId);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
  }
  
  document.getElementById('mobDeliveryAlert').classList.remove('active');
  activeDeliveryPkg = null;
  processNotifications(currentDeliveries);

  // 2. Background Cloud Sync (Tells the master database it has been read)
  try {
    await fetch(GOOGLE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: "markNotificationRead",
        bookingID: pkgId
      })
    });
  } catch (error) {
    console.error("Cloud notification sync failed.", error);
  }
}

function notifyPartyAction() {
  if (!activeDeliveryPkg) return;
  let cleanPhone = (activeDeliveryPkg.shipperPhone || "").replace(/[^0-9]/g, ""); 
  if (!cleanPhone || cleanPhone.length < 8) {
    alert("No valid phone number saved.");
    return;
  }

  let msg = `Hello *${activeDeliveryPkg.shipperName || "Customer"}*! 📦✨\n\nYour shipment with *Al-Farha Cargo* has been DELIVERED.\n\n📌 *ID:* ${activeDeliveryPkg.id}\n📍 *Destination:* ${activeDeliveryPkg.dest}\n\nThank you! 🚚💨`;
  window.open("https://wa.me/" + cleanPhone + "?text=" + encodeURIComponent(msg), '_blank');
  
  // This now fires the cloud-sync function above
  markDeliveryRead();
}