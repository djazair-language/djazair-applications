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
      var ms   = (typeof timeoutMs === 'number' && timeoutMs > 0) ? timeoutMs : 10000;

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
    // Data is already a parsed JS object (the JSON literal is eval'd by JS).
    // ─────────────────────────────────────────────────────────────────────
    send: function(channel, data) {
      var listeners = this._local[channel];
      if (listeners && listeners.length > 0) {
        listeners.forEach(function(cb) { cb(data); });
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
})();

