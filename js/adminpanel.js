/**
 * js/adminpanel.js
 * Controller for adminpanel.html (Migrated from GAS AdminPanel.html)
 */

var sessionUser = JSON.parse(localStorage.getItem('afc_user'));
  var allUsersData = [];
  var allBranchesData = [];

  (function setupSidebar() {
    if(sessionUser) {
      document.getElementById('navName').innerText = sessionUser.name;
      document.getElementById('navBranch').innerText = sessionUser.branch;
      
      if (sessionUser.role === 'Admin' || sessionUser.role === 'Head Office') {
        document.getElementById('nav-admin').classList.remove('d-none');
        document.getElementById('nav-consol').classList.remove('d-none');
      } else {
        returnToDashboard();
        return; 
      }

      loadUsers();
      loadBranches();
    }
  })();

  function toggleSidebar() { document.getElementById('sidebar').classList.toggle('collapsed'); document.getElementById('mainContent').classList.toggle('expanded'); }

  function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    document.querySelectorAll('.content-card').forEach(card => card.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
  }

  // --- USER LOGIC ---
  function loadUsers() {
    google.script.run
      .withSuccessHandler(function(data) {
        allUsersData = data;
        const tbody = document.getElementById('userTableBody');
        tbody.innerHTML = '';
        data.forEach(function(u, index) {
          let roleBadge = u.role === 'Admin' ? `<span class="badge-admin">Admin</span>` : `<span class="badge-role">${u.role}</span>`;
          
          // NEW: Render the active/inactive status badge
          let statusBadge = u.status === 'Inactive' ? `<span class="badge-inactive">Inactive</span>` : `<span class="badge-active">Active</span>`;
          
          let tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="font-family: 'Lexend'; font-weight: 500;">${u.id}</td>
            <td>${u.name}</td>
            <td>${roleBadge}</td>
            <td>${u.branch}</td>
            <td>${statusBadge}</td>
            <td style="text-align: right;"><button class="action-icon-btn" onclick="openUserModal(${index})" title="Edit User"><i class="bi bi-pencil-square"></i></button></td>
          `;
          tbody.appendChild(tr);
        });
      })
      .getSystemUsers();
  }

  function openUserModal(index = null) {
    document.getElementById('userAlert').classList.add('d-none');
    if (index !== null) {
      const u = allUsersData[index];
      document.getElementById('userModalTitle').innerText = "Edit User";
      document.getElementById('userRowId').value = u.rowId;
      document.getElementById('mUserId').value = u.id;
      document.getElementById('mUserName').value = u.name;
      document.getElementById('mUserPin').value = u.pin;
      document.getElementById('mUserRole').value = u.role;
      document.getElementById('mUserBranch').value = u.branch;
      document.getElementById('mUserStatus').value = u.status || 'Active'; // Load status
    } else {
      document.getElementById('userModalTitle').innerText = "Add New User";
      document.getElementById('userRowId').value = '';
      document.getElementById('mUserId').value = '';
      document.getElementById('mUserName').value = '';
      document.getElementById('mUserPin').value = '';
      document.getElementById('mUserRole').value = 'Branch Manager';
      document.getElementById('mUserBranch').value = '';
      document.getElementById('mUserStatus').value = 'Active'; // Default to active
    }
    document.getElementById('userModal').classList.add('active');
  }

  function saveUser() {
    const btn = document.getElementById('saveUserBtn'); const alertBox = document.getElementById('userAlert');
    const userData = {
      rowId: document.getElementById('userRowId').value,
      id: document.getElementById('mUserId').value.trim(),
      name: document.getElementById('mUserName').value.trim(),
      pin: document.getElementById('mUserPin').value.trim(),
      role: document.getElementById('mUserRole').value,
      branch: document.getElementById('mUserBranch').value.trim(),
      status: document.getElementById('mUserStatus').value // Capture status
    };
    if(!userData.id || !userData.name || !userData.pin) { alertBox.className = 'alert alert-danger custom-alert'; alertBox.innerText = "Please fill in all fields."; alertBox.classList.remove('d-none'); return; }
    btn.disabled = true; btn.innerHTML = 'Saving...';
    
    google.script.run
      .withSuccessHandler(function(res) {
        closeModal('userModal'); loadUsers(); btn.disabled = false; btn.innerHTML = '<i class="bi bi-save"></i> Save User';
      })
      .saveSystemUser(userData);
  }

  // --- BRANCH LOGIC ---
  function loadBranches() {
    google.script.run
      .withSuccessHandler(function(data) {
        allBranchesData = data;
        const tbody = document.getElementById('branchTableBody');
        tbody.innerHTML = '';
        
        const userBranchSelect = document.getElementById('mUserBranch');
        userBranchSelect.innerHTML = '<option value="" disabled selected>Select Branch...</option>';

        data.forEach(function(b, index) {
          let typeBadge = b.type === 'Head Quarters' ? `<span class="badge-hq"><i class="bi bi-star-fill me-1" style="font-size:0.7rem;"></i> HQ</span>` : `<span class="badge-role">Branch</span>`;
          let tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="font-family: 'Lexend'; font-weight: 500;">${b.code}</td>
            <td>${b.name}</td>
            <td>${typeBadge}</td>
            <td>${b.location}</td>
            <td style="text-align: right;"><button class="action-icon-btn" onclick="openBranchModal(${index})" title="Edit Branch"><i class="bi bi-pencil-square"></i></button></td>
          `;
          tbody.appendChild(tr);

          if (b.type !== 'Head Quarters') {
            userBranchSelect.innerHTML += `<option value="${b.name}">${b.name}</option>`;
          }
        });
      })
      .getSystemBranches();
  }

  function openBranchModal(index = null) {
    document.getElementById('branchAlert').classList.add('d-none');
    if (index !== null) {
      const b = allBranchesData[index];
      document.getElementById('branchModalTitle').innerText = "Edit Branch";
      document.getElementById('branchRowId').value = b.rowId;
      document.getElementById('mBranchCode').value = b.code;
      document.getElementById('mBranchName').value = b.name;
      document.getElementById('mBranchType').value = b.type || 'Branch';
      document.getElementById('mBranchLoc').value = b.location;
    } else {
      document.getElementById('branchModalTitle').innerText = "Add New Branch";
      document.getElementById('branchRowId').value = '';
      document.getElementById('mBranchCode').value = '';
      document.getElementById('mBranchName').value = '';
      document.getElementById('mBranchType').value = 'Branch';
      document.getElementById('mBranchLoc').value = '';
    }
    document.getElementById('branchModal').classList.add('active');
  }

  function saveBranch() {
    const btn = document.getElementById('saveBranchBtn'); const alertBox = document.getElementById('branchAlert');
    const branchData = {
      rowId: document.getElementById('branchRowId').value,
      code: document.getElementById('mBranchCode').value.trim(),
      name: document.getElementById('mBranchName').value.trim(),
      type: document.getElementById('mBranchType').value,
      location: document.getElementById('mBranchLoc').value.trim()
    };
    if(!branchData.code || !branchData.name) { alertBox.className = 'alert alert-danger custom-alert'; alertBox.innerText = "Code and Name are required."; alertBox.classList.remove('d-none'); return; }
    btn.disabled = true; btn.innerHTML = 'Saving...';
    
    google.script.run
      .withSuccessHandler(function(res) {
        closeModal('branchModal'); loadBranches(); btn.disabled = false; btn.innerHTML = '<i class="bi bi-save"></i> Save Branch';
      })
      .saveSystemBranch(branchData);
  }

  function closeModal(modalId) { document.getElementById(modalId).classList.remove('active'); }
  function returnToDashboard() { window.location.href = '/dashboard.html'; }
  function loadBookingForm() { window.location.href = '/booking.html'; }
  function loadTransfers() { window.location.href = '/transfers.html'; }
  function loadConsolidationPanel() { window.location.href = '/consolidation.html'; }
