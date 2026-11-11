// ==========================================
// SYSTEM CONFIGURATION 
// ==========================================
const CONFIG = {
  USERS_SHEET: "Users",           
  BOOKINGS_SHEET: "Bookings",     
  TRACKING_LOG_SHEET: "Tracking_Log", 
  SUBSCRIPTIONS_SHEET: "Subscriptions",
  
  // Bookings Sheet Columns (0-Indexed)
  B_AWB: 0,           // Booking_ID
  B_SHIPPER: 2,       // Shipper
  B_CONSIGNEE: 3,     // Consignee
  B_ORIGIN: 4,        // Origin_City
  B_ORIGIN_COUNTRY: 5,// Origin_Country
  B_DEST: 6,          // Dest_City
  B_DEST_COUNTRY: 7,  // Dest_Country
  B_PKG_TYPE: 8,      // Package_Type
  B_WEIGHT: 9,        // Weight
  B_PCS: 10,          // No_Of_Pcs
  B_STATUS: 11,       // Current_Status
  B_SHIPPER_PH: 17,   // Shipper No

  // Tracking_Log Sheet Columns (0-Indexed)
  T_LOG_ID: 0,        // Log_ID
  T_AWB: 1,           // Booking_ID
  T_STATUS: 2,        // Status_Update
  T_DATE: 3,          // Timestamp
  T_USER: 4,          // Updated_By
  T_LOCATION: 5,      // Location
  T_REMARK: 6         // Remark
};

// ==========================================
// MAIN API ROUTER
// ==========================================
function doPost(e) {
  const MY_SECRET_API_KEY = "AFC_SEC_x9L4vQ2mP8kR7nH5wB3jC6yT1zF0dU"; 
  
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return respondError("No data received from Vercel.");
    }

    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;

    if (requestData.apiKey && requestData.apiKey !== MY_SECRET_API_KEY) {
      return respondError("Invalid API Key");
    }

    // 1. Intercept Tunneled Email Subscriptions
    if (requestData.searchQuery && String(requestData.searchQuery).trim().startsWith("SUBSCRIBE_EMAIL:")) {
      try {
        const subData = JSON.parse(String(requestData.searchQuery).trim().substring(16));
        return handleEmailSubscription(subData); // Executed via global scope in notifications.gs
      } catch (err) {
        return respondError("Failed to parse email subscription.");
      }
    }

    // 2. Route Core Actions
    switch (action) {
      case "authenticate":
        return respondJSON(handleLogin(requestData));
      
      case "getDashboardSummary":
        return respondJSON(handleDashboardSummary(requestData));
      
      case "fetchCompleteTracking":
        return respondJSON(handleSearchTracking(requestData));
      
      case "markNotificationRead":
        return respondJSON(handleMarkNotificationRead(requestData));
      
      case "createNewBooking":
        return respondJSON(handleCreateBooking(requestData));
      
      case "createBulkBookings":
        return respondJSON(handleBulkBookings(requestData));
      
      case "fetchExternalOrder":
        return respondJSON(handleFetchExternalOrder(requestData));
      
      case "getBranchInventory":
        return respondJSON(handleGetBranchInventory(requestData));
      
      case "updateManualTrackingStatus":
        return respondJSON(handleUpdateManualTrackingStatus(requestData.args));
      
      case "updateBulkManualTrackingStatus":
        return respondJSON(handleUpdateBulkManualTrackingStatus(requestData.args));
      
      case "updateConsolidationTrackingStatus":
        return respondJSON(handleUpdateConsolidationTrackingStatus(requestData.args));

      // --- NEW DESKTOP & ADMIN ROUTES FOR FULL VERCEL/GITHUB HOSTING ---
      case "getBranchListForDropdown":
        return respondJSON({ success: true, data: getBranchListForDropdown() });

      case "processOutboundTransfer":
        return respondJSON(processOutboundTransfer(
          requestData.bookingID,
          requestData.toBranch,
          requestData.user,
          requestData.branch
        ));

      case "processBulkOutboundTransfer":
        return respondJSON(processBulkOutboundTransfer(
          requestData.bookingIds || (requestData.args && requestData.args[0]) || [],
          requestData.destBranch || (requestData.args && requestData.args[1]) || "",
          requestData.user || (requestData.args && requestData.args[2]) || "",
          requestData.branch || (requestData.args && requestData.args[3]) || ""
        ));

      case "getPendingInbounds":
        return respondJSON({ success: true, data: getPendingInbounds(requestData.branch) });

      case "getRecentOutbounds":
        return respondJSON({ success: true, data: getRecentOutbounds(requestData.branch) });

      case "processInboundReceive":
        return respondJSON(processInboundReceive(
          requestData.transferId,
          requestData.bookingId,
          requestData.user,
          requestData.branch
        ));

      case "processBulkInboundReceive":
        return respondJSON(processBulkInboundReceive(
          requestData.bookingIds || [],
          requestData.user,
          requestData.branch
        ));

      case "getPackageDetails":
        return respondJSON({ success: true, data: getPackageDetails(requestData.bookingId) });

      case "createConsolidationRecord":
        return respondJSON(createConsolidationRecord(
          requestData.masterAwb,
          requestData.childAwbs || [],
          requestData.destBranch || "",
          requestData.user,
          requestData.branch
        ));

      case "getRecentConsolidations":
        return respondJSON({ success: true, data: getRecentConsolidations(requestData.branch) });

      case "getActiveConsolidations":
        return respondJSON({ success: true, data: getActiveConsolidations() });

      case "getMAWBDetails":
        return respondJSON({ success: true, data: getMAWBDetails(requestData.mawbId) });

      case "processCsvForwardingUpload":
        return respondJSON(processCsvForwardingUpload(
          requestData.records || [],
          requestData.user,
          requestData.branch
        ));

      case "forceApiSync":
        return respondJSON(forceApiSync(requestData.user, requestData.branch));

      case "getSystemUsers":
        return respondJSON({ success: true, data: getSystemUsers() });

      case "saveSystemUser":
        return respondJSON(saveSystemUser(requestData.userData));

      case "getSystemBranches":
        return respondJSON({ success: true, data: getSystemBranches() });

      case "saveSystemBranch":
        return respondJSON(saveSystemBranch(requestData.branchData));

      case "getAllBookings":
        return respondJSON({ success: true, data: getAllBookings() });

      case "updateBookingDetails":
        return respondJSON(updateBookingDetails(
          requestData.bookingID,
          requestData.updateData,
          requestData.user,
          requestData.branch
        ));

      
      default:
        // Handle normal tracking search as a fallback if searchQuery exists
        if (requestData.searchQuery) {
          return respondJSON(handleSearchTracking(requestData));
        }
        return respondError(`Unknown API Action requested: ${action}`);
    }
    
  } catch (error) {
    return respondJSON({
      success: false, 
      details: {}, 
      history: [], 
      message: `Backend Script Error: ${error.toString()}`
    });
  }
}

// ==========================================
// HELPERS
// ==========================================
function respondJSON(dataObject) { 
  return ContentService.createTextOutput(JSON.stringify(dataObject)).setMimeType(ContentService.MimeType.JSON); 
}

function respondError(message) { 
  return ContentService.createTextOutput(JSON.stringify({ success: false, message: message })).setMimeType(ContentService.MimeType.JSON); 
}

function isIdMatch(id1, id2) {
  const clean1 = String(id1).trim().replace(/^'/, "").toUpperCase();
  const clean2 = String(id2).trim().replace(/^'/, "").toUpperCase();
  
  if (clean1 === clean2) return true;
  if (!isNaN(clean1) && !isNaN(clean2) && clean1 !== "" && clean2 !== "") {
    return Number(clean1) === Number(clean2);
  }
  return false;
}

// ==========================================
// ACTION: FETCH SINGLE TRACKING 
// ==========================================
function handleSearchTracking(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bookingsSheet = ss.getSheetByName(CONFIG.BOOKINGS_SHEET);
  const trackingSheet = ss.getSheetByName(CONFIG.TRACKING_LOG_SHEET);
  
  if (!bookingsSheet || !trackingSheet) throw new Error("Missing database sheets.");

  const query = String(req.searchQuery).trim();
  let pkgDetails = null;
  const historyData = [];

  const bData = bookingsSheet.getDataRange().getValues();
  for (let i = 1; i < bData.length; i++) {
    const rowAwb = bData[i][CONFIG.B_AWB];
    if (isIdMatch(rowAwb, query)) {
      pkgDetails = {
        id: String(rowAwb).trim().replace(/^'/, ""),
        origin: bData[i][CONFIG.B_ORIGIN],
        originCountry: bData[i][CONFIG.B_ORIGIN_COUNTRY] || "OMN",
        originFlag: "🇴🇲",
        dest: bData[i][CONFIG.B_DEST],
        destCountry: bData[i][CONFIG.B_DEST_COUNTRY] || "IND",
        destFlag: "🇮🇳",
        status: bData[i][CONFIG.B_STATUS],
        shipper: bData[i][CONFIG.B_SHIPPER],
        consignee: bData[i][CONFIG.B_CONSIGNEE],
        pkgType: bData[i][CONFIG.B_PKG_TYPE],
        weight: bData[i][CONFIG.B_WEIGHT],
        pcs: bData[i][CONFIG.B_PCS],
        carrier: bData[i][15] || "",
        docket: bData[i][16] || "",
        bookingDate: "",
        edd: ""
      };
      break;
    }
  }

  if (!pkgDetails) return { success: false, message: `AWB ${query} not found.` };

  const tData = trackingSheet.getDataRange().getValues();
  for (let i = 1; i < tData.length; i++) {
    const rowLogAwb = tData[i][CONFIG.T_AWB];
    if (isIdMatch(rowLogAwb, query)) { 
      historyData.push({ 
        status: tData[i][CONFIG.T_STATUS], 
        date: tData[i][CONFIG.T_DATE] ? new Date(tData[i][CONFIG.T_DATE]).toISOString() : new Date().toISOString(), 
        location: tData[i][CONFIG.T_LOCATION] || "Hub", 
        remark: tData[i][CONFIG.T_REMARK] || "" 
      }); 
    }
  }

  historyData.reverse();
  return { success: true, details: pkgDetails, history: historyData };
}

// ==========================================
// ACTION: STATUS UPDATES
// ==========================================
function handleUpdateManualTrackingStatus(args) {
  const [bookingId, status, user, branch, location, _, customDate, fwdAgent, fwdDocket] = args;
  return processStatusUpdate([bookingId], status, user, branch, location, customDate, fwdAgent, fwdDocket);
}

function handleUpdateBulkManualTrackingStatus(args) {
  const [bulkIds, status, user, branch, location, _, customDate] = args;
  return processStatusUpdate(bulkIds, status, user, branch, location, customDate, "", "");
}

function handleUpdateConsolidationTrackingStatus(args) {
  const [consolId, status, user, branch, location, _, customDate] = args;
  return processStatusUpdate([consolId], status, user, branch, location, customDate, "", "");
}

function processStatusUpdate(idArray, status, user, branch, location, customDate, fwdAgent, fwdDocket) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bookSheet = ss.getSheetByName(CONFIG.BOOKINGS_SHEET);
  const trackSheet = ss.getSheetByName(CONFIG.TRACKING_LOG_SHEET);
  
  if (!bookSheet || !trackSheet) return { success: false, message: "Database sheets not found." };
  
  const bData = bookSheet.getDataRange().getValues();
  const headers = bData[0];
  let bkgIdIndex = headers.indexOf("Booking_ID");
  let statusIndex = headers.indexOf("Current_Status");
  const locIndex = headers.indexOf("Current_Location");
  
  if (bkgIdIndex === -1) bkgIdIndex = CONFIG.B_AWB;
  if (statusIndex === -1) statusIndex = CONFIG.B_STATUS;
  
  const timestamp = customDate ? new Date(customDate).toISOString() : new Date().toISOString();
  const actualLocation = location ? location : branch;
  
  let remark = "";
  if (fwdAgent && fwdDocket) {
    remark = `Carrier: ${fwdAgent} | Docket: ${fwdDocket}`;
  }

  let successCount = 0;
  const notFoundList = [];

  for (let j = 0; j < idArray.length; j++) {
    const targetId = String(idArray[j]).trim().replace(/^'/, "");
    if (!targetId) continue;
    
    let foundInBookings = false;
    
    for (let i = 1; i < bData.length; i++) {
      const sheetId = bData[i][bkgIdIndex];
      
      if (isIdMatch(sheetId, targetId)) {
        foundInBookings = true;
        
        bookSheet.getRange(i + 1, statusIndex + 1).setValue(status);
        if (locIndex !== -1) {
          bookSheet.getRange(i + 1, locIndex + 1).setValue(actualLocation);
        }
        
        if (fwdAgent) {
          bookSheet.getRange(i + 1, 16).setValue(fwdAgent);
        }
        if (fwdDocket) {
          bookSheet.getRange(i + 1, 17).setValue("'" + String(fwdDocket).replace(/^'/, ""));
        }
        
        break;
      }
    }
    
    if (!foundInBookings) {
      notFoundList.push(targetId);
      continue;
    }
    
    const logId = `LOG-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;
    trackSheet.appendRow([
      logId,           
      "'" + targetId,  
      status,          
      timestamp,       
      user,            
      actualLocation,  
      remark           
    ]);
    
    // TRIGGER NATIVE EMAIL ALERT HERE (Executed via global scope in notifications.gs)
    sendEmailAlerts(targetId, status, actualLocation);
    
    successCount++;
  }

  if (successCount === 0) {
    return { success: false, message: `Booking ID not found: ${notFoundList.join(', ')}` };
  }
  if (notFoundList.length > 0) {
    return { success: true, message: `Updated ${successCount}. Not found: ${notFoundList.join(', ')}` };
  }
  return { success: true, message: `Successfully updated ${successCount} record(s).` };
}

// ==========================================
// ACTION: LOGIN AUTHENTICATION
// ==========================================
function handleLogin(req) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.USERS_SHEET); 
  if (!sheet) throw new Error("Could not find the Users tab.");

  const data = sheet.getDataRange().getValues();
  const userIdInput = String(req.userId).trim();
  const pinInput = String(req.pin).trim();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const sheetId = String(row[0]).trim();      
    const sheetName = String(row[1]).trim();    
    const sheetPin = String(row[2]).trim();     
    const sheetRole = String(row[3]).trim();    
    const sheetBranch = String(row[4]).trim();  
    const sheetStatus = String(row[5]).trim();  
    
    if (sheetId === userIdInput && sheetPin === pinInput) {
      if (sheetStatus.toLowerCase() !== "active") {
        return { success: false, message: "This account is no longer active." };
      }
      return { 
        success: true, 
        user: { name: sheetName, branch: sheetBranch, role: sheetRole } 
      };
    }
  }
  return { success: false, message: "Invalid ID or PIN." };
}

// ==========================================
// ACTION: DASHBOARD SUMMARY
// ==========================================
function handleDashboardSummary(req) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.BOOKINGS_SHEET);
  if (!sheet) throw new Error("Could not find the Bookings tab.");

  const data = sheet.getDataRange().getValues();
  const userBranch = req.branch;
  const userRole = req.role;
  const isAdmin = (userRole === "Admin" || userRole === "Head Office" || userRole === "Super Admin" || userRole === "Branch Manager");

  const metrics = { totalBookings: 0, inTransit: 0, delivered: 0, exceptions: 0, pendingInbounds: 0, recentBookings: [], recentDelivered: [] };

  for (let i = data.length - 1; i > 0; i--) {
    const row = data[i];
    const awb = String(row[CONFIG.B_AWB]).trim().replace(/^'/, ""); 
    if (!awb) continue; 

    const origin = String(row[CONFIG.B_ORIGIN]).trim();
    const dest = String(row[CONFIG.B_DEST]).trim();
    const status = String(row[CONFIG.B_STATUS]).trim().toUpperCase();
    const notifStatus = String(row[18] || "").trim().toUpperCase(); 

    if (!isAdmin && origin !== userBranch && dest !== userBranch) continue;

    metrics.totalBookings++;
    
    if (status.includes("DELIVERED")) metrics.delivered++;
    else if (status.includes("RETURN") || status.includes("FAIL") || status.includes("HOLD") || status.includes("EXCEPTION")) metrics.exceptions++;
    else if (status.includes("TRANSIT") || status.includes("DISPATCHED") || status !== "PENDING") metrics.inTransit++;
    
    if (dest === userBranch && !status.includes("DELIVERED") && !status.includes("EXCEPTION")) { metrics.pendingInbounds++; }

    if (metrics.recentBookings.length < 15) { 
      metrics.recentBookings.push({ id: awb, destination: dest, status: row[CONFIG.B_STATUS] }); 
    }
    
    if (status.includes("DELIVERED") && notifStatus !== "READ" && metrics.recentDelivered.length < 10) { 
      metrics.recentDelivered.push({ id: awb, dest: dest, shipperName: String(row[CONFIG.B_SHIPPER] || "Customer"), shipperPhone: String(row[CONFIG.B_SHIPPER_PH] || "") }); 
    }
  }

  return { success: true, ...metrics };
}

// ==========================================
// ACTION: CREATE SINGLE BOOKING
// ==========================================
function handleCreateBooking(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const bookSheet = ss.getSheetByName(CONFIG.BOOKINGS_SHEET);
  const trackSheet = ss.getSheetByName(CONFIG.TRACKING_LOG_SHEET);
  
  if (!bookSheet) throw new Error("Could not find Bookings tab.");

  const b = req.bookingData;
  const safeBookingId = String(b.bookingID).trim().replace(/^'/, "");
  
  const newRow = new Array(21).fill("");

  newRow[CONFIG.B_AWB] = "'" + safeBookingId; 
  newRow[1] = new Date().toLocaleDateString('en-GB'); 
  newRow[CONFIG.B_SHIPPER] = b.shipper; 
  newRow[CONFIG.B_CONSIGNEE] = b.consignee; 
  newRow[CONFIG.B_ORIGIN] = b.originCity; 
  newRow[CONFIG.B_ORIGIN_COUNTRY] = b.originCountry; 
  newRow[CONFIG.B_DEST] = b.destCity; 
  newRow[CONFIG.B_DEST_COUNTRY] = b.destCountry; 
  newRow[CONFIG.B_PKG_TYPE] = b.packageType; 
  newRow[CONFIG.B_WEIGHT] = b.weight; 
  newRow[CONFIG.B_PCS] = b.pcs; 
  newRow[CONFIG.B_STATUS] = "Shipment Booked"; 
  newRow[12] = req.user; 
  newRow[13] = req.branch; 
  newRow[CONFIG.B_SHIPPER_PH] = b.shipperPhone;
  
  bookSheet.appendRow(newRow);

  if (trackSheet) { 
    const logId = `LOG-${new Date().getTime()}`; 
    trackSheet.appendRow([logId, "'" + safeBookingId, "Shipment Booked", new Date().toISOString(), req.user, req.branch, "Shipment created via Mobile App"]); 
  }
  
  return { success: true, message: "Booking created successfully." };
}

// ==========================================
// ACTION: BULK UPLOAD BOOKINGS
// ==========================================
function handleBulkBookings(req) {
  const bookSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.BOOKINGS_SHEET);
  if (!bookSheet) throw new Error("Could not find Bookings tab.");
  
  const bulkData = req.bulkData; 
  let successCount = 0;
  
  bulkData.forEach(row => {
    if (row.Booking_ID) { 
      const safeBookingId = String(row.Booking_ID).trim().replace(/^'/, "");
      const newRow = new Array(21).fill("");
      
      newRow[CONFIG.B_AWB] = "'" + safeBookingId; 
      newRow[1] = new Date().toLocaleDateString('en-GB'); 
      newRow[CONFIG.B_SHIPPER] = row.Shipper || ""; 
      newRow[CONFIG.B_CONSIGNEE] = row.Consignee || ""; 
      newRow[CONFIG.B_DEST] = row.Dest_City || ""; 
      newRow[CONFIG.B_WEIGHT] = row.Weight || ""; 
      newRow[CONFIG.B_PCS] = row.No_Of_Pcs || ""; 
      newRow[CONFIG.B_STATUS] = "Shipment Booked"; 
      newRow[12] = req.user; 
      newRow[13] = req.branch; 
      
      bookSheet.appendRow(newRow); 
      successCount++;
    }
  });
  
  return { success: true, message: `Successfully processed ${successCount} bookings.` };
}

// ==========================================
// ACTION: MARK DELIVERY NOTIFICATION AS READ
// ==========================================
function handleMarkNotificationRead(req) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); 
  const bookSheet = ss.getSheetByName(CONFIG.BOOKINGS_SHEET); 
  
  if (!bookSheet) return { success: false, message: "Sheet not found" };
  
  const data = bookSheet.getDataRange().getValues(); 
  const targetAwb = String(req.bookingID).trim();
  
  for (let i = 1; i < data.length; i++) {
    if (isIdMatch(data[i][0], targetAwb)) { 
      bookSheet.getRange(i + 1, 19).setValue("READ"); 
      return { success: true, message: "Notification synced to cloud." }; 
    }
  }
  
  return { success: false, message: "Booking not found." };
}

// ==========================================
// ACTION: FETCH EXTERNAL API DATA
// ==========================================
function handleFetchExternalOrder(req) {
  const orderNo = encodeURIComponent(String(req.orderNo).trim().replace(/^'/, ""));
  const url = `https://api-direct.alfarhaonline.com/api/order-details?order_no=${orderNo}`;
  const options = { 
    method: "post", 
    contentType: "application/json", 
    headers: { 
      "X-API-KEY": "R681hJQUTSXBqf6QHxLasBln2x0", 
      "User-Agent": "AlFarha-Scanner-App/1.0", 
      "Accept": "application/json" 
    }, 
    payload: "{}", 
    muteHttpExceptions: true 
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options); 
    const rawText = response.getContentText();
    try { 
      const result = JSON.parse(rawText); 
      return { success: true, apiData: result }; 
    } catch (parseError) { 
      return { success: false, message: "Invalid API Response." }; 
    }
  } catch (e) { 
    return { success: false, message: `Connection Error: ${e.toString()}` }; 
  }
}

// ==========================================
// ACTION: FETCH BRANCH INVENTORY 
// ==========================================
function handleGetBranchInventory(req) {
  try {
    const branchIdentifier = String(req.branch).trim(); 
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const branchSheet = ss.getSheetByName("Branches"); 
    
    if (!branchSheet) throw new Error("Could not find 'Branches' sheet.");
    
    const branchData = branchSheet.getDataRange().getValues(); 
    const branchHeaders = branchData[0];
    const idCol = branchHeaders.indexOf("Branch ID"); 
    const nameCol = branchHeaders.indexOf("Name"); 
    const typeCol = branchHeaders.indexOf("Branch Type");
    let isGlobalView = false; 
    
    for (let i = 1; i < branchData.length; i++) { 
      const bId = String(branchData[i][idCol]).trim(); 
      const bName = String(branchData[i][nameCol]).trim(); 
      
      if (bId === branchIdentifier || bName === branchIdentifier) { 
        const bType = String(branchData[i][typeCol]).trim(); 
        if (bType === "Head Quarters" || bType === "Warehouse/Hub") { 
          isGlobalView = true; 
        } 
        break; 
      } 
    }
    
    const bookingSheet = ss.getSheetByName("Bookings"); 
    if (!bookingSheet) throw new Error("Could not find 'Bookings' sheet.");
    
    const bookingData = bookingSheet.getDataRange().getValues(); 
    const bookingHeaders = bookingData[0];
    let bkgIdIndex = bookingHeaders.indexOf("Booking_ID"); 
    const destIndex = bookingHeaders.indexOf("Dest_City"); 
    const statusIndex = bookingHeaders.indexOf("Current_Status"); 
    const locationIndex = bookingHeaders.indexOf("Current_Location"); 
    
    if (bkgIdIndex === -1) bkgIdIndex = 0;
    
    const inventory = [];
    
    for (let j = 1; j < bookingData.length; j++) { 
      const row = bookingData[j]; 
      const rowStatus = String(row[statusIndex]).trim(); 
      const rowLocation = String(row[locationIndex]).trim(); 
      
      if (rowStatus !== "Delivered") { 
        if (isGlobalView || rowLocation === branchIdentifier || rowLocation.includes(branchIdentifier)) { 
          if (req.excludeConsolidated && rowStatus.toLowerCase().includes("consolidated")) continue;
          const cleanId = String(row[bkgIdIndex]).trim().replace(/^'/, "");
          const destCountryCol = bookingHeaders.indexOf("Dest_Country");
          const destCountryVal = destCountryCol !== -1 ? row[destCountryCol] : "";
          inventory.push({ 
            id: cleanId,
            bookingID: cleanId, 
            dest: (row[destIndex] || "Unknown") + (destCountryVal ? ", " + destCountryVal : ""),
            destCity: row[destIndex] || "Unknown", 
            status: rowStatus || "Pending" 
          }); 
        } 
      } 
    }
    
    return { success: true, data: inventory };
    
  } catch (error) { 
    return { success: false, message: error.message }; 
  }
}