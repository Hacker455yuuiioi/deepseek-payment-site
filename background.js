// background.js - Simple tracking only
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({ 
      install_date: Date.now(),
      usage_stats: {
        searches: [],
        clicks: [],
        installDate: Date.now()
      }
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'ping') {
    sendResponse({ pong: true });
  }
  if (request.action === 'trackSearch') {
    trackEvent('search', request.data);
    sendResponse({ success: true });
  }
  if (request.action === 'trackClick') {
    trackEvent('click', request.data);
    sendResponse({ success: true });
  }
  return true;
});

function trackEvent(type, data) {
  chrome.storage.local.get(['usage_stats'], (result) => {
    const stats = result.usage_stats || { searches: [], clicks: [], installDate: Date.now() };
    
    if (type === 'search') {
      stats.searches.push({
        timestamp: Date.now(),
        query: data.query,
        results: data.results
      });
    } else if (type === 'click') {
      stats.clicks.push({
        timestamp: Date.now(),
        title: data.title,
        daysAgo: data.daysAgo
      });
    }
    
    if (stats.searches.length > 100) stats.searches = stats.searches.slice(-100);
    if (stats.clicks.length > 100) stats.clicks = stats.clicks.slice(-100);
    
    chrome.storage.local.set({ usage_stats: stats });
  });
}