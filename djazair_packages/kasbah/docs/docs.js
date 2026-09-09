// docs.js — Kasbah Framework Interactive Documentation & API Simulator
// Powered by jQuery 3.7.1

$(document).ready(function() {

  // ── 1. Real-Time Search Filter ─────────────────────────────────────────────
  $("#apiSearch").on("input", function() {
    var query = $(this).val().toLowerCase().trim();

    if (query === "") {
      $(".doc-section, .method-card, .api-table tbody tr, .nav-item").show();
      $(".no-results-msg").remove();
      return;
    }

    var matchCount = 0;

    // Filter Method Cards
    $(".method-card").each(function() {
      var text = $(this).text().toLowerCase();
      if (text.indexOf(query) !== -1) {
        $(this).show();
        matchCount++;
      } else {
        $(this).hide();
      }
    });

    // Filter Table Rows
    $(".api-table tbody tr").each(function() {
      var text = $(this).text().toLowerCase();
      if (text.indexOf(query) !== -1) {
        $(this).show();
        matchCount++;
      } else {
        $(this).hide();
      }
    });

    // Filter Navigation Items
    $(".nav-item").each(function() {
      var text = $(this).text().toLowerCase();
      if (text.indexOf(query) !== -1) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });

    // Filter Sections (show if has visible child cards or title matches)
    $(".doc-section").each(function() {
      var hasVisibleCards = $(this).find(".method-card:visible, tr:visible").length > 0;
      var titleText = $(this).find(".section-title").text().toLowerCase();
      if (hasVisibleCards || titleText.indexOf(query) !== -1) {
        $(this).show();
      } else {
        $(this).hide();
      }
    });

    // Handle No Results
    $(".no-results-msg").remove();
    if (matchCount === 0) {
      $("#contentArea").prepend(
        '<div class="no-results-msg alert-box alert-warning">' +
          '<i class="fas fa-exclamation-triangle"></i>' +
          '<div>' +
            '<strong>No matching APIs found</strong>' +
            '<p>No methods, classes, or properties matched "<em>' + $('<div>').text(query).html() + '</em>". Try searching for "get", "status", "json", "helmet", "cors", "session", or "uploader".</p>' +
          '</div>' +
        '</div>'
      );
    }
  });

  // ── 2. Theme Toggle (Dark / Light Mode) ─────────────────────────────────────
  var currentTheme = localStorage.getItem("kasbah_docs_theme") || "dark";
  $("html").attr("data-theme", currentTheme);
  updateThemeIcon(currentTheme);

  $("#themeToggleBtn").on("click", function() {
    var newTheme = $("html").attr("data-theme") === "dark" ? "light" : "dark";
    $("html").attr("data-theme", newTheme);
    localStorage.setItem("kasbah_docs_theme", newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    var icon = $("#themeToggleBtn i");
    if (theme === "dark") {
      icon.removeClass("fa-sun").addClass("fa-moon");
    } else {
      icon.removeClass("fa-moon").addClass("fa-sun");
    }
  }

  // ── 3. Mobile Navigation Drawer ────────────────────────────────────────────
  $("#mobileMenuBtn").on("click", function() {
    $(".sidebar").toggleClass("open");
  });

  $(document).on("click", function(e) {
    if (!$(e.target).closest(".sidebar, #mobileMenuBtn").length) {
      $(".sidebar").removeClass("open");
    }
  });

  // ── 4. Scrollspy / Active Sidebar Navigation ───────────────────────────────
  $(window).on("scroll", function() {
    var scrollPos = $(window).scrollTop() + 100;
    $(".doc-section").each(function() {
      var top = $(this).offset().top;
      var height = $(this).outerHeight();
      var id = $(this).attr("id");

      if (scrollPos >= top && scrollPos < top + height) {
        $(".nav-item").removeClass("active");
        $('.nav-item[href="#' + id + '"]').addClass("active");
      }
    });
  });

  // ── 5. Copy Code to Clipboard ──────────────────────────────────────────────
  $(document).on("click", ".copy-btn", function() {
    var btn = $(this);
    var codeBlock = btn.closest(".code-container").find("pre");
    var textToCopy = codeBlock.text().trim();

    if (navigator.clipboard) {
      navigator.clipboard.writeText(textToCopy).then(function() {
        showCopiedFeedback(btn);
      });
    } else {
      var tempTextArea = $("<textarea>").val(textToCopy).appendTo("body").select();
      document.execCommand("copy");
      tempTextArea.remove();
      showCopiedFeedback(btn);
    }
  });

  function showCopiedFeedback(btn) {
    var origHtml = btn.html();
    btn.html('<i class="fas fa-check" style="color:var(--accent-emerald);"></i> Copied!').css("border-color", "var(--accent-emerald)");
    setTimeout(function() {
      btn.html(origHtml).css("border-color", "");
    }, 2000);
  }

  // ── 6. Live Interactive REST API Studio / Simulator ────────────────────────
  $("#simMethod, #simPath, #simUseHelmet, #simUseCors, #simUseLogger, #simUseSession, #simBodyInput").on("input change", function() {
    updateGeneratedDjazairCode();
  });

  $(".sim-preset-btn").on("click", function() {
    var method = $(this).data("method");
    var path = $(this).data("path");
    var body = $(this).data("body") || "";

    $("#simMethod").val(method);
    $("#simPath").val(path);
    if (body) {
      $("#simBodyInput").val(body);
    } else {
      $("#simBodyInput").val("");
    }
    updateGeneratedDjazairCode();
    executeSimulation();
  });

  $("#simRunBtn").on("click", function() {
    executeSimulation();
  });

  function updateGeneratedDjazairCode() {
    var method = $("#simMethod").val().toLowerCase();
    var path = $("#simPath").val().trim() || "/";
    var useHelmet = $("#simUseHelmet").is(":checked");
    var useCors = $("#simUseCors").is(":checked");
    var useLogger = $("#simUseLogger").is(":checked");
    var useSession = $("#simUseSession").is(":checked");
    var hasBody = $("#simMethod").val() === "POST" || $("#simMethod").val() === "PUT";

    var code = 'use kasbah\n\nlet app = new kasbah.app({\n    "port": 3000,\n    "host": "127.0.0.1"';
    if (useSession) code += ',\n    "session": {"secret": "cryptographic-key-32-chars-long!"}';
    code += '\n})\n\n';

    if (useHelmet) code += 'app.middleware(kasbah.helmet())\n';
    if (useCors)   code += 'app.middleware(kasbah.cors())\n';
    if (useLogger) code += 'app.middleware(kasbah.logger({"format": "dev"}))\n';
    if (useHelmet || useCors || useLogger) code += '\n';

    code += '# ' + method.toUpperCase() + ' ' + path + '\n';
    code += 'app.' + method + '("' + path + '", fn(req, res)\n';
    
    if (path.indexOf(":") !== -1) {
      code += '    let paramVal = req.param("id")\n';
    }
    if (hasBody) {
      code += '    let payload = req.body\n';
    }

    if (path.indexOf("trade") !== -1 || path.indexOf("item") !== -1) {
      code += '    res.ok({\n        "status": "success",\n        "timestamp": "' + new Date().toISOString() + '",\n        "data": [{"id": 1, "symbol": "EURUSD", "profit": "+240$"}]\n    })\n';
    } else if (path.indexOf("health") !== -1) {
      code += '    res.ok({"status": "UP", "uptime": "99.98%"})\n';
    } else {
      code += '    res.ok({\n        "message": "Kasbah request dispatched successfully",\n        "method": req.method,\n        "path": req.path\n    })\n';
    }
    code += 'end)\n\napp.listen()';

    $("#simGeneratedCode").text(code);
  }

  function executeSimulation() {
    var method = $("#simMethod").val();
    var path = $("#simPath").val().trim() || "/";
    var useHelmet = $("#simUseHelmet").is(":checked");
    var useCors = $("#simUseCors").is(":checked");
    var useLogger = $("#simUseLogger").is(":checked");
    var useSession = $("#simUseSession").is(":checked");
    var bodyRaw = $("#simBodyInput").val();

    var dateStr = new Date().toUTCString();
    var latency = (Math.random() * 1.5 + 0.4).toFixed(2);

    // Build Headers
    var headers = [];
    headers.push("HTTP/1.1 200 OK");
    headers.push("Date: " + dateStr);
    headers.push("Content-Type: application/json; charset=utf-8");
    headers.push("X-Powered-By: Kasbah/0.2.0 (Djazair)");
    if (useHelmet) {
      headers.push("X-Frame-Options: SAMEORIGIN");
      headers.push("X-Content-Type-Options: nosniff");
      headers.push("X-XSS-Protection: 1; mode=block");
    }
    if (useCors) {
      headers.push("Access-Control-Allow-Origin: *");
      headers.push("Access-Control-Allow-Methods: GET,HEAD,PUT,PATCH,POST,DELETE");
    }
    if (useSession) {
      headers.push("Set-Cookie: kasbah.sid=s%3A9f8a2b1c4e...; Path=/; HttpOnly; SameSite=Lax");
    }

    // Build Payload
    var payload = {
      "success": true,
      "framework": "Kasbah v0.2.0 (Djazair Language)",
      "endpoint": {
        "method": method,
        "path": path,
        "ip": "127.0.0.1",
        "latency": latency + " ms"
      }
    };

    if (path.indexOf(":id") !== -1) {
      payload.endpoint.resolvedParams = { "id": "42" };
    }

    if (bodyRaw && (method === "POST" || method === "PUT")) {
      try {
        payload.receivedPayload = JSON.parse(bodyRaw);
      } catch (e) {
        payload.receivedPayload = bodyRaw;
      }
    }

    if (path.indexOf("trades") !== -1) {
      payload.data = [
        { "id": 1, "symbol": "EURUSD", "action": "BUY", "pnl": "+$240" },
        { "id": 2, "symbol": "BTCUSD", "action": "BUY", "pnl": "+$1,250" }
      ];
    } else if (path.indexOf("health") !== -1) {
      payload.health = { "status": "healthy", "memoryUsage": "4.2 MB", "goroutines": 12 };
    }

    // Render in UI
    $("#simStatusBadge").html('<span class="badge-tag http-get" style="background:rgba(16,185,129,0.2);color:#10b981;font-size:12px;font-weight:700;"><i class="fas fa-check-circle"></i> 200 OK (' + latency + ' ms)</span>');
    $("#simResponseHeaders").text(headers.join("\n"));
    $("#simResponseBody").text(JSON.stringify(payload, null, 2));

    // Pulse animation
    $("#simResponseContainer").css("opacity", "0.5").animate({ opacity: 1 }, 200);
  }

  // Initialize Simulator on Load
  updateGeneratedDjazairCode();
  executeSimulation();

});
