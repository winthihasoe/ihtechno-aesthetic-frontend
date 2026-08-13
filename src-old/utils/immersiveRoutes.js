/**
 * Full-screen workflow routes with no workspace chrome.
 * @param {string} pathname
 * @returns {boolean}
 */
export function isImmersiveWorkspacePath(pathname) {
  const p =
    pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;
  return /\/visits\/[^/]+\/(consultation-room|treatment-room|preparation-room)$/.test(p);
}
