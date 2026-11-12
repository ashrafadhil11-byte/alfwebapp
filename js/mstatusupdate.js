/**
 * js/mstatusupdate.js
 * Mobile Scan & Milestone Update Controller
 */

var sessionUser = JSON.parse(localStorage.getItem('afc_user') || '{"name":"Field User","branch":"Salalah"}');
var activeTab = 'single';

document.addEventListener("DOMContentLoaded", function () {
  if (typeof initNavigation === 'function') {
    initNavigation('StatusUpdate');
  }
  const branchEl = document.getElementById('inventoryBranchName');
  if (branchEl) branchEl.innerText = sessionUser.branch;
  loadInventory();
});

function showAlert(type, message) {
  const alertBox = document.getElementById('booking-alert');
  alertBox.className = 'custom-alert alert-' + type;
  var icon = type === 'success' ? 'check-circle-fill' : (type === 'info' ? 'info-circle-fill' : 'exclamation-triangle-fill');
  alertBox.innerHTML = `<i class="bi bi-${icon}" style="font-size: 1.2rem;"></i> <span>${message}</span>`;
  alertBox.style.display = 'flex';
  document.querySelector('.main-scroll-area').scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => alertBox.style.display = 'none', 4500);
}

function switchTab(tabId, btnElement) {
  document.querySelectorAll('.seg-btn').forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');

  document.querySelectorAll('.inv-list-item.selected').forEach(el => el.classList.remove('selected'));
  activeTab = tabId;

  if (tabId === 'bulk') {
    showAlert('info', 'Tap multiple items below to add them to your bulk list.');
  }
}

function handleInventoryClick(element, bookingId) {
  if (activeTab === 'bulk') {
    element.classList.toggle('selected');
    updateBulkTextarea();
  } else {
    let targetInput = null;
    if (activeTab === 'single') targetInput = 'scanSingleId';
    else if (activeTab === 'consol') targetInput = 'scanConsolId';
    else if (activeTab === 'carrier') targetInput = 'carrierId';

    if (targetInput) {
      document.getElementById(targetInput).value = bookingId;
      showAlert('success', `Selected ${bookingId}`);
      document.querySelectorAll('.inv-list-item.selected').forEach(el => el.classList.remove('selected'));
      element.classList.add('selected');
      document.querySelector('.main-scroll-area').scrollTo({ top: 0, behavior: 'smooth' });
    }
  }
}

function updateBulkTextarea() {
  const selectedItems = document.querySelectorAll('.inv-list-item.selected');
  const ids = Array.from(selectedItems).map(item => item.dataset.id);
  document.getElementById('scanBulkIds').value = ids.join(',\n');
}

function triggerScanner(targetInputId, isContinuous = false) {
  if (typeof openScanner === 'function') {
    openScanner('input', function (decodedText) {
      const trimmedCode = decodedText.replace(/\s+/g, '');
      const inputField = document.getElementById(targetInputId);

      if (isContinuous) {
        inputField.value = inputField.value ? inputField.value + ",\n" + trimmedCode : trimmedCode;
      } else {
        inputField.value = trimmedCode;
      }

      if (navigator.vibrate) navigator.vibrate(100);
      showAlert('success', 'Barcode scanned successfully.');
    });
  } else {
    showAlert('danger', 'Scanner module failed to load. Check scanner.js');
  }
}

async function submitStatusUpdate() {
  const status = document.getElementById('scanStatus').value;
  const location = document.getElementById('scanLocation').value.trim();
  const customDate = document.getElementById('scanDate').value;

  if (!status) return showAlert('danger', 'Please select a New Status Milestone.');

  let actionName = '';
  let payloadArgs = [];

  if (activeTab === 'single') {
    let singleId = document.getElementById('scanSingleId').value.trim();
    if (!singleId) return showAlert('danger', 'Please enter a Booking ID.');
    actionName = 'updateManualTrackingStatus';
    payloadArgs = [String(singleId), status, sessionUser.name, sessionUser.branch, location, "", customDate, "", ""];
  } else if (activeTab === 'bulk') {
    const rawIds = document.getElementById('scanBulkIds').value.trim();
    const bulkIds = rawIds.split(/[\n,]+/).map(id => id.trim()).filter(id => id !== '');
    if (bulkIds.length === 0) return showAlert('danger', 'Please provide at least one Booking ID.');
    actionName = 'updateBulkManualTrackingStatus';
    payloadArgs = [bulkIds, status, sessionUser.name, sessionUser.branch, location, "", customDate, "", ""];
  } else if (activeTab === 'consol') {
    let consolId = document.getElementById('scanConsolId').value.trim();
    if (!consolId) return showAlert('danger', 'Please enter a Master Consolidation ID.');
    actionName = 'updateConsolidationTrackingStatus';
    payloadArgs = [String(consolId), status, sessionUser.name, sessionUser.branch, location, "", customDate, "", ""];
  } else if (activeTab === 'carrier') {
    let carrierId = document.getElementById('carrierId').value.trim();
    let fwdAgent = document.getElementById('fwdAgent').value.trim();
    let fwdDocket = document.getElementById('fwdDocket').value.trim();

    if (!carrierId) return showAlert('danger', 'Please enter the Booking or Master ID.');
    if (!fwdAgent || !fwdDocket) return showAlert('danger', 'Please provide both Forwarding Agent and Docket Number.');

    actionName = 'updateManualTrackingStatus';
    payloadArgs = [String(carrierId), status, sessionUser.name, sessionUser.branch, location, "", customDate, fwdAgent, fwdDocket];
  }

  await executeBackendApiCall(actionName, payloadArgs);
}

async function executeBackendApiCall(functionName, argsArray) {
  const btn = document.getElementById('updateBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-arrow-repeat" style="animation: spin 1s linear infinite;"></i> <span>Committing...</span>';

  try {
    const result = await AFC_API.call(functionName, { args: argsArray });

    if (result.success) {
      showAlert('success', result.message || 'Update logged successfully!');
      document.getElementById('scanSingleId').value = '';
      document.getElementById('scanBulkIds').value = '';
      document.getElementById('scanConsolId').value = '';
      document.getElementById('carrierId').value = '';
      document.getElementById('fwdDocket').value = '';
      document.getElementById('scanStatus').value = '';
      loadInventory();
    } else {
      showAlert('danger', result.message || 'Failed to update status.');
    }
  } catch (err) {
    showAlert('danger', 'Network Connection Error. Please try again.');
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill"></i> <span>Commit Record</span>';
  }
}

async function loadInventory() {
  const loadingUI = document.getElementById('inventoryLoading');
  const emptyUI = document.getElementById('inventoryEmpty');
  const listUI = document.getElementById('inventoryList');

  loadingUI.classList.remove('d-none');
  emptyUI.classList.add('d-none');
  listUI.classList.add('d-none');
  listUI.innerHTML = '';

  try {
    const res = await AFC_API.call('getBranchInventory', { branch: sessionUser.branch });

    if (!res.success) {
      throw new Error(res.message || "Backend inventory function not found");
    }

    const inventoryData = res.data || [];
    loadingUI.classList.add('d-none');

    if (inventoryData.length === 0) {
      emptyUI.classList.remove('d-none');
    } else {
      inventoryData.forEach(item => {
        const id = item.bookingID || item.id || "Unknown ID";
        const dest = item.destCity || item.dest || item.destination || "N/A";
        const status = item.status || "Pending";

        listUI.innerHTML += `
          <div class="inv-list-item" data-id="${id}" onclick="handleInventoryClick(this, '${id}')">
            <div>
              <div class="inv-id">${id}</div>
              <div class="inv-details"><i class="bi bi-geo-alt"></i> To: ${dest}</div>
            </div>
            <div class="inv-status-badge">${status}</div>
          </div>
        `;
      });
      listUI.classList.remove('d-none');
    }
  } catch (error) {
    loadingUI.innerHTML = `<i class="bi bi-info-circle" style="font-size: 2rem; color: var(--text-muted); display: block; margin-bottom: 10px;"></i><p style="margin: 0;">Please configure <b>getBranchInventory</b> in Google Apps Script.</p>`;
  }
}
