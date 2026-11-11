// scanner.js - Universal Camera Barcode Scanner for Al-Farha PWA

function injectScannerUI() {
  const scannerStyles = `
    <style>
      .scanner-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: #0f172a; z-index: 3000; display: flex; flex-direction: column; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
      .scanner-overlay.active { opacity: 1; pointer-events: all; }
      .scanner-header { display: flex; justify-content: space-between; padding: 20px; color: white; font-family: 'Lexend', sans-serif; }
      
      #reader { width: 100%; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); background: #000; border: none !important;}
      #reader video { border-radius: 16px; object-fit: cover; }
      #reader__scan_region { background: #000; }
      #reader__dashboard_section_csr span, #reader__dashboard_section_swaplink { color: white !important; font-family: 'Lexend', sans-serif; }
    </style>
  `;

  const scannerHTML = `
    <div class="scanner-overlay" id="scannerOverlay">
      <div class="scanner-header">
        <span style="font-weight: 600;">Scan Barcode</span>
        <i class="bi bi-x-lg" style="font-size: 1.5rem; cursor: pointer;" onclick="closeScanner()"></i>
      </div>
      <div style="flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 20px;">
        <div id="reader"></div>
      </div>
    </div>
  `;

  document.head.insertAdjacentHTML('beforeend', scannerStyles);
  document.body.insertAdjacentHTML('beforeend', scannerHTML);
}

document.addEventListener('DOMContentLoaded', injectScannerUI);

// Globals for the Scanner
let html5QrCode = null;
let activeScannerMode = null;
let isProcessingScan = false;
let globalScanCallback = null;

// Audio Feedback
function playSuccessBeep() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(850, ctx.currentTime); // High pitch beep
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime); // Volume
    gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) { console.log('Audio feedback not supported in this browser environment.'); }
}

// Open the Camera
function openScanner(mode, callback) {
  activeScannerMode = mode;
  globalScanCallback = callback;
  isProcessingScan = false;
  
  document.getElementById('scannerOverlay').classList.add('active');
  
  if (!html5QrCode) {
    html5QrCode = new Html5Qrcode("reader");
  }
  
  // Configured for optimal 1D Barcode reading
  const config = { fps: 15, qrbox: { width: 280, height: 150 }, aspectRatio: 1.0 };
  
  html5QrCode.start({ facingMode: "environment" }, config, onScanSuccess)
    .catch((err) => {
      closeScanner();
      alert('Camera access denied or unavailable. Check browser permissions.');
    });
}

// Close the Camera
function closeScanner() {
  document.getElementById('scannerOverlay').classList.remove('active');
  if (html5QrCode && html5QrCode.isScanning) {
    html5QrCode.stop().catch((err) => { console.error("Failed to stop scanning.", err); });
  }
  activeScannerMode = null;
  globalScanCallback = null;
}

// Process the Scan
function onScanSuccess(decodedText) {
  if (isProcessingScan) return; 
  isProcessingScan = true;
  
  playSuccessBeep();

  // Save the mode and callback to temporary variables
  const currentMode = activeScannerMode;
  const currentCallback = globalScanCallback;

  // Pause the camera instantly to freeze the frame, then shut it down
  if (html5QrCode && html5QrCode.isScanning) { html5QrCode.pause(true); }
  closeScanner();
  
  // Give the UI a fraction of a second to hide the camera before triggering the callback
  setTimeout(() => {
    if (currentCallback) {
      currentCallback(decodedText, currentMode);
    }
    isProcessingScan = false;
  }, 300);
}