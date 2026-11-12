/**
 * js/booking.js
 * Controller for booking.html (Migrated from GAS BookingForm.html)
 */

var sessionUser = JSON.parse(localStorage.getItem('afc_user'));
  var parsedBulkData = []; 

  (function setupSidebar() {
    if(sessionUser) {
      document.getElementById('navName').innerText = sessionUser.name;
      document.getElementById('navBranch').innerText = sessionUser.branch;
      if (sessionUser.role === 'Admin' || sessionUser.role === 'Head Office') {
        document.getElementById('nav-admin').classList.remove('d-none');
        document.getElementById('nav-consol').classList.remove('d-none');
      }
    }
  })();

  function toggleSidebar() { 
    document.getElementById('sidebar').classList.toggle('collapsed'); 
    document.getElementById('mainContent').classList.toggle('expanded'); 
  }

  function switchTab(tabId, btnElement) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');
    document.querySelectorAll('.content-card').forEach(card => card.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    document.getElementById('booking-alert').style.display = 'none';
  }

  function showSuccessPopup(message) { 
    document.getElementById('successPopupMessage').innerText = message; 
    document.getElementById('successPopup').classList.add('active'); 
  }
  
  function closeSuccessPopup() { 
    document.getElementById('successPopup').classList.remove('active'); 
  }
  
  function showErrorAlert(message) { 
    const alertBox = document.getElementById('booking-alert'); 
    alertBox.className = 'custom-alert alert-danger'; 
    alertBox.innerHTML = `<i class="bi bi-exclamation-triangle-fill"></i> ` + message; 
    alertBox.style.display = 'flex'; 
  }

  // --- SINGLE BOOKING LOGIC ---
  function submitBooking() {
    const btn = document.getElementById('submitBtn'); 
    document.getElementById('booking-alert').style.display = 'none';
    
    const customId = document.getElementById('bookingID').value.trim();
    if (!customId) { showErrorAlert('Please enter a Booking ID.'); return; }

    const formData = {
      bookingID: customId, 
      shipper: document.getElementById('shipper').value.trim(), 
      shipperPhone: document.getElementById('shipperPhone').value.trim(), 
      consignee: document.getElementById('consignee').value.trim(),
      originCity: document.getElementById('originCity').value.trim(), 
      originCountry: document.getElementById('originCountry').value.trim(),
      destCity: document.getElementById('destCity').value.trim(), 
      destCountry: document.getElementById('destCountry').value.trim(),
      packageType: document.getElementById('packageType').value, 
      weight: document.getElementById('weight').value, 
      pcs: document.getElementById('pcs').value
    };

    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="margin-right:8px;"></span> Processing...';

    google.script.run
      .withSuccessHandler(function(response) {
        if(response.success) { 
          showSuccessPopup("Package " + customId + " has been successfully added to the system."); 
          clearSingleForm(); 
        } else { 
          showErrorAlert(response.message); 
        }
        btn.disabled = false; 
        btn.innerHTML = 'Submit Booking <i class="bi bi-arrow-right"></i>';
      })
      .withFailureHandler(function(error) { 
        showErrorAlert('Error: ' + error.message); 
        btn.disabled = false; 
        btn.innerHTML = 'Submit Booking <i class="bi bi-arrow-right"></i>'; 
      })
      .createNewBooking(formData, sessionUser.name, sessionUser.branch);
  }

  function clearSingleForm() {
    document.getElementById('bookingID').value = ''; 
    document.getElementById('shipper').value = ''; 
    document.getElementById('shipperPhone').value = ''; 
    document.getElementById('consignee').value = '';
    document.getElementById('originCity').value = ''; 
    document.getElementById('originCountry').value = ''; 
    document.getElementById('destCity').value = '';
    document.getElementById('destCountry').value = ''; 
    document.getElementById('weight').value = ''; 
    document.getElementById('pcs').value = ''; 
    document.getElementById('packageType').value = 'Parcel';
  }

  // --- BULK UPLOAD LOGIC ---
  function downloadTemplate() {
    const csvContent = "data:text/csv;charset=utf-8,BookingID,PackageType,Weight,PCS,Shipper,ShipperPhone,Consignee,OriginCity,OriginCountry,DestCity,DestCountry\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "AlFarha_Bulk_Booking_Template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleFileUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: function(results) {
        parsedBulkData = results.data;
        if(parsedBulkData.length === 0) {
          showErrorAlert("The uploaded CSV file is empty.");
          return;
        }
        
        const tbody = document.getElementById('previewTableBody');
        tbody.innerHTML = '';
        
        let previewLimit = Math.min(parsedBulkData.length, 100);
        
        for(let i = 0; i < previewLimit; i++) {
          let row = parsedBulkData[i];
          let tr = document.createElement('tr');
          tr.innerHTML = `
            <td style="font-weight: 600; color: var(--brand-accent);">${row.BookingID || '-'}</td>
            <td>${row.Shipper || '-'}</td>
            <td style="color: var(--text-muted);">${row.ShipperPhone || 'N/A'}</td>
            <td>${row.Consignee || '-'}</td>
            <td>${row.DestCity || '-'}, ${row.DestCountry || '-'}</td>
          `;
          tbody.appendChild(tr);
        }

        if (parsedBulkData.length > 100) {
          tbody.innerHTML += `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); font-style: italic;">...and ${parsedBulkData.length - 100} more rows.</td></tr>`;
        }

        document.getElementById('previewContainer').classList.remove('d-none');
        document.getElementById('bulkActionContainer').classList.remove('d-none');
        document.getElementById('bulkCount').innerText = parsedBulkData.length;
      },
      error: function(err) {
        showErrorAlert("Error parsing CSV: " + err.message);
      }
    });
  }

  function submitBulkBookings() {
    const btn = document.getElementById('submitBulkBtn');
    document.getElementById('booking-alert').style.display = 'none';

    if (parsedBulkData.length === 0) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true" style="margin-right:8px;"></span> Processing Upload...';

    google.script.run
      .withSuccessHandler(function(response) {
        if(response.success) {
          showSuccessPopup(response.message);
          resetBulkUpload();
        } else {
          showErrorAlert(response.message);
        }
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-rocket-takeoff"></i> Process <span id="bulkCount" style="margin:0 4px;">${parsedBulkData.length}</span> Bookings`;
      })
      .withFailureHandler(function(error) {
        showErrorAlert('Backend Error: ' + error.message);
        btn.disabled = false;
        btn.innerHTML = `<i class="bi bi-rocket-takeoff"></i> Process <span id="bulkCount" style="margin:0 4px;">${parsedBulkData.length}</span> Bookings`;
      })
      .createBulkBookings(parsedBulkData, sessionUser.name, sessionUser.branch);
  }

  function resetBulkUpload() {
    document.getElementById('csvFileInput').value = '';
    parsedBulkData = [];
    document.getElementById('previewContainer').classList.add('d-none');
    document.getElementById('bulkActionContainer').classList.add('d-none');
  }

  function returnToDashboard() { window.location.href = '/dashboard.html'; }
  function loadTransfers() { window.location.href = '/transfers.html'; }
  function loadAdminPanel() { window.location.href = '/adminpanel.html'; }
  function loadConsolidationPanel() { window.location.href = '/consolidation.html'; }


  // --- AL-FARHA ONLINE API INTEGRATION (DESKTOP) ---
  var desktopFetchedOrder = null;

  async function fetchAndFillSingleForm() {
    const input = document.getElementById('quickOnlineOrderInput');
    const btn = document.getElementById('quickFetchBtn');
    const orderNo = (input && input.value.trim()) || document.getElementById('bookingID').value.trim();

    if (!orderNo) {
      showErrorAlert('Please enter an Order / Booking ID to fetch from Al-Farha Online.');
      return;
    }

    document.getElementById('booking-alert').style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Fetching...';

    try {
      const res = await AFC_API.fetchAlfarhaOrder(orderNo, sessionUser ? sessionUser.branch : 'Salalah');
      if (res.success && res.booking) {
        const b = res.booking;
        document.getElementById('bookingID').value = b.bookingID || '';
        document.getElementById('packageType').value = b.packageType || 'Parcel';
        document.getElementById('weight').value = b.weight || '';
        document.getElementById('pcs').value = b.pcs || '';
        document.getElementById('shipper').value = b.shipper || '';
        document.getElementById('shipperPhone').value = b.shipperPhone || '';
        document.getElementById('consignee').value = b.consignee || '';
        document.getElementById('originCity').value = b.originCity || '';
        document.getElementById('originCountry').value = b.originCountry || '';
        document.getElementById('destCity').value = b.destCity || '';
        document.getElementById('destCountry').value = b.destCountry || '';
        if (input) input.value = '';
      } else {
        showErrorAlert(res.message || 'Order not found in Al-Farha Online.');
      }
    } catch (err) {
      showErrorAlert('Connection Error: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-cloud-arrow-down-fill"></i> Fetch API';
    }
  }

  function triggerDesktopBarcodeScan() {
    if (typeof openScanner === 'function') {
      openScanner('fetch', function(decodedText) {
        const clean = decodedText.replace(/\s+/g, '');
        document.getElementById('desktopFetchInput').value = clean;
        triggerDesktopApiFetch();
      });
    } else {
      showErrorAlert('Camera scanner library not loaded.');
    }
  }

  async function triggerDesktopApiFetch() {
    const input = document.getElementById('desktopFetchInput');
    const btn = document.getElementById('desktopFetchBtn');
    const preview = document.getElementById('desktopFetchPreview');
    const orderNo = input.value.trim();

    if (!orderNo) {
      showErrorAlert('Please enter or scan an Order ID to fetch.');
      return;
    }

    document.getElementById('booking-alert').style.display = 'none';
    preview.classList.add('d-none');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Querying API...';

    try {
      const res = await AFC_API.fetchAlfarhaOrder(orderNo, sessionUser ? sessionUser.branch : 'Salalah');
      if (res.success && res.booking) {
        desktopFetchedOrder = res.booking;
        document.getElementById('dfpId').innerText = desktopFetchedOrder.bookingID;
        document.getElementById('dfpOrigin').innerText = `${desktopFetchedOrder.originCity}, ${desktopFetchedOrder.originCountry}`;
        document.getElementById('dfpDest').innerText = `${desktopFetchedOrder.destCity || 'N/A'}, ${desktopFetchedOrder.destCountry}`;
        document.getElementById('dfpSpecs').innerText = `${desktopFetchedOrder.packageType} • ${desktopFetchedOrder.weight} KG / ${desktopFetchedOrder.pcs} PCS`;
        document.getElementById('dfpShipper').innerText = desktopFetchedOrder.shipper || 'N/A';
        document.getElementById('dfpPhone').innerText = desktopFetchedOrder.shipperPhone || 'N/A';
        document.getElementById('dfpConsignee').innerText = desktopFetchedOrder.consignee || 'N/A';
        preview.classList.remove('d-none');
      } else {
        showErrorAlert(res.message || 'Order number not found in Al-Farha Online database.');
      }
    } catch (err) {
      showErrorAlert('Failed to reach Al-Farha Online API: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-search"></i> Fetch Order Details';
    }
  }

  function transferFetchedToSingleForm() {
    if (!desktopFetchedOrder) return;
    document.getElementById('bookingID').value = desktopFetchedOrder.bookingID || '';
    document.getElementById('packageType').value = desktopFetchedOrder.packageType || 'Parcel';
    document.getElementById('weight').value = desktopFetchedOrder.weight || '';
    document.getElementById('pcs').value = desktopFetchedOrder.pcs || '';
    document.getElementById('shipper').value = desktopFetchedOrder.shipper || '';
    document.getElementById('shipperPhone').value = desktopFetchedOrder.shipperPhone || '';
    document.getElementById('consignee').value = desktopFetchedOrder.consignee || '';
    document.getElementById('originCity').value = desktopFetchedOrder.originCity || '';
    document.getElementById('originCountry').value = desktopFetchedOrder.originCountry || '';
    document.getElementById('destCity').value = desktopFetchedOrder.destCity || '';
    document.getElementById('destCountry').value = desktopFetchedOrder.destCountry || '';
    switchTab('single', document.getElementById('tabBtnSingle'));
  }

  function submitDesktopFetchedBooking() {
    if (!desktopFetchedOrder) return;
    const btn = document.getElementById('dfpSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Saving...';

    google.script.run
      .withSuccessHandler(function(response) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill"></i> Confirm & Save to Sheet';
        if (response.success) {
          showSuccessPopup("Package " + desktopFetchedOrder.bookingID + " fetched from Al-Farha Online and saved to the system.");
          document.getElementById('desktopFetchPreview').classList.add('d-none');
          document.getElementById('desktopFetchInput').value = '';
          desktopFetchedOrder = null;
        } else {
          showErrorAlert(response.message || 'Failed to save booking.');
        }
      })
      .withFailureHandler(function(error) {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill"></i> Confirm & Save to Sheet';
        showErrorAlert('Error: ' + error.message);
      })
      .createNewBooking(desktopFetchedOrder, sessionUser.name, sessionUser.branch);
  }
