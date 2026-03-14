document.addEventListener('DOMContentLoaded', function() {
  function loadStats() {
    chrome.storage.local.get(['usage_stats'], (data) => {
      const stats = data.usage_stats || { 
        searches: [], 
        clicks: [], 
        installDate: Date.now() 
      };
      
      document.getElementById('searchCount').textContent = stats.searches.length;
      document.getElementById('clickCount').textContent = stats.clicks.length;
      
      if (stats.installDate) {
        const date = new Date(stats.installDate);
        document.getElementById('installDate').textContent = 
          date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
    });
  }
  
  loadStats();
  
  document.getElementById('resetStats').addEventListener('click', () => {
    if (confirm('Reset all usage statistics?')) {
      chrome.storage.local.set({
        usage_stats: { 
          searches: [], 
          clicks: [], 
          installDate: Date.now() 
        }
      }, () => {
        loadStats();
      });
    }
  });
  
  setInterval(loadStats, 2000);
});