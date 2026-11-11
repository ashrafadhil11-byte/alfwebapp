/**
 * js/mobilebooking.js
 * Mobile Booking & Rapid Barcode Scanner Controller
 */

var sessionUser = JSON.parse(localStorage.getItem('afc_user') || 'null');
if (!sessionUser) { window.location.href = '/login.html'; }

var tempFetchedData = null;
var currentSavedBooking = null;

function switchTab(tabId, btnElement) {
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  btnElement.classList.add('active');
  document.querySelectorAll('.content-card').forEach(card => card.classList.remove('active'));
  document.getElementById('tab-' + tabId).classList.add('active');
  document.getElementById('booking-alert').style.display = 'none';
}

function showAlert(type, message) {
  const alertBox = document.getElementById('booking-alert');
  alertBox.className = 'custom-alert alert-' + type;
  var icon = type === 'success' ? 'check-circle-fill' : 'exclamation-triangle-fill';
  alertBox.innerHTML = `<i class="bi bi-${icon}"></i> ` + message;
  alertBox.style.display = 'flex';

  document.querySelector('.main-scroll-area').scrollTo({ top: 0, behavior: 'smooth' });
  setTimeout(() => alertBox.style.display = 'none', 4000);
}

function closeTicketModal(e) {
  if (e === 'force' || (e && e.target.id === 'fetchedTicketModal')) {
    document.getElementById('fetchedTicketModal').classList.remove('active');
    resetFetchState();
  }
}

function closeSuccessModal(e) {
  if (e === 'force' || (e && e.target.id === 'successModalOverlay')) {
    document.getElementById('successModalOverlay').classList.remove('active');
    currentSavedBooking = null;
  }
}

function showSuccessModal(bookingData) {
  currentSavedBooking = bookingData;
  document.getElementById('successTrackingId').innerText = bookingData.bookingID;
  document.getElementById('successModalOverlay').classList.add('active');
}

function notifyCustomerWhatsApp() {
  if (!currentSavedBooking || !currentSavedBooking.shipperPhone) {
    showAlert('danger', 'No phone number available to notify.');
    return;
  }

  let phone = currentSavedBooking.shipperPhone.replace(/[-\s]/g, '');
  let shipperName = currentSavedBooking.shipper || 'Customer';
  let destCity = currentSavedBooking.destCity || 'your destination';

  let textMessage = `Hello ${shipperName},\n\nYour booking with *Al-Farha Cargo* has been successfully confirmed!\n\n📦 *Tracking ID:* ${currentSavedBooking.bookingID}\n📍 *Destination:* ${destCity}\n⚖️ *Weight:* ${currentSavedBooking.weight || 'N/A'} KG\n\nThank you for choosing Al-Farha Cargo! Have a great day.`;
  window.open(`https://wa.me/${phone}?text=${encodeURIComponent(textMessage)}`, '_blank');
}

function resetFetchState() {
  tempFetchedData = null;
  document.getElementById('scanLoadingState').classList.add('d-none');
  document.getElementById('scanHeroState').classList.remove('d-none');

  const btn = document.getElementById('submitFetchedBtn');
  btn.disabled = false;
  btn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill"></i> Confirm & Save';
}

function triggerBookingScan(mode) {
  openScanner(mode, function (decodedText, returnedMode) {
    if (returnedMode === 'input') {
      const trimmedCode = decodedText.replace(/\s+/g, '');
      const inputField = document.getElementById('bookingID');
      inputField.value = trimmedCode;
      inputField.focus();
      showAlert('success', 'Barcode scanned successfully.');
    } else if (returnedMode === 'fetch') {
      triggerApiFetch(decodedText);
    }
  });
}

async function submitBooking() {
  const btn = document.getElementById('submitBtn');
  const customId = String(document.getElementById('bookingID').value.trim());
  if (!customId) return showAlert('danger', 'Please enter a Booking ID.');

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

  const payloadData = { ...formData, bookingID: "'" + formData.bookingID };

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-arrow-repeat" style="animation: spin 1s linear infinite;"></i> Processing...';

  try {
    const res = await AFC_API.call("createNewBooking", {
      bookingData: payloadData,
      user: sessionUser.name,
      branch: sessionUser.branch
    });

    btn.disabled = false;
    btn.innerHTML = 'Submit Booking <i class="bi bi-arrow-right"></i>';

    if (res.success) {
      clearSingleForm();
      showSuccessModal(formData);
    } else {
      showAlert('danger', res.message || "Failed to save booking.");
    }
  } catch (error) {
    btn.disabled = false;
    btn.innerHTML = 'Submit Booking <i class="bi bi-arrow-right"></i>';
    showAlert('danger', 'Network connection error.');
  }
}

function clearSingleForm() {
  ['bookingID', 'shipper', 'shipperPhone', 'consignee', 'originCity', 'originCountry', 'destCity', 'destCountry', 'weight', 'pcs'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('packageType').value = 'Parcel';
}

function triggerManualFetch() {
  const manualId = document.getElementById('manualFetchInput').value.trim();
  if (!manualId) {
    return showAlert('danger', 'Please enter a Booking ID to search.');
  }
  document.getElementById('manualFetchInput').value = '';
  triggerApiFetch(manualId);
}

async function triggerApiFetch(scannedId) {
  document.getElementById('scanHeroState').classList.add('d-none');
  document.getElementById('scanLoadingState').classList.remove('d-none');
  document.getElementById('fetchingIdTxt').innerText = scannedId;

  try {
    const result = await AFC_API.fetchAlfarhaOrder(scannedId, sessionUser ? sessionUser.branch : 'Salalah');
    if (result.success && result.booking) {
      tempFetchedData = result.booking;

      document.getElementById('fpId').innerText = tempFetchedData.bookingID;
      document.getElementById('fpOriginCity').innerText = tempFetchedData.originCity;
      document.getElementById('fpOriginCountry').innerText = tempFetchedData.originCountry.toUpperCase();
      document.getElementById('fpDestCity').innerText = tempFetchedData.destCity || "N/A";
      document.getElementById('fpDestCountry').innerText = tempFetchedData.destCountry.toUpperCase();

      document.getElementById('fpCargoType').innerText = tempFetchedData.packageType;
      document.getElementById('fpWeight').innerText = `${tempFetchedData.weight} KG / ${tempFetchedData.pcs} PCS`;

      document.getElementById('fpShipper').innerText = tempFetchedData.shipper || "N/A";
      document.getElementById('fpShipperPhone').innerText = tempFetchedData.shipperPhone || "N/A";
      document.getElementById('fpConsignee').innerText = tempFetchedData.consignee || "N/A";

      document.getElementById('scanLoadingState').classList.add('d-none');
      document.getElementById('scanHeroState').classList.remove('d-none');
      document.getElementById('fetchedTicketModal').classList.add('active');
    } else {
      resetFetchState();
      showAlert('danger', result.message || "Error: Order number not found in database.");
    }
  } catch (error) {
    resetFetchState();
    showAlert('danger', "Connection Error: Failed to reach the server.");
    console.error(error);
  }
}

async function _legacyTriggerApiFetchUnused(scannedId) {
  try {
    const orderNo = encodeURIComponent(scannedId.trim());
    const targetUrl = "/api/order-proxy?order_no=" + orderNo;

    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) throw new Error("Vercel Proxy rejected the request.");

    const apiResponse = await response.json();

    if (apiResponse && apiResponse.response === "success" && apiResponse.data && apiResponse.data.length > 0) {
      const extData = apiResponse.data[0];

      let rawType = (extData.cargotype || "").trim().toUpperCase();
      let formattedCargoType = "Parcel";
      if (rawType === "D2D") formattedCargoType = "Parcel";
      else if (rawType === "MAIL") formattedCargoType = "Document";
      else if (rawType === "AIR") formattedCargoType = "Air Freight";
      else if (rawType === "SEA") formattedCargoType = "Sea Freight";
      else if (rawType !== "") formattedCargoType = extData.cargotype;

      const branchMapping = {
        "ALFHQ": "Salalah",
        "Al-Farha Head Office": "Salalah",
        "ALFSLL": "Salalah",
        "Al-Farha Cargo Salalah": "Salalah",
        "ALFSNY": "Sannayya",
        "Al-Farha Cargo Sannayya": "Sannayya",
        "ALFTMT": "Thumraith",
        "Al-Farha Cargo Thumraith": "Thumraith",
        "ALFDQM": "Duqm",
        "Al-Farha Cargo Duqm": "Duqm",
        "ALFWR-SLL": "Sannayya",
        "Al-Farha Warehouse": "Sannayya"
      };

      let resolvedOriginCity = branchMapping[sessionUser.branch] || sessionUser.branch || "Unknown City";
      const fetchedWeight = extData.weight || extData.actual_weight || extData.act_weight || extData.total_weight || extData.chargeable_weight || "0";
      const fetchedPcs = extData.pcs || extData.pieces || extData.total_box || extData.total_boxes || "1";

      let rawDestCity = extData.receiver_district || "";
      let formattedDestCity = rawDestCity.toLowerCase().replace(/\b\w/g, function (char) {
        return char.toUpperCase();
      });

      tempFetchedData = {
        bookingID: String((extData.o_unique_id || scannedId).replace(/\s+/g, '')),
        shipper: extData.sender_name || "",
        shipperPhone: extData.sender_phone || "",
        consignee: extData.receiver_name || "",
        originCity: resolvedOriginCity,
        originCountry: extData.order_from || "Oman",
        destCity: formattedDestCity,
        destCountry: extData.receiver_country || "Nepal",
        packageType: formattedCargoType,
        weight: fetchedWeight,
        pcs: fetchedPcs
      };

      document.getElementById('fpId').innerText = tempFetchedData.bookingID;
      document.getElementById('fpOriginCity').innerText = tempFetchedData.originCity;
      document.getElementById('fpOriginCountry').innerText = tempFetchedData.originCountry.toUpperCase();
      document.getElementById('fpDestCity').innerText = tempFetchedData.destCity || "N/A";
      document.getElementById('fpDestCountry').innerText = tempFetchedData.destCountry.toUpperCase();
      document.getElementById('fpCargoType').innerText = tempFetchedData.packageType;
      document.getElementById('fpWeight').innerText = `${tempFetchedData.weight} KG / ${tempFetchedData.pcs} PCS`;
      document.getElementById('fpShipper').innerText = tempFetchedData.shipper || "N/A";
      document.getElementById('fpShipperPhone').innerText = tempFetchedData.shipperPhone || "N/A";
      document.getElementById('fpConsignee').innerText = tempFetchedData.consignee || "N/A";

      document.getElementById('scanLoadingState').classList.add('d-none');
      document.getElementById('scanHeroState').classList.remove('d-none');
      document.getElementById('fetchedTicketModal').classList.add('active');
    } else {
      resetFetchState();
      showAlert('danger', "Error: Order number not found in database.");
    }
  } catch (error) {
    resetFetchState();
    showAlert('danger', "Connection Error: Failed to reach the server.");
    console.error(error);
  }
}

function editFetchedData() {
  if (!tempFetchedData) return;

  document.getElementById('bookingID').value = tempFetchedData.bookingID || '';
  document.getElementById('packageType').value = tempFetchedData.packageType || 'Parcel';
  document.getElementById('shipper').value = tempFetchedData.shipper || '';
  document.getElementById('shipperPhone').value = tempFetchedData.shipperPhone || '';
  document.getElementById('consignee').value = tempFetchedData.consignee || '';
  document.getElementById('originCity').value = tempFetchedData.originCity || '';
  document.getElementById('originCountry').value = tempFetchedData.originCountry || '';
  document.getElementById('destCity').value = tempFetchedData.destCity || '';
  document.getElementById('destCountry').value = tempFetchedData.destCountry || '';
  document.getElementById('weight').value = tempFetchedData.weight || '';
  document.getElementById('pcs').value = tempFetchedData.pcs || '';

  closeTicketModal('force');
  switchTab('single', document.getElementById('tabBtnSingle'));
  showAlert('success', 'Data transferred. You can now edit the details.');
}

async function submitFetchedBooking() {
  const btn = document.getElementById('submitFetchedBtn');
  if (!tempFetchedData) return;

  const payloadData = { ...tempFetchedData, bookingID: "'" + tempFetchedData.bookingID };

  btn.disabled = true;
  btn.innerHTML = '<i class="bi bi-arrow-repeat" style="animation: spin 1s linear infinite;"></i> Saving...';

  try {
    const res = await AFC_API.call("createNewBooking", {
      bookingData: payloadData,
      user: sessionUser.name,
      branch: sessionUser.branch
    });

    if (res.success) {
      closeTicketModal('force');
      showSuccessModal(tempFetchedData);
    } else {
      showAlert('danger', res.message || "Failed to save.");
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill"></i> Confirm & Save';
    }
  } catch (error) {
    showAlert('danger', 'Network connection error.');
    btn.disabled = false;
    btn.innerHTML = '<i class="bi bi-cloud-arrow-up-fill"></i> Confirm & Save';
  }
}
