/**
 * js/consolidation.js
 * Controller for consolidation.html (Migrated from GAS Consolidation.html)
 */

var sessionUser = JSON.parse(localStorage.getItem('afc_user'));

  // --- SETUP ---
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
      
      const scanInput = document.getElementById('masterAwb');
      if (scanInput) setTimeout(() => scanInput.focus(), 300);
      
      // Load Data
      fetchInventory();
      loadDestinations();
      fetchRecentConsolidations();
    }
  })();

  // --- LOAD LIVE INVENTORY ---
  function fetchInventory() {
    google.script.run
      .withSuccessHandler(function(data) {
        const tbody = document.getElementById('inventoryTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        // THE FIX: Check if data is null BEFORE checking its length!
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
      .getBranchInventory(sessionUser.branch, true); // The 'true' flag hides consolidated items!
  }

  // --- LOAD RECENT CONSOLIDATIONS ---
  function fetchRecentConsolidations() {
    google.script.run
      .withSuccessHandler(function(data) {
        const tbody = document.getElementById('recentConsolTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        // THE FIX: Check if data is null BEFORE checking its length!
        if(!data || data.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 30px;">No recent master bags created.</td></tr>';
          return;
        }
        
        data.forEach(function(bag) {
          let tr = document.createElement('tr');
          
          if (bag.id === "SYSTEM ERROR") {
             tr.innerHTML = `<td colspan="4" style="color: #dc2626; padding: 20px; font-weight: 500;"><i class="bi bi-exclamation-triangle-fill"></i> Backend Error: ${bag.destination}</td>`;
          } else {
            tr.innerHTML = `
              <td style="font-family: 'Lexend'; font-weight: 500;">${bag.id}</td>
              <td>${bag.destination}</td>
              <td>
                <span class="metric-pill"><i class="bi bi-box-seam"></i> ${bag.childCount} AWBs (${bag.pcs} PCS)</span>
                <span class="metric-pill weight"><i class="bi bi-speedometer2"></i> ${bag.weight} KG</span>
              </td>
              <td style="font-size: 0.85rem; color: var(--text-muted);">${bag.date}</td>
            `;
          }
          tbody.appendChild(tr);
        });
      })
      .withFailureHandler(function(error) {
        const tbody = document.getElementById('recentConsolTableBody');
        if (tbody) tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #dc2626; padding: 30px;"><i class="bi bi-exclamation-triangle"></i> Script Connection Error: ${error.message}</td></tr>`;
      })
      .getRecentConsolidations(sessionUser.branch);
  }

  // --- LOAD DESTINATION DROPDOWN ---
  function loadDestinations() {
    google.script.run
      .withSuccessHandler(function(branches) {
        const destSelect = document.getElementById('destinationBranch');
        if(!destSelect) return; 
        destSelect.innerHTML = '<option value="" selected>Routing destination...</option>';
        if(branches.length > 0) {
           branches.forEach(function(b) { destSelect.innerHTML += `<option value="${b}">${b}</option>`; });
        }
      })
      .getBranchListForDropdown();
  }

  // --- CLICK-TO-ADD MAGIC & COUNTER ---
  function quickAddId(id) {
    const box = document.getElementById('childAwbs');
    if (!box.value.includes(id)) {
      box.value = box.value ? box.value + ",\n" + id : id;
      updateCounter();
    }
  }

  function updateCounter() {
    const rawData = document.getElementById('childAwbs').value.trim();
    const count = rawData ? rawData.split(/[\n,]+/).map(id => id.trim()).filter(id => id !== '').length : 0;
    document.getElementById('childCounter').innerText = count;
  }

  // --- SUBMIT LOGIC ---
  function submitConsolidation() {
    const masterAwb = document.getElementById('masterAwb').value.trim();
    const rawChildIds = document.getElementById('childAwbs').value.trim();
    const dest = document.getElementById('destinationBranch').value;
    const alertBox = document.getElementById('consol-alert');
    const btn = document.getElementById('createBtn');

    if (!masterAwb) return showAlert('warning', 'Please provide a Master Consolidation ID.');
    if (!rawChildIds) return showAlert('warning', 'Please add at least one Child AWB.');

    const childIds = rawChildIds.split(/[\n,]+/).map(id => id.trim()).filter(id => id !== '');
    if (childIds.length === 0) return showAlert('warning', 'No valid tracking IDs found.');

    alertBox.classList.add('d-none');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...';

    google.script.run
      .withSuccessHandler(function(res) {
        if(res.success) {
          showAlert('success', res.message);
          
          document.getElementById('masterAwb').value = '';
          document.getElementById('childAwbs').value = '';
          document.getElementById('destinationBranch').value = '';
          updateCounter();
          
          // Refreshes both lists so UI represents reality instantly!
          fetchInventory(); 
          fetchRecentConsolidations();
        } else {
          showAlert('danger', res.message);
        }
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2-all"></i> Create Consolidation';
      })
      .withFailureHandler(function(error) {
        showAlert('danger', 'System Error: ' + error.message);
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check2-all"></i> Create Consolidation';
      })
      .createConsolidationRecord(masterAwb, childIds, dest, sessionUser.name, sessionUser.branch);
  }

  function showAlert(type, message) {
    const alertBox = document.getElementById('consol-alert');
    if (!alertBox) return;
    alertBox.className = `alert alert-${type} custom-alert`;
    alertBox.innerHTML = message;
    alertBox.classList.remove('d-none');
  }

  // --- ROUTING ---
  function returnToDashboard() { window.location.href = '/dashboard.html'; }
  function loadBookingForm() { window.location.href = '/booking.html'; }
  function loadTransfers() { window.location.href = '/transfers.html'; }
  function loadStatusUpdate() { window.location.href = '/statusupdate.html'; }
  function loadAdminPanel() { window.location.href = '/adminpanel.html'; }
