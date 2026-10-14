/* Loads content/content.json (the single source of truth).
   When served over http(s) the JSON file is fetched directly, so an edit to it shows up on reload.
   When opened from disk (file://), browsers block fetch(), so we fall back to content/content.js,
   which tools/build_content.py regenerates from the JSON after validating it. */
window.loadContent = function () {
  function viaScript() {
    return new Promise(function (resolve, reject) {
      if (window.PARENTING_CONTENT) return resolve(window.PARENTING_CONTENT);
      var s = document.createElement('script');
      s.src = 'content/content.js';
      s.onload = function () { window.PARENTING_CONTENT ? resolve(window.PARENTING_CONTENT) : reject(new Error('content.js empty')); };
      s.onerror = function () { reject(new Error('content.js missing')); };
      document.head.appendChild(s);
    });
  }
  if (location.protocol === 'file:') return viaScript().then(function (c) { c.__loadedFrom = 'content/content.js (file:// fallback)'; return c; });
  return fetch('content/content.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
    .then(function (c) { c.__loadedFrom = 'content/content.json'; return c; })
    .catch(function () { return viaScript(); });
};
