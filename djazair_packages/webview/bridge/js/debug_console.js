(function() {
  if (!window.djazair || window.__djazairConsoleForwarded) return;
  window.__djazairConsoleForwarded = true;
  var original = {
    log: console.log,
    warn: console.warn,
    error: console.error,
    info: console.info
  };
  function toText(args) {
    return Array.prototype.slice.call(args).map(function(item) {
      try { return JSON.stringify(item); } catch(e) { return String(item); }
    }).join(" ");
  }
  function forward(level) {
    return function() {
      var text = toText(arguments);
      try { window.djazair.invoke("__console", [level, text]); } catch(e) {}
      original[level].apply(console, arguments);
    };
  }
  console.log = forward("log");
  console.warn = forward("warn");
  console.error = forward("error");
  console.info = forward("info");
})();
