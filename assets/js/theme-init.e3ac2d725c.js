/* AK Premium — theme init. Runs synchronously in <head> before the
   stylesheet, so the page never flashes the wrong theme. Saved choice
   ("ak-theme") wins, else the OS setting. (Was an inline script; moved to
   this file for the enforced Content-Security-Policy, v12.) */
(function(){try{var t=localStorage.getItem('ak-theme');if(!t){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)}catch(e){}})();
