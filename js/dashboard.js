/**
 * js/dashboard.js
 * Controller for dashboard.html (Migrated from GAS Dashboard.html)
 */

var sessionUser = JSON.parse(localStorage.getItem('afc_user'));
  
  var activeAlertAwb = null;

  var quotes = [
    '"Deliver joy, one package at a time. 😊"',
    '"Bring a smile to someone\'s face today!"',
    '"Success is the sum of small efforts, repeated." ',
    '"Every package is a promise."',
    '"Great things are done by a series of small things."'
  ];

  function formatDateToDDMMMYYYY(dateInput) {
    if (!dateInput) return 'N/A';
    var d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    var day = String(d.getDate()).padStart(2, '0');
    var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var month = monthNames[d.getMonth()];
    var year = d.getFullYear();
    return day + ' ' + month + ' ' + year;
  }

  function initializeDashboard() {
    if(!sessionUser) return;

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
    var icon = "bi-moon-stars text-primary";
    if (hour < 12) { greeting = "Good morning"; icon = "bi-brightness-alt-high text-warning"; }
    else if (hour < 18) { greeting = "Good afternoon"; icon = "bi-sun text-warning"; }
    
    var firstName = sessionUser.name.split(' ')[0];
    var welcomeEl = document.getElementById('welcomeMsg');
    if(welcomeEl) welcomeEl.innerHTML = '<i class="bi ' + icon + ' me-2"></i> ' + greeting + ', ' + firstName + '!';

    var randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    var quoteEl = document.getElementById('quoteMsg');
    if(quoteEl) quoteEl.innerText = randomQuote;

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
    
    if(dropdown.classList.contains('show')) {
       dropdown.classList.remove('show');
       bellBtn.classList.remove('active');
    } else {
       dropdown.classList.add('show');
       bellBtn.classList.add('active');
    }
  }

  document.addEventListener('click', function(e) {
    var wrapper = document.getElementById('notifWrapper');
    if (wrapper && !wrapper.contains(e.target)) {
       document.getElementById('notifDropdown').classList.remove('show');
       document.getElementById('bellBtn').classList.remove('active');
    }
  });

  var activeDeliveryPkg = null; 

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
      AFC_API.call('markNotificationRead', { bookingID: activeDeliveryPkg.id }).catch(() => {});
    }
    
    document.getElementById('deliveryAlertOverlay').classList.remove('active');
    activeDeliveryPkg = null;
    
    fetchDashboardMetrics();
  }

  function notifyPartyAction() {
    if (!activeDeliveryPkg) return;
    
    let phoneRaw = activeDeliveryPkg.shipperPhone || "";
    let cleanPhone = phoneRaw.replace(/[^0-9]/g, ""); 
    
    if (!cleanPhone || cleanPhone.length < 8) {
       alert("Cannot open WhatsApp: No valid phone number was saved for this booking.");
       return;
    }

    let shipperName = activeDeliveryPkg.shipperName || "Customer";
    let awb = activeDeliveryPkg.id;
    let dest = activeDeliveryPkg.dest;

    let message = "Hello *" + shipperName + "*! 📦✨\n\nGreat news! Your shipment with *Al-Farha Cargo* has been successfully DELIVERED. 🎉\n\n📌 *Booking ID:* " + awb + "\n📍 *Destination:* " + dest + "\n\nThank you for choosing us! Have a wonderful day. 🚚💨";
    
    let encodedMessage = encodeURIComponent(message);
    
    let waUrl = "https://web.whatsapp.com/send?phone=" + cleanPhone + "&text=" + encodedMessage;
    window.open(waUrl, '_blank');
    
    markDeliveryRead();
  }


  function fetchDashboardMetrics() {
    google.script.run
      .withSuccessHandler(function(data) {
        
        document.getElementById('statTotal').innerText = data.totalBookings || 0;
        document.getElementById('statTransit').innerText = data.inTransit || 0;
        document.getElementById('statDelivered').innerText = data.delivered || 0;
        document.getElementById('statExceptions').innerText = data.exceptions || 0;
        
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
           
           var unreadDeliveries = data.recentDelivered.filter(function(item) {
              return !seenDeliveries.includes(item.id);
           });

           if (unreadDeliveries.length > 0) {
             bellBadge.innerText = unreadDeliveries.length;
             bellBadge.classList.add('show');
             countLabel.innerText = unreadDeliveries.length + " New";
             
             if (!document.getElementById('deliveryAlertOverlay').classList.contains('active')) {
                triggerDeliveryPopup(unreadDeliveries[0]);
             }

             notifList.innerHTML = ''; 
             unreadDeliveries.forEach(function(item) {
               var div = document.createElement('div');
               div.className = 'notif-item';
               div.onclick = function() { 
                  triggerDeliveryPopup(item); 
               };
               div.innerHTML = '<div class="notif-icon"><i class="bi bi-box-seam"></i></div><div class="notif-content"><span class="notif-title">' + item.id + ' Delivered</span><span class="notif-desc">Successfully arrived at ' + item.dest + '</span></div>';
               notifList.appendChild(div);
             });

           } else {
             bellBadge.classList.remove('show');
             countLabel.innerText = "0 New";
             notifList.innerHTML = '<div class="notif-empty"><i class="bi bi-bell-slash" style="font-size: 1.8rem;"></i><span>No new deliveries</span></div>';
           }

        } else {
           bellBadge.classList.remove('show');
           countLabel.innerText = "0 New";
           notifList.innerHTML = '<div class="notif-empty"><i class="bi bi-bell-slash" style="font-size: 1.8rem;"></i><span>No new deliveries</span></div>';
        }

        var tbody = document.getElementById('recentTableBody');
        tbody.innerHTML = '';
        if(!data.recentBookings || data.recentBookings.length === 0) {
          tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 40px;">No recent activity found.</td></tr>';
          return;
        }
        
        data.recentBookings.forEach(function(b) {
          var tr = document.createElement('tr');
          
          var sUpper = String(b.status).toUpperCase();
          var badgeStyle = "background: #eff6ff; color: #3b82f6; border-color: #bfdbfe;"; 
          
          if (sUpper.includes('DELIVERED')) {
             badgeStyle = "background: #ecfdf5; color: #10b981; border-color: #d1fae5;"; 
          } else if (sUpper.includes('RETURN') || sUpper.includes('CANCEL') || sUpper.includes('FAIL') || sUpper.includes('HOLD') || sUpper.includes('EXCEPTION')) {
             badgeStyle = "background: #fef2f2; color: #ef4444; border-color: #fecaca;"; 
          } else if (sUpper.includes('BOOK') || sUpper.includes('PENDING') || sUpper.includes('NEW') || sUpper.includes('PICKED UP')) {
             badgeStyle = "background: #fffbeb; color: #d97706; border-color: #fde68a;"; 
          }

          tr.innerHTML = '<td style="font-family: \'Lexend\'; font-weight: 500; color: var(--brand-accent);">' + b.id + '</td><td>' + b.destination + '</td><td><span class="status-badge" style="' + badgeStyle + '">' + b.status + '</span></td>';
          tbody.appendChild(tr);
        });
      })
      .withFailureHandler(function(error) {
        document.getElementById('statTotal').innerText = "Err";
        document.getElementById('statTransit').innerText = "Err";
        document.getElementById('statDelivered').innerText = "Err";
        document.getElementById('statExceptions').innerText = "Err";
        document.getElementById('statPending').innerText = "Err";
        document.getElementById('recentTableBody').innerHTML = '<tr><td colspan="3" style="text-align: center; color: #dc2626; padding: 20px;">Error loading metrics: ' + error.message + '</td></tr>';
      })
      .getDashboardSummary(sessionUser.branch, sessionUser.role);
  }

  function executeSearch() {
    var searchVal = document.getElementById('searchInput').value.trim();
    var btn = document.getElementById('searchBtn');
    var alertBox = document.getElementById('searchAlert');
    
    if (!searchVal) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" style="margin-right:6px;"></span> Wait..';
    alertBox.style.display = 'none';
    
    document.getElementById('notifDropdown').classList.remove('show');
    document.getElementById('bellBtn').classList.remove('active');

    google.script.run
      .withSuccessHandler(function(res) {
        btn.disabled = false;
        btn.innerHTML = 'Track';
        
        if (res.success) {
          renderTrackingData(res.details, res.history);
          document.getElementById('trackingModalOverlay').classList.add('active'); 
          document.getElementById('searchInput').value = ''; 
        } else {
          alertBox.innerHTML = '<i class="bi bi-exclamation-triangle"></i> ' + res.message;
          alertBox.style.display = 'block';
        }
      })
      .withFailureHandler(function(error) {
        btn.disabled = false;
        btn.innerHTML = 'Track';
        alertBox.innerHTML = '<i class="bi bi-wifi-off"></i> Connection Error: ' + error.message;
        alertBox.style.display = 'block';
      })
      .fetchCompleteTracking(searchVal);
  }

  function closeTrackingModal() {
    document.getElementById('trackingModalOverlay').classList.remove('active');
  }

  document.getElementById('trackingModalOverlay').addEventListener('click', function(e) {
    if(e.target === this) closeTrackingModal();
  });

  function renderTrackingData(pkg, history) {
    document.getElementById('lblAwb').innerHTML = '<i class="bi bi-box-seam" style="color: var(--text-muted); margin-right: 6px; font-size: 1.4rem;"></i> ' + pkg.id;
    
    var badge = document.getElementById('lblStatusBadge');
    var s = String(pkg.status || '').toLowerCase(); 
    
    if (s.includes('delivered')) { badge.innerHTML = '<i class="bi bi-check2-circle" style="color: #10b981; font-size: 1.1rem;"></i> Delivered'; }
    else if (s.includes('cancel') || s.includes('return') || s.includes('fail') || s.includes('hold') || s.includes('exception')) { badge.innerHTML = '<i class="bi bi-exclamation-circle" style="color: #ef4444; font-size: 1.1rem;"></i> Exception'; }
    else { badge.innerHTML = '<i class="bi bi-arrow-repeat" style="color: var(--brand-accent); font-size: 1.1rem;"></i> Active'; }

    var originParts = pkg.origin.split(',');
    var originCity = originParts[0] ? originParts[0].trim() : '---';
    var originCountry = originParts[1] ? originParts[1].trim() : '';

    var destParts = pkg.dest.split(',');
    var destCity = destParts[0] ? destParts[0].trim() : '---';
    var destCountry = destParts[1] ? destParts[1].trim() : '';

    document.getElementById('lblRoute').innerHTML = '<div class="route-display"><div class="route-point"><span class="route-city">' + originCity + '</span>' + (originCountry ? '<span class="route-country">' + originCountry + '</span>' : '') + '</div><div class="route-divider"><i class="bi bi-arrow-right"></i></div><div class="route-point"><span class="route-city">' + destCity + '</span>' + (destCountry ? '<span class="route-country">' + destCountry + '</span>' : '') + '</div></div>';
    document.getElementById('stepperLabelOrigin').innerHTML = '<span class="stepper-loc-city">' + originCity + '</span>' + (originCountry ? '<span class="stepper-loc-country">' + originCountry + '</span>' : '');
    document.getElementById('stepperLabelTransit').innerHTML = '<span class="stepper-transit">In-Transit</span>';
    document.getElementById('stepperLabelDest').innerHTML = '<span class="stepper-loc-city">' + destCity + '</span>' + (destCountry ? '<span class="stepper-loc-country">' + destCountry + '</span>' : '');

    document.getElementById('lblDate').innerText = formatDateToDDMMMYYYY(pkg.date);
    document.getElementById('lblShipper').innerText = pkg.shipper || 'N/A';
    document.getElementById('lblConsignee').innerText = pkg.consignee || 'N/A';
    
    document.getElementById('lblWeightOnly').innerText = pkg.weight + ' KG';
    document.getElementById('lblPcsOnly').innerText = pkg.pcs + ' PCS';
    document.getElementById('lblType').innerText = pkg.type || 'Standard';
    
    if (pkg.fwdAgent && pkg.fwdAgent !== 'N/A' && pkg.fwdDocket && pkg.fwdDocket !== 'N/A') {
      document.getElementById('lbl3rdPartyName').innerText = pkg.fwdAgent;
      document.getElementById('lbl3rdPartyDocket').innerText = 'AWB: ' + pkg.fwdDocket;
    } else {
      document.getElementById('lbl3rdPartyName').innerText = "Not Assigned";
      document.getElementById('lbl3rdPartyDocket').innerText = "Internal Route";
    }

    updateStepper(pkg.status);

    var tlContainer = document.getElementById('timelineContainer');
    tlContainer.innerHTML = '';
    
    if (!history || history.length === 0) {
      tlContainer.innerHTML = '<div style="text-align: center; padding: 40px 20px; color: #94a3b8;"><i class="bi bi-inbox" style="font-size: 2.5rem; margin-bottom: 12px; display: block; color:#cbd5e0;"></i><p style="font-size: 0.95rem; margin:0; font-weight:500;">No history available yet.</p></div>';
    } else {
      history.forEach(function(event, index) {
        var div = document.createElement('div');
        div.className = index === 0 ? 'timeline-row newest' : 'timeline-row';
        
        var d = event.date ? new Date(event.date) : new Date();
        var day = String(d.getDate()).padStart(2, '0');
        var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        var dateOnly = day + ' ' + monthNames[d.getMonth()];
        var timeOnly = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        var rmk = (event.remark || "").trim();
        var showRemark = false;
        if (rmk !== "" && !rmk.startsWith("Verified via") && !rmk.startsWith("Auto-fetched from")) { showRemark = true; }
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
    else if (s.includes('return') || s.includes('cancel') || s.includes('fail') || s.includes('exception')) { stepperWrapper.classList.add('state-exception'); progress = 50; } 
    else if (s === 'pending' || s === 'booked' || s === 'new' || s.includes('picked up') || s.includes('collected')) { stepperWrapper.classList.add('state-booked'); progress = 0; }
    else { stepperWrapper.classList.add('state-transit'); progress = 50; }

    setTimeout(function() { stepperLine.style.width = progress + '%'; }, 100);
  }

  function loadBookingForm() { window.location.href = '/booking.html'; }
  function loadTransfers() { window.location.href = '/transfers.html'; }
  function loadStatusUpdate() { window.location.href = '/statusupdate.html'; }
  function loadConsolidation() { window.location.href = '/consolidation.html'; }
  function loadAdminPanel() { window.location.href = '/adminpanel.html'; }
