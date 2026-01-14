/**
 * Auto-lock functionality
 * Client-side activity tracking
 * 
 * Default: 15 minutes (configurable via environment)
 */

const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Get auto-lock timeout from environment or use default
 */
function getTimeoutMs(): number {
  // In client-side, we can't access process.env directly for server-only vars
  // This will be set at build time for NEXT_PUBLIC_ vars, but for server-only
  // vars we use the default. The actual timeout is enforced server-side.
  return DEFAULT_TIMEOUT_MS;
}

/**
 * Client-side activity tracking script
 * This should be injected into client components
 */
export function getActivityTrackingScript(): string {
  const timeoutMs = getTimeoutMs();
  return `
    (function() {
      const timeout = ${timeoutMs};
      let activityTimer;
      let lastServerUpdate = 0;
      const SERVER_UPDATE_INTERVAL = 60000; // 1 minute
      
      function updateActivity() {
        const now = Date.now();
        if (now - lastServerUpdate > SERVER_UPDATE_INTERVAL) {
          lastServerUpdate = now;
          fetch('/api/activity', { method: 'POST', credentials: 'include' })
            .catch(() => {});
        }
      }
      
      function resetTimer() {
        clearTimeout(activityTimer);
        activityTimer = setTimeout(() => {
          // Redirect to lock page after timeout
          window.location.href = '/master-password?locked=true';
        }, timeout);
      }
      
      // Track various user activities
      ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'].forEach(event => {
        document.addEventListener(event, () => {
          updateActivity();
          resetTimer();
        }, { passive: true });
      });
      
      // Initial timer and activity
      resetTimer();
      updateActivity();
    })();
  `;
}

