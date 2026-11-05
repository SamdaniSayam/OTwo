/* OTwo service-worker registration.
 *
 * Kept in an external file so the production web build can use a strict
 * `script-src 'self'` Content-Security-Policy without inline scripts.
 */
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js').catch(function (error) {
      console.warn('Service worker registration failed:', error);
    });
  });
}
