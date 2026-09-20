/**
 * =============================================================================
 * Project:      Djazair dpack Standalone Bundler Framework
 * File:         docs/docs.js
 * Description:  Interactive Documentation Controller, Search, & Config Studio
 * Author:       Harizi Riyadh (hariziriyadh@gmail.com)
 * Copyright:    (c) 2026 Djazair Language Project
 * =============================================================================
 */

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
    if (matchCount === 0 && query !== "") {
      $("#mainContent").append(
        '<div class="no-results-msg" style="text-align:center; padding:60px 20px; color:var(--text-muted);">' +
          '<i class="fas fa-search" style="font-size:36px; margin-bottom:12px; color:var(--border-color);"></i>' +
          '<p>No documentation matches found for <strong>"' + $("<div>").text(query).html() + '"</strong>.</p>' +
        '</div>'
      );
    }
  });

  // ── 2. Copy Code to Clipboard ──────────────────────────────────────────────
  $(document).on("click", ".btn-copy", function() {
    var $btn = $(this);
    var codeText = $btn.closest(".code-container").find(".code-content code").text();
    
    if (!codeText) {
      codeText = $btn.closest(".code-container").find(".code-content").text();
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(codeText).then(function() {
        showCopyFeedback($btn);
      }).catch(function() {
        fallbackCopy(codeText, $btn);
      });
    } else {
      fallbackCopy(codeText, $btn);
    }
  });

  function showCopyFeedback($btn) {
    var originalHtml = $btn.html();
    $btn.html('<i class="fas fa-check" style="color:var(--accent-emerald);"></i> Copied!').addClass("copied");
    setTimeout(function() {
      $btn.html(originalHtml).removeClass("copied");
    }, 2000);
  }

  function fallbackCopy(text, $btn) {
    var $temp = $("<textarea>");
    $("body").append($temp);
    $temp.val(text).select();
    try {
      document.execCommand("copy");
      showCopyFeedback($btn);
    } catch(e) {}
    $temp.remove();
  }

  // ── 3. Theme Toggle ────────────────────────────────────────────────────────
  $("#themeToggleBtn").on("click", function() {
    var currentTheme = $("html").attr("data-theme") || "dark";
    var newTheme = currentTheme === "dark" ? "light" : "dark";
    $("html").attr("data-theme", newTheme);
    $(this).find("i").toggleClass("fa-sun fa-moon");
  });

  // ── 4. Mobile Menu Toggle ──────────────────────────────────────────────────
  $("#mobileMenuBtn").on("click", function() {
    $(".sidebar").toggleClass("open");
  });

  // Close sidebar on link click (mobile)
  $(".nav-item").on("click", function() {
    if ($(window).width() <= 960) {
      $(".sidebar").removeClass("open");
    }
  });

  // ── 5. ScrollSpy for Navigation Highlighting ───────────────────────────────
  $(window).on("scroll", function() {
    var scrollPos = $(window).scrollTop() + 100;
    $(".doc-section").each(function() {
      var top = $(this).offset().top;
      var bottom = top + $(this).outerHeight();
      var id = $(this).attr("id");

      if (scrollPos >= top && scrollPos < bottom) {
        $(".nav-item").removeClass("active");
        $('.nav-item[href="#' + id + '"]').addClass("active");
      }
    });
  });

  // ── 6. Interactive Config & Script Generator ───────────────────────────────
  function updateConfigStudio() {
    var scriptPath = $("#cfgMainScript").val().trim() || "main.dz";
    var outputExe  = $("#cfgOutputExe").val().trim() || "app.exe";
    var isConsole  = $("#cfgConsole").is(":checked");
    var isPortable = $("#cfgPortable").is(":checked");
    var isEncrypt  = $("#cfgEncrypt").is(":checked");
    var assetMode  = $("#cfgAssetMode").val();

    // Generate dpack.json
    var configObj = {
      "main": scriptPath,
      "output": outputExe,
      "console": isConsole,
      "portable": isPortable,
      "encrypt": isEncrypt
    };

    if (assetMode === "all") {
      configObj["assets"] = true;
    } else if (assetMode === "none") {
      configObj["assets"] = false;
    } else {
      configObj["assets"] = ["assets/", "data.json", "icon.ico"];
    }

    var jsonStr = JSON.stringify(configObj, null, 2);
    $("#dpackJsonPreview").text(jsonStr);

    // Generate build.dz
    var buildDz = 'use dpack\n\n' +
      'dpack.pack("' + scriptPath + '", "' + outputExe + '", {\n' +
      '    "console": ' + (isConsole ? 'True' : 'False') + ',\n' +
      '    "portable": ' + (isPortable ? 'True' : 'False') + ',\n' +
      '    "encrypt": ' + (isEncrypt ? 'True' : 'False') + ',\n';

    if (assetMode === "all") {
      buildDz += '    "assets": True\n';
    } else if (assetMode === "none") {
      buildDz += '    "assets": False\n';
    } else {
      buildDz += '    "assets": ["assets/", "data.json", "icon.ico"]\n';
    }
    buildDz += '})\n';

    $("#buildDzPreview").text(buildDz);
  }

  $("#cfgMainScript, #cfgOutputExe, #cfgConsole, #cfgPortable, #cfgEncrypt, #cfgAssetMode").on("input change", function() {
    updateConfigStudio();
  });

  // Initial update
  if ($("#cfgMainScript").length) {
    updateConfigStudio();
  }
});
