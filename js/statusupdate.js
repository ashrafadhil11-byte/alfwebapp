/**
 * js/statusupdate.js
 * Controller for statusupdate.html (Migrated from GAS StatusUpdate.html)
 */

var sessionUser = JSON.parse(localStorage.getItem('afc_user'));
  var activeTab = 'single'; 
  var pendingCsvRecords = []; 

  // --- SETUP SIDEBAR ---
  (function setupSidebar() {
    if(sessionUser) {
      const navName = document.getElementById('navName');
      if (navName) navName.innerText = sessionUser.name;

      const navBranch = document.getElementById('navBranch');
      if (navBranch) navBranch.innerText = sessionUser.branch;

      const navAdmin = document.getElementById('nav-admin');
      if (navAdmin && (sessionUser.role === 'Admin' || sessionUser.role === 'Head Office' || sessionUser.role === 'Super Admin')) {
        navAdmin.classList.remove('d-none');
      }
      
      const scanInput = document.getElementById('scanSingleId');
      if (scanInput) setTimeout(() => scanInput.focus(), 300);
      
      if (typeof fetchInventory === "function") fetchInventory();
    }
  })();

  // --- UI TOGGLES ---
  function toggleCarrierSection() {
    const sec = document.getElementById('carrierSection');
    const icon = document.getElementById('carrierIcon');
    sec.classList.toggle('expanded');
    if (sec.classList.contains('expanded')) {
      icon.className = 'bi bi-chevron-up';
      document.getElementById('fwdAgent').focus();
    } else {
      icon.className = 'bi bi-chevron-down';
      document.getElementById('fwdAgent').value = '';
      document.getElementById('fwdDocket').value = '';
    }
  }

  function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    
    const alertBox = document.getElementById('update-alert');
    if (alertBox) alertBox.classList.add('d-none');
    
    const sharedFields = document.getElementById('sharedUpdateFields');
    const carrierWrapper = document.getElementById('carrierWrapper');
    
    if (tabId === 'csv') {
      sharedFields.classList.add('d-none'); 
      document.getElementById('csvFileInput').value = '';
      document.getElementById('csvBtn').classList.remove('d-none');
      document.getElementById('csvPreviewSection').classList.add('d-none');
      pendingCsvRecords = [];
    } else {
      sharedFields.classList.remove('d-none');
      if (tabId === 'single') {
        carrierWrapper.classList.remove('d-none');
      } else {
        carrierWrapper.classList.add('d-none');
        document.getElementById('carrierSection').classList.remove('expanded');
        document.getElementById('fwdAgent').value = '';
        document.getElementById('fwdDocket').value = '';
      }
    }

    if (tabId === 'consol') {
      document.getElementById('panel-inventory').classList.add('d-none');
      document.getElementById('panel-csv-help').classList.add('d-none');
      document.getElementById('panel-consolidation').classList.remove('d-none');
      fetchRecentConsolidations();
      setTimeout(() => document.getElementById('scanConsolId').focus(), 100);
    } else if (tabId === 'csv') {
      document.getElementById('panel-inventory').classList.add('d-none');
      document.getElementById('panel-consolidation').classList.add('d-none');
      document.getElementById('panel-csv-help').classList.remove('d-none');
    } else {
      document.getElementById('panel-consolidation').classList.add('d-none');
      document.getElementById('panel-csv-help').classList.add('d-none');
      document.getElementById('panel-inventory').classList.remove('d-none');
      fetchInventory();
      if(tabId === 'single') setTimeout(() => document.getElementById('scanSingleId').focus(), 100);
      if(tabId === 'bulk') setTimeout(() => document.getElementById('scanBulkIds').focus(), 100);
    }

    activeTab = tabId;
  }

  // --- DYNAMIC DATA FETCHING ---
  function fetchInventory() {
    google.script.run
      .withSuccessHandler(function(data) {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if(!data || data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 30px;">No unbagged inventory found.</td></tr>';
          return;
        }
        data.forEach(function(pkg) {
          let tr = document.createElement('tr');
          tr.className = 'inventory-row';
          tr.onclick = function() { quickAddId(pkg.id); };
          tr.innerHTML = `
            <td style="font-family: 'Lexend'; font-weight: 500; color: var(--brand-accent);"><i class="bi bi-plus-circle me-1"></i> ${pkg.id}</td>
            <td>${pkg.dest}</td>
            <td><span class="status-badge">${pkg.status}</span></td>
          `;
          tbody.appendChild(tr);
        });
      })
      .withFailureHandler(function(error) {
        const tbody = document.getElementById('inventoryTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="3" style="text-align: center; color: #dc2626; padding: 30px;"><i class="bi bi-exclamation-triangle"></i> Error: ${error.message}</td></tr>`;
      })
      .getBranchInventory(sessionUser.branch, false); 
  }

  function fetchRecentConsolidations() {
    google.script.run
      .withSuccessHandler(function(data) {
        const tbody = document.getElementById('consolTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if(!data || data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; color: var(--text-muted); padding: 30px;">No recent master bags found.</td></tr>';
          return;
        }
        data.forEach(function(bag) {
          if(bag.id === "SYSTEM ERROR") return;
          let tr = document.createElement('tr');
          tr.className = 'inventory-row';
          tr.onclick = function() { quickAddId(bag.id); };
          tr.innerHTML = `
            <td style="font-family: 'Lexend'; font-weight: 500; color: var(--brand-accent);"><i class="bi bi-plus-circle me-1"></i> ${bag.id}</td>
            <td>${bag.destination}</td>
            <td style="font-weight: 600; font-size: 0.8rem; color: #059669;">${bag.weight} KG</td>
          `;
          tbody.appendChild(tr);
        });
      })
      .getRecentConsolidations(sessionUser.branch);
  }

  function quickAddId(id) {
    if (activeTab === 'single') {
      document.getElementById('scanSingleId').value = id;
    } else if (activeTab === 'bulk') {
      const box = document.getElementById('scanBulkIds');
      if (!box.value.includes(id)) {
        box.value = box.value ? box.value + ",\n" + id : id;
      }
    } else if (activeTab === 'consol') {
      document.getElementById('scanConsolId').value = id;
    }
  }

  // --- CSV UPLOAD LOGIC ---
  function previewCsvUpload() {
    const fileInput = document.getElementById('csvFileInput');
    const file = fileInput.files[0];
    const btn = document.getElementById('csvBtn');
    
    if (!file) return showAlert('warning', 'Please select a .CSV file to upload.');

    const reader = new FileReader();
    reader.onload = function(e) {
      const text = e.target.result;
      const rows = text.split('\n');
      pendingCsvRecords = [];

      for (let i = 0; i < rows.length; i++) {
        let cols = rows[i].split(',').map(c => c.trim());
        if (cols.length >= 3 && cols[0]) {
          if (i === 0 && (cols[0].toLowerCase().includes('booking') || cols[0].toLowerCase().includes('id'))) continue;

          pendingCsvRecords.push({
            id: cols[0],
            agent: cols[1],
            docket: cols[2]
          });
        }
      }

      if (pendingCsvRecords.length === 0) return showAlert('warning', 'Could not read any valid tracking data from the CSV file.');

      const tbody = document.getElementById('csvPreviewBody');
      tbody.innerHTML = '';
      pendingCsvRecords.forEach(r => {
        let tr = document.createElement('tr');
        tr.innerHTML = `<td>${r.id}</td><td>${r.agent}</td><td style="font-family: 'Lexend'; color: var(--brand-accent); font-weight:500;">${r.docket}</td>`;
        tbody.appendChild(tr);
      });

      document.getElementById('csvPreviewSection').classList.remove('d-none');
      document.getElementById('csvBtn').classList.add('d-none');
    };
    reader.readAsText(file);
  }

  function confirmCsvUpload() {
    const btn = document.getElementById('csvConfirmBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Syncing to Database...';

    google.script.run
      .withSuccessHandler(function(res) {
        if(res.success) {
          showAlert('success', res.message);
          document.getElementById('csvFileInput').value = '';
          document.getElementById('csvBtn').classList.remove('d-none');
          document.getElementById('csvPreviewSection').classList.add('d-none');
          pendingCsvRecords = [];
        } else {
          showAlert('danger', res.message);
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-cloud-arrow-up"></i> Confirm & Map Dockets';
      })
      .withFailureHandler(function(error) {
        showAlert('danger', 'System Error: ' + error.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-cloud-arrow-up"></i> Confirm & Map Dockets';
      })
      .processCsvForwardingUpload(pendingCsvRecords, sessionUser.name, sessionUser.branch);
  }

  // --- MANUAL API DIAGNOSTIC MODAL LOGIC ---
  function openSyncModal(summary, log) {
    document.getElementById('syncModalText').innerText = summary;
    const logBox = document.getElementById('syncModalLog');
    
    if (log) {
      logBox.innerText = log;
      logBox.classList.remove('d-none');
    } else {
      logBox.classList.add('d-none');
    }
    
    document.getElementById('syncModal').classList.add('active');
  }

  function closeSyncModal() {
    document.getElementById('syncModal').classList.remove('active');
  }

  function runApiSync() {
    const btn = document.getElementById('forceSyncBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Pinging External APIs...';
    
    const alertBox = document.getElementById('update-alert');
    if (alertBox) alertBox.classList.add('d-none');

    google.script.run
      .withSuccessHandler(function(res) {
        // Open the brand new Diagnostic Modal!
        openSyncModal(res.message, res.log);
        
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-lightning-charge"></i> Force API Sync Now';
        if (typeof fetchInventory === "function") fetchInventory(); 
      })
      .withFailureHandler(function(error) {
        openSyncModal('API Connection Error', error.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-lightning-charge"></i> Force API Sync Now';
      })
      .forceApiSync(sessionUser.name, sessionUser.branch);
  }

  // --- STANDARD UPDATE LOGIC ---
  function submitStatusUpdate() {
    const status = document.getElementById('scanStatus').value;
    const location = document.getElementById('scanLocation').value.trim();
    const remark = document.getElementById('scanRemark').value.trim();
    const customDate = document.getElementById('scanDate').value;
    
    let fwdAgent = "";
    let fwdDocket = "";
    
    if (activeTab === 'single') {
      fwdAgent = document.getElementById('fwdAgent').value.trim();
      fwdDocket = document.getElementById('fwdDocket').value.trim();
    }
    
    if (!status) return showAlert('warning', 'Please select a Status Milestone.');

    const commonArgs = [status, sessionUser.name, sessionUser.branch, location, remark, customDate, fwdAgent, fwdDocket];

    if (activeTab === 'single') {
      const singleId = document.getElementById('scanSingleId').value.trim();
      if (!singleId) return showAlert('warning', 'Please provide a Booking ID.');
      executeBackendCall('updateManualTrackingStatus', [singleId, ...commonArgs]);

    } else if (activeTab === 'bulk') {
      const rawIds = document.getElementById('scanBulkIds').value.trim();
      if (!rawIds) return showAlert('warning', 'Please provide at least one ID.');
      const bulkIds = rawIds.split(/[\n,]+/).map(id => id.trim()).filter(id => id !== '');
      executeBackendCall('updateBulkManualTrackingStatus', [bulkIds, ...commonArgs]);

    } else if (activeTab === 'consol') {
      const consolId = document.getElementById('scanConsolId').value.trim();
      if (!consolId) return showAlert('warning', 'Please provide a Master Consolidation ID.');
      executeBackendCall('updateConsolidationTrackingStatus', [consolId, ...commonArgs]);
    }
  }

  function executeBackendCall(functionName, argsArray) {
    const btn = document.getElementById('updateBtn');
    const alertBox = document.getElementById('update-alert');
    if (alertBox) alertBox.classList.add('d-none');
    
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Committing...';

    google.script.run
      .withSuccessHandler(function(res) {
        if(res.success) {
          showAlert('success', res.message);
          
          document.getElementById('scanSingleId').value = '';
          document.getElementById('scanBulkIds').value = '';
          document.getElementById('scanConsolId').value = '';
          document.getElementById('scanLocation').value = '';
          document.getElementById('scanDate').value = '';
          document.getElementById('scanRemark').value = ''; 
          document.getElementById('fwdAgent').value = ''; 
          document.getElementById('fwdDocket').value = ''; 
          
          document.getElementById('carrierSection').classList.remove('expanded');
          if(document.getElementById('carrierIcon')) document.getElementById('carrierIcon').className = 'bi bi-chevron-down';

          if (activeTab === 'consol') { fetchRecentConsolidations(); } else { fetchInventory(); }
        } else {
          showAlert('danger', res.message);
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2-circle"></i> Commit Record';
      })
      .withFailureHandler(function(error) {
        showAlert('danger', 'System Error: ' + error.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2-circle"></i> Commit Record';
      })
      [functionName](...argsArray); 
  }

  function showAlert(type, message) {
    const alertBox = document.getElementById('update-alert');
    if (!alertBox) return;
    alertBox.className = `alert alert-${type} custom-alert`;
    alertBox.innerHTML = message;
    alertBox.classList.remove('d-none');
    alertBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function returnToDashboard() { window.location.href = '/dashboard.html'; }
  function loadBookingForm() { window.location.href = '/booking.html'; }
  function loadTransfers() { window.location.href = '/transfers.html'; }
  function loadConsolidation() { window.location.href = '/consolidation.html'; }
  function loadAdminPanel() { window.location.href = '/adminpanel.html'; }
