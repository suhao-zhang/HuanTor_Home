/**
 * Vercel Speed Insights initialization for Hexo
 * This implements the vanilla JavaScript injection method
 * following the official Vercel Speed Insights documentation
 */

(function() {
  'use strict';
  
  // Initialize the Speed Insights queue
  window.si = window.si || function () {
    (window.siq = window.siq || []).push(arguments);
  };
  
  // Don't load in development environment
  var isDevelopment = window.location.hostname === 'localhost' || 
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname.includes('192.168.');
  
  if (isDevelopment) {
    console.log('[Speed Insights] Development mode detected, skipping tracking');
    return;
  }
  
  // Load the Speed Insights script
  var script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/speed-insights/script.js';
  script.onerror = function() {
    console.warn('[Speed Insights] Failed to load tracking script');
  };
  
  // Insert the script into the document
  var firstScript = document.getElementsByTagName('script')[0];
  if (firstScript && firstScript.parentNode) {
    firstScript.parentNode.insertBefore(script, firstScript);
  } else {
    document.head.appendChild(script);
  }
})();
