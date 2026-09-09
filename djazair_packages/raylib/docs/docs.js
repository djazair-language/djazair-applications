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

    // Filter Sections
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
        '<div class="no-results-msg alert-box warn">' +
        '<strong>No matching Raylib APIs found.</strong> Try searching for "Window", "drawCircle", "Camera2D", "Texture", "Sound", or "checkCollision".' +
        '</div>'
      );
    }
  });

  // ── 2. Code Copy to Clipboard ──────────────────────────────────────────────
  $(document).on("click", ".btn-copy", function() {
    var $btn = $(this);
    var $codeBlock = $btn.closest(".code-wrapper").find(".code-body pre code");
    var codeText = $codeBlock.text();

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(codeText).then(function() {
        showCopySuccess($btn);
      });
    } else {
      var $temp = $("<textarea>");
      $("body").append($temp);
      $temp.val(codeText).select();
      document.execCommand("copy");
      $temp.remove();
      showCopySuccess($btn);
    }
  });

  function showCopySuccess($btn) {
    var origHtml = $btn.html();
    $btn.html('<i class="fas fa-check" style="color:var(--accent-emerald);"></i> Copied!').css("color", "var(--accent-emerald)");
    setTimeout(function() {
      $btn.html(origHtml).css("color", "");
    }, 2000);
  }

  // ── 3. Tabbed Code Switcher ────────────────────────────────────────────────
  $(document).on("click", ".tab-btn", function() {
    var $btn = $(this);
    var targetTab = $btn.data("tab");
    var $container = $btn.closest(".tab-container");

    $container.find(".tab-btn").removeClass("active");
    $btn.addClass("active");

    $container.find(".tab-pane").removeClass("active");
    $container.find(".tab-pane[data-pane='" + targetTab + "']").addClass("active");
  });

  // ── 4. Scrollspy Navigation ────────────────────────────────────────────────
  var $sections = $(".doc-section");
  var $navLinks = $(".nav-item");

  $(window).on("scroll", function() {
    var scrollPos = $(window).scrollTop() + 120;

    $sections.each(function() {
      var top = $(this).offset().top;
      var bottom = top + $(this).outerHeight();
      var id = $(this).attr("id");

      if (scrollPos >= top && scrollPos <= bottom) {
        $navLinks.removeClass("active");
        $('.nav-item[href="#' + id + '"]').addClass("active");
      }
    });
  });

  // ── 5. Dark / Light Theme Switcher ─────────────────────────────────────────
  $("#themeToggleBtn").on("click", function() {
    var currentTheme = $("html").attr("data-theme");
    if (currentTheme === "light") {
      $("html").attr("data-theme", "dark");
      $(this).html('<i class="fas fa-sun"></i>');
    } else {
      $("html").attr("data-theme", "light");
      $(this).html('<i class="fas fa-moon"></i>');
    }
  });

  // Mobile sidebar toggle
  $("#mobileMenuBtn").on("click", function() {
    $(".sidebar").toggleClass("open");
  });

  // ── 6. Live Interactive Raylib Canvas Simulator ────────────────────────────
  var canvas = document.getElementById("raylibCanvas");
  if (canvas) {
    var ctx = canvas.getContext("2d");
    var posX = 200, posY = 150;
    var velX = 2.5, velY = 2.0;
    var rotation = 0;
    var lastTime = performance.now();
    var frameCount = 0;
    var currentFps = 60;

    function renderSimulator() {
      var now = performance.now();
      var dt = (now - lastTime) / 1000.0;
      lastTime = now;
      frameCount++;

      if (frameCount % 15 === 0) {
        currentFps = Math.round(1.0 / (dt || 0.016));
        $("#simFpsOverlay").text("FPS: " + currentFps);
      }

      var width = canvas.width;
      var height = canvas.height;
      var bgColor = $("#simBgColor").val() || "#0f172a";
      var shapeType = $("#simShapeType").val() || "circle";
      var shapeColor = $("#simShapeColor").val() || "#00e5ff";
      var shapeSize = parseFloat($("#simShapeSize").val()) || 25;
      var animSpeed = parseFloat($("#simSpeed").val()) || 1.0;
      var enableCollision = $("#simCollision").is(":checked");
      var enableCamera = $("#simCameraZoom").is(":checked");
      var cameraZoom = enableCamera ? 1.25 : 1.0;

      // Update position
      posX += velX * animSpeed;
      posY += velY * animSpeed;
      rotation += 0.03 * animSpeed;

      // Bounce boundaries
      var boundRadius = shapeSize;
      if (posX - boundRadius <= 0) { posX = boundRadius; velX = Math.abs(velX); }
      if (posX + boundRadius >= width) { posX = width - boundRadius; velX = -Math.abs(velX); }
      if (posY - boundRadius <= 0) { posY = boundRadius; velY = Math.abs(velY); }
      if (posY + boundRadius >= height) { posY = height - boundRadius; velY = -Math.abs(velY); }

      // Clear background
      ctx.save();
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);

      // Camera transformation
      if (enableCamera) {
        ctx.translate(width / 2, height / 2);
        ctx.scale(cameraZoom, cameraZoom);
        ctx.translate(-posX, -posY);
      }

      // Draw Grid Lines (World Grid)
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (var x = 0; x < width; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
      }
      for (var y = 0; y < height; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(width, y); ctx.stroke();
      }

      // Obstacle for collision demonstration
      var obsX = 140, obsY = 100, obsW = 120, obsH = 80;
      var isColliding = false;

      if (enableCollision) {
        // Simple AABB vs circle collision check
        var testX = Math.max(obsX, Math.min(posX, obsX + obsW));
        var testY = Math.max(obsY, Math.min(posY, obsY + obsH));
        var distSq = (posX - testX) * (posX - testX) + (posY - testY) * (posY - testY);
        isColliding = (distSq <= boundRadius * boundRadius);

        ctx.fillStyle = isColliding ? "rgba(244, 63, 94, 0.85)" : "rgba(30, 41, 59, 0.85)";
        ctx.strokeStyle = isColliding ? "#f43f5e" : "#3b82f6";
        ctx.lineWidth = 2;
        ctx.fillRect(obsX, obsY, obsW, obsH);
        ctx.strokeRect(obsX, obsY, obsW, obsH);

        ctx.fillStyle = "#fff";
        ctx.font = "11px monospace";
        ctx.fillText(isColliding ? "COLLISION!" : "Obstacle [Rec]", obsX + 14, obsY + 44);
      }

      // Draw Main Shape
      ctx.fillStyle = shapeColor;
      ctx.strokeStyle = shapeColor;
      ctx.lineWidth = 2;

      if (shapeType === "circle") {
        ctx.beginPath();
        ctx.arc(posX, posY, shapeSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      } else if (shapeType === "rectangle") {
        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate(rotation);
        ctx.fillRect(-shapeSize, -shapeSize, shapeSize * 2, shapeSize * 2);
        ctx.restore();
      } else if (shapeType === "triangle") {
        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate(rotation);
        ctx.beginPath();
        ctx.moveTo(0, -shapeSize);
        ctx.lineTo(shapeSize, shapeSize);
        ctx.lineTo(-shapeSize, shapeSize);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else if (shapeType === "poly") {
        var sides = 6;
        ctx.save();
        ctx.translate(posX, posY);
        ctx.rotate(rotation);
        ctx.beginPath();
        for (var i = 0; i < sides; i++) {
          var a = (i * 2 * Math.PI) / sides;
          var px = Math.cos(a) * shapeSize;
          var py = Math.sin(a) * shapeSize;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      ctx.restore();

      // Update Generated Code snippet in real-time
      updateGeneratedDjazairCode(shapeType, shapeSize, bgColor, shapeColor, enableCollision, enableCamera);

      requestAnimationFrame(renderSimulator);
    }

    function updateGeneratedDjazairCode(shape, size, bg, col, colCheck, cam) {
      var code = 'use raylib as rl\n\n' +
        'let win = new rl.Window(480, 320, "Djazair Raylib Demo")\n' +
        'win.setFPS(60)\n\n' +
        'let x = 200.0\nlet y = 150.0\nlet vx = 2.5\nlet vy = 2.0\n\n';

      if (cam) {
        code += 'let camera = new rl.Camera2D()\n' +
                'camera.offset_x = 240.0\n' +
                'camera.offset_y = 160.0\n' +
                'camera.zoom = 1.25\n\n';
      }

      code += 'while win.isOpen()\n' +
              '    # Update positions\n' +
              '    x += vx\n    y += vy\n' +
              '    if x <= ' + size + ' or x >= 480 - ' + size + ' vx = -vx end\n' +
              '    if y <= ' + size + ' or y >= 320 - ' + size + ' vy = -vy end\n\n' +
              '    win.begin()\n' +
              '    win.clear(' + formatColorArray(bg) + ')\n\n';

      if (cam) {
        code += '    camera.target_x = x\n' +
                '    camera.target_y = y\n' +
                '    camera.begin()\n\n';
      }

      if (colCheck) {
        code += '    # Draw obstacle & check collision\n' +
                '    rl.drawRectangle(140, 100, 120, 80, rl.DARKGRAY)\n' +
                '    if rl.checkCollisionCircleRec(x, y, ' + size + ', 140, 100, 120, 80)\n' +
                '        rl.drawText("COLLISION!", 150, 130, 16, rl.RED)\n' +
                '    end\n\n';
      }

      if (shape === "circle") {
        code += '    rl.drawCircle(int(x), int(y), ' + size + ', ' + formatColorArray(col) + ')\n';
      } else if (shape === "rectangle") {
        code += '    rl.drawRectangle(int(x - ' + size + '), int(y - ' + size + '), ' + (size * 2) + ', ' + (size * 2) + ', ' + formatColorArray(col) + ')\n';
      } else if (shape === "triangle") {
        code += '    rl.drawTriangle(x, y - ' + size + ', x + ' + size + ', y + ' + size + ', x - ' + size + ', y + ' + size + ', ' + formatColorArray(col) + ')\n';
      } else {
        code += '    rl.drawPoly(x, y, 6, ' + size + ', 0.0, ' + formatColorArray(col) + ')\n';
      }

      if (cam) {
        code += '\n    camera.finish()\n';
      }

      code += '    rl.drawText("FPS: " + str(win.getFPS()), 10, 10, 14, rl.LIME)\n' +
              '    win.finish()\n' +
              'end\n\n' +
              'win.close()';

      $("#simGeneratedCode pre code").text(code);
    }

    function formatColorArray(hex) {
      // Convert hex to [r, g, b, 255]
      var r = 0, g = 0, b = 0;
      if (hex.length === 4) {
        r = parseInt(hex[1] + hex[1], 16);
        g = parseInt(hex[2] + hex[2], 16);
        b = parseInt(hex[3] + hex[3], 16);
      } else if (hex.length === 7) {
        r = parseInt(hex.substring(1, 3), 16);
        g = parseInt(hex.substring(3, 5), 16);
        b = parseInt(hex.substring(5, 7), 16);
      }
      return '[' + r + ', ' + g + ', ' + b + ', 255]';
    }

    requestAnimationFrame(renderSimulator);
  }
});
