/**
 * js/api-client.js
 * Unified API Client for Al-Farha Cargo System (Vercel / GitHub Hosted)
 * Bridges all frontend views (Desktop & Mobile PWA) to the Google Apps Script Web App API.
 */

const GOOGLE_API_URL = "https://script.google.com/macros/s/AKfycbwycWJw0iiCfF9ZFfj3rNpBsfiITySuJrvlSgmFW10aFBR1Qx0xwmTv30jRlZW83f-oSw/exec";
window.GOOGLE_API_URL = GOOGLE_API_URL;

const AFC_API = {
  endpoint: GOOGLE_API_URL,

  /**
   * Sends a POST request to the GAS Web App (with automatic fallback to /api/gas-proxy if needed).
   * @param {string} action - The backend action name.
   * @param {Object} payload - Additional key-value parameters.
   * @returns {Promise<Object>} Parsed JSON response.
   */
  async call(action, payload = {}) {
    const bodyStr = JSON.stringify({ action, ...payload });

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        redirect: 'follow',
        body: bodyStr
      });
      return await response.json();
    } catch (directError) {
      // Fallback to Vercel Serverless Proxy (/api/gas-proxy)
      const proxyRes = await fetch('/api/gas-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr
      });
      return await proxyRes.json();
    }
  },

  /**
   * Returns the current logged-in user object from localStorage.
   */
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('afc_user') || 'null');
    } catch (e) {
      return null;
    }
  },

  /**
   * Formats a date string or Date object into DD MMM YYYY.
   */
  formatDate(dateInput) {
    if (!dateInput) return 'N/A';
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return String(dateInput);
    const day = String(d.getDate()).padStart(2, '0');
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
  },

  /**
   * Maps raw order-details payload from api.alfarhaonline.com / api-direct.alfarhaonline.com
   * into the standardized Al-Farha Booking object used by both Desktop and Mobile forms.
   */
  mapExternalOrderToBooking(extData, scannedId, userBranch) {
    let rawType = String(extData.cargotype || "").trim().toUpperCase();
    let formattedCargoType = "Parcel";
    if (rawType === "D2D") formattedCargoType = "Parcel";
    else if (rawType === "MAIL" || rawType === "DOC" || rawType === "DOCUMENT") formattedCargoType = "Document";
    else if (rawType === "AIR") formattedCargoType = "Air Cargo";
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

    const resolvedOriginCity = branchMapping[userBranch] || userBranch || "Salalah";
    const fetchedWeight = extData.weight || extData.actual_weight || extData.act_weight || extData.total_weight || extData.chargeable_weight || "0";
    const fetchedPcs = extData.pcs || extData.pieces || extData.total_box || extData.total_boxes || "1";

    const rawDestCity = String(extData.receiver_district || extData.destination_city || "");
    const formattedDestCity = rawDestCity.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

    return {
      bookingID: String((extData.o_unique_id || scannedId || "").replace(/\s+/g, '')),
      shipper: extData.sender_name || "",
      shipperPhone: extData.sender_phone || "",
      consignee: extData.receiver_name || "",
      originCity: resolvedOriginCity,
      originCountry: extData.order_from || "Oman",
      destCity: formattedDestCity,
      destCountry: extData.receiver_country || "India",
      packageType: formattedCargoType,
      weight: String(fetchedWeight),
      pcs: String(fetchedPcs)
    };
  },

  /**
   * Fetches an order from Al-Farha Online (api-direct.alfarhaonline.com / alfarhaonline.com)
   * Tier 1: Vercel Serverless Proxy (/api/order-proxy?order_no=...)
   * Tier 2: GAS Backend fallback (action: "fetchExternalOrder" -> UrlFetchApp to api-direct.alfarhaonline.com)
   */
  async fetchAlfarhaOrder(orderNo, userBranch) {
    const cleanOrder = String(orderNo || "").trim().replace(/^'/, "");
    if (!cleanOrder) {
      return { success: false, message: "Please provide a valid Order / Booking ID." };
    }

    let apiResponse = null;

    // 1. Try Vercel Serverless Proxy (/api/order-proxy)
    try {
      const proxyRes = await fetch("/api/order-proxy?order_no=" + encodeURIComponent(cleanOrder), {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      if (proxyRes.ok) {
        apiResponse = await proxyRes.json();
      }
    } catch (proxyErr) {
      console.warn("Vercel /api/order-proxy unavailable, falling back to GAS fetchExternalOrder:", proxyErr);
    }

    // 2. Fallback to Google Apps Script `fetchExternalOrder` (hits api-direct.alfarhaonline.com)
    if (!apiResponse || apiResponse.response !== "success" || !apiResponse.data || apiResponse.data.length === 0) {
      try {
        const gasRes = await this.call("fetchExternalOrder", { orderNo: cleanOrder });
        if (gasRes && gasRes.success && gasRes.apiData) {
          apiResponse = gasRes.apiData;
        }
      } catch (gasErr) {
        console.error("GAS fetchExternalOrder fallback failed:", gasErr);
      }
    }

    if (apiResponse && apiResponse.response === "success" && Array.isArray(apiResponse.data) && apiResponse.data.length > 0) {
      const mapped = this.mapExternalOrderToBooking(apiResponse.data[0], cleanOrder, userBranch);
      return { success: true, booking: mapped, raw: apiResponse.data[0] };
    }

    return {
      success: false,
      message: "Order number " + cleanOrder + " not found in Al-Farha Online database."
    };
  }
};

window.AFC_API = AFC_API;

/**
 * Compatibility Bridge for `google.script.run`
 * Allows any migrated GAS view calling `google.script.run.withSuccessHandler(...).fn(...)`
 * to work transparently in a standard browser on Vercel/GitHub Pages.
 */
function createGasRunner(successHandler = null, failureHandler = null) {
  const invoke = async (action, payload, unwrapData = false) => {
    try {
      const res = await AFC_API.call(action, payload);
      if (unwrapData && res && res.success && 'data' in res) {
        if (successHandler) successHandler(res.data);
      } else {
        if (successHandler) successHandler(res);
      }
    } catch (err) {
      if (failureHandler) failureHandler(err);
      else console.error(`GAS API Error [${action}]:`, err);
    }
  };

  return {
    withSuccessHandler(fn) {
      return createGasRunner(fn, failureHandler);
    },
    withFailureHandler(fn) {
      return createGasRunner(successHandler, fn);
    },
    authenticateUser(userId, pin) {
      return invoke("authenticate", { userId, pin });
    },
    getDashboardSummary(branch, role) {
      return invoke("getDashboardSummary", { branch, role });
    },
    fetchCompleteTracking(searchQuery) {
      return invoke("fetchCompleteTracking", { searchQuery });
    },
    createNewBooking(formData, user, branch) {
      const bookingData = { ...formData, bookingID: "'" + String(formData.bookingID || "").replace(/^'/, "") };
      return invoke("createNewBooking", { bookingData, user, branch });
    },
    createBulkBookings(bookingsArray, user, branch) {
      const bulkData = (bookingsArray || []).map(b => ({
        Booking_ID: b.BookingID || b.Booking_ID || "",
        Shipper: b.Shipper || "",
        ShipperPhone: b.ShipperPhone || "",
        Consignee: b.Consignee || "",
        OriginCity: b.OriginCity || "",
        OriginCountry: b.OriginCountry || "",
        Dest_City: b.DestCity || b.Dest_City || "",
        DestCountry: b.DestCountry || "",
        PackageType: b.PackageType || "Parcel",
        Weight: b.Weight || 0,
        No_Of_Pcs: b.PCS || b.No_Of_Pcs || 1
      }));
      return invoke("createBulkBookings", { bulkData, user, branch });
    },
    getBranchInventory(branch, excludeConsolidated = false) {
      return invoke("getBranchInventory", { branch, excludeConsolidated }, true);
    },
    getBranchListForDropdown() {
      return invoke("getBranchListForDropdown", {}, true);
    },
    processBulkOutboundTransfer(bookingIds, destBranch, user, branch) {
      return invoke("processBulkOutboundTransfer", { bookingIds, destBranch, user, branch });
    },
    getRecentOutbounds(branch) {
      return invoke("getRecentOutbounds", { branch }, true);
    },
    getPendingInbounds(branch) {
      return invoke("getPendingInbounds", { branch }, true);
    },
    processBulkInboundReceive(bookingIds, user, branch) {
      return invoke("processBulkInboundReceive", { bookingIds, user, branch });
    },
    processInboundReceive(transferId, bookingId, user, branch) {
      return invoke("processInboundReceive", { transferId, bookingId, user, branch });
    },
    getPackageDetails(bookingId) {
      return invoke("getPackageDetails", { bookingId }, true);
    },
    createConsolidationRecord(masterAwb, childAwbs, destBranch, user, branch) {
      return invoke("createConsolidationRecord", { masterAwb, childAwbs, destBranch, user, branch });
    },
    getRecentConsolidations(branch) {
      return invoke("getRecentConsolidations", { branch }, true);
    },
    updateManualTrackingStatus(...args) {
      return invoke("updateManualTrackingStatus", { args });
    },
    updateBulkManualTrackingStatus(...args) {
      return invoke("updateBulkManualTrackingStatus", { args });
    },
    updateConsolidationTrackingStatus(...args) {
      return invoke("updateConsolidationTrackingStatus", { args });
    },
    processCsvForwardingUpload(records, user, branch) {
      return invoke("processCsvForwardingUpload", { records, user, branch });
    },
    forceApiSync(user, branch) {
      return invoke("forceApiSync", { user, branch });
    },
    getSystemUsers() {
      return invoke("getSystemUsers", {}, true);
    },
    saveSystemUser(userData) {
      return invoke("saveSystemUser", { userData });
    },
    getSystemBranches() {
      return invoke("getSystemBranches", {}, true);
    },
    saveSystemBranch(branchData) {
      return invoke("saveSystemBranch", { branchData });
    }
  };
}

window.google = window.google || {};
window.google.script = {
  get run() {
    return createGasRunner();
  }
};
