/**
 * Scans the database for forwarded packages and fetches live updates.
 */
function syncForwarderTracking() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const bookingsSheet = ss.getSheetByName('Bookings');
  const logSheet = ss.getSheetByName('Tracking_Log');
  
  const data = bookingsSheet.getDataRange().getValues();
  let updatesMade = 0;
  
  // Loop through all bookings
  for (let i = 1; i < data.length; i++) {
    const bookingID = data[i][0];
    const currentStatus = data[i][11];
    const agent = data[i][13];
    const fwdTracking = data[i][14];
    
    // Only check if assigned to a forwarder AND not already delivered
    if (agent && fwdTracking && currentStatus !== "Delivered") {
      
      // Call our router function below to get the latest status
      const latestStatus = getStatusFromAgent(agent, fwdTracking);
      
      // If the API returned a status AND it's different from our current sheet status
      if (latestStatus && latestStatus !== currentStatus) {
        
        // 1. Update the Bookings sheet (Column 12 is Status)
        bookingsSheet.getRange(i + 1, 12).setValue(latestStatus);
        
        // 2. Add an entry to the Tracking_Log
        const timestamp = new Date();
        const logLastRow = logSheet.getLastRow();
        const logID = logLastRow === 1 ? 1 : parseInt(logSheet.getRange(logLastRow, 1).getValue()) + 1;
        
        // Note: 'System API' is logged as the Updated_By user
        logSheet.appendRow([logID, bookingID, latestStatus, timestamp, "System API", agent + " Network"]);
        
        updatesMade++;
      }
    }
  }
  
  return { success: true, count: updatesMade };
}

/**
 * Routes the request to the correct carrier API based on the agent name.
 */
function getStatusFromAgent(agentName, trackingNumber) {
  try {
    if (agentName === "DHL") {
      return fetchDHL(trackingNumber);
    } else if (agentName === "FedEx") {
      return fetchFedEx(trackingNumber);
    } else if (agentName === "Aramex") {
      return fetchAramex(trackingNumber);
    }
    return null; // Agent not configured
  } catch (error) {
    Logger.log("API Error for " + trackingNumber + ": " + error);
    return null;
  }
}

// --- CARRIER SPECIFIC API FUNCTIONS ---

function fetchDHL(trackingNumber) {
  // REQUIREMENT: Get an API Key from developer.dhl.com
  const apiKey = "YOUR_DHL_API_KEY_HERE"; 
  const url = "https://api-eu.dhl.com/track/shipments?trackingNumber=" + trackingNumber;
  
  const options = {
    "method": "get",
    "headers": { "DHL-API-Key": apiKey },
    "muteHttpExceptions": true
  };
  
  const response = UrlFetchApp.fetch(url, options);
  if (response.getResponseCode() === 200) {
    const data = JSON.parse(response.getContentText());
    // Parse the DHL JSON response to find the latest status description
    // Example: return data.shipments[0].status.status;
    return "In Transit (Mock DHL Update)"; // Replace with actual JSON parsing
  }
  return null;
}

function fetchFedEx(trackingNumber) {
  // REQUIREMENT: Set up OAuth on developer.fedex.com
  // FedEx requires a more complex OAuth token request first, followed by the tracking request.
  // Add your FedEx logic here.
  return "In Transit (Mock FedEx Update)";
}

function fetchAramex(trackingNumber) {
  // Add Aramex XML/JSON API logic here
  return "In Transit (Mock Aramex Update)";
}