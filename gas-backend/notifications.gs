// ==========================================
// SMART EMAIL FILTER CONFIGURATION
// ==========================================
const MAJOR_STATUS_KEYWORDS = [
  "booked",
  "picked up",
  "dispatched",
  "out for delivery",
  "delivered",
  "hold",
  "delay",
  "customs",
  "exception",
  "return",
  "fail"
];

// ==========================================
// ACTION: SUBSCRIBE EMAIL
// ==========================================
function handleEmailSubscription(data) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SUBSCRIPTIONS_SHEET);
  
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SUBSCRIPTIONS_SHEET);
    sheet.appendRow(["Timestamp", "AWB", "Email"]);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(["Timestamp", "AWB", "Email"]);
  }
  
  let safeAwb = "'" + String(data.awb).trim().replace(/^'/, "");
  sheet.appendRow([new Date().toISOString(), safeAwb, data.email]);
  
  // Trigger the Welcome Email immediately after saving
  try {
    sendWelcomeEmail(data.email, data.awb, data.status || "In Transit");
  } catch (e) {
    console.error("Failed to send welcome email: " + e.toString());
  }
  
  return respondJSON({ success: true, message: "Email saved and welcome email sent." });
}

// ==========================================
// HELPER: BROADCAST HTML EMAIL ALERTS
// ==========================================
function sendEmailAlerts(awb, status, location) {
  
  // --- SMART FILTER: Check if this is a major update ---
  let isMajor = false;
  let lowerStatus = String(status).toLowerCase();
  
  for (let i = 0; i < MAJOR_STATUS_KEYWORDS.length; i++) {
    if (lowerStatus.includes(MAJOR_STATUS_KEYWORDS[i])) {
      isMajor = true;
      break;
    }
  }

  // If it's just a minor hub scan, exit quietly without emailing
  if (!isMajor) {
    return; 
  }
  // -----------------------------------------------------

  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let subSheet = ss.getSheetByName(CONFIG.SUBSCRIPTIONS_SHEET);
  let bookSheet = ss.getSheetByName(CONFIG.BOOKINGS_SHEET); 
  
  if (!subSheet || !bookSheet) return;

  let data = subSheet.getDataRange().getValues();
  let emailsToSend = [];
  let safeTargetAwb = String(awb).trim().replace(/^'/, "").toUpperCase();

  // Find all email subscribers for this specific AWB
  for (let i = 1; i < data.length; i++) {
    let rowAwb = String(data[i][1]).trim().replace(/^'/, "").toUpperCase();
    let rowEmail = String(data[i][2]).trim();

    if (rowAwb === safeTargetAwb && rowEmail && rowEmail.includes("@")) {
      if (!emailsToSend.includes(rowEmail)) {
        emailsToSend.push(rowEmail);
      }
    }
  }

  if (emailsToSend.length === 0) return;

  // --- FETCH ORIGIN AND DESTINATION DATA ---
  let bData = bookSheet.getDataRange().getValues();
  let originCity = "Origin";
  let originCountry = "";
  let destinationCity = "Destination";
  let destinationCountry = "";

  for (let i = 1; i < bData.length; i++) {
    let sheetAwb = String(bData[i][CONFIG.B_AWB]).trim().replace(/^'/, "").toUpperCase();
    if (sheetAwb === safeTargetAwb) {
      originCity = String(bData[i][CONFIG.B_ORIGIN] || "Origin").split(',')[0];
      originCountry = String(bData[i][CONFIG.B_ORIGIN_COUNTRY] || "");
      destinationCity = String(bData[i][CONFIG.B_DEST] || "Destination").split(',')[0];
      destinationCountry = String(bData[i][CONFIG.B_DEST_COUNTRY] || "");
      break;
    }
  }

  // --- DYNAMIC THEME ENGINE ---
  // Default Theme: In Transit (Purple/Orange)
  let theme = {
    color: "#F38220",
    grad1: "#76347A",
    grad2: "#4A1F4D",
    pillText: "New Activity",
    pillBg: "rgba(243, 130, 32, 0.15)",
    pillBorder: "rgba(243, 130, 32, 0.4)",
    mainTitle: "Tracking Update",
    introText: "Your international shipment has been scanned. Please review the latest routing details below.",
    icon: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'><path fill='%23F38220' d='M21,16V14L13,9V3.5A1.5,1.5 0 0,0 11.5,2A1.5,1.5 0 0,0 10,3.5V9L2,14V16L10,13.5V19L8,20.5V22L11.5,21L15,22V20.5L13,19V13.5L21,16Z' /></svg>`
  };

  // Success Theme: Delivered (Emerald Green)
  if (lowerStatus.includes('delivered')) {
    theme.color = "#10B981";
    theme.grad1 = "#059669";
    theme.grad2 = "#064E3B";
    theme.pillText = "Shipment Delivered";
    theme.pillBg = "rgba(16, 185, 129, 0.15)";
    theme.pillBorder = "rgba(16, 185, 129, 0.4)";
    theme.mainTitle = "Package Delivered!";
    theme.introText = "Great news! Your shipment has been successfully delivered to its destination. Thank you for choosing Al-Farha Cargo.";
    theme.icon = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'><path fill='%2310B981' d='M12 2C6.5 2 2 6.5 2 12S6.5 22 12 22 22 17.5 22 12 17.5 2 12 2M10 17L5 12L6.41 10.59L10 14.17L17.59 6.58L19 8L10 17Z' /></svg>`;
  } 
  // Exception Theme: Delay, Hold, Return, Fail (Crimson Red)
  else if (lowerStatus.includes('exception') || lowerStatus.includes('fail') || lowerStatus.includes('return') || lowerStatus.includes('hold') || lowerStatus.includes('delay') || lowerStatus.includes('cancel')) {
    theme.color = "#EF4444";
    theme.grad1 = "#DC2626";
    theme.grad2 = "#7F1D1D";
    theme.pillText = "Attention Required";
    theme.pillBg = "rgba(239, 68, 68, 0.15)";
    theme.pillBorder = "rgba(239, 68, 68, 0.4)";
    theme.mainTitle = "Delivery Exception";
    theme.introText = "There is an important update regarding your shipment. Please review the details below.";
    theme.icon = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'><path fill='%23EF4444' d='M13 14H11V9H13M13 18H11V16H13M1 21H23L12 2L1 21Z' /></svg>`;
  }

  // Convert SVG icon to a URL-safe data string for emails
  let encodedIcon = "data:image/svg+xml," + encodeURIComponent(theme.icon);
  let subject = `Al-Farha Cargo Update: ${awb} is ${status}`;
  
  // Premium Branded HTML Template (Dynamic Version)
  let htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Al-Farha Cargo Update</title>
    <!-- Import Custom Fonts -->
    <style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=Lexend:wght@400;500;600&family=Poppins:wght@400;600;700&display=swap');
      
      /* Responsive styles for mobile */
      @media screen and (max-width: 600px) {
        .responsive-padding { padding: 20px !important; }
        .mobile-text-center { text-align: center !important; }
        .route-card { padding: 15px !important; }
        .city-name { font-size: 20px !important; }
        .plane-icon-cell { padding: 0 10px !important; }
      }
    </style>
    <!--[if mso]>
    <style type="text/css">
      table {border-collapse: collapse;}
      h1, h2, h3, p, span {font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif !important;}
    </style>
    <![endif]-->
  </head>
  <body style="margin: 0; padding: 0; background-color: #F5F0E6; -webkit-font-smoothing: antialiased;">
    
    <!-- Outer Wrapper -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F0E6; padding: 40px 20px;">
      <tr>
        <td align="center">

          <!-- Main Email Container -->
          <table width="100%" max-width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(42, 59, 76, 0.08); max-width: 600px; width: 100%;">
            
            <!-- GRAPHIC DESIGNED BANNER -->
            <tr>
              <td class="responsive-padding" style="background: linear-gradient(135deg, ${theme.grad1} 0%, ${theme.grad2} 100%); padding: 45px 30px; text-align: center; border-bottom: 5px solid ${theme.color};">
                
                <!-- Pill Badge -->
                <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
                  <tr>
                    <td style="background-color: ${theme.pillBg}; border: 1px solid ${theme.pillBorder}; border-radius: 20px; padding: 6px 16px;">
                      <span style="color: ${theme.color}; font-family: 'Lexend', 'Helvetica Neue', sans-serif; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">${theme.pillText}</span>
                    </td>
                  </tr>
                </table>

                <!-- Main Title -->
                <h1 style="color: #ffffff; margin: 0; font-family: 'Poppins', 'Helvetica Neue', sans-serif; font-size: 34px; font-weight: 700; letter-spacing: -1px; line-height: 1.2;">
                  ${theme.mainTitle}
                </h1>
                
                <!-- Subtitle AWB -->
                <p style="color: #E2E8F0; font-family: 'Lexend', 'Helvetica Neue', sans-serif; font-size: 15px; margin: 12px 0 0 0; font-weight: 400; opacity: 0.9;">
                  Waybill Number <strong style="color: #ffffff; font-family: 'Poppins', sans-serif;">#${awb}</strong>
                </p>

              </td>
            </tr>

            <!-- Greeting & Intro -->
            <tr>
              <td class="responsive-padding" style="padding: 40px 40px 20px 40px;">
                <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; font-size: 16px; line-height: 1.6; color: #2A3B4C; margin: 0 0 8px 0;">Hello,</p>
                <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; font-size: 16px; line-height: 1.6; color: #475569; margin: 0;">
                  ${theme.introText}
                </p>
              </td>
            </tr>

            <!-- Route/Origin-Destination Card -->
            <tr>
              <td class="responsive-padding" style="padding: 0px 40px 20px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" class="route-card" style="background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px;">
                  <tr>
                    <!-- Origin -->
                    <td width="35%" align="left" valign="middle">
                      <p class="city-name" style="font-family: 'Poppins', 'Helvetica Neue', sans-serif; margin: 0 0 4px 0; font-size: 24px; font-weight: 700; color: #2A3B4C;">${originCity}</p>
                      <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; margin: 0; font-size: 14px; color: #64748B; font-weight: 500;">${originCountry}</p>
                    </td>
                    
                    <!-- Dynamic Icon and Dotted Lines -->
                    <td width="30%" align="center" valign="middle" class="plane-icon-cell" style="padding: 0 15px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <!-- Left Dotted Line -->
                          <td width="40%" valign="middle" style="border-bottom: 2px dashed #CBD5E1;">&nbsp;</td>
                          <!-- Dynamic SVG Icon -->
                          <td width="20%" align="center" valign="middle" style="padding: 0 5px;">
                            <img src="${encodedIcon}" alt="Status Icon" width="24" height="24" style="display: block; border: 0;" />
                          </td>
                          <!-- Right Dotted Line -->
                          <td width="40%" valign="middle" style="border-bottom: 2px dashed #CBD5E1;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>

                    <!-- Destination -->
                    <td width="35%" align="right" valign="middle">
                      <p class="city-name" style="font-family: 'Poppins', 'Helvetica Neue', sans-serif; margin: 0 0 4px 0; font-size: 24px; font-weight: 700; color: #2A3B4C;">${destinationCity}</p>
                      <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; margin: 0; font-size: 14px; color: #64748B; font-weight: 500;">${destinationCountry}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Shipment Details Card -->
            <tr>
              <td class="responsive-padding" style="padding: 10px 40px 30px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 24px;">
                  <tr>
                    <td style="padding-bottom: 18px;">
                      <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; margin: 0 0 6px 0; font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">Current Status</p>
                      <p style="font-family: 'Poppins', 'Helvetica Neue', sans-serif; margin: 0; font-size: 24px; font-weight: 700; color: ${theme.color};">${status}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="border-top: 1px dashed #CBD5E1; padding-top: 18px;">
                      <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; margin: 0 0 6px 0; font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">Current Location</p>
                      <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; margin: 0; font-size: 16px; color: #2A3B4C; font-weight: 500;">
                        ${location}
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Action Button -->
            <tr>
              <td align="center" class="responsive-padding" style="padding: 10px 40px 45px 40px;">
                <table width="100%" border="0" cellspacing="0" cellpadding="0">
                  <tr>
                    <td align="center">
                      <a href="https://alftrck.vercel.app/track?awb=${awb}" target="_blank" style="display: inline-block; background-color: ${theme.grad1}; color: #ffffff; font-family: 'Lexend', 'Helvetica Neue', sans-serif; text-decoration: none; padding: 16px 36px; border-radius: 30px; font-weight: 600; font-size: 15px; box-shadow: 0 6px 16px ${theme.pillBorder};">
                        Track Shipment Live
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="responsive-padding" style="background-color: #F8FAFC; padding: 30px 40px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; margin: 0 0 12px 0; font-size: 13px; color: #64748B; line-height: 1.5;">
                  Need help with your delivery? <br>
                  Reply directly to this email or contact our support team.
                </p>
                <div style="height: 1px; background-color: #E2E8F0; width: 40px; margin: 0 auto 12px auto;"></div>
                <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; margin: 0; font-size: 12px; color: #94A3B8; font-weight: 500;">
                  &copy; ${new Date().getFullYear()} Al-Farha Cargo International.<br>All rights reserved.
                </p>
              </td>
            </tr>
            
          </table>
          
          <!-- Spacer below email -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="height: 40px;"></td></tr>
          </table>

        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  // Updated plain-text fallback
  let textBody = `Hello,\n\n${theme.introText}\n\nWaybill: ${awb}\nRoute: ${originCity}, ${originCountry} -> ${destinationCity}, ${destinationCountry}\nLatest Status: ${status}\nLocation: ${location}\n\nTrack Shipment Live: https://alftrck.vercel.app/track?awb=${awb}\n\nThank you,\nAl-Farha Cargo International`;

  // Dispatch via GmailApp using the authenticated Nuvanago subdomain
  emailsToSend.forEach(email => {
    try {
      GmailApp.sendEmail(email, subject, textBody, {
        htmlBody: htmlBody,
        name: "Al-Farha Cargo Tracking",
        from: "track@alf.nuvanago.in", 
        replyTo: "track@alf.nuvanago.in"
      });
    } catch(e) {
      // Fallback
      try {
        GmailApp.sendEmail(email, subject, textBody, {
          htmlBody: htmlBody,
          name: "Al-Farha Cargo Tracking"
        });
      } catch(fallbackErr) {}
    }
  });
}

// ==========================================
// HELPER: SEND WELCOME SUBSCRIPTION EMAIL
// ==========================================
function sendWelcomeEmail(recipientEmail, awb, currentStatus) {
  let ss = SpreadsheetApp.getActiveSpreadsheet();
  let bookSheet = ss.getSheetByName(CONFIG.BOOKINGS_SHEET); 
  
  let safeTargetAwb = String(awb).trim().replace(/^'/, "").toUpperCase();
  let originCity = "Origin";
  let originCountry = "";
  let destinationCity = "Destination";
  let destinationCountry = "";

  // Fetch routing data if the bookings sheet exists
  if (bookSheet) {
    let bData = bookSheet.getDataRange().getValues();
    for (let i = 1; i < bData.length; i++) {
      let sheetAwb = String(bData[i][CONFIG.B_AWB]).trim().replace(/^'/, "").toUpperCase();
      if (sheetAwb === safeTargetAwb) {
        originCity = String(bData[i][CONFIG.B_ORIGIN] || "Origin").split(',')[0];
        originCountry = String(bData[i][CONFIG.B_ORIGIN_COUNTRY] || "");
        destinationCity = String(bData[i][CONFIG.B_DEST] || "Destination").split(',')[0];
        destinationCountry = String(bData[i][CONFIG.B_DEST_COUNTRY] || "");
        break;
      }
    }
  }

  // Welcome Email Theme Configuration (Brand Purple/Orange)
  let theme = {
    color: "#76347A", // Brand Purple
    grad1: "#76347A",
    grad2: "#4A1F4D",
    pillText: "Alerts Activated",
    pillBg: "rgba(118, 52, 122, 0.15)",
    pillBorder: "rgba(118, 52, 122, 0.4)",
    mainTitle: "You're Subscribed! &#127881;",
    introText: "Thank you for subscribing to status updates. We will notify you instantly when there are major tracking updates for your shipment.",
    icon: `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' width='24' height='24'><path fill='%23F38220' d='M21 19V20H3V19L5 17V11C5 7.9 7.03 5.17 10 4.29C10 4.19 10 4.1 10 4C10 2.9 10.9 2 12 2C13.11 2 14 2.9 14 4C14 4.1 14 4.19 14 4.29C16.97 5.17 19 7.9 19 11V17L21 19M14 21C14 22.1 13.1 23 12 23C10.9 23 10 22.1 10 21H14Z' /></svg>` // Bell icon in Brand Orange
  };

  let encodedIcon = "data:image/svg+xml," + encodeURIComponent(theme.icon);
  let subject = `Tracking Alerts Activated for ${awb} | Al-Farha Cargo`;
  
  // Premium Branded HTML Template
  let htmlBody = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Al-Farha Cargo Subscribed</title>
    <style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Comfortaa:wght@700&family=Lexend:wght@400;500;600&family=Poppins:wght@400;600;700&display=swap');
      @media screen and (max-width: 600px) {
        .responsive-padding { padding: 20px !important; }
        .route-card { padding: 15px !important; }
        .city-name { font-size: 20px !important; }
        .plane-icon-cell { padding: 0 10px !important; }
      }
    </style>
  </head>
  <body style="margin: 0; padding: 0; background-color: #F5F0E6; -webkit-font-smoothing: antialiased;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F5F0E6; padding: 40px 20px;">
      <tr>
        <td align="center">
          <table width="100%" max-width="600" cellpadding="0" cellspacing="0" border="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(42, 59, 76, 0.08); max-width: 600px; width: 100%;">
            
            <!-- GRAPHIC DESIGNED BANNER -->
            <tr>
              <td class="responsive-padding" style="background: linear-gradient(135deg, ${theme.grad1} 0%, ${theme.grad2} 100%); padding: 45px 30px; text-align: center; border-bottom: 5px solid #F38220;">
                <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 0 auto 16px auto;">
                  <tr>
                    <td style="background-color: ${theme.pillBg}; border: 1px solid ${theme.pillBorder}; border-radius: 20px; padding: 6px 16px;">
                      <span style="color: #ffffff; font-family: 'Lexend', 'Helvetica Neue', sans-serif; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px;">${theme.pillText}</span>
                    </td>
                  </tr>
                </table>
                <h1 style="color: #ffffff; margin: 0; font-family: 'Poppins', 'Helvetica Neue', sans-serif; font-size: 34px; font-weight: 700; letter-spacing: -1px; line-height: 1.2;">
                  ${theme.mainTitle}
                </h1>
                <p style="color: #E2E8F0; font-family: 'Lexend', 'Helvetica Neue', sans-serif; font-size: 15px; margin: 12px 0 0 0; font-weight: 400; opacity: 0.9;">
                  Alerts enabled for Waybill <strong style="color: #ffffff; font-family: 'Poppins', sans-serif;">#${awb}</strong>
                </p>
              </td>
            </tr>

            <!-- Greeting & Intro -->
            <tr>
              <td class="responsive-padding" style="padding: 40px 40px 20px 40px;">
                <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; font-size: 16px; line-height: 1.6; color: #2A3B4C; margin: 0 0 8px 0;">Hello,</p>
                <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; font-size: 16px; line-height: 1.6; color: #475569; margin: 0;">
                  ${theme.introText}
                </p>
              </td>
            </tr>

            <!-- Route/Origin-Destination Card -->
            <tr>
              <td class="responsive-padding" style="padding: 0px 40px 20px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" class="route-card" style="background-color: #ffffff; border: 1px solid #E2E8F0; border-radius: 12px; padding: 20px;">
                  <tr>
                    <td width="35%" align="left" valign="middle">
                      <p class="city-name" style="font-family: 'Poppins', 'Helvetica Neue', sans-serif; margin: 0 0 4px 0; font-size: 24px; font-weight: 700; color: #2A3B4C;">${originCity}</p>
                      <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; margin: 0; font-size: 14px; color: #64748B; font-weight: 500;">${originCountry}</p>
                    </td>
                    <td width="30%" align="center" valign="middle" class="plane-icon-cell" style="padding: 0 15px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td width="40%" valign="middle" style="border-bottom: 2px dashed #CBD5E1;">&nbsp;</td>
                          <td width="20%" align="center" valign="middle" style="padding: 0 5px;">
                            <img src="${encodedIcon}" alt="Alert Icon" width="24" height="24" style="display: block; border: 0;" />
                          </td>
                          <td width="40%" valign="middle" style="border-bottom: 2px dashed #CBD5E1;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                    <td width="35%" align="right" valign="middle">
                      <p class="city-name" style="font-family: 'Poppins', 'Helvetica Neue', sans-serif; margin: 0 0 4px 0; font-size: 24px; font-weight: 700; color: #2A3B4C;">${destinationCity}</p>
                      <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; margin: 0; font-size: 14px; color: #64748B; font-weight: 500;">${destinationCountry}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Shipment Details Card -->
            <tr>
              <td class="responsive-padding" style="padding: 10px 40px 30px 40px;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #F8FAFC; border-left: 4px solid #F38220; padding: 20px; border-radius: 0 8px 8px 0;">
                  <tr>
                    <td>
                      <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; margin: 0 0 6px 0; font-size: 11px; color: #64748B; text-transform: uppercase; font-weight: 600; letter-spacing: 1px;">Current Package Status</p>
                      <p style="font-family: 'Poppins', 'Helvetica Neue', sans-serif; margin: 0; font-size: 20px; font-weight: 700; color: #2A3B4C;">${currentStatus}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- Action Button -->
            <tr>
              <td align="center" class="responsive-padding" style="padding: 10px 40px 45px 40px;">
                <a href="https://alftrck.vercel.app/track?awb=${awb}" target="_blank" style="display: inline-block; background-color: #F38220; color: #ffffff; font-family: 'Lexend', 'Helvetica Neue', sans-serif; text-decoration: none; padding: 16px 36px; border-radius: 30px; font-weight: 600; font-size: 15px; box-shadow: 0 6px 16px rgba(243, 130, 32, 0.25);">
                  View Live Tracking
                </a>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="responsive-padding" style="background-color: #F8FAFC; padding: 30px 40px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; margin: 0 0 12px 0; font-size: 13px; color: #64748B; line-height: 1.5;">
                  Need help with your delivery? <br>
                  Reply directly to this email or contact our support team.
                </p>
                <div style="height: 1px; background-color: #E2E8F0; width: 40px; margin: 0 auto 12px auto;"></div>
                <p style="font-family: 'Lexend', 'Helvetica Neue', sans-serif; margin: 0; font-size: 12px; color: #94A3B8; font-weight: 500;">
                  &copy; ${new Date().getFullYear()} Al-Farha Cargo International.<br>All rights reserved.
                </p>
              </td>
            </tr>
          </table>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="height: 40px;"></td></tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
  </html>
  `;

  let textBody = `Hello,\n\n${theme.introText}\n\nWaybill: ${awb}\nRoute: ${originCity}, ${originCountry} -> ${destinationCity}, ${destinationCountry}\nCurrent Status: ${currentStatus}\n\nTrack Shipment Live: https://alftrck.vercel.app/track?awb=${awb}\n\nThank you,\nAl-Farha Cargo International`;

  // Dispatch via GmailApp using the authenticated Nuvanago subdomain
  try {
    GmailApp.sendEmail(recipientEmail, subject, textBody, {
      htmlBody: htmlBody,
      name: "Al-Farha Cargo Tracking",
      from: "track@alf.nuvanago.in", 
      replyTo: "track@alf.nuvanago.in"
    });
  } catch(e) {
    // Fallback if aliases are strict
    try {
      GmailApp.sendEmail(recipientEmail, subject, textBody, {
        htmlBody: htmlBody,
        name: "Al-Farha Cargo Alerts"
      });
    } catch(fallbackErr) {
        console.error("Email Fallback Error: " + fallbackErr.toString());
    }
  }
}