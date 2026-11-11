/**
 * HELPER: Forces text into Proper Title Case (e.g., "JOHN DOE" -> "John Doe").
 * Smartly protects specific country acronyms.
 */
function toProperCase(text) {
  if (!text || text === 'N/A') return text;
  
  let cleanText = String(text).trim();
  
  // Force specific logistics acronyms to always be uppercase
  const acronyms = ["UAE", "USA", "UK", "KSA", "GCC"];
  if (acronyms.includes(cleanText.toUpperCase())) {
    return cleanText.toUpperCase();
  }
  
  // Convert to standard Title Case
  return cleanText.toLowerCase().replace(/\b\w/g, function(char) {
    return char.toUpperCase();
  });
}

/**
 * Adds a new booking and simultaneously logs the initial status.
 * SMART UPDATE: Automatically formats all text into controlled capital cases.
 */
function createNewBooking(formData, currentUser, currentBranch) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const bookingsSheet = ss.getSheetByName('Bookings');
    const logSheet = ss.getSheetByName('Tracking_Log');
    
    // 1. Force ID to UPPERCASE and armor it
    const rawBookingID = String(formData.bookingID).trim().toUpperCase(); 
    const safeBookingID = "'" + rawBookingID; 
    
    // 2. Bulletproof Duplicate Check
    const existingData = bookingsSheet.getRange("A:A").getValues().flat();
    let isDuplicate = false;
    
    for (let i = 0; i < existingData.length; i++) {
      let sheetId = typeof existingData[i] === 'number' 
        ? existingData[i].toLocaleString('fullwide', {useGrouping:false}) 
        : String(existingData[i]);
        
      if (sheetId.replace(/^'/, "").trim().toUpperCase() === rawBookingID) {
        isDuplicate = true;
        break;
      }
    }
    
    if (isDuplicate) {
      return { success: false, message: "Error: Booking ID " + rawBookingID + " already exists in the system." };
    }
    
    const timestamp = new Date();
    const initialStatus = "Booking Created";

    // 3. Append to Bookings Sheet with PROPER CASE formatting
    bookingsSheet.appendRow([
      safeBookingID,                           // Col A: Booking ID
      timestamp,                               // Col B: Date
      toProperCase(formData.shipper),          // Col C: Shipper (Proper Case)
      toProperCase(formData.consignee),        // Col D: Consignee (Proper Case)
      toProperCase(formData.originCity),       // Col E: Origin City (Proper Case)
      toProperCase(formData.originCountry),    // Col F: Origin Country (Proper Case)
      toProperCase(formData.destCity),         // Col G: Dest City (Proper Case)
      toProperCase(formData.destCountry),      // Col H: Dest Country (Proper Case)
      toProperCase(formData.packageType),      // Col I: Type
      formData.weight,                         // Col J: Weight
      formData.pcs,                            // Col K: Pcs
      initialStatus,                           // Col L: Status
      currentUser,                             // Col M: Created By User
      currentBranch,                           // Col N: Booking Branch
      currentBranch,                           // Col O: Current Location
      "",                                      // Col P: Fwd Agent
      "",                                      // Col Q: Fwd Docket
      "'" + String(formData.shipperPhone).trim() // Col R: Shipper Phone
    ]);

    // 4. Append to Tracking_Log Sheet
    const logLastRow = logSheet.getLastRow();
    let logID = 1;
    if (logLastRow > 1) {
      let prevLogVal = logSheet.getRange(logLastRow, 1).getValue();
      logID = (parseInt(prevLogVal) || 0) + 1;
    }
    
    logSheet.appendRow([
      logID, 
      safeBookingID, 
      initialStatus, 
      timestamp, 
      currentUser, 
      currentBranch,
      "Initial Booking Entry" 
    ]);

    return { success: true, newBookingId: rawBookingID };
    
  } catch (error) {
    return { success: false, message: "Backend Crash: " + error.message };
  }
}

/**
 * Processes a bulk array of bookings from a CSV upload.
 * SMART UPDATE: Applies the exact same strict capitalization rules to bulk uploads.
 */
function createBulkBookings(bookingsArray, userName, branchName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName('Bookings');
    const timestamp = new Date();
    const initialStatus = "Booking Created";
    
    const existingData = sheet.getRange("A:A").getValues().flat();
    let existingIds = new Set();
    
    for (let i = 0; i < existingData.length; i++) {
       let cleanId = String(existingData[i]).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
       if (cleanId) existingIds.add(cleanId);
    }
    
    let rowsToAppend = [];
    let processedCount = 0;
    let duplicateCount = 0;
    
    for (let i = 0; i < bookingsArray.length; i++) {
      let b = bookingsArray[i];
      
      if (!b.BookingID) continue; 
      
      // Force Bulk Booking IDs to UPPERCASE
      let rawBookingID = String(b.BookingID).trim().toUpperCase();
      let cleanCheckId = rawBookingID.replace(/[^a-zA-Z0-9]/g, "");
      let safeBookingID = "'" + rawBookingID; 
      
      if (existingIds.has(cleanCheckId)) {
        duplicateCount++;
        continue; 
      }
      
      existingIds.add(cleanCheckId);
      
      let phoneNum = b.ShipperPhone ? "'" + String(b.ShipperPhone).trim() : "N/A";

      // Append bulk row with PROPER CASE formatting applied to all string columns
      rowsToAppend.push([
        safeBookingID,                           // Col A: Booking ID
        timestamp,                               // Col B: Date
        toProperCase(b.Shipper || 'N/A'),        // Col C: Shipper
        toProperCase(b.Consignee || 'N/A'),      // Col D: Consignee
        toProperCase(b.OriginCity || ''),        // Col E: Origin City
        toProperCase(b.OriginCountry || ''),     // Col F: Origin Country
        toProperCase(b.DestCity || ''),          // Col G: Dest City
        toProperCase(b.DestCountry || ''),       // Col H: Dest Country
        toProperCase(b.PackageType || 'Parcel'), // Col I: Type
        b.Weight || 0,                           // Col J: Weight
        b.PCS || 1,                              // Col K: Pcs
        initialStatus,                           // Col L: Status
        userName,                                // Col M: Created By User
        branchName,                              // Col N: Booking Branch
        branchName,                              // Col O: Current Location
        "",                                      // Col P: Fwd Agent placeholder
        "",                                      // Col Q: Fwd Docket placeholder
        phoneNum                                 // Col R: Shipper Phone
      ]);
      
      logTrackingEvent(rawBookingID, initialStatus, userName, "", "Bulk CSV Upload", branchName);
      processedCount++;
    }
    
    if (rowsToAppend.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
      
      let msg = `Successfully processed ${processedCount} packages!`;
      if (duplicateCount > 0) msg += ` (Skipped ${duplicateCount} duplicates).`;
      
      return { success: true, message: msg };
    } else {
      if (duplicateCount > 0) {
        return { success: false, message: `Upload failed: All ${duplicateCount} packages already exist in the system.` };
      }
      return { success: false, message: "No valid data found in the CSV." };
    }
    
  } catch (error) {
    return { success: false, message: "Backend Crash: " + error.message };
  }
}

/**
 * Verifies user credentials against the Users sheet.
 * @param {String} userId - The inputted User ID.
 * @param {String} pin - The inputted Password/PIN.
 */
function authenticateUser(userId, pin) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const usersSheet = ss.getSheetByName('Users');
  
  // Get all data from the Users sheet
  const data = usersSheet.getDataRange().getValues();
  
  // Loop through the rows (starting at index 1 to skip the header row)
  for (let i = 1; i < data.length; i++) {
    const sheetUserId = data[i][0]; // Column A
    const sheetName = data[i][1];   // Column B
    const sheetPin = data[i][2];    // Column C
    const sheetRole = data[i][3];   // Column D
    const sheetBranch = data[i][4]; // Column E
    const sheetStatus = data[i][5]; // Column F
    
    // Check if ID and PIN match
    if (sheetUserId == userId && sheetPin == pin) {
      if (sheetStatus !== 'Active') {
        return { success: false, message: 'Your account is inactive. Contact Admin.' };
      }
      
      // Success! Return the user's details to the frontend
      return {
        success: true,
        user: {
          id: sheetUserId,
          name: sheetName,
          role: sheetRole,
          branch: sheetBranch
        }
      };
    }
  }
  
  // If the loop finishes without finding a match
  return { success: false, message: 'Invalid User ID or Password.' };
}
/**
 * Processes an outbound transfer from one branch to another.
 * UPGRADE: Preserves zeros, maps user to Col H, and uses Smart Logger!
 */
function processOutboundTransfer(bookingID, toBranch, currentUser, currentBranch) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const transfersSheet = ss.getSheetByName('Transfers');
    const bookingsSheet = ss.getSheetByName('Bookings');
    
    if (!transfersSheet || !bookingsSheet) return { success: false, message: "System Error: Missing sheets." };
    
    const timestamp = new Date();
    const statusUpdate = "In Transit to " + toBranch;
    
    // 1. Armor the Booking ID to protect the leading zeros
    const rawBookingID = String(bookingID).trim();
    const safeBookingID = "'" + rawBookingID.replace(/^'/, "");
    
    // 2. Generate Transfer ID
    const tLastRow = transfersSheet.getLastRow();
    const transferID = tLastRow === 1 ? "TRN-1000" : "TRN-" + (parseInt(transfersSheet.getRange(tLastRow, 1).getValue().toString().split('-')[1]) + 1);
    
    // 3. Log in Transfers Sheet (PERFECT COLUMN MAPPING)
    transfersSheet.appendRow([
      transferID,      // Col A: Transfer_ID
      safeBookingID,   // Col B: Booking_ID (Zero Protected)
      currentBranch,   // Col C: From_Branch
      toBranch,        // Col D: To_Branch
      timestamp,       // Col E: Outbound_Date
      "",              // Col F: Inbound_Date (Left blank for now!)
      "Pending",       // Col G: Transfer_Status
      currentUser      // Col H: Transferred_By
    ]);
    
    // 4. Update Bookings Sheet (High-Speed Batch Update & ID Scrubber)
    let bData = bookingsSheet.getDataRange().getValues();
    let bFound = false;
    let cleanSearchId = rawBookingID.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    let originalBookingId = rawBookingID;

    for (let i = 1; i < bData.length; i++) {
      let cleanSheetId = String(bData[i][0]).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if (cleanSheetId === cleanSearchId) {
        
        originalBookingId = bData[i][0]; // Grab the original ID to pass to the logger
        bData[i][11] = statusUpdate;     // Col L (Index 11): Status
        
        // Ensure row is wide enough, then update Current Location
        while(bData[i].length <= 14) bData[i].push("");
        bData[i][14] = "In Transit";     // Col O (Index 14): Current Location
        
        bFound = true;
        break;
      }
    }
    
    if (bFound) bookingsSheet.getDataRange().setValues(bData);
    
    // 5. Update Tracking Log via Smart Logger
    // (bookingId, status, updatedBy, providedLocation, remark, currentBranch)
    logTrackingEvent(originalBookingId, statusUpdate, currentUser, "", `Transferred to ${toBranch}`, currentBranch);
    
    return { success: true };
  } catch (error) {
    return { success: false, message: "Backend Crash: " + error.message };
  }
}

/**
 * Gets a list of incoming packages for a specific branch.
 * UPGRADE: Cleans the IDs before sending to the frontend so they don't appear blank!
 */
function getPendingInbounds(branchName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const transfersSheet = ss.getSheetByName('Transfers');
  
  if (!transfersSheet) return []; 
  
  const data = transfersSheet.getDataRange().getValues();
  let pending = [];
  
  for (let i = 1; i < data.length; i++) {
    // Check if Destination is this branch AND Status is Pending
    if (data[i][3] === branchName && data[i][6] === "Pending") {
      
      let rawDate = data[i][4];
      let dateString = rawDate instanceof Date ? rawDate.toLocaleDateString() : rawDate;

      pending.push({
        // The magic eraser: Safely strips the hidden apostrophe so the frontend can read it!
        transferId: String(data[i][0]).replace(/^'/, "").trim(),
        bookingId: String(data[i][1]).replace(/^'/, "").trim(),
        fromBranch: data[i][2],
        dateSent: dateString 
      });
    }
  }
  return pending;
}

/**
 * Processes the receipt of an inbound transfer.
 * UPGRADE: Stamps the actual arrival date into Column F and uses ID Scrubber!
 */
function processInboundReceive(transferId, bookingId, userName, branchName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const transferSheet = ss.getSheetByName('Transfers');
  const bookingSheet = ss.getSheetByName('Bookings');
  if (!transferSheet || !bookingSheet) return { success: false, message: "System Error: Missing sheets." };

  // 1. Scrub the search IDs so they are purely letters and numbers
  let cleanSearchTransferId = String(transferId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  let cleanSearchBookingId = String(bookingId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  let tData = transferSheet.getDataRange().getValues();
  let tFound = false;
  
  for (let i = 1; i < tData.length; i++) {
    let cleanSheetTransferId = String(tData[i][0]).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleanSheetTransferId === cleanSearchTransferId) {
      
      // THE FIX: Record the exact Arrival Time in Column F (Index 5)
      tData[i][5] = new Date();     
      tData[i][6] = "Received";     // Update Status in Column G
      
      tFound = true;
      break;
    }
  }

  let bData = bookingSheet.getDataRange().getValues();
  let bFound = false;
  let originalBookingId = bookingId; 
  
  for (let i = 1; i < bData.length; i++) {
    let cleanSheetBookingId = String(bData[i][0]).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    if (cleanSheetBookingId === cleanSearchBookingId) {
      bData[i][11] = "Received at Destination Hub"; 
      
      // Save the original ID (with apostrophe) so we can pass it to the logger perfectly
      originalBookingId = bData[i][0];
      
      // Ensure the row has enough columns, then write to Current Location (Column O / Index 14)
      while(bData[i].length <= 14) bData[i].push("");
      bData[i][14] = branchName; 
      
      bFound = true;
      break;
    }
  }

  if (tFound && bFound) {
    transferSheet.getDataRange().setValues(tData);
    bookingSheet.getDataRange().setValues(bData);
    
    // 2. Call the Smart Logger to record the exact location and remark!
    logTrackingEvent(originalBookingId, "Received at Destination Hub", userName, "", "Inbound Transfer Received", branchName);
    
    return { success: true, message: `Package ${cleanSearchBookingId} received successfully.` };
  } else {
    return { success: false, message: "Could not locate the transfer or booking record. Please verify the ID." };
  }
}
/**
 * Retrieves all bookings for the Head Office / Admin panel.
 */
function getAllBookings() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bookingsSheet = ss.getSheetByName('Bookings');
  
  // Get all data, excluding the header row
  const data = bookingsSheet.getDataRange().getValues();
  const headers = data.shift(); // Remove row 1 (headers)
  
  // Return the data to the frontend
  return data;
}
/**
 * Processes a bulk array of inbound receipts.
 * UPGRADE: High-speed batch processing, respects leading zeros, updates both databases.
 */
function processBulkInboundReceive(bookingIdsArray, userName, branchName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const transferSheet = ss.getSheetByName('Transfers');
    const bookingSheet = ss.getSheetByName('Bookings');
    if (!transferSheet || !bookingSheet) return { success: false, message: "System Error: Missing sheets." };

    // 1. Scrub the incoming IDs so we can match them flawlessly
    let cleanSearchIds = bookingIdsArray.map(id => String(id).replace(/[^a-zA-Z0-9]/g, "").toUpperCase());
    if (cleanSearchIds.length === 0) return { success: false, message: "No valid IDs provided." };

    let tData = transferSheet.getDataRange().getValues();
    let transferMatches = 0;
    
    // 2. Update Transfers Sheet
    for (let i = 1; i < tData.length; i++) {
      // Ensure it is headed to THIS branch and is currently Pending
      if (tData[i][3] === branchName && tData[i][6] === "Pending") {
        let cleanSheetBookingId = String(tData[i][1]).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
        
        if (cleanSearchIds.includes(cleanSheetBookingId)) {
          tData[i][5] = new Date();     // Column F: Inbound_Date
          tData[i][6] = "Received";     // Column G: Transfer_Status
          transferMatches++;
        }
      }
    }

    let bData = bookingSheet.getDataRange().getValues();
    let bMatches = 0;
    let logsToCreate = [];

    // 3. Update Bookings Sheet
    for (let i = 1; i < bData.length; i++) {
      let cleanSheetBookingId = String(bData[i][0]).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      
      if (cleanSearchIds.includes(cleanSheetBookingId)) {
        bData[i][11] = "Received at Destination Hub"; // Column L: Status
        
        // Grab original ID (with apostrophe) for the logger
        logsToCreate.push(bData[i][0]); 
        
        while(bData[i].length <= 14) bData[i].push("");
        bData[i][14] = branchName; // Column O: Current Location
        
        bMatches++;
      }
    }

    // 4. Save & Log
    if (transferMatches > 0 && bMatches > 0) {
      transferSheet.getDataRange().setValues(tData);
      bookingSheet.getDataRange().setValues(bData);
      
      // Batch log all the events
      logsToCreate.forEach(origId => {
        logTrackingEvent(origId, "Received at Destination Hub", userName, "", "Bulk Inbound Received", branchName);
      });
      
      return { success: true, message: `Successfully received ${bMatches} packages into ${branchName} inventory.` };
    } else {
      return { success: false, message: "No matching pending transfers found to update. They may have already been received." };
    }
  } catch (error) {
    return { success: false, message: "Backend Crash: " + error.message };
  }
}

/**
 * Updates a booking from the Admin panel and logs the change.
 */
function updateBookingDetails(bookingID, updateData, currentUser, currentBranch) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bookingsSheet = ss.getSheetByName('Bookings');
  const logSheet = ss.getSheetByName('Tracking_Log');
  
  const data = bookingsSheet.getDataRange().getValues();
  let rowToUpdate = -1;
  
  // Find the specific booking row
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === bookingID) {
      rowToUpdate = i + 1; // +1 because array is 0-indexed and sheet is 1-indexed
      break;
    }
  }
  
  if (rowToUpdate === -1) return { success: false, message: "Booking ID not found." };
  
  // Update the Bookings sheet columns (Ensure these match your exact column layout)
  // Column 12: Status, Column 14: Forwarding Agent, Column 15: Fwd Tracking #
  bookingsSheet.getRange(rowToUpdate, 12).setValue(updateData.status);
  bookingsSheet.getRange(rowToUpdate, 14).setValue(updateData.fwdAgent);
  bookingsSheet.getRange(rowToUpdate, 15).setValue(updateData.fwdTracking);
  
  // Log the master update in the Tracking_Log
  const timestamp = new Date();
  const logMessage = "Admin Update: " + updateData.status + " (Fwd: " + updateData.fwdAgent + ")";
  
  const logLastRow = logSheet.getLastRow();
  const logID = logLastRow === 1 ? 1 : parseInt(logSheet.getRange(logLastRow, 1).getValue()) + 1;
  
  logSheet.appendRow([logID, bookingID, logMessage, timestamp, currentUser, "Head Office"]);
  
  return { success: true };
}
/**
 * Creates a new consolidated shipment (MAWB) matching your exact columns.
 */
function createConsolidation(mawb, bookingIds, currentUser, currentBranch) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const consolSheet = ss.getSheetByName('Consolidations');
  const bookingsSheet = ss.getSheetByName('Bookings');
  const logSheet = ss.getSheetByName('Tracking_Log');

  // 1. Prevent Duplicate MAWBs (Checking Column B / Index 1)
  const data = consolSheet.getDataRange().getValues();
  const existingMawbs = data.map(row => row[1]); 
  if (existingMawbs.includes(mawb)) {
    return { success: false, message: "Error: MAWB " + mawb + " already exists." };
  }

  // 2. Generate Consolidation_ID (e.g., CON-1000)
  const cLastRow = consolSheet.getLastRow();
  const consolID = cLastRow === 1 ? "CON-1000" : "CON-" + (parseInt(consolSheet.getRange(cLastRow, 1).getValue().toString().split('-')[1]) + 1);

  const timestamp = new Date();
  const initialStatus = "Consolidated under MAWB: " + mawb;
  
  // Clean up the array of IDs
  const cleanIds = bookingIds.map(id => id.trim()).filter(id => id !== "");

  // 3. Save to Consolidations sheet (Matches your exact columns)
  consolSheet.appendRow([
    consolID,              // Consolidation_ID
    mawb,                  // Master_Airway_bill
    cleanIds.join(','),    // List_of_Booking_IDs
    "Manifested",          // Status
    timestamp,             // Date_Created
    currentUser            // Created_By
  ]);

  // 4. Update all individual bookings & write to Tracking Log
  const bData = bookingsSheet.getDataRange().getValues();
  const logLastRow = logSheet.getLastRow();
  let currentLogId = logLastRow === 1 ? 1 : parseInt(logSheet.getRange(logLastRow, 1).getValue()) + 1;

  for (let i = 1; i < bData.length; i++) {
    const rowBookingId = bData[i][0];
    
    if (cleanIds.includes(rowBookingId)) {
      bookingsSheet.getRange(i + 1, 12).setValue(initialStatus);
      logSheet.appendRow([currentLogId, rowBookingId, initialStatus, timestamp, currentUser, currentBranch]);
      currentLogId++;
    }
  }

  return { success: true, message: "Successfully grouped " + cleanIds.length + " packages under " + mawb };
}

/**
 * Mass-updates the status of an entire consolidation (MAWB).
 */
function updateConsolidationStatus(mawb, newStatus, currentUser, currentBranch) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const consolSheet = ss.getSheetByName('Consolidations');
  const bookingsSheet = ss.getSheetByName('Bookings');
  const logSheet = ss.getSheetByName('Tracking_Log');
  const timestamp = new Date();

  // 1. Find the MAWB and update Status
  const cData = consolSheet.getDataRange().getValues();
  let bookingIdsStr = "";
  
  for (let i = 1; i < cData.length; i++) {
    if (cData[i][1] === mawb) { // Index 1 is Master_Airway_bill
      consolSheet.getRange(i + 1, 4).setValue(newStatus); // Update Column 4 (Status)
      bookingIdsStr = cData[i][2]; // Index 2 is List_of_Booking_IDs
      break;
    }
  }

  if (!bookingIdsStr) return { success: false, message: "MAWB not found." };
  const childIds = String(bookingIdsStr).split(',');

  // 2. Update all child bookings & add to tracking log
  const bData = bookingsSheet.getDataRange().getValues();
  const logLastRow = logSheet.getLastRow();
  let currentLogId = logLastRow === 1 ? 1 : parseInt(logSheet.getRange(logLastRow, 1).getValue()) + 1;

  for (let i = 1; i < bData.length; i++) {
    const rowBookingId = bData[i][0];
    if (childIds.includes(rowBookingId)) {
      bookingsSheet.getRange(i + 1, 12).setValue(newStatus); 
      logSheet.appendRow([currentLogId, rowBookingId, newStatus, timestamp, currentUser, currentBranch]);
      currentLogId++;
    }
  }
  
  return { success: true, message: "Status updated for " + childIds.length + " packages." };
}
/**
 * Gets active consolidations for the UI.
 */
function getActiveConsolidations() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const consolSheet = ss.getSheetByName('Consolidations');
  
  if (!consolSheet) return []; // Safety check
  
  const data = consolSheet.getDataRange().getValues();
  data.shift(); // Remove headers
  
  // Fix for the Date bug (Date_Created is in Column E / Index 4)
  for (let i = 0; i < data.length; i++) {
    let rawDate = data[i][4]; 
    if (rawDate instanceof Date) {
      data[i][4] = rawDate.toLocaleDateString();
    }
  }
  
  return data;
}
/**
 * Fetches dashboard statistics based on Origin Booking Branch.
 * Admins / Head Office get complete access to all data.
 * UPDATED: Added calculation for Exceptions.
 */
function getDashboardSummary(branchName, role) {
  try {
    const ss = typeof SPREADSHEET_ID !== 'undefined' 
        ? SpreadsheetApp.openById(SPREADSHEET_ID) 
        : SpreadsheetApp.getActiveSpreadsheet();
        
    const bookingSheet = ss.getSheetByName('Bookings');
    const transferSheet = ss.getSheetByName('Transfers');
    
    let totalBookings = 0;
    let inTransit = 0;       
    let delivered = 0;   
    let exceptions = 0;      // NEW: Counter for the Exception card
    let pendingInbounds = 0;
    let recentBookings = [];
    let recentDelivered = [];
    
    const isAdmin = (role === 'Admin' || role === 'Super Admin' || role === 'Head Office');
    
    if (bookingSheet) {
      const data = bookingSheet.getDataRange().getDisplayValues(); 
      
      for (let i = data.length - 1; i >= 1; i--) {
        let id = String(data[i][0]).trim();
        let bookingBranch = String(data[i][13]).trim(); 
        let status = String(data[i][11]).trim();        
        
        if (!id) continue;

        if (isAdmin || bookingBranch === String(branchName).trim()) {
          totalBookings++;
          
          let sUpper = status.toUpperCase();
          
          // Count In-Transit
          if (sUpper.includes('TRANSIT') || sUpper.includes('DISPATCHED') || sUpper.includes('FORWARDED')) {
             inTransit++;
          }
          
          // Count Delivered
          if (sUpper.includes('DELIVERED')) {
             delivered++;
             if (recentDelivered.length < 5) {
                recentDelivered.push({
                   id: id,
                   dest: data[i][6] ? String(data[i][6]).trim() : 'Destination',
                   // NEW: Grab Shipper Name (Col C / Index 2) and Phone (Col R / Index 17)
                   shipperName: data[i][2] ? String(data[i][2]).trim() : 'Valued Customer',
                   shipperPhone: data[i][17] ? String(data[i][17]).replace(/^'/, "").trim() : ''
                });
             }
          }

          // Count Exceptions (NEW)
          if (sUpper.includes('RETURN') || sUpper.includes('CANCEL') || sUpper.includes('FAIL') || sUpper.includes('HOLD') || sUpper.includes('EXCEPTION')) {
             exceptions++;
          }
          
          if (recentBookings.length < 10) {
            recentBookings.push({
              id: id,
              destination: data[i][6] + (data[i][7] ? ', ' + data[i][7] : ''),
              status: status 
            });
          }
        }
      }
    }
    
    if (transferSheet) {
      const tData = transferSheet.getDataRange().getDisplayValues();
      for (let i = 1; i < tData.length; i++) {
        let destBranch = String(tData[i][3]).trim(); 
        let tStatus = String(tData[i][6]).trim();    
        
        if (tStatus === 'Pending') {
          if (isAdmin || destBranch === String(branchName).trim()) {
            pendingInbounds++;
          }
        }
      }
    }
    
    return {
      totalBookings: totalBookings,
      inTransit: inTransit,      
      delivered: delivered,   
      exceptions: exceptions,    // Feeds Card 4
      pendingInbounds: pendingInbounds,
      recentBookings: recentBookings,
      recentDelivered: recentDelivered 
    };
    
  } catch (error) {
    Logger.log("Dashboard Error: " + error.message);
    return { totalBookings: 0, inTransit: 0, delivered: 0, exceptions: 0, pendingInbounds: 0, recentBookings: [], recentDelivered: [] };
  }
}
/**
 * Fetches the recent outbound shipments for a specific branch.
 */
function getRecentOutbounds(branchName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const transfersSheet = ss.getSheetByName('Transfers');
  if (!transfersSheet) return [];
  
  const data = transfersSheet.getDataRange().getValues();
  let outbounds = [];
  
  // Loop backwards to get the most recent transfers first
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][2] === branchName) { // Column C: From Branch
      let rawDate = data[i][4]; // Column E: Outbound Date
      let dateString = rawDate instanceof Date ? rawDate.toLocaleDateString() : rawDate;
      
      outbounds.push({
        transferId: data[i][0],
        bookingId: data[i][1],
        toBranch: data[i][3],
        dateSent: dateString,
        status: data[i][6] // Pending or Received
      });
      
      // Limit to the 10 most recent outbound transfers for a clean UI
      if(outbounds.length >= 10) break; 
    }
  }
  return outbounds;
}

/**
 * Fetches full details for a specific Booking ID to show in the popup.
 */
function getPackageDetails(bookingId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Bookings');
  if (!sheet) return null;

  const data = sheet.getDataRange().getValues();
  
  for(let i = 1; i < data.length; i++) {
    if(String(data[i][0]) === String(bookingId)) {
      return {
        id: data[i][0],
        shipper: data[i][2],
        consignee: data[i][3],
        origin: data[i][4] + ", " + data[i][5],
        dest: data[i][6] + ", " + data[i][7],
        type: data[i][8],
        weight: data[i][9],
        pcs: data[i][10]
      };
    }
  }
  return null;
}
/**
 * Fetches the specific package details grouped inside a MAWB.
 */
function getMAWBDetails(mawbId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const consolSheet = ss.getSheetByName('Consolidations');
  const bookingsSheet = ss.getSheetByName('Bookings');
  if (!consolSheet || !bookingsSheet) return [];

  const cData = consolSheet.getDataRange().getValues();
  let childIds = [];
  
  // 1. Find the MAWB and get its list of Booking IDs
  for (let i = 1; i < cData.length; i++) {
    if (cData[i][1] === mawbId) {
      // Split the comma-separated string into an array
      childIds = String(cData[i][2]).split(',').map(id => id.trim());
      break;
    }
  }

  if (childIds.length === 0) return [];

  // 2. Cross-reference with Bookings to get Weight, Pcs, and Destination
  const bData = bookingsSheet.getDataRange().getValues();
  let results = [];
  
  for (let i = 1; i < bData.length; i++) {
    let rowId = String(bData[i][0]).trim();
    if (childIds.includes(rowId)) {
      results.push({
        id: rowId,
        destCity: bData[i][6], // Column G: Destination City
        weight: bData[i][9],   // Column J: Weight
        pcs: bData[i][10]      // Column K: Pieces
      });
    }
  }
  
  return results;
}
/**
 * Fetches all users for the Admin Panel.
 */
function getSystemUsers() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  let users = [];
  for (let i = 1; i < data.length; i++) {
    users.push({
      rowId: i + 1,
      id: data[i][0],
      name: data[i][1],
      pin: data[i][2],
      role: data[i][3],
      branch: data[i][4],
      status: data[i][5] || 'Active' // Column F: Defaults to Active if blank
    });
  }
  return users;
}

/**
 * Saves a new user or updates an existing one.
 */
function saveSystemUser(userData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Users');
  
  if (userData.rowId) {
    // Edit existing (Updated to span 6 columns)
    sheet.getRange(userData.rowId, 1, 1, 6).setValues([[userData.id, userData.name, userData.pin, userData.role, userData.branch, userData.status]]);
    return { success: true, message: "User updated successfully." };
  } else {
    // Add new (Updated to insert 6 columns)
    sheet.appendRow([userData.id, userData.name, userData.pin, userData.role, userData.branch, userData.status]);
    return { success: true, message: "New user created." };
  }
}

/**
 * Fetches all branches for the Admin Panel.
 */
function getSystemBranches() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Branches');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  let branches = [];
  for (let i = 1; i < data.length; i++) {
    branches.push({
      rowId: i + 1,
      code: data[i][0],
      name: data[i][1],
      location: data[i][2]
    });
  }
  return branches;
}


/**
 * Fetches all branches for the Admin Panel.
 */
function getSystemBranches() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Branches');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  let branches = [];
  // Start at i=1 to skip the headers
  for (let i = 1; i < data.length; i++) {
    branches.push({
      rowId: i + 1,
      code: data[i][0],      // Column A: Branch ID
      name: data[i][1],      // Column B: Name
      type: data[i][2],      // Column C: Branch Type
      location: data[i][3]   // Column D: Location
    });
  }
  return branches;
}

/**
 * Saves a new branch or updates an existing one.
 */
function saveSystemBranch(branchData) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Branches');
  
  if (branchData.rowId) {
    // Edit existing (Updated to span 4 columns)
    sheet.getRange(branchData.rowId, 1, 1, 4).setValues([[branchData.code, branchData.name, branchData.type, branchData.location]]);
    return { success: true, message: "Branch updated successfully." };
  } else {
    // Add new (Updated to insert 4 columns)
    sheet.appendRow([branchData.code, branchData.name, branchData.type, branchData.location]);
    return { success: true, message: "New branch created." };
  }
}
/**
 * Fetches branch names for dropdowns, strictly hiding "Head Quarters".
 */
function getBranchListForDropdown() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Branches');
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  let validBranches = [];
  
  // Start at i=1 to skip the headers
  for (let i = 1; i < data.length; i++) {
    // Column C (Index 2) is Branch Type, Column B (Index 1) is Branch Name
    if (data[i][2] !== 'Head Quarters') { 
      validBranches.push(data[i][1]);
    }
  }
  
  return validBranches;
}

/**
 * Processes a bulk outbound transfer for multiple packages simultaneously.
 * Automatically logs the "In-Transit" milestone for every package.
 */
function processBulkOutboundTransfer(bookingIds, destBranch, userName, fromBranch) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const transferSheet = ss.getSheetByName('Transfers');
  const bookingSheet = ss.getSheetByName('Bookings');
  
  let rowsToAppend = [];
  let dateSent = new Date().toLocaleString();
  
  // Loop through every scanned/pasted package
  for (let i = 0; i < bookingIds.length; i++) {
    let bId = bookingIds[i]; // bId is defined right here!
    
    // Generate a unique Transfer ID for each package
    let transferId = "TRN-" + Math.floor(Math.random() * 1000000) + "-" + i;
    
    // Add to the Transfer list
    rowsToAppend.push([transferId, bId, fromBranch, destBranch, dateSent, userName, "Pending"]);
    
    // --- THE FIX: The Automatic Logger sits safely INSIDE the loop! ---
    logTrackingEvent(bId, "In Transit to " + destBranch, userName, fromBranch);
  }
  
  if (rowsToAppend.length > 0) {
    // Bulk insert all transfers at once for maximum speed
    transferSheet.getRange(transferSheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
    
    // Update the master Bookings sheet so the system knows these packages are in transit
    try {
      const bData = bookingSheet.getDataRange().getValues();
      let modified = false;
      for (let i = 1; i < bData.length; i++) {
        if (bookingIds.includes(String(bData[i][0]).trim())) {
          bData[i][11] = 'In Transit to ' + destBranch; // Assuming column L is Status
          modified = true;
        }
      }
      if (modified) {
        bookingSheet.getDataRange().setValues(bData);
      }
    } catch(e) {
      // Failsafe
    }
    
    return { success: true, message: `Successfully dispatched ${rowsToAppend.length} package(s) to ${destBranch}.` };
  }
  
  return { success: false, message: "No valid tracking IDs to process." };
}
/**
 * Connects to the SMSA Express API to track a shipment by AWB Number.
 * ROUTE FIXED: Uses the official /api/track/single/{awb} endpoint.
 */
function trackSmsaShipment(awbNumber) {
  const API_KEY = "014867d83be149298995c9104a6a40df";
  const cleanAwb = encodeURIComponent(String(awbNumber).trim());
  
  // THE FIX: The official SMSA endpoint for AWB tracking is /track/single/
  const API_URL = "https://ecomapis.smsaexpress.com/api/track/single/" + cleanAwb;

  const options = {
    'method': 'get',
    'headers': { 
      'apikey': API_KEY 
    },
    'muteHttpExceptions': true
  };

  try {
    let response = UrlFetchApp.fetch(API_URL, options);
    let responseCode = response.getResponseCode();
    let responseBody = response.getContentText();
    
    if (responseCode === 200) {
      let data = JSON.parse(responseBody);
      
      // Ensure the API actually returned scan data
      if (data && data.Scans && data.Scans.length > 0) {
        
        // Loop through the scans and map ReceivedBy to Notes
        for (let i = 0; i < data.Scans.length; i++) {
          let scan = data.Scans[i];
          if (scan.ReceivedBy && String(scan.ReceivedBy).trim() !== "") {
            scan.Notes = "Delivered to " + String(scan.ReceivedBy).trim();
          } else {
            scan.Notes = ""; // Keep it blank so it doesn't trigger undefined errors
          }
        }
        
        return { success: true, payload: data };
      } else {
        return { success: false, message: "AWB Found, but no scan history exists yet." };
      }
    } else if (responseCode === 404 || responseCode === 204) {
      return { success: false, message: "No tracking data found for AWB " + awbNumber + "." };
    } else {
      return { success: false, message: "SMSA Error " + responseCode + ": " + responseBody };
    }
    
  } catch (error) {
    return { success: false, message: "Connection Failed: " + error.message };
  }
}
/**
 * Connects to the Aramex SOAP API to track a shipment.
 * Updated with Live Credentials and Strict XML Schema compliance.
 */
function trackAramexShipment(awb) {
  const url = "http://ws.aramex.net/shippingapi/tracking/service_1_0.svc";
  
  // Constructing the SOAP XML Envelope based on the exact Aramex WSDL Schema
  const soapPayload = `<?xml version="1.0" encoding="utf-8"?>
    <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:v1="http://ws.aramex.net/ShippingAPI/v1/" xmlns:arr="http://schemas.microsoft.com/2003/10/Serialization/Arrays">
       <soapenv:Header/>
       <soapenv:Body>
          <v1:ShipmentTrackingRequest>
             <v1:ClientInfo>
                <v1:UserName>adhilashraf@alfarhacargo.in</v1:UserName>
                <v1:Password>99081618@Alf</v1:Password>
                <v1:Version>v1.0</v1:Version>
                <v1:AccountNumber>60529509</v1:AccountNumber>
                <v1:AccountPin>321321</v1:AccountPin>
                <v1:AccountEntity>MCT</v1:AccountEntity>
                <v1:AccountCountryCode>OM</v1:AccountCountryCode>
             </v1:ClientInfo>
             <v1:Transaction>
                <v1:Reference1>Track_${String(awb).trim()}</v1:Reference1>
                <v1:Reference2></v1:Reference2>
                <v1:Reference3></v1:Reference3>
                <v1:Reference4></v1:Reference4>
                <v1:Reference5></v1:Reference5>
             </v1:Transaction>
             <v1:Shipments>
                <arr:string>${String(awb).trim()}</arr:string>
             </v1:Shipments>
             <v1:GetLastTrackingUpdateOnly>false</v1:GetLastTrackingUpdateOnly>
          </v1:ShipmentTrackingRequest>
       </soapenv:Body>
    </soapenv:Envelope>`;

  const options = {
    method: "post",
    contentType: "text/xml; charset=utf-8",
    headers: {
      "SOAPAction": "http://ws.aramex.net/ShippingAPI/v1/Service_1_0/TrackShipments"
    },
    payload: soapPayload,
    muteHttpExceptions: true
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const xmlText = response.getContentText();
    
    // SMART ERROR EXTRACTOR
    if (xmlText.includes("<HasErrors>true</HasErrors>") || !xmlText.includes("TrackingResult")) {
      let errorMessage = "No tracking data found for this AWB.";
      let match = xmlText.match(/<Message>(.*?)<\/Message>/);
      if (match && match[1]) {
         errorMessage = match[1];
      }
      return { success: false, message: "Aramex Server Says: " + errorMessage };
    }

    // Parse the XML using Google's XmlService
    const document = XmlService.parse(xmlText);
    const root = document.getRootElement();
    
    const soapNs = XmlService.getNamespace("s", "http://schemas.xmlsoap.org/soap/envelope/");
    const apiNs = XmlService.getNamespace("http://ws.aramex.net/ShippingAPI/v1/");
    const arrNs = XmlService.getNamespace("a", "http://schemas.microsoft.com/2003/10/Serialization/Arrays");
    
    const body = root.getChild("Body", soapNs);
    const responseNode = body.getChild("ShipmentTrackingResponse", apiNs);
    const trackingResultsArray = responseNode.getChild("TrackingResults", apiNs);
    
    if (!trackingResultsArray) return { success: false, message: "No tracking data found." };

    const keyValuePair = trackingResultsArray.getChild("KeyValueOfstringArrayOfTrackingResultmFAkxlpY", arrNs);
    const valueNode = keyValuePair.getChild("Value", arrNs);
    const results = valueNode.getChildren("TrackingResult", apiNs);

    let normalizedScans = [];
    let destination = "N/A";
    let origin = "N/A";

    for (let i = 0; i < results.length; i++) {
      let node = results[i];
      let desc = node.getChildText("UpdateDescription", apiNs);
      let loc = node.getChildText("UpdateLocation", apiNs);
      let date = node.getChildText("UpdateDateTime", apiNs);
      
      normalizedScans.push({
        ScanDateTime: date,
        City: loc,
        ScanDescription: desc,
        Notes: node.getChildText("Comments", apiNs) || "" // Add this line
      });

      if (i === 0) destination = loc; 
      if (i === results.length - 1) origin = loc;
    }

    const payload = {
      AWB: awb,
      RecipientName: "Aramex Consignee", 
      OriginCity: origin,
      DesinationCity: destination,
      Pieces: "-",
      weight: "-",
      ContentDesc: "Aramex Shipment",
      Scans: normalizedScans
    };

    return { success: true, payload: payload };

  } catch (error) {
    return { success: false, message: "Failed to connect to Aramex: " + error.message };
  }
}
/**
 * Fetches current active inventory based on physical location.
 * Admins see the global inventory network.
 * Accepts an optional flag to hide 'Consolidated' packages for specific screens.
 */
function getBranchInventory(branchName, excludeConsolidated) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bookingSheet = ss.getSheetByName('Bookings');
  if (!bookingSheet) return [];
  
  const data = bookingSheet.getDataRange().getValues();
  let inventory = [];
  
  const safeBranch = String(branchName).trim().toLowerCase();
  const isAdmin = (safeBranch === 'head quarters' || safeBranch === 'admin' || safeBranch === 'super admin');
  
  for (let i = data.length - 1; i >= 1; i--) {
    let status = String(data[i][11] || '').trim(); // Status
    let originBranch = String(data[i][13] || '').trim(); // Booking Branch
    let currentBranch = String(data[i][14] || '').trim(); // Current Physical Location
    
    // If the package hasn't moved yet, its current location is the origin branch!
    let activeLocation = currentBranch !== "" ? currentBranch : originBranch;
    
    // 1. Always hide delivered or returned packages
    let isHidden = status.toLowerCase().includes('delivered') || status.toLowerCase().includes('returned');
    
    // 2. THE FIX: Only hide consolidated packages if the frontend explicitly asks to!
    if (excludeConsolidated && status.toLowerCase().includes('consolidated')) {
      isHidden = true;
    }
    
    if (!isHidden) {
      if (isAdmin || activeLocation.toLowerCase() === safeBranch) {
        inventory.push({
          id: data[i][0],
          dest: (data[i][6] || 'Unknown') + ', ' + (data[i][7] || ''),
          status: status || 'Pending'
        });
        if (inventory.length >= 150) break; // Keep UI fast
      }
    }
  }
  return inventory;
}

/**
 * Records a tracking event in the Tracking_Log sheet.
 * ULTIMATE FIX: Strictly maps to exactly 7 columns in the correct order.
 */
function logTrackingEvent(bookingId, status, updatedBy, location, remark, fallbackBranch, customTimestamp) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const trackingSheet = ss.getSheetByName('Tracking_Log');
  if (!trackingSheet) return;

  const logId = "LOG-" + Utilities.getUuid().substring(0, 8).toUpperCase();
  const safeBookingId = "'" + String(bookingId).replace(/^'/, ""); // Keep the Zero!
  
  let finalTimestamp = new Date();
  if (customTimestamp) {
    try { finalTimestamp = new Date(customTimestamp); } catch(e) {}
  }

  let finalLocation = "";
  if (location && String(location).trim() !== "") {
    finalLocation = String(location).trim();
  } else if (fallbackBranch && String(fallbackBranch).trim() !== "") {
    finalLocation = getBranchPhysicalLocation(fallbackBranch);
  } else {
    finalLocation = "Network Hub";
  }

  // STRICT COLUMN MAPPING
  trackingSheet.appendRow([
    logId,           // Column A: Log_ID
    safeBookingId,   // Column B: Booking_ID
    status,          // Column C: Status_Update
    finalTimestamp,  // Column D: Timestamp
    updatedBy,       // Column E: Updated_By
    finalLocation,   // Column F: Location
    remark || ""     // Column G: Remark
  ]);
}

/**
 * Manual Status Updaters
 * REWRITTEN: Handles leading zeros and uses Smart Location logic.
 */

function updateManualTrackingStatus(bookingId, status, userName, branchName, customLoc, remark, customDate, fwdAgent, fwdDocket) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bookingSheet = ss.getSheetByName('Bookings');
  if (!bookingSheet) return { success: false, message: "System Error: Bookings sheet missing." };
  
  const data = bookingSheet.getDataRange().getValues();
  let found = false;
  
  // Scrubber to match IDs accurately (ignoring zeros/apostrophes)
  const cleanSearchId = String(bookingId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  for (let i = 1; i < data.length; i++) {
    let cleanSheetId = String(data[i][0]).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    
    if (cleanSheetId === cleanSearchId) {
      data[i][11] = status; // Column L (Status)
      
      // Ensure row has enough columns for P and Q
      while(data[i].length <= 16) data[i].push("");
      
      if (fwdAgent) data[i][15] = fwdAgent; // Column P
      if (fwdDocket) data[i][16] = fwdDocket; // Column Q
      
      found = true;
      break;
    }
  }
  
  if (found) {
    bookingSheet.getDataRange().setValues(data);
    
    // CALL THE SMART LOGGER: (bookingId, status, updatedBy, providedLocation, remark, currentBranch, apiTimestamp)
    logTrackingEvent(bookingId, status, userName, customLoc, remark, branchName, customDate);
    
    return { success: true, message: `Package ${bookingId} updated successfully.` };
  } else {
    return { success: false, message: `Could not find Booking ID: ${bookingId}` };
  }
}

function updateBulkManualTrackingStatus(bookingIds, status, userName, branchName, customLoc, remark, customDate, fwdAgent, fwdDocket) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bookingSheet = ss.getSheetByName('Bookings');
  if (!bookingSheet) return { success: false, message: "System Error: Bookings sheet missing." };
  
  const data = bookingSheet.getDataRange().getValues();
  let updatedCount = 0;
  
  // Clean all IDs in the search list
  const cleanSearchList = bookingIds.map(id => String(id).replace(/[^a-zA-Z0-9]/g, "").toUpperCase());

  for (let i = 1; i < data.length; i++) {
    let cleanSheetId = String(data[i][0]).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    
    if (cleanSearchList.includes(cleanSheetId)) {
      data[i][11] = status;
      
      while(data[i].length <= 16) data[i].push("");
      if (fwdAgent) data[i][15] = fwdAgent; 
      if (fwdDocket) data[i][16] = fwdDocket; 
      
      updatedCount++;
      
      // Get the original ID from the sheet to preserve formatting during logging
      let originalId = data[i][0];
      logTrackingEvent(originalId, status, userName, customLoc, remark, branchName, customDate);
    }
  }
  
  if (updatedCount > 0) {
    bookingSheet.getDataRange().setValues(data);
    return { success: true, message: `Successfully updated ${updatedCount} packages.` };
  } else {
    return { success: false, message: "No matching Booking IDs found to update." };
  }
}

function updateConsolidationTrackingStatus(consolId, status, userName, branchName, customLoc, remark, customDate, fwdAgent, fwdDocket) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const consolSheet = ss.getSheetByName('Consolidations');
  let childAWBs = [];
  
  if (consolSheet) {
    const consolData = consolSheet.getDataRange().getValues();
    const cleanConsolId = String(consolId).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

    for(let i = 1; i < consolData.length; i++) {
      let cleanSheetConsol = String(consolData[i][0]).replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
      if(cleanSheetConsol === cleanConsolId) {
         if(consolData[i][1]) childAWBs = String(consolData[i][1]).split(',').map(id => id.trim());
         break;
      }
    }
  }
  
  // 1. Log the update for the Master Consol ID itself
  logTrackingEvent(consolId, status, userName, customLoc, remark, branchName, customDate);
  
  // 2. If there are child packages, update them all
  if (childAWBs.length > 0) {
      updateBulkManualTrackingStatus(childAWBs, status, userName, branchName, customLoc, remark, customDate, fwdAgent, fwdDocket);
      return { success: true, message: `Master ID ${consolId} and ${childAWBs.length} child packages updated.` };
  } else {
      return { success: true, message: `Master ID ${consolId} updated.` };
  }
}
/**
 * Creates a new Master Consolidation record.
 * Links multiple Child AWBs to a single Master AWB.
 */
function createConsolidationRecord(masterAwb, childAwbsArray, destBranch, userName, branchName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let consolSheet = ss.getSheetByName('Consolidations');
  
  // Failsafe: Create the Consolidations sheet if it doesn't exist yet
  if (!consolSheet) {
    consolSheet = ss.insertSheet('Consolidations');
    consolSheet.appendRow(['Master_AWB', 'Child_AWBs', 'Destination', 'Date_Created', 'Created_By', 'Origin_Branch']);
  }
  
  // Convert the array of child IDs into a neat comma-separated string
  const childString = childAwbsArray.join(', ');
  const dateCreated = new Date().toLocaleString();
  
  // Save the master record
  consolSheet.appendRow([masterAwb, childString, destBranch, dateCreated, userName, branchName]);
  
  // Optional: Automatically update the status of all child packages to show they are consolidated
  updateBulkManualTrackingStatus(childAwbsArray, "Consolidated into " + masterAwb, userName, branchName, "", "", "", "", "");
  
  return { success: true, message: `Master Bag ${masterAwb} created with ${childAwbsArray.length} packages.` };
}
/**
 * Fetches recent Master Consolidations and calculates total weight & pieces safely.
 * Includes Date stringification to prevent 'null' data transmission errors!
 */
function getRecentConsolidations(branchName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const consolSheet = ss.getSheetByName('Consolidations');
    
    if (!consolSheet) return [];
    
    const cData = consolSheet.getDataRange().getValues();
    if (cData.length <= 1) return []; 
    
    const bookingSheet = ss.getSheetByName('Bookings');
    const bData = bookingSheet ? bookingSheet.getDataRange().getValues() : [];
    
    let bookingMap = {};
    if (bData.length > 1) {
      const headers = bData[0].map(h => String(h).trim().toLowerCase());
      let wCol = 9;  
      let pCol = 10; 
      
      for(let j = 0; j < headers.length; j++) {
        if(headers[j].includes('weight')) wCol = j;
        if(headers[j].includes('pcs') || headers[j].includes('pieces')) pCol = j;
      }
      
      for(let i = 1; i < bData.length; i++) {
        bookingMap[String(bData[i][0]).trim()] = {
          weight: parseFloat(bData[i][wCol]) || 0,
          pcs: parseInt(bData[i][pCol]) || 1
        };
      }
    }
    
    let recent = [];
    const safeBranch = String(branchName).trim().toLowerCase();
    const isAdmin = (safeBranch === 'head quarters' || safeBranch === 'admin' || safeBranch === 'super admin');
    
    for (let i = cData.length - 1; i >= 1; i--) {
      let origin = String(cData[i][5] || '').trim().toLowerCase(); 
      
      if (isAdmin || origin === safeBranch) {
        let masterAwb = cData[i][0];
        let childrenRaw = String(cData[i][1]).trim();
        let childArray = childrenRaw ? childrenRaw.split(',').map(s => s.trim()) : [];
        
        let totalW = 0;
        let totalP = 0;
        
        childArray.forEach(id => {
          if(bookingMap[id]) {
            totalW += bookingMap[id].weight;
            totalP += bookingMap[id].pcs;
          }
        });

        // THE FIX: Safely convert the raw Date object into plain text!
        let rawDate = cData[i][3];
        let safeDateString = (rawDate instanceof Date) ? rawDate.toLocaleString() : String(rawDate || 'N/A');
        
        recent.push({
          id: masterAwb || 'Unknown',
          destination: cData[i][2] || 'Hub',
          childCount: childArray.length,
          weight: totalW.toFixed(2),
          pcs: totalP,
          date: safeDateString
        });
        
        if (recent.length >= 10) break; 
      }
    }
    
    return recent;
    
  } catch(error) {
    return [{
      id: "SYSTEM ERROR",
      destination: error.message,
      childCount: 0,
      weight: "0.00",
      pcs: 0,
      date: "Error"
    }];
  }
}
/**
 * Processes a bulk CSV upload for Forwarding Agents and Dockets.
 * FIX: Protects Docket Numbers from turning into Scientific Notation!
 */
function processCsvForwardingUpload(records, userName, branchName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bookingSheet = ss.getSheetByName('Bookings');
  if (!bookingSheet) return { success: false, message: "System Error: Bookings sheet missing." };

  const data = bookingSheet.getDataRange().getValues();
  let updatedCount = 0;

  // Build a map of the uploaded records for lightning-fast matching
  let recordMap = {};
  records.forEach(r => {
    if (r.id) recordMap[String(r.id).trim()] = r;
  });

  for (let i = 1; i < data.length; i++) {
    let bId = String(data[i][0]).trim();
    
    // If the Booking ID from the sheet matches an ID in the CSV...
    if (recordMap[bId]) {
      let agent = recordMap[bId].agent || "";
      let rawDocket = recordMap[bId].docket || "";

      // Ensure the row is long enough
      while(data[i].length <= 16) data[i].push("");

      // Update the Status
      data[i][11] = "Assigned to Forwarding Agent";
      
      // Update Column P (15)
      data[i][15] = agent;
      
      // THE FIX: Add an invisible apostrophe so Sheets reads it as TEXT!
      data[i][16] = rawDocket ? "'" + rawDocket : "";

      updatedCount++;
      
      // Auto-log the event
      logTrackingEvent(bId, "Assigned to Forwarding Agent", userName, branchName, "", `Carrier: ${agent} | Docket: ${rawDocket}`, "");
    }
  }

  if (updatedCount > 0) {
    bookingSheet.getDataRange().setValues(data);
    return { success: true, message: `Successfully mapped Forwarding Details to ${updatedCount} packages.` };
  } else {
    return { success: false, message: "Upload complete, but no matching Booking IDs were found in your database." };
  }
}
/**
 * BACKGROUND WORKER: Automatically fetches updates for packages with 3rd-Party Dockets.
 * Runs silently in the background every 4 hours.
 */
function autoFetchThirdPartyUpdates() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bookingSheet = ss.getSheetByName('Bookings');
  if (!bookingSheet) return;

  const data = bookingSheet.getDataRange().getValues();
  let sheetUpdated = false;

  const smsaDictionary = {
    "AF": "Arrived Delivery Facility",
    "CC": "Processing for Consignee Collection",
    "CR": "Customs Released",
    "DE": "Delivery Exception",
    "IC": "Under clearance process",
    "ST77": "Departed Origin Country",
    "HIP": "Received at Sorting Facility",
    "PU": "Picked up from shipper"
  };

  for (let i = 1; i < data.length; i++) {
    let bId = String(data[i][0]).trim();
    let currentStatus = String(data[i][11]).trim();
    let fwdAgent = String(data[i][15] || "").trim().toUpperCase();
    let fwdDocket = String(data[i][16] || "").trim();

    if (currentStatus.toLowerCase().includes('delivered') || 
        currentStatus.toLowerCase().includes('returned') || 
        !fwdAgent || !fwdDocket) {
      continue;
    }

    let apiResult = null;

    // --- CARRIER ROUTING ---
    if (fwdAgent.includes('SMSA')) {
      try { apiResult = trackSmsaShipment(fwdDocket); } catch(e) { apiResult = { success: false, message: "Crash: " + e.message }; }
    } else if (fwdAgent.includes('ARAMEX')) {
      try { apiResult = trackAramexShipment(fwdDocket); } catch(e) { apiResult = { success: false, message: "Crash: " + e.message }; }
    } else if (fwdAgent.includes('DHL')) {
      try { apiResult = trackDhlShipment(fwdDocket); } catch(e) { apiResult = { success: false, message: "Crash: " + e.message }; }
    } else if (fwdAgent.includes('DELHIVERY')) {
      try { apiResult = trackDelhiveryShipment(fwdDocket); } catch(e) { apiResult = { success: false, message: "Crash: " + e.message }; }
    } else {
      // CATCH-ALL: Send FedEx, UPS, DPD, Royal Mail, etc., to 17Track
      try { apiResult = track17TrackShipment(fwdDocket, fwdAgent); } catch(e) { apiResult = { success: false, message: "Crash: " + e.message }; }
    }

    let payload = apiResult ? apiResult.payload : null;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch(e) {}
    }

    if (apiResult && apiResult.success && payload && payload.Scans && payload.Scans.length > 0) {
      
      let latestScan = payload.Scans[0];
      let newStatus = latestScan.ScanDescription || "";
      
      if (!newStatus && latestScan.ScanType && fwdAgent.includes('SMSA')) {
        newStatus = smsaDictionary[latestScan.ScanType] || ("Status Code: " + latestScan.ScanType);
      }
      
      newStatus = String(newStatus).trim();

      // --- SMART STATUS ALTERNATION ---
      let descLower = (newStatus || "").toLowerCase();

      if (descLower.includes('not received yet from shipper')) {
        continue; 
      }

      if (descLower.includes('collected') || descLower.includes('picked up') || descLower.includes('received at origin')) {
        newStatus = 'Arrived at sorting hub';
        descLower = 'arrived at sorting hub';
      }
      
      let scanLoc = latestScan.City || fwdAgent + " Network";
      let scanTime = latestScan.ScanDateTime;
      
      let rawRemark = latestScan.Notes || latestScan.Remark || latestScan.Details || latestScan.Activity || "";
      let finalRemark = rawRemark.trim() !== "" ? rawRemark.trim() : (newStatus + " (via " + fwdAgent + ")");

      // --- THE FIX: ADDED EMAIL TRIGGER HERE ---
      if (currentStatus !== newStatus) {
        data[i][11] = newStatus; 
        sheetUpdated = true;
        
        logTrackingEvent(bId, newStatus, "System Auto-Sync", scanLoc, finalRemark, "", scanTime);
        
        // Broadcast the automated email!
        try {
          sendEmailAlerts(bId, newStatus, scanLoc);
        } catch(emailError) {
          // Silent fail to prevent breaking the rest of the loop
        }
      }
    }
  }

  if (sheetUpdated) {
    bookingSheet.getDataRange().setValues(data);
  }
}

/**
 * Manually forces the API to sync all 3rd-party shipments.
 */
function forceApiSync(userName, branchName) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bookingSheet = ss.getSheetByName('Bookings');
  if (!bookingSheet) return { success: false, message: "System Error: Bookings sheet missing." };

  const data = bookingSheet.getDataRange().getValues();
  let sheetUpdated = false;
  
  let stats = { checked: 0, updated: 0, invalidOrPending: 0 };
  let debugLog = []; 

  const smsaDictionary = {
    "AF": "Arrived Delivery Facility",
    "CC": "Processing for Consignee Collection",
    "CR": "Customs Released",
    "DE": "Delivery Exception",
    "IC": "Under clearance process",
    "ST77": "Departed Origin Country",
    "HIP": "Received at Sorting Facility",
    "PU": "Picked up from shipper"
  };

  for (let i = 1; i < data.length; i++) {
    let bId = String(data[i][0]).trim();
    let currentStatus = String(data[i][11]).trim();
    let fwdAgent = String(data[i][15] || "").trim().toUpperCase();
    
    let rawDocket = String(data[i][16] || "");
    let fwdDocket = rawDocket.replace(/['"\r\n]/g, "").trim();

    if (currentStatus.toLowerCase().includes('delivered') || 
        currentStatus.toLowerCase().includes('returned') || 
        !fwdAgent || !fwdDocket) {
      continue;
    }

    stats.checked++;
    let apiResult = null;

    // --- CARRIER ROUTING ---
    if (fwdAgent.includes('SMSA')) {
      try { apiResult = trackSmsaShipment(fwdDocket); } catch(e) { apiResult = { success: false, message: "Crash: " + e.message }; }
    } else if (fwdAgent.includes('ARAMEX')) {
      try { apiResult = trackAramexShipment(fwdDocket); } catch(e) { apiResult = { success: false, message: "Crash: " + e.message }; }
    } else if (fwdAgent.includes('DHL')) {
      try { apiResult = trackDhlShipment(fwdDocket); } catch(e) { apiResult = { success: false, message: "Crash: " + e.message }; }
    } else if (fwdAgent.includes('DELHIVERY')) {
      try { apiResult = trackDelhiveryShipment(fwdDocket); } catch(e) { apiResult = { success: false, message: "Crash: " + e.message }; }
    } else {
      // CATCH-ALL: Send FedEx, UPS, DPD, Royal Mail, etc., to 17Track
      try { apiResult = track17TrackShipment(fwdDocket, fwdAgent); } catch(e) { apiResult = { success: false, message: "Crash: " + e.message }; }
    }

    let payload = apiResult ? apiResult.payload : null;
    if (typeof payload === 'string') {
      try { payload = JSON.parse(payload); } catch(e) {}
    }

    if (apiResult && apiResult.success && payload && payload.Scans && payload.Scans.length > 0) {
      
      let latestScan = payload.Scans[0];
      
      let newStatus = latestScan.ScanDescription || "";
      if (!newStatus && latestScan.ScanType && fwdAgent.includes('SMSA')) {
        newStatus = smsaDictionary[latestScan.ScanType] || ("Status Code: " + latestScan.ScanType);
      }
      
      newStatus = String(newStatus).trim();

      let descLower = (newStatus || "").toLowerCase();

      if (descLower.includes('not received yet from shipper')) {
        debugLog.push(`[SKIPPED] ${fwdDocket} (Ignored placeholder status)`);
        continue; 
      }

      if (descLower.includes('collected') || descLower.includes('picked up') || descLower.includes('received at origin')) {
        newStatus = 'Arrived at sorting hub';
        descLower = 'arrived at sorting hub';
      }
      
      let scanLoc = latestScan.City || fwdAgent + " Hub";
      let scanTime = latestScan.ScanDateTime;
      
      let rawRemark = latestScan.Notes || latestScan.Remark || latestScan.Details || latestScan.Activity || "";
      let finalRemark = rawRemark.trim() !== "" ? rawRemark.trim() : ("Verified via " + fwdAgent);

      if (currentStatus !== newStatus) {
        data[i][11] = newStatus; 
        sheetUpdated = true;
        stats.updated++;
        
        logTrackingEvent(bId, newStatus, "Manual API Sync", scanLoc, finalRemark, "", scanTime);
        
        // Broadcast the automated email!
        try {
          sendEmailAlerts(bId, newStatus, scanLoc);
        } catch(emailError) {
          // Silent fail to prevent breaking the rest of the loop
        }
        
        debugLog.push(`[UPDATED] ${fwdDocket} ➔ ${newStatus}`);
      } else {
        debugLog.push(`[NO CHANGE] ${fwdDocket} (Status is still: ${newStatus})`);
      }
    } else {
      stats.invalidOrPending++;
      let reason = apiResult ? (apiResult.message || "No Scans Found") : "API returned null";
      debugLog.push(`[ERROR] ${fwdDocket} ➔ ${reason}`);
    }
  }

  if (sheetUpdated) {
    bookingSheet.getDataRange().setValues(data);
  }

  return { 
    success: true, 
    message: `API Sync Complete! Checked ${stats.checked} dockets. Applied ${stats.updated} new updates.`,
    log: debugLog.join('\n')
  };
}
/**
 * Fetches the complete package details and tracking history.
 * UPGRADE: Explicitly fetches Shipper/Consignee AND actively searches the 90-Day Archives!
 */
function fetchCompleteTracking(searchTerm) {
  try {
    const ss = typeof SPREADSHEET_ID !== 'undefined' ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
    
    // Define Active and Archive Sheets
    const bookingSheet = ss.getSheetByName('Bookings');
    const trackingSheet = ss.getSheetByName('Tracking_Log'); 
    const archiveBookingSheet = ss.getSheetByName('Archive_Bookings');
    const archiveTrackingSheet = ss.getSheetByName('Archive_Tracking_Log');
    
    if (!bookingSheet || !trackingSheet) return { success: false, message: "System Error: Missing active databases." };
    
    // Scrubber to guarantee strings match perfectly
    function getCleanId(val) {
      if (val === null || val === undefined) return "";
      let str = typeof val === 'number' ? val.toLocaleString('fullwide', {useGrouping:false}) : String(val);
      return str.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    }

    const searchId = getCleanId(searchTerm);
    if (!searchId) return { success: false, message: "Invalid search term." };

    let pkgDetails = null;
    let targetBookingId = ""; 
    let isArchived = false;
    
    // HELPER: Scans a specific sheet so we don't have to write this loop twice
    function scanSheetForPackage(sheetToScan) {
      if (!sheetToScan) return false;
      const bData = sheetToScan.getDataRange().getValues();
      
      for (let i = 1; i < bData.length; i++) {
        let bId = getCleanId(bData[i][0]);
        let fDocket = getCleanId(bData[i][16]); 
        
        if (bId === searchId || (fDocket !== "" && fDocket === searchId)) {
          targetBookingId = bId; 
          
          let rawDate = bData[i][1];
          let safeDate = "";
          if (rawDate) { try { safeDate = new Date(rawDate).toISOString(); } catch(e) { safeDate = String(rawDate); } }
          
          pkgDetails = {
            id: String(bData[i][0] || "").replace(/^'/, ""), 
            date: safeDate,
            shipper: String(bData[i][2] || 'N/A'),
            consignee: String(bData[i][3] || 'N/A'),
            origin: String(bData[i][4] || "") + ', ' + String(bData[i][5] || ""),
            dest: String(bData[i][6] || "") + ', ' + String(bData[i][7] || ""),
            type: String(bData[i][8] || ""),
            weight: String(bData[i][9] || ""),
            pcs: String(bData[i][10] || ""),
            status: String(bData[i][11] || "Pending"),
            fwdAgent: String(bData[i][15] || 'N/A'),
            fwdDocket: String(bData[i][16] || 'N/A').replace(/['"\r\n]/g, "") 
          };
          return true; // Package Found
        }
      }
      return false; // Package Not Found
    }

    // 1. Search the Active Sheet first
    let found = scanSheetForPackage(bookingSheet);
    
    // 2. If not found, immediately search the Archive Sheet
    if (!found && archiveBookingSheet) {
      found = scanSheetForPackage(archiveBookingSheet);
      if (found) isArchived = true; // Mark it so we know where to get the logs
    }
    
    if (!pkgDetails) return { success: false, message: `Could not find package data for: ${searchTerm}` };

    // 3. Fetch History from the correct log sheet (Active vs Archive)
    let targetLogSheet = isArchived ? archiveTrackingSheet : trackingSheet;
    let history = [];
    
    if (targetLogSheet) {
      const tData = targetLogSheet.getDataRange().getValues();
      
      for (let i = tData.length - 1; i >= 1; i--) {
        let logBookingId = getCleanId(tData[i][1]);
        
        if (logBookingId === targetBookingId) {
          let rawTDate = tData[i][3]; 
          let safeTDate = "";
          if (rawTDate) { try { safeTDate = new Date(rawTDate).toISOString(); } catch(e) { safeTDate = String(rawTDate); } }

          history.push({
            status: String(tData[i][2] || "Status Update"), 
            date: safeTDate,                                
            user: String(tData[i][4] || "System"),          
            location: String(tData[i][5] || "Network Hub"), 
            remark: String(tData[i][6] || "")               
          });
        }
      }
    }
    
    return { success: true, details: pkgDetails, history: history };
    
  } catch(error) {
    return { success: false, message: "Backend Crash: " + error.message };
  }
}
/**
 * Connects to the DHL API to track a shipment.
 * FIX: Added routing parameters to prevent 401 Gateway rejections.
 */
function trackDhlShipment(awbNumber) {
  // Your DHL API Credentials (trimmed to prevent accidental space characters)
  const API_KEY = "xJeuGzlqOSzHdwBCkfqvswZ0hoYHfGx6".trim();
  const cleanAwb = encodeURIComponent(String(awbNumber).trim());
  
  // THE FIX: Appended &service=express to help DHL route the key authorization
  const API_URL = "https://api-eu.dhl.com/track/shipments?trackingNumber=" + cleanAwb + "&service=express";

  const options = {
    'method': 'get',
    'headers': { 
      'DHL-API-Key': API_KEY 
    },
    'muteHttpExceptions': true
  };

  try {
    let response = UrlFetchApp.fetch(API_URL, options);
    let responseCode = response.getResponseCode();
    let responseBody = response.getContentText();
    
    if (responseCode === 200) {
      let data = JSON.parse(responseBody);
      
      // DHL stores events inside data.shipments[0].events
      if (data && data.shipments && data.shipments.length > 0 && data.shipments[0].events) {
        
        let dhlEvents = data.shipments[0].events;
        let standardizedScans = [];
        
        // UNIVERSAL ADAPTER: Convert DHL's format into our standard format
        for (let i = 0; i < dhlEvents.length; i++) {
          let ev = dhlEvents[i];
          let city = "DHL Global Network";
          
          if (ev.location && ev.location.address && ev.location.address.addressLocality) {
            city = ev.location.address.addressLocality;
          }

          standardizedScans.push({
            ScanDescription: ev.description || ev.statusCode || "Status Updated",
            City: city,
            ScanDateTime: ev.timestamp,
            Notes: ev.remark || "" // Add this line
          });
        }

        return { success: true, payload: { Scans: standardizedScans } };
      } else {
        return { success: false, message: "AWB Found, but no scan history exists yet." };
      }
    } else if (responseCode === 404 || responseCode === 204) {
      return { success: false, message: "No tracking data found for AWB " + awbNumber + " at DHL." };
    } else {
      return { success: false, message: "DHL Error " + responseCode + ": " + responseBody };
    }
    
  } catch (error) {
    return { success: false, message: "Connection Failed: " + error.message };
  }
}
/**
 * Helper to fetch the physical location (City/Area) of a specific branch.
 * MAPPED TO: 'Branches' sheet. Searches Col B (Name), returns Col D (Location).
 */
function getBranchPhysicalLocation(branchName) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const branchSheet = ss.getSheetByName('Branches'); // Corrected Sheet Name
    if (!branchSheet) return branchName; 

    const data = branchSheet.getDataRange().getValues();
    
    for (let i = 1; i < data.length; i++) {
      // Column B (Index 1) is the Branch Name
      let sheetBranchName = String(data[i][1]).trim().toUpperCase();
      let searchBranchName = String(branchName).trim().toUpperCase();
      
      if (sheetBranchName === searchBranchName) {
        // Column D (Index 3) is the actual Location
        let actualLocation = String(data[i][3]).trim();
        
        // Return the location. If the location cell is accidentally empty, fall back to the branch name.
        return actualLocation !== "" ? actualLocation : branchName; 
      }
    }
    return branchName; // Fallback to Branch Name if it couldn't find a match
  } catch (e) {
    return branchName;
  }
}
/**
 * Connects to the Delhivery LTL/B2B API.
 * Tracks shipments directly, but silently falls back to 17Track 
 * if booked via a 3rd party account or if the API fails.
 */
function trackDelhiveryShipment(lrn) {
  try {
    // 1. Authenticate & Get Token
    const authUrl = "https://ltl-clients-api.delhivery.com/ums/login"; 
    const authPayload = {
      "username": "ALFARHACARGO1614B2B",
      "password": "99081618@Alf"
    };
    
    const authOptions = {
      "method": "post",
      "contentType": "application/json",
      "payload": JSON.stringify(authPayload),
      "muteHttpExceptions": true
    };
    
    const authResponse = UrlFetchApp.fetch(authUrl, authOptions);
    const authCode = authResponse.getResponseCode();
    const authText = authResponse.getContentText();
    
    // --- FALLBACK TRIGGER 1: Auth Fails ---
    if (authCode !== 200 || authText.trim().startsWith("<")) {
       return track17TrackShipment(lrn, "DELHIVERY");
    }
    
    const authData = JSON.parse(authText);
    
    let token = null;
    if (authData.data && authData.data.jwt) {
      token = authData.data.jwt;
    } else if (authData.token) {
      token = authData.token;
    }
    
    if (!token) {
      return track17TrackShipment(lrn, "DELHIVERY");
    }
    
    // 2. Fetch Tracking Data
    const cleanLrn = encodeURIComponent(String(lrn).trim());
    const trackingUrl = `https://ltl-clients-api.delhivery.com/lrn/track?lrnum=${cleanLrn}`;
    
    const trackingOptions = {
      "method": "get",
      "headers": {
        "Authorization": `Bearer ${token}`
      },
      "muteHttpExceptions": true
    };
    
    const trackResponse = UrlFetchApp.fetch(trackingUrl, trackingOptions);
    const trackCode = trackResponse.getResponseCode();
    const trackText = trackResponse.getContentText();
    
    // --- FALLBACK TRIGGER 2: Docket Not Found or API Fails ---
    if (trackCode === 404 && trackText.includes("Data not found")) {
        return track17TrackShipment(lrn, "DELHIVERY");
    } else if (trackCode !== 200 || trackText.trim().startsWith("<")) {
       return track17TrackShipment(lrn, "DELHIVERY");
    }

    const trackData = JSON.parse(trackText);
    
    // 3. Normalize data for the UI
    let rawScans = trackData.data || trackData.scans || (Array.isArray(trackData) ? trackData : []);
    
    // --- FALLBACK TRIGGER 3: Empty Scans Array ---
    if (!rawScans || rawScans.length === 0) {
       return track17TrackShipment(lrn, "DELHIVERY");
    }
    
    let normalizedScans = [];
    for (let i = 0; i < rawScans.length; i++) {
       let scan = rawScans[i];
       normalizedScans.push({
          ScanDescription: scan.status || scan.activity || scan.ScanDescription || "Update Received",
          City: scan.location || scan.city || scan.City || "Delhivery Network",
          ScanDateTime: scan.date || scan.timestamp || scan.ScanDateTime || new Date().toISOString(),
          Notes: scan.remark || scan.instructions || ""
       });
    }
    
    return { success: true, payload: { Scans: normalizedScans } };
    
  } catch (error) {
    // --- FALLBACK TRIGGER 4: Total Crash ---
    // If the code crashes for any reason, use 17Track as a failsafe
    return track17TrackShipment(lrn, "DELHIVERY");
  }
}

/**
 * NIGHTLY JANITOR: Auto-Archives Delivered bookings older than 90 days.
 * Moves data to Archive_Bookings and Archive_Tracking_Log to keep the system lightning fast.
 */
function autoArchiveDeliveredBookings() {
  const ss = typeof SPREADSHEET_ID !== 'undefined' 
        ? SpreadsheetApp.openById(SPREADSHEET_ID) 
        : SpreadsheetApp.getActiveSpreadsheet();
        
  const activeBookings = ss.getSheetByName('Bookings');
  const archiveBookings = ss.getSheetByName('Archive_Bookings');
  const activeLogs = ss.getSheetByName('Tracking_Log');
  const archiveLogs = ss.getSheetByName('Archive_Tracking_Log');
  
  if (!activeBookings || !archiveBookings || !activeLogs || !archiveLogs) {
    Logger.log("Missing Archive Sheets! Please create them.");
    return;
  }
  
  // Calculate the cutoff date (90 days ago)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 90);
  
  const bData = activeBookings.getDataRange().getValues();
  let archivedAwbSet = new Set();
  
  Logger.log("Starting Archive Sweep...");

  // 1. SWEEP BOOKINGS (Looping backwards is required when deleting rows)
  for (let i = bData.length - 1; i >= 1; i--) {
    let rawStatus = String(bData[i][12]).toUpperCase(); // Col M (Index 12) is Status
    let bookingDate = new Date(bData[i][1]);            // Col B (Index 1) is Date
    let awb = String(bData[i][0]).replace(/^'/, "").trim(); // Col A is Booking ID
    
    if (!awb) continue;

    // If it is Delivered AND older than 90 days
    if (rawStatus.includes('DELIVERED') && bookingDate < cutoffDate) {
      // Copy to Archive
      archiveBookings.appendRow(bData[i]);
      archivedAwbSet.add(awb);
      
      // Delete from Active Sheet
      activeBookings.deleteRow(i + 1); 
    }
  }
  
  Logger.log(`Archived ${archivedAwbSet.size} bookings.`);

  // 2. SWEEP TRACKING LOGS
  if (archivedAwbSet.size > 0) {
    const lData = activeLogs.getDataRange().getValues();
    let logsMoved = 0;
    
    // Loop backwards through logs
    for (let i = lData.length - 1; i >= 1; i--) {
      let logAwb = String(lData[i][1]).replace(/^'/, "").trim(); // Col B is AWB
      
      // If this log belongs to an AWB we just archived...
      if (archivedAwbSet.has(logAwb)) {
        archiveLogs.appendRow(lData[i]);
        activeLogs.deleteRow(i + 1);
        logsMoved++;
      }
    }
    Logger.log(`Archived ${logsMoved} tracking logs.`);
  }
  
  Logger.log("Archive Sweep Complete!");
}


/**
 * Connects to the 17Track Universal API (v2.4).
 * Fully mapped to your live tracking data structure with Auto-Param support!
 */
function track17TrackShipment(awbNumber, agentName) {
  const API_KEY = "C2A4A2CE16F89E5B2F1BAEC8B0F4513D"; 
  
  const cleanAwb = String(awbNumber).trim();
  const safeAgent = String(agentName || "").toUpperCase();
  
  let carrierCode = null;
  let queryParam = null; 
  
  if (safeAgent.includes('FEDEX')) carrierCode = 100003;
  else if (safeAgent.includes('UPS')) carrierCode = 100002;
  else if (safeAgent.includes('USPS')) carrierCode = 100001;
  else if (safeAgent.includes('DPD')) carrierCode = 100010;
  else if (safeAgent.includes('ROYAL MAIL')) carrierCode = 100008;
  else if (safeAgent.includes('DELHIVERY')) {
      carrierCode = 100060; 
      
      // Auto-switch based on tracking number length (17Track requires numeric Query Types)
      if (cleanAwb.length < 10) {
          queryParam = "3"; // 17Track Query Type for LRN
      } else {
          queryParam = "1"; // 17Track Query Type for AWB
      }
  }

  const urlInfo = "https://api.17track.net/track/v2.4/gettrackinfo";
  const urlRegister = "https://api.17track.net/track/v2.4/register";

  const headers = {
    "17token": API_KEY,
    "Content-Type": "application/json"
  };

  let payloadObj = { "number": cleanAwb };
  if (carrierCode) {
    payloadObj.carrier = carrierCode;
  }
  if (queryParam) {
    payloadObj.param = queryParam; 
  }
  
  const payloadData = JSON.stringify([payloadObj]);
  const options = { method: "post", headers: headers, payload: payloadData, muteHttpExceptions: true };

  try {
    let response = UrlFetchApp.fetch(urlInfo, options);
    let data = JSON.parse(response.getContentText());

    if (data.data && data.data.rejected && data.data.rejected.length > 0) {
      let regResponse = UrlFetchApp.fetch(urlRegister, options); 
      let regData = JSON.parse(regResponse.getContentText());
      
      if (regData.data && regData.data.accepted && regData.data.accepted.length > 0) {
        return { success: false, message: "Successfully registered in 17Track v2.4! Will sync on next run." };
      } else if (regData.data && regData.data.rejected && regData.data.rejected.length > 0) {
        let errorCode = regData.data.rejected[0].error.code;
        let errorMsg = regData.data.rejected[0].error.message;
        
        if (errorCode === -18019903) {
           return { success: false, message: "Tracking Unavailable: Carrier format not supported by Universal Tracker." };
        }
        return { success: false, message: `17Track Rejected: ${errorMsg} (Code: ${errorCode})` };
      } else {
        return { success: false, message: "17Track Registration Failed." };
      }
    }

    if (data.data && data.data.accepted && data.data.accepted.length > 0) {
      let acceptedObj = data.data.accepted[0];
      let events = [];
      
      if (acceptedObj.track_info && acceptedObj.track_info.tracking && acceptedObj.track_info.tracking.providers) {
        let providers = acceptedObj.track_info.tracking.providers;
        for (let p = 0; p < providers.length; p++) {
          if (providers[p].events) {
            events = events.concat(providers[p].events);
          }
        }
      }

      if (events.length === 0) {
        return { success: false, message: "Registered, but no event rows found in cache yet." };
      }

      let standardizedScans = [];
      for (let i = 0; i < events.length; i++) {
        standardizedScans.push({
          ScanDescription: events[i].description || "Status Updated",
          City: events[i].location || "Global Network",
          ScanDateTime: events[i].time_iso || new Date().toISOString(),
          Notes: events[i].sub_status || "" // Add this line
        });
      }

      standardizedScans.sort((a, b) => new Date(b.ScanDateTime) - new Date(a.ScanDateTime));

      return { success: true, payload: { Scans: standardizedScans } };
    }

    return { success: false, message: "No valid data returned from Universal Tracker." };

  } catch (error) {
    return { success: false, message: "17Track Connection Failed: " + error.message };
  }
}