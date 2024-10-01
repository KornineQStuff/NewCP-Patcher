const { contextBridge, ipcRenderer } = require('electron');

// Expose limited API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  removeAds: () => ipcRenderer.send('remove-ads')
});

contextBridge.exposeInMainWorld('api', {
    onPreloadLoaded: (callback) => ipcRenderer.on('preload-loaded', callback)
});
// Listen for the preload loaded event
ipcMain.on('preload-loaded', (event) => {
    event.sender.send('preload-loaded', true);
});
// Listen for the ad removal command sent by the main process
ipcRenderer.on('remove-ads', () => {
  // Define ad selectors and patterns
  const adSelectors = [
    '[data-google-query-id]',    // Google Ads
    'iframe[src*="ads"]',        // Ads inside iframes with "ads" in the URL
    'iframe[src*="adservice"]',  // General ad service iframes
    '.ad-container',             // Common ad container classes
    '.advertisement',            // Elements with generic "advertisement" class
    '[id*="ad"]',                // Elements with "ad" in their ID
    '[class*="ad"]',             // Elements with "ad" in their class
    '[src*="doubleclick"]',      // DoubleClick Ads
    '[src*="googlesyndication"]' // Google Syndication Ads
  ];

  // Remove ads based on selectors
  adSelectors.forEach((selector) => {
    const ads = document.querySelectorAll(selector);
    ads.forEach((ad) => {
      ad.remove();
    });
  });
});
