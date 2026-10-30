/** Registers the offline service worker (public/sw.js) in production builds so the game can be installed as an app. */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`./sw.js?v=${__APP_VERSION__}`).catch(() => undefined);
  });
}
