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

    // Filter Sections (show if has visible child cards or text match)
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
        '<strong>No matching APIs found.</strong> Try searching for "flash", "drag", "singleInstance", "tray", or "bridge".' +
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
      // Fallback
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

  // ── 5. Interactive Window Playground Simulator ─────────────────────────────
  function updateWindowMockup() {
    var title = $("#simTitle").val() || "Djazair Window";
    var width = parseInt($("#simWidth").val()) || 600;
    var height = parseInt($("#simHeight").val()) || 400;
    var isFrameless = $("#simFrameless").is(":checked");
    var isDark = $("#simDark").is(":checked");
    var bgColor = $("#simBg").val() || "#0f172a";

    // Scale down for preview if needed
    var scale = 0.55;
    var previewW = Math.round(width * scale);
    var previewH = Math.round(height * scale);

    $("#mockupTitle").text(title);
    $("#mockupWindow").css({
      width: previewW + "px",
      height: previewH + "px",
      background: bgColor
    });

    if (isFrameless) {
      $("#mockupTitlebar").hide();
      $("#mockupWindow").css("border-radius", "4px");
    } else {
      $("#mockupTitlebar").show();
      $("#mockupWindow").css("border-radius", "8px");
      if (isDark) {
        $("#mockupTitlebar").css({ background: "#0a0e17", color: "#f8fafc" });
      } else {
        $("#mockupTitlebar").css({ background: "#e2e8f0", color: "#0f172a" });
      }
    }

    // Generate matching Djazair code
    var codeSnippet = 
      'use webview\n\n' +
      'let app = webview.createWindow({\n' +
      '    "title": "' + title + '",\n' +
      '    "width": ' + width + ',\n' +
      '    "height": ' + height + ',\n' +
      '    "frameless": ' + (isFrameless ? 'True' : 'False') + ',\n' +
      '    "singleInstance": True,\n' +
      '    "debug": True\n' +
      '})\n\n';

    if (isDark && !isFrameless) {
      codeSnippet += 'app.window.setDarkTitleBar(True)\n';
    }
    codeSnippet += 'app.run()';

    $("#simGeneratedCode pre code").text(codeSnippet);
    $("#simWidthVal").text(width + "px");
    $("#simHeightVal").text(height + "px");
  }

  $("#simTitle, #simWidth, #simHeight, #simFrameless, #simDark, #simBg").on("input change", updateWindowMockup);
  updateWindowMockup();

  // ── 6. Dark / Light Theme Switcher ─────────────────────────────────────────
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
});
