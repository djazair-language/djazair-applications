/**
 * =============================================================================
 * Project:      Djazair WebView Desktop Application Framework
 * File:         bridge/js/bridge_client.js
 * Description:  Client-Side JavaScript IPC API (window.djazair)
 * Author:       Harizi Riyadh (hariziriyadh@gmail.com)
 * Copyright:    (c) 2026 Harizi Riyadh / Djazair Language Project. All rights reserved.
 * License:      MIT License
 * =============================================================================
 */

(function() {
  if (window.djazair) return;

  window.djazair = {
    // ── Event listeners for push notifications from Djazair (bridge.send)
    _local: {},

    // ─────────────────────────────────────────────────────────────────────
    // invoke(channel, payload [, timeoutMs]) → Promise<any>
    //
    // Calls a Djazair handler by channel name and returns a Promise that
    // resolves with the handler's return value (auto-deserialized from JSON).
    // Rejects automatically after `timeoutMs` milliseconds (default: 10000)
    // to prevent Promises from hanging forever if the handler is unreachable.
    //
    // Example:
    //   const user = await window.djazair.invoke('getUser', { id: 42 });
    //   const result = await window.djazair.invoke('slowOp', {}, 30000);
    // ─────────────────────────────────────────────────────────────────────
    invoke: function(channel, payload, timeoutMs) {
      var data = (payload !== undefined && payload !== null) ? payload : null;
      var disableTimeout = (timeoutMs === 0 || timeoutMs === false || (typeof timeoutMs === 'number' && timeoutMs >= 86400000));
      var ms   = (typeof timeoutMs === 'number' && timeoutMs > 0) ? timeoutMs : 10000;

      // When timeout is explicitly disabled (e.g. for modal dialogs or long tasks), return direct call promise
      if (disableTimeout) {
        return __dz_invoke(channel, data).then(function(result) {
          if (result !== null && typeof result === 'object') {
            if (result.__dz_ok === false) {
              return Promise.reject(new Error(result.__dz_error || 'Handler error'));
            }
            if ('__dz_data' in result) {
              return result.__dz_data;
            }
          }
          return result;
        });
      }

      // Hold a reference to the timer so we can cancel it the moment
      // the real call settles — prevents orphaned timers from accumulating
      // in high-frequency invoke() scenarios.
      var timerId;

      var callPromise = __dz_invoke(channel, data).then(function(result) {
        clearTimeout(timerId); // ← cancel timer immediately on success
        if (result !== null && typeof result === 'object') {
          if (result.__dz_ok === false) {
            return Promise.reject(new Error(result.__dz_error || 'Handler error'));
          }
          if ('__dz_data' in result) {
            return result.__dz_data;
          }
        }
        return result;
      }, function(err) {
        clearTimeout(timerId); // ← cancel timer immediately on error too
        return Promise.reject(err);
      });

      var timeoutPromise = new Promise(function(_, reject) {
        timerId = setTimeout(function() {
          reject(new Error('TimeoutError: invoke("' + channel + '") timed out after ' + ms + 'ms'));
        }, ms);
      });

      return Promise.race([callPromise, timeoutPromise]);
    },

    // ─────────────────────────────────────────────────────────────────────
    // on(channel, callback)
    //
    // Subscribe to push events sent from Djazair via bridge.send().
    // Multiple listeners per channel are supported.
    //
    // Example:
    //   window.djazair.on('notification', function(data) {
    //     console.log(data.message);
    //   });
    // ─────────────────────────────────────────────────────────────────────
    on: function(channel, callback) {
      if (!this._local[channel]) {
        this._local[channel] = [];
      }
      this._local[channel].push(callback);
    },

    // ─────────────────────────────────────────────────────────────────────
    // off(channel [, callback])
    //
    // Remove a specific listener, or all listeners if callback is omitted.
    // ─────────────────────────────────────────────────────────────────────
    off: function(channel, callback) {
      if (!this._local[channel]) return;
      if (!callback) {
        delete this._local[channel];
        return;
      }
      this._local[channel] = this._local[channel].filter(function(cb) {
        return cb !== callback;
      });
    },

    // ─────────────────────────────────────────────────────────────────────
    // send(channel, data)  [internal — called by Djazair via win.eval()]
    //
    // Dispatches data to all JS listeners registered via .on().
    // Fix #8: each listener is wrapped in try/catch so one broken listener
    // cannot swallow the error and prevent other listeners from firing.
    // ─────────────────────────────────────────────────────────────────────
    send: function(channel, data) {
      var listeners = this._local[channel];
      if (listeners && listeners.length > 0) {
        listeners.forEach(function(cb) {
          try {
            cb(data);
          } catch (e) {
            // Surface the error — forward to Djazair terminal via __console
            console.error('[djazair.send] Listener error on channel "' + channel + '":', e);
          }
        });
      }
    },

    // ─────────────────────────────────────────────────────────────────────
    // startDragging()
    //
    // Initiates native window moving/dragging. Call on mousedown from a
    // custom frameless HTML/CSS titlebar.
    //
    // Example:
    //   <div class="titlebar" onmousedown="window.djazair.startDragging()"></div>
    // ─────────────────────────────────────────────────────────────────────
    startDragging: function() {
      return this.invoke('__djazair_start_drag');
    }
  };

  // ─────────────────────────────────────────────────────────────────────
  // Fix #9: Catch unhandled Promise rejections (async/await errors with
  // no .catch() or try/catch) and forward them to the Djazair terminal.
  // These are completely invisible in WebView2 without this handler.
  // ─────────────────────────────────────────────────────────────────────
  window.addEventListener('unhandledrejection', function(event) {
    var reason = event.reason;
    var msg = reason instanceof Error
      ? reason.stack || reason.message
      : String(reason);
    console.error('[djazair] Unhandled Promise rejection: ' + msg);
    // Prevent the browser from swallowing it silently
    event.preventDefault();
  });

  // ─────────────────────────────────────────────────────────────────────
  // Fix #10: Catch uncaught synchronous JS errors (syntax errors,
  // type errors, etc.) and forward them to the Djazair terminal.
  // ─────────────────────────────────────────────────────────────────────
  window.addEventListener('error', function(event) {
    var loc = (event.filename || '<unknown>') + ':' + event.lineno + ':' + event.colno;
    console.error('[djazair] Uncaught error at ' + loc + ' — ' + event.message);
  });

})();


