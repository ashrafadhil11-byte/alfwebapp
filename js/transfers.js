/**
 * js/transfers.js
 * Controller for transfers.html (Migrated from GAS Transfers.html)
 */

var sessionUser = JSON.parse(localStorage.getItem('afc_user'));
  var activeReceiveData = { tId: '', bId: '', btnElement: null };
  
  // Globals for Bulk Scanning
  var expectedPackages = [];
  var readyToReceiveIds = [];

  (function setupSidebar() {
    if(sessionUser) {
      const navName = document.getElementById('navName');
      if (navName) {
        navName.innerText = sessionUser.name;
        document.getElementById('navBranch').innerText = sessionUser.branch;
        if (sessionUser.role === 'Admin' || sessionUser.role === 'Head Office') {
          document.getElementById('nav-admin').classList.remove('d-none');
        }

        loadPendingInbounds();
        loadRecentOutbounds();
        fetchInventoryForTransfer();

        google.script.run
          .withSuccessHandler(function(branches) {
            const destSelect = document.getElementById('destinationBranch');
            if(!destSelect) return; 
            destSelect.innerHTML = '<option value="" disabled selected>Select Destination Hub...</option>';
            if(branches.length === 0) {
               destSelect.innerHTML += '<option value="" disabled>No branches found</option>';
            } else {
               branches.forEach(function(branchName) { destSelect.innerHTML += `<option value="${branchName}">${branchName}</option>`; });
            }
          })
          .getBranchListForDropdown();
      }
    }
  })();

  function toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); document.getElementById('mainContent').classList.toggle('expanded'); }

  function fetchInventoryForTransfer() {
    google.script.run
      .withSuccessHandler(function(data) {
        const tbody = document.getElementById('inventoryTableBody');
        if(!tbody) return;
        tbody.innerHTML = '';
        if(data.length === 0) {
          tbody.innerHTML = '<tr><td style="text-align: center; color: var(--text-muted); padding: 20px;">No available packages in branch.</td></tr>';
          return;
        }
        
        data.forEach(function(pkg) {
          let tr = document.createElement('tr');
          tr.className = 'clickable-row';
          tr.onclick = function() { quickAddId(pkg.id); };
          tr.innerHTML = `
            <td style="font-family: 'Lexend'; font-weight: 500; color: var(--brand-accent); font-size: 0.85rem;"><i class="bi bi-plus-circle me-1"></i> ${pkg.id}</td>
            <td style="font-size: 0.85rem;">To: ${pkg.dest}</td>
          `;
          tbody.appendChild(tr);
        });
      })
      .getBranchInventory(sessionUser.branch);
  }

  function quickAddId(id) {
    const box = document.getElementById('outboundBookingIds');
    if (!box.value.includes(id)) {
      box.value = box.value ? box.value + ",\n" + id : id;
    }
  }

  function sendOutbound() {
    const rawIds = document.getElementById('outboundBookingIds').value.trim();
    const dest = document.getElementById('destinationBranch').value;
    const alertBox = document.getElementById('outbound-alert');
    const btn = document.getElementById('sendBtn');
    
    if (!rawIds || !dest) { showInlineAlert(alertBox, 'danger', 'Please enter at least one Booking ID and select a destination.'); return; }

    const bIds = rawIds.split(/[\n,]+/).map(id => id.trim()).filter(id => id !== '');
    if (bIds.length === 0) { showInlineAlert(alertBox, 'danger', 'No valid tracking IDs found.'); return; }

    btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Processing...';

    google.script.run
      .withSuccessHandler(function(res) {
        if(res.success) {
          showInlineAlert(alertBox, 'success', res.message);
          document.getElementById('outboundBookingIds').value = ''; 
          loadRecentOutbounds(); 
          fetchInventoryForTransfer(); 
        } else {
          showInlineAlert(alertBox, 'danger', res.message);
        }
        btn.disabled = false; btn.innerHTML = '<i class="bi bi-truck"></i> Dispatch Package(s)';
      })
      .withFailureHandler(function(error) {
        showInlineAlert(alertBox, 'danger', 'Error: ' + error.message);
        btn.disabled = false; btn.innerHTML = '<i class="bi bi-truck"></i> Dispatch Package(s)';
      })
      .processBulkOutboundTransfer(bIds, dest, sessionUser.name, sessionUser.branch);
  }

  function loadRecentOutbounds() {
    const tbody = document.getElementById('outboundTableBody');
    google.script.run
      .withSuccessHandler(function(data) {
        if(!tbody) return;
        tbody.innerHTML = '';
        if (!data || data.length === 0) { tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">No recent outbound packages.</td></tr>'; return; }
        data.forEach(function(item) {
          let statusBadge = item.status === "Pending" ? `<span class="status-pending"><i class="bi bi-truck"></i> In Transit</span>` : `<span class="status-received"><i class="bi bi-check2-all"></i> Received</span>`;
          let tr = document.createElement('tr');
          tr.innerHTML = `<td><span class="tracking-id">${item.bookingId}</span></td><td><span class="badge-branch">${item.toBranch}</span></td><td class="date-sent">${item.dateSent}</td><td>${statusBadge}</td>`;
          tbody.appendChild(tr);
        });
      })
      .getRecentOutbounds(sessionUser.branch);
  }

  // ==========================================
  // NEW SMART SCANNER INBOUND LOGIC
  // ==========================================

  function loadPendingInbounds() {
    const tbody = document.getElementById('inboundTableBody');
    google.script.run
      .withSuccessHandler(function(data) {
        if(!tbody) return;
        tbody.innerHTML = '';
        
        // Setup Scanner State
        expectedPackages = data || [];
        readyToReceiveIds = [];
        updateBulkButton();
        
        if (!data || data.length === 0) { 
           tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 30px;"><i class="bi bi-check-circle text-success" style="font-size: 2rem; display:block; margin-bottom: 10px;"></i>No pending incoming packages.</td></tr>'; 
           document.getElementById('scannerBox').style.display = 'none';
           return; 
        }
        
        document.getElementById('scannerBox').style.display = 'block';

        data.forEach(function(item) {
          let cleanId = String(item.bookingId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          let tr = document.createElement('tr');
          tr.id = 'row-' + cleanId; // Setup row ID for strikethrough target
          
          tr.innerHTML = `
            <td><span class="tracking-id">${item.bookingId}</span><span class="date-sent"><i class="bi bi-clock"></i> Sent: ${item.dateSent}</span></td>
            <td><span class="badge-branch">${item.fromBranch}</span></td>
            <td style="text-align: right;" id="action-${cleanId}">
               <button class="btn-success-custom" onclick="openReceiveModal('${item.transferId}', '${item.bookingId}', this)">Receive</button>
            </td>`;
          tbody.appendChild(tr);
        });
      })
      .getPendingInbounds(sessionUser.branch);
  }

  // Hook up the scanner input
  setTimeout(function() {
    var scanInput = document.getElementById('scanInput');
    if(scanInput) {
      scanInput.addEventListener('focus', () => document.getElementById('scannerBox').classList.add('focused'));
      scanInput.addEventListener('blur', () => document.getElementById('scannerBox').classList.remove('focused'));
      
      scanInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          var rawVal = this.value.trim();
          this.value = '';
          if (!rawVal) return;
          
          var cleanVal = rawVal.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
          
          // Validation 1: Already scanned?
          if (readyToReceiveIds.includes(cleanVal)) {
            showScanError(`ID ${cleanVal} already scanned.`);
            return;
          }
          
          // Validation 2: Is it on our expected list?
          var isExpected = expectedPackages.find(p => String(p.bookingId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === cleanVal);
          
          if (!isExpected) {
            showScanError(`REJECTED: Booking ${rawVal} not found in pending list!`);
            return;
          }
          
          // Success!
          document.getElementById('scanErrorMsg').innerText = "";
          readyToReceiveIds.push(cleanVal);
          
          // Update the table row visually
          var row = document.getElementById('row-' + cleanVal);
          if (row) {
            row.classList.add('scanned-row');
            document.getElementById('action-' + cleanVal).innerHTML = '<i class="bi bi-check-circle-fill text-success" style="font-size: 1.5rem;"></i>';
          }
          
          updateBulkButton();
        }
      });
    }
  }, 500);

  function showScanError(msg) {
    var scanErrorMsg = document.getElementById('scanErrorMsg');
    var scannerBox = document.getElementById('scannerBox');
    scanErrorMsg.innerText = msg;
    scannerBox.classList.add('error-flash');
    setTimeout(() => scannerBox.classList.remove('error-flash'), 400);
  }

  function updateBulkButton() {
    var btn = document.getElementById('btnSubmitBulkReceive');
    if (readyToReceiveIds.length > 0) {
      btn.classList.remove('d-none');
      document.getElementById('bulkCount').innerText = readyToReceiveIds.length;
    } else {
      btn.classList.add('d-none');
    }
  }

  function submitBulkReceive() {
    if (readyToReceiveIds.length === 0) return;
    
    var btn = document.getElementById('btnSubmitBulkReceive');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing Batch...';
    
    google.script.run
      .withSuccessHandler(function(res) {
        if (res.success) {
          showInlineAlert(document.getElementById('inbound-alert'), 'success', res.message);
          loadPendingInbounds(); // Resets everything naturally
          fetchInventoryForTransfer(); 
        } else {
          showInlineAlert(document.getElementById('inbound-alert'), 'danger', res.message);
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-box-arrow-in-down"></i> Confirm Bulk Receipt (<span id="bulkCount">0</span>)';
      })
      .withFailureHandler(function(err) {
        showInlineAlert(document.getElementById('inbound-alert'), 'danger', 'Connection Error: ' + err.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-box-arrow-in-down"></i> Confirm Bulk Receipt (<span id="bulkCount">0</span>)';
      })
      .processBulkInboundReceive(readyToReceiveIds, sessionUser.name, sessionUser.branch);
  }

  // ==========================================
  // SINGLE RECEIVE MODAL (STILL WORKS!)
  // ==========================================
  
  function openReceiveModal(tId, bId, btnElement) {
    activeReceiveData = { tId: tId, bId: bId, btnElement: btnElement };
    document.getElementById('modalLoading').classList.remove('d-none'); document.getElementById('modalContent').classList.add('d-none'); document.getElementById('modal-alert').classList.add('d-none');
    
    const confirmBtn = document.getElementById('confirmReceiveBtn');
    confirmBtn.disabled = false; confirmBtn.innerHTML = 'Confirm Receipt';
    document.getElementById('receiveModal').classList.add('active');
    
    google.script.run
      .withSuccessHandler(function(details) {
        document.getElementById('modalLoading').classList.add('d-none'); document.getElementById('modalContent').classList.remove('d-none');
        if(details) {
          document.getElementById('mdl-id').innerText = details.id; document.getElementById('mdl-shipper').innerText = details.shipper; document.getElementById('mdl-consignee').innerText = details.consignee;
          document.getElementById('mdl-route').innerHTML = `${details.origin} <i class="bi bi-arrow-right mx-1 text-muted"></i> ${details.dest}`; document.getElementById('mdl-weight').innerText = details.weight; document.getElementById('mdl-pcs').innerText = details.pcs;
        } else {
          document.getElementById('mdl-id').innerText = bId; document.getElementById('mdl-route').innerText = "Details not found.";
        }
      })
      .getPackageDetails(bId);
  }

  function closeReceiveModal() { document.getElementById('receiveModal').classList.remove('active'); }

  function confirmReceive() {
    const btn = document.getElementById('confirmReceiveBtn'); const alertBox = document.getElementById('modal-alert'); const bId = activeReceiveData.bId;
    btn.disabled = true; btn.innerHTML = "Processing...";
    
    google.script.run
      .withSuccessHandler(function(res) {
        if(res.success) {
          closeReceiveModal(); 
          btn.disabled = false; btn.innerHTML = "Confirm Receipt";
          showInlineAlert(document.getElementById('inbound-alert'), 'success', 'Package ' + bId + ' received securely.');
          const row = activeReceiveData.btnElement.closest('tr'); row.style.opacity = '0'; setTimeout(() => row.remove(), 300);
          setTimeout(() => { const tbody = document.getElementById('inboundTableBody'); if(tbody.children.length === 0) { tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 30px;">No pending incoming packages.</td></tr>'; document.getElementById('scannerBox').style.display = 'none'; } }, 350);
          
          fetchInventoryForTransfer();
        } else {
          showInlineAlert(alertBox, 'danger', res.message); btn.disabled = false; btn.innerHTML = "Confirm Receipt";
        }
      })
      .withFailureHandler(function(error) { showInlineAlert(alertBox, 'danger', 'Error: ' + error.message); btn.disabled = false; btn.innerHTML = "Confirm Receipt"; })
      .processInboundReceive(activeReceiveData.tId, bId, sessionUser.name, sessionUser.branch);
  }

  function showInlineAlert(element, type, message) { element.className = 'alert alert-' + type + ' custom-alert'; element.innerHTML = message; element.classList.remove('d-none'); setTimeout(() => element.classList.add('d-none'), 4000); }

  function returnToDashboard() { window.location.href = '/dashboard.html'; }
  function loadBookingForm() { window.location.href = '/booking.html'; }
  function loadStatusUpdate() { window.location.href = '/statusupdate.html'; }
  function loadAdminPanel() { window.location.href = '/adminpanel.html'; }
