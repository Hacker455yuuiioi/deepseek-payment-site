// content.js - COMPLETELY FREE SEARCH
console.log('🚀 DeepSeek Search Pro: Content script loaded');

let allConversations = [];
let allMessages = [];

function parseExactTimestamp(element) {
  const datetimeEl = element.querySelector('[datetime]') || element;
  const datetime = datetimeEl.getAttribute('datetime');
  if (datetime) {
    try {
      const date = new Date(datetime);
      if (!isNaN(date.getTime())) return date.getTime();
    } catch (e) {}
  }

  const timeEl = element.querySelector('time');
  if (timeEl) {
    const timeText = timeEl.getAttribute('datetime') || timeEl.textContent;
    try {
      const date = new Date(timeText);
      if (!isNaN(date.getTime())) return date.getTime();
    } catch (e) {}
  }

  const text = element.textContent || '';
  
  if (text.toLowerCase().includes('today')) {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }
  
  if (text.toLowerCase().includes('yesterday')) {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }
  
  const relativeMatch = text.match(/(\d+)\s*(minute|min|hour|day|week|month|year)s?\s+ago/i);
  if (relativeMatch) {
    const value = parseInt(relativeMatch[1]);
    const unit = relativeMatch[2].toLowerCase();
    const now = Date.now();
    
    switch(unit) {
      case 'minute': case 'min': return now - (value * 60 * 1000);
      case 'hour': return now - (value * 60 * 60 * 1000);
      case 'day': return now - (value * 24 * 60 * 60 * 1000);
      case 'week': return now - (value * 7 * 24 * 60 * 60 * 1000);
      case 'month': return now - (value * 30 * 24 * 60 * 60 * 1000);
      case 'year': return now - (value * 365 * 24 * 60 * 60 * 1000);
    }
  }
  
  return null;
}

function extractAllContent() {
  const conversations = [];
  const messages = [];
  
  const convElements = document.querySelectorAll(
    '[data-conversation-id], a[href*="/chat/"], .cursor-pointer, .group, [class*="conversation"]'
  );
  
  convElements.forEach((el, index) => {
    let title = '';
    const titleSelectors = [
      '.font-medium', '.text-sm', '.truncate', 'span:not([class*="icon"])',
      '[class*="title"]', '.flex-1'
    ];
    
    for (const selector of titleSelectors) {
      const titleEl = el.querySelector(selector);
      if (titleEl && titleEl.textContent) {
        title = titleEl.textContent.trim();
        break;
      }
    }
    
    if (!title) title = el.textContent?.trim() || '';
    title = title.replace(/[\\n\\r]+/g, ' ').replace(/\s+/g, ' ').trim();
    
    if (!title || title.length < 3 ||
        title.includes('New chat') || title.includes('Settings') || title.includes('Profile')) {
      return;
    }
    
    const timestamp = parseExactTimestamp(el);
    
    conversations.push({
      id: `conv-${index}-${Date.now()}`,
      title: title,
      element: el,
      timestamp: timestamp || Date.now() - (index * 24 * 60 * 60 * 1000),
      type: 'conversation',
      fullText: title.toLowerCase()
    });
  });
  
  const messageElements = document.querySelectorAll(
    '.message, [class*="message"], .markdown-body, .prose, .whitespace-pre-wrap'
  );
  
  messageElements.forEach((el, index) => {
    const content = el.textContent?.trim() || '';
    if (content && content.length > 10) {
      messages.push({
        id: `msg-${index}-${Date.now()}`,
        content: content,
        element: el,
        type: 'message',
        role: el.matches('[class*="user"]') ? 'user' : 'assistant',
        fullText: content.toLowerCase()
      });
    }
  });
  
  return { conversations, messages };
}

function createHighlightedText(text, keyword) {
  if (!keyword) return document.createTextNode(text);
  
  const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts = text.split(new RegExp(`(${escapedKeyword})`, 'gi'));
  const fragment = document.createDocumentFragment();
  
  parts.forEach(part => {
    if (part && part.toLowerCase() === keyword.toLowerCase()) {
      const span = document.createElement('span');
      span.style.cssText = 'background: #fef3c7; color: #92400e; font-weight: 500; padding: 2px 0; border-radius: 2px;';
      span.textContent = part;
      fragment.appendChild(span);
    } else if (part) {
      fragment.appendChild(document.createTextNode(part));
    }
  });
  
  return fragment;
}

function createSearchBar() {
  const existing = document.getElementById('deepseek-search-widget');
  if (existing) existing.remove();
  
  const widget = document.createElement('div');
  widget.id = 'deepseek-search-widget';
  widget.style.cssText = `
    position: fixed !important;
    top: 20px !important;
    right: 30px !important;
    width: 300px !important;
    z-index: 999999 !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
    box-shadow: 0 4px 20px rgba(0,0,0,0.15) !important;
    border-radius: 40px !important;
    background: white !important;
  `;
  
  const searchContainer = document.createElement('div');
  searchContainer.style.cssText = `
    display: flex !important;
    align-items: center !important;
    background: white !important;
    border: 1px solid #e5e7eb !important;
    border-radius: 40px !important;
    height: 34px !important;
    padding: 0 4px 0 16px !important;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05) !important;
  `;
  
  const searchIcon = document.createElement('span');
  searchIcon.textContent = '🔍';
  searchIcon.style.cssText = 'margin-right: 8px; font-size: 14px; color: #9ca3af;';
  searchContainer.appendChild(searchIcon);
  
  const input = document.createElement('input');
  input.id = 'deepseek-search-input';
  input.type = 'text';
  input.placeholder = 'Search conversations...';
  input.style.cssText = `
    flex: 1 !important;
    height: 34px !important;
    border: none !important;
    outline: none !important;
    font-size: 13px !important;
    background: transparent !important;
    color: #1f2937 !important;
  `;
  searchContainer.appendChild(input);
  
  const closeBtn = document.createElement('button');
  closeBtn.id = 'deepseek-close-search';
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    background: transparent !important;
    border: none !important;
    width: 28px !important;
    height: 28px !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    color: #9ca3af !important;
    font-size: 16px !important;
    font-weight: bold !important;
    margin-right: 4px !important;
  `;
  closeBtn.onmouseover = () => { closeBtn.style.background = '#f3f4f6'; closeBtn.style.color = '#4b5563'; };
  closeBtn.onmouseout = () => { closeBtn.style.background = 'transparent'; closeBtn.style.color = '#9ca3af'; };
  searchContainer.appendChild(closeBtn);
  
  widget.appendChild(searchContainer);
  
  const resultsContainer = document.createElement('div');
  resultsContainer.id = 'deepseek-results';
  resultsContainer.style.cssText = `
    position: absolute !important;
    top: 42px !important;
    right: 0 !important;
    width: 350px !important;
    background: white !important;
    border-radius: 16px !important;
    box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
    border: 1px solid #e5e7eb !important;
    max-height: 400px !important;
    overflow-y: auto !important;
    display: none !important;
    z-index: 999999 !important;
  `;
  widget.appendChild(resultsContainer);
  
  document.body.appendChild(widget);
  
  closeBtn.addEventListener('click', function() {
    widget.style.display = 'none';
    
    const showButton = document.createElement('div');
    showButton.id = 'deepseek-show-button';
    showButton.textContent = '🔍';
    showButton.style.cssText = `
      position: fixed !important;
      top: 20px !important;
      right: 30px !important;
      width: 40px !important;
      height: 40px !important;
      background: #10a37f !important;
      color: white !important;
      border-radius: 50% !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      cursor: pointer !important;
      font-size: 18px !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2) !important;
      z-index: 999999 !important;
      border: none !important;
    `;
    
    showButton.onmouseover = function() { this.style.background = '#0e8c6d'; };
    showButton.onmouseout = function() { this.style.background = '#10a37f'; };
    
    showButton.onclick = function() {
      widget.style.display = 'block';
      this.remove();
    };
    
    document.body.appendChild(showButton);
  });
  
  const content = extractAllContent();
  allConversations = content.conversations;
  allMessages = content.messages;
  
  setupSearch();
  
  setInterval(() => {
    const content = extractAllContent();
    allConversations = content.conversations;
    allMessages = content.messages;
  }, 10000);
}

function setupSearch() {
  const input = document.getElementById('deepseek-search-input');
  const resultsContainer = document.getElementById('deepseek-results');
  
  if (!input || !resultsContainer) {
    setTimeout(setupSearch, 500);
    return;
  }
  
  function performSearch() {
    const query = input.value.trim().toLowerCase();
    
    if (query.length < 2) {
      resultsContainer.style.display = 'none';
      return;
    }
    
    const conversationMatches = allConversations.filter(conv => 
      conv.fullText.includes(query)
    ).map(conv => ({
      ...conv,
      matchType: 'conversation',
      displayTitle: conv.title
    }));
    
    const messageMatches = allMessages.filter(msg => 
      msg.fullText.includes(query)
    ).map(msg => ({
      ...msg,
      matchType: 'message',
      displayTitle: msg.role === 'user' ? '👤 You' : '🤖 DeepSeek',
      displayPreview: msg.content.substring(0, 120) + '...'
    }));
    
    const allMatches = [...conversationMatches, ...messageMatches];
    
    chrome.runtime.sendMessage({
      action: 'trackSearch',
      data: { query: input.value.trim(), results: allMatches.length }
    });
    
    while (resultsContainer.firstChild) {
      resultsContainer.removeChild(resultsContainer.firstChild);
    }
    
    if (allMatches.length === 0) {
      const noResultsDiv = document.createElement('div');
      noResultsDiv.style.cssText = 'padding: 20px; text-align: center; color: #6b7280; font-size: 13px;';
      noResultsDiv.textContent = `No matches found for "${input.value.trim()}"`;
      resultsContainer.appendChild(noResultsDiv);
      resultsContainer.style.display = 'block';
      return;
    }
    
    const now = Date.now();
    
    if (conversationMatches.length > 0) {
      const headerDiv = document.createElement('div');
      headerDiv.style.cssText = 'padding: 8px 12px; background: #f9fafb; font-weight: 600; font-size: 12px; border-bottom: 1px solid #e5e7eb;';
      headerDiv.textContent = `💬 CONVERSATIONS (${conversationMatches.length})`;
      resultsContainer.appendChild(headerDiv);
      
      conversationMatches.forEach((match, index) => {
        let daysAgo = 0;
        if (match.timestamp) {
          const diffMs = now - match.timestamp;
          daysAgo = Math.floor(diffMs / (24 * 60 * 60 * 1000));
        }
        
        const itemDiv = document.createElement('div');
        itemDiv.className = 'search-result-item';
        itemDiv.dataset.index = index;
        itemDiv.dataset.type = 'conversation';
        itemDiv.dataset.title = match.title;
        itemDiv.dataset.days = daysAgo;
        itemDiv.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.2s;';
        itemDiv.onmouseover = () => { itemDiv.style.background = '#f9fafb'; };
        itemDiv.onmouseout = () => { itemDiv.style.background = 'white'; };
        
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-weight: 500; margin-bottom: 4px; color: #1f2937; font-size: 14px;';
        titleDiv.appendChild(createHighlightedText(match.displayTitle, input.value));
        itemDiv.appendChild(titleDiv);
        
        const metaDiv = document.createElement('div');
        metaDiv.style.cssText = 'font-size: 11px; color: #6b7280;';
        metaDiv.textContent = `${daysAgo} days ago`;
        itemDiv.appendChild(metaDiv);
        
        resultsContainer.appendChild(itemDiv);
      });
    }
    
    if (messageMatches.length > 0) {
      const headerDiv = document.createElement('div');
      headerDiv.style.cssText = 'padding: 8px 12px; background: #f9fafb; font-weight: 600; font-size: 12px; margin-top: 5px; border-bottom: 1px solid #e5e7eb;';
      headerDiv.textContent = `📝 MESSAGES (${messageMatches.length})`;
      resultsContainer.appendChild(headerDiv);
      
      messageMatches.forEach((match, index) => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'search-result-item';
        itemDiv.dataset.index = index + conversationMatches.length;
        itemDiv.dataset.type = 'message';
        itemDiv.dataset.title = match.role;
        itemDiv.style.cssText = 'padding: 12px 16px; border-bottom: 1px solid #f0f0f0; cursor: pointer; transition: background 0.2s;';
        itemDiv.onmouseover = () => { itemDiv.style.background = '#f9fafb'; };
        itemDiv.onmouseout = () => { itemDiv.style.background = 'white'; };
        
        const titleDiv = document.createElement('div');
        titleDiv.style.cssText = 'font-weight: 500; margin-bottom: 4px; color: #1f2937; font-size: 14px;';
        titleDiv.textContent = match.displayTitle;
        itemDiv.appendChild(titleDiv);
        
        const previewDiv = document.createElement('div');
        previewDiv.style.cssText = 'font-size: 12px; color: #4b5563; margin-bottom: 4px; line-height: 1.4;';
        previewDiv.appendChild(createHighlightedText(match.displayPreview, input.value));
        itemDiv.appendChild(previewDiv);
        
        resultsContainer.appendChild(itemDiv);
      });
    }
    
    resultsContainer.style.display = 'block';
    
    document.querySelectorAll('.search-result-item').forEach((item, idx) => {
      item.addEventListener('click', function() {
        const type = this.dataset.type;
        let match;
        
        if (type === 'conversation') {
          match = conversationMatches[parseInt(this.dataset.index)];
        } else {
          match = messageMatches[parseInt(this.dataset.index) - conversationMatches.length];
        }
        
        if (!match) return;
        
        chrome.runtime.sendMessage({
          action: 'trackClick',
          data: { 
            title: match.title || match.role,
            daysAgo: match.daysAgo || 0
          }
        });
        
        if (type === 'conversation' && match.element) {
          match.element.click();
          setTimeout(() => {
            highlightInConversation(input.value);
          }, 2000);
        } else if (type === 'message' && match.element) {
          match.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          highlightInElement(match.element, input.value);
        }
        
        resultsContainer.style.display = 'none';
        input.value = '';
      });
    });
  }
  
  function highlightInConversation(keyword) {
    document.querySelectorAll('.search-highlight-global').forEach(el => {
      const parent = el.parentNode;
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    });
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (node.parentElement?.closest('#deepseek-search-widget, #deepseek-results, script, style')) {
            return NodeFilter.FILTER_REJECT;
          }
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    const matches = [];
    
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent || '';
      if (regex.test(text)) {
        matches.push(node);
      }
    }
    
    matches.forEach(node => {
      const text = node.textContent || '';
      const span = document.createElement('span');
      span.className = 'search-highlight-global';
      span.style.cssText = 'background: #fef3c7; color: #92400e; font-weight: 500; padding: 2px 0; border-radius: 2px;';
      
      const parts = text.split(regex);
      const fragment = document.createDocumentFragment();
      
      parts.forEach((part, i) => {
        if (i % 2 === 1 && part) {
          const highlightSpan = document.createElement('span');
          highlightSpan.style.cssText = 'background: #fef3c7; color: #92400e; font-weight: 500; padding: 2px 0;';
          highlightSpan.textContent = part;
          fragment.appendChild(highlightSpan);
        } else if (part) {
          fragment.appendChild(document.createTextNode(part));
        }
      });
      
      span.appendChild(fragment);
      node.parentNode?.replaceChild(span, node);
    });
    
    const firstHighlight = document.querySelector('.search-highlight-global');
    if (firstHighlight) {
      firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }
  
  function highlightInElement(element, keyword) {
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      { acceptNode: (node) => NodeFilter.FILTER_ACCEPT }
    );
    
    const escapedKeyword = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedKeyword})`, 'gi');
    
    while (walker.nextNode()) {
      const node = walker.currentNode;
      const text = node.textContent || '';
      if (regex.test(text)) {
        const span = document.createElement('span');
        span.style.cssText = 'background: #fef3c7; color: #92400e; font-weight: 500; padding: 2px 0;';
        
        const parts = text.split(regex);
        const fragment = document.createDocumentFragment();
        
        parts.forEach((part, i) => {
          if (i % 2 === 1 && part) {
            const highlightSpan = document.createElement('span');
            highlightSpan.style.cssText = 'background: #fef3c7; color: #92400e; font-weight: 500; padding: 2px 0;';
            highlightSpan.textContent = part;
            fragment.appendChild(highlightSpan);
          } else if (part) {
            fragment.appendChild(document.createTextNode(part));
          }
        });
        
        span.appendChild(fragment);
        node.parentNode?.replaceChild(span, node);
      }
    }
  }
  
  let timeout;
  input.addEventListener('input', () => {
    clearTimeout(timeout);
    timeout = setTimeout(performSearch, 300);
  });
  
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      performSearch();
    }
  });
  
  document.addEventListener('click', (e) => {
    const widget = document.getElementById('deepseek-search-widget');
    if (widget && !widget.contains(e.target)) {
      resultsContainer.style.display = 'none';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => setTimeout(createSearchBar, 1500));
} else {
  setTimeout(createSearchBar, 1500);
}

const observer = new MutationObserver(() => {
  if (!document.getElementById('deepseek-search-widget')) {
    createSearchBar();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true
});