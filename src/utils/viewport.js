/**
 * Sets a CSS custom property (--vh) that mirrors the current viewport height.
 * The --vh value is used to avoid iOS/Safari 100vh bugs by referencing
 * calc(var(--vh) * 100) instead of 100vh directly.
 */
export function initViewportUnit() {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const setViewportVar = () => {
    const vh = window.innerHeight * 0.01;
    document.documentElement.style.setProperty('--vh', `${vh}px`);
  };

  setViewportVar();

  window.addEventListener('resize', setViewportVar);
  window.addEventListener('orientationchange', setViewportVar);

  return () => {
    window.removeEventListener('resize', setViewportVar);
    window.removeEventListener('orientationchange', setViewportVar);
  };
}

export default initViewportUnit;

