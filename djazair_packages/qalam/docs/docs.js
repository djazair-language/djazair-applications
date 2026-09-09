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
        '<strong>No matching Qalam APIs found.</strong> Try searching for "render", "renderString", "escapeHtml", "registerFilter", "upper", "join", "extends", or "cache".' +
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

  // ── 3. Tabbed Switcher ─────────────────────────────────────────────────────
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
  var savedTheme = localStorage.getItem("qalam-theme") || "dark";
  $("html").attr("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  $("#themeToggleBtn").on("click", function() {
    var currentTheme = $("html").attr("data-theme");
    var newTheme = (currentTheme === "light") ? "dark" : "light";
    $("html").attr("data-theme", newTheme);
    localStorage.setItem("qalam-theme", newTheme);
    updateThemeIcon(newTheme);
  });

  function updateThemeIcon(theme) {
    if (theme === "light") {
      $("#themeToggleBtn").html('<i class="fas fa-moon"></i>');
    } else {
      $("#themeToggleBtn").html('<i class="fas fa-sun"></i>');
    }
  }

  // Mobile sidebar toggle
  $("#mobileMenuBtn").on("click", function() {
    $(".sidebar").toggleClass("open");
  });

  // ── 6. Live Interactive Qalam Template Playground Simulator ────────────────
  var presets = {
    user: {
      template: '<div class="user-card">\n  <h2>{{ user.name | title }}</h2>\n  <p>Email: {{ user.email | lower }}</p>\n  <p>Status: {% if user.isActive %}<span class="sim-badge active">Active</span>{% else %}<span class="sim-badge">Inactive</span>{% end %}</p>\n  <p>Roles: {{ user.roles | join(" • ") | upper }}</p>\n</div>',
      data: JSON.stringify({
        user: {
          name: "riad harizi",
          email: "RIAD@EXAMPLE.COM",
          isActive: true,
          roles: ["architect", "developer"]
        }
      }, null, 2)
    },
    table: {
      template: '<h3>Invoice #{{ invoice.id }}</h3>\n<p>Customer: {{ invoice.customer | capitalize }}</p>\n<table>\n  <tr><th>Item</th><th>Price</th><th>Stock</th></tr>\n  {% for item in items %}\n  <tr>\n    <td>{{ item.name }}</td>\n    <td>${{ item.price | round(2) }}</td>\n    <td>{% if item.stock > 0 %}{{ item.stock }} in stock{% else %}Out of Stock{% end %}</td>\n  </tr>\n  {% end %}\n</table>\n<p><strong>Total Items: {{ items | length }}</strong></p>',
      data: JSON.stringify({
        invoice: { id: "INV-2026-09", customer: "riad" },
        items: [
          { name: "Kasbah Cloud", price: 149.5, stock: 8 },
          { name: "Qalam Book", price: 29.99, stock: 0 },
          { name: "Enterprise Support", price: 499.0, stock: 3 }
        ]
      }, null, 2)
    },
    loops: {
      template: '<ul>\n{% for fruit in fruits %}\n  <li>\n    {{ loop.index }}. {{ fruit | upper }}\n    {% if loop.first %}(First item!){% elif loop.last %}(Last item!){% end %}\n  </li>\n{% end %}\n</ul>\n<p>Total Fruits: {{ fruits | length }}</p>',
      data: JSON.stringify({
        fruits: ["apple", "orange", "pomegranate", "fig"]
      }, null, 2)
    },
    filters: {
      template: '<p>Original: "{{ rawText }}"</p>\n<p>Cleaned: "{{ rawText | trim | upper }}"</p>\n<p>Reversed: "{{ "qalam" | reverse }}"</p>\n<p>Fallback Bio: "{{ userBio | default("No biography provided.") }}"</p>\n<p>Abs Value: {{ numVal | abs }}</p>',
      data: JSON.stringify({
        rawText: "   welcome to qalam template engine   ",
        userBio: "",
        numVal: -99
      }, null, 2)
    }
  };

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function applyFilter(val, filterName, argStr) {
    var f = filterName.trim();
    var arg = argStr ? argStr.trim().replace(/^['"]|['"]$/g, "") : null;

    switch (f) {
      case "upper": return String(val).toUpperCase();
      case "lower": return String(val).toLowerCase();
      case "capitalize": 
        var s = String(val);
        return s.charAt(0).toUpperCase() + s.slice(1);
      case "title":
        return String(val).replace(/\b\w/g, function(l) { return l.toUpperCase(); });
      case "trim": return String(val).trim();
      case "ltrim": return String(val).replace(/^\s+/, "");
      case "rtrim": return String(val).replace(/\s+$/, "");
      case "reverse": 
        if (Array.isArray(val)) return val.slice().reverse();
        return String(val).split("").reverse().join("");
      case "length":
      case "len":
        if (Array.isArray(val) || typeof val === "string") return val.length;
        if (val && typeof val === "object") return Object.keys(val).length;
        return 0;
      case "first": return (Array.isArray(val) && val.length > 0) ? val[0] : (String(val)[0] || "");
      case "last": return (Array.isArray(val) && val.length > 0) ? val[val.length - 1] : "";
      case "join":
        if (Array.isArray(val)) return val.join(arg !== null ? arg : ", ");
        return String(val);
      case "default":
        if (!val || val === "" || val === 0 || (Array.isArray(val) && val.length === 0)) {
          return arg !== null ? arg : "";
        }
        return val;
      case "json": return JSON.stringify(val);
      case "abs": return Math.abs(parseFloat(val) || 0);
      case "round": 
        var prec = parseInt(arg) || 0;
        return Number(parseFloat(val) || 0).toFixed(prec);
      case "int": return parseInt(val) || 0;
      case "float": return parseFloat(val) || 0.0;
      case "str": return String(val);
      default: return val;
    }
  }

  function resolvePath(obj, pathStr) {
    var parts = pathStr.split(".");
    var curr = obj;
    for (var i = 0; i < parts.length; i++) {
      if (curr === null || curr === undefined) return "";
      curr = curr[parts[i]];
    }
    return curr !== undefined ? curr : "";
  }

  function renderMiniQalam(tpl, data) {
    try {
      var output = tpl;

      // 1. Remove comments {# ... #}
      output = output.replace(/\{#[\s\S]*?#\}/g, "");

      // 2. Handle Loops {% for x in items %} ... {% end %}
      var forRegex = /\{%\s*for\s+(\w+)\s+in\s+([\w\.]+)\s*%\}([\s\S]*?)\{%\s*(?:end|endfor)\s*%\}/g;
      output = output.replace(forRegex, function(match, itemName, listPath, innerTpl) {
        var list = resolvePath(data, listPath);
        if (!Array.isArray(list)) return "";
        var res = "";
        for (var idx = 0; idx < list.length; idx++) {
          var itemContext = Object.assign({}, data);
          itemContext[itemName] = list[idx];
          itemContext["loop"] = {
            index: idx + 1,
            index0: idx,
            first: (idx === 0),
            last: (idx === list.length - 1),
            length: list.length
          };
          res += renderMiniQalam(innerTpl, itemContext);
        }
        return res;
      });

      // 3. Handle Conditionals {% if cond %} ... {% elif ... %} ... {% else %} ... {% end %}
      var ifRegex = /\{%\s*if\s+([^%]+)\s*%\}([\s\S]*?)(?:\{%\s*elif\s+([^%]+)\s*%\}([\s\S]*?))?(?:\{%\s*else\s*%\}([\s\S]*?))?\{%\s*(?:end|endif)\s*%\}/g;
      output = output.replace(ifRegex, function(match, cond1, body1, cond2, body2, elseBody) {
        function evalCond(cStr) {
          cStr = cStr.trim();
          if (cStr.indexOf(">") !== -1) {
            var pts = cStr.split(">");
            var l = parseFloat(resolvePath(data, pts[0].trim())) || 0;
            var r = parseFloat(pts[1].trim()) || 0;
            return l > r;
          }
          if (cStr.indexOf("==") !== -1) {
            var pts = cStr.split("==");
            var l = resolvePath(data, pts[0].trim());
            var r = pts[1].trim().replace(/^['"]|['"]$/g, "");
            return String(l) == String(r);
          }
          var val = resolvePath(data, cStr);
          return Boolean(val);
        }

        if (evalCond(cond1)) {
          return renderMiniQalam(body1, data);
        } else if (cond2 && evalCond(cond2)) {
          return renderMiniQalam(body2, data);
        } else if (elseBody) {
          return renderMiniQalam(elseBody, data);
        }
        return "";
      });

      // 4. Handle Raw Variables {{{ expr }}}
      output = output.replace(/\{\{\{\s*([^}]+)\s*\}\}\}/g, function(m, expr) {
        return evalExpr(expr, data, false);
      });

      // 5. Handle Escaped Variables {{ expr }}
      output = output.replace(/\{\{\s*([^}]+)\s*\}\}/g, function(m, expr) {
        return evalExpr(expr, data, true);
      });

      return output;
    } catch (e) {
      return '<div style="color:var(--accent-rose); font-family:var(--font-mono);">Render Error: ' + e.message + '</div>';
    }
  }

  function evalExpr(expr, data, autoEscape) {
    var parts = expr.split("|");
    var baseVal = parts[0].trim();
    var val = "";

    // Check literal string or path
    if (/^['"].*['"]$/.test(baseVal)) {
      val = baseVal.slice(1, -1);
    } else if (!isNaN(Number(baseVal)) && baseVal !== "") {
      val = Number(baseVal);
    } else {
      val = resolvePath(data, baseVal);
    }

    // Apply Filter Pipeline
    for (var i = 1; i < parts.length; i++) {
      var filterPart = parts[i].trim();
      var match = filterPart.match(/^(\w+)(?:\((.*)\))?$/);
      if (match) {
        var fname = match[1];
        var fargs = match[2] || null;
        val = applyFilter(val, fname, fargs);
      }
    }

    return autoEscape ? escapeHtml(val) : String(val);
  }

  function updatePlayground() {
    var tpl = $("#simTemplate").val() || "";
    var dataStr = $("#simData").val() || "{}";
    var dataObj = {};

    try {
      dataObj = JSON.parse(dataStr);
    } catch (e) {
      $("#simPreview").html('<div style="color:var(--accent-amber); font-family:var(--font-mono);"><i class="fas fa-exclamation-triangle"></i> JSON Parse Error: ' + e.message + '</div>');
      $("#simHtmlSource pre code").text("<!-- Invalid JSON Context -->");
      return;
    }

    var rendered = renderMiniQalam(tpl, dataObj);
    $("#simPreview").html(rendered);
    $("#simHtmlSource pre code").text(rendered);

    // Generate Djazair snippet
    var djazairCode = 
      'use qalam\n\n' +
      'let template = `\n' + tpl + '\n`\n\n' +
      'let data = ' + dataStr.replace(/: true/g, ": True").replace(/: false/g, ": False").replace(/: null/g, ": Null") + '\n\n' +
      'let result = qalam.renderString(template, data)\n' +
      'print(result)';

    $("#simDjazairCode pre code").text(djazairCode);
  }

  // Handle Preset Change
  $("#simPresetSelect").on("change", function() {
    var key = $(this).val();
    if (presets[key]) {
      $("#simTemplate").val(presets[key].template);
      $("#simData").val(presets[key].data);
      updatePlayground();
    }
  });

  // Handle Input Changes
  $("#simTemplate, #simData").on("input", updatePlayground);

  // Initialize with default preset
  if ($("#simPresetSelect").length > 0) {
    $("#simPresetSelect").val("user").trigger("change");
  }
});
