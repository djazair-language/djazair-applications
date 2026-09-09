/**
 * Djazair SQLite Extension — Interactive Documentation Script
 * Features:
 *  - Real-time API search filter across methods, tables, and nav items
 *  - One-click code copy to clipboard
 *  - Tabbed code switcher
 *  - Scrollspy active section tracking
 *  - Dark / Light theme switcher with localStorage persistence
 *  - Mobile sidebar drawer toggle
 *  - Interactive client-side In-Memory SQLite Studio / Simulator
 *
 * Developer: Harizi Riyadh (hariziriyadh@gmail.com)
 * Copyright (c) 2026 Djazair Language Project
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
    if (matchCount === 0) {
      $("#contentArea").prepend(
        '<div class="no-results-msg alert-box warn">' +
        '<i class="fas fa-exclamation-triangle"></i>' +
        '<div><strong>No matching SQLite APIs found.</strong> Try searching for "connect", "safeQuery", "execute", "transaction", "fetchAssoc", or "insertId".</div>' +
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
  var savedTheme = localStorage.getItem("djazair_sqlite_docs_theme") || "dark";
  $("html").attr("data-theme", savedTheme);
  updateThemeIcon(savedTheme);

  $("#themeToggleBtn").on("click", function() {
    var currentTheme = $("html").attr("data-theme");
    var nextTheme = currentTheme === "light" ? "dark" : "light";
    $("html").attr("data-theme", nextTheme);
    localStorage.setItem("djazair_sqlite_docs_theme", nextTheme);
    updateThemeIcon(nextTheme);
  });

  function updateThemeIcon(theme) {
    if (theme === "light") {
      $("#themeToggleBtn").html('<i class="fas fa-moon"></i>');
    } else {
      $("#themeToggleBtn").html('<i class="fas fa-sun"></i>');
    }
  }

  // Mobile sidebar drawer
  $("#mobileMenuBtn").on("click", function() {
    $(".sidebar").toggleClass("open");
  });

  // ── 6. Interactive SQLite Studio / Simulator ───────────────────────────────
  // Pre-seed sample in-memory relational database
  var sampleDatabase = {
    users: [
      { id: 1, name: "Harizi Riyadh", email: "harizi@djazair.org", role: "admin", balance: 5400.0, created_at: "2026-01-10 10:00:00" },
      { id: 2, name: "Anis Benali", email: "anis@example.dz", role: "developer", balance: 3200.5, created_at: "2026-02-14 14:20:00" },
      { id: 3, name: "Karim Ziani", email: "karim@example.dz", role: "analyst", balance: 2150.0, created_at: "2026-03-01 09:15:00" },
      { id: 4, name: "Yacine Brahimi", email: "yacine@example.dz", role: "developer", balance: 4100.75, created_at: "2026-04-12 16:45:00" },
      { id: 5, name: "Amine Gouiri", email: "amine@example.dz", role: "designer", balance: 1850.0, created_at: "2026-05-20 11:30:00" }
    ],
    products: [
      { id: 1, name: "Mechanical Keyboard", category: "Hardware", price: 89.99, stock: 45 },
      { id: 2, name: "4K Monitor 27-inch", category: "Electronics", price: 349.50, stock: 12 },
      { id: 3, name: "Ergonomic Office Chair", category: "Furniture", price: 199.00, stock: 20 },
      { id: 4, name: "USB-C Hub 8-in-1", category: "Accessories", price: 39.99, stock: 150 },
      { id: 5, name: "Noise Cancelling Headset", category: "Audio", price: 129.00, stock: 35 }
    ],
    accounts: [
      { id: 101, owner: "Alice", balance: 1000.0 },
      { id: 102, owner: "Bob", balance: 500.0 }
    ]
  };

  // Transaction snapshot & state
  var inTransaction = false;
  var txSnapshot = null;
  var lastInsertId = 5;
  var lastChanges = 0;

  // Studio tabs
  $(".studio-tab-btn").on("click", function() {
    var tab = $(this).data("studio-tab");
    $(".studio-tab-btn").removeClass("active");
    $(this).addClass("active");

    $(".studio-pane").removeClass("active");
    $("#pane-" + tab).addClass("active");
  });

  // Query templates
  var templates = {
    select_users: "SELECT * FROM users WHERE balance > 2000 ORDER BY balance DESC",
    select_products: "SELECT name, category, price, stock FROM products WHERE stock < 50",
    insert_user: "INSERT INTO users (name, email, role, balance, created_at) VALUES ('Sofiane Feghouli', 'sofiane@djazair.dz', 'manager', 3800.0, '2026-08-20 12:00:00')",
    update_balance: "UPDATE users SET balance = balance + 500 WHERE role = 'developer'",
    delete_user: "DELETE FROM users WHERE id = 5",
    tx_transfer: "BEGIN TRANSACTION;\nUPDATE accounts SET balance = balance - 200 WHERE id = 101;\nUPDATE accounts SET balance = balance + 200 WHERE id = 102;\nCOMMIT;",
    schema_view: "SELECT * FROM products"
  };

  $("#templateSelect").on("change", function() {
    var key = $(this).val();
    if (templates[key]) {
      $("#sqlInput").val(templates[key]);
    }
  });

  // Reset database button
  $("#resetDbBtn").on("click", function() {
    sampleDatabase = JSON.parse(JSON.stringify({
      users: [
        { id: 1, name: "Harizi Riyadh", email: "harizi@djazair.org", role: "admin", balance: 5400.0, created_at: "2026-01-10 10:00:00" },
        { id: 2, name: "Anis Benali", email: "anis@example.dz", role: "developer", balance: 3200.5, created_at: "2026-02-14 14:20:00" },
        { id: 3, name: "Karim Ziani", email: "karim@example.dz", role: "analyst", balance: 2150.0, created_at: "2026-03-01 09:15:00" },
        { id: 4, name: "Yacine Brahimi", email: "yacine@example.dz", role: "developer", balance: 4100.75, created_at: "2026-04-12 16:45:00" },
        { id: 5, name: "Amine Gouiri", email: "amine@example.dz", role: "designer", balance: 1850.0, created_at: "2026-05-20 11:30:00" }
      ],
      products: [
        { id: 1, name: "Mechanical Keyboard", category: "Hardware", price: 89.99, stock: 45 },
        { id: 2, name: "4K Monitor 27-inch", category: "Electronics", price: 349.50, stock: 12 },
        { id: 3, name: "Ergonomic Office Chair", category: "Furniture", price: 199.00, stock: 20 },
        { id: 4, name: "USB-C Hub 8-in-1", category: "Accessories", price: 39.99, stock: 150 },
        { id: 5, name: "Noise Cancelling Headset", category: "Audio", price: 129.00, stock: 35 }
      ],
      accounts: [
        { id: 101, owner: "Alice", balance: 1000.0 },
        { id: 102, owner: "Bob", balance: 500.0 }
      ]
    }));
    inTransaction = false;
    txSnapshot = null;
    lastInsertId = 5;
    lastChanges = 0;
    $("#studioStatus").html('<span class="status-badge ok"><i class="fas fa-check"></i> Database Reset</span> In-memory DB re-initialized.');
    renderSchemaView();
    executeSql($("#sqlInput").val());
  });

  // Run Query Button
  $("#runQueryBtn").on("click", function() {
    var rawSql = $("#sqlInput").val().trim();
    if (!rawSql) return;
    executeSql(rawSql);
  });

  // Keybind: Ctrl+Enter or Cmd+Enter to execute SQL
  $("#sqlInput").on("keydown", function(e) {
    if ((e.ctrlKey || e.metaKey) && e.keyCode === 13) {
      e.preventDefault();
      $("#runQueryBtn").click();
    }
  });

  function executeSql(rawSql) {
    var startTime = performance.now();
    var statements = rawSql.split(";").map(function(s) { return s.trim(); }).filter(function(s) { return s.length > 0; });

    var lastResult = null;
    var errorMsg = null;
    var isSelect = false;

    try {
      for (var i = 0; i < statements.length; i++) {
        var stmt = statements[i];
        var upper = stmt.toUpperCase();

        if (upper.startsWith("BEGIN")) {
          inTransaction = true;
          txSnapshot = JSON.parse(JSON.stringify(sampleDatabase));
          lastChanges = 0;
        } else if (upper.startsWith("COMMIT")) {
          inTransaction = false;
          txSnapshot = null;
          lastChanges = 0;
        } else if (upper.startsWith("ROLLBACK")) {
          if (txSnapshot) {
            sampleDatabase = txSnapshot;
            txSnapshot = null;
          }
          inTransaction = false;
          lastChanges = 0;
        } else if (upper.startsWith("SELECT")) {
          isSelect = true;
          lastResult = handleSelect(stmt);
        } else if (upper.startsWith("INSERT")) {
          handleInsert(stmt);
        } else if (upper.startsWith("UPDATE")) {
          handleUpdate(stmt);
        } else if (upper.startsWith("DELETE")) {
          handleDelete(stmt);
        } else if (upper.startsWith("CREATE TABLE")) {
          handleCreateTable(stmt);
        } else {
          throw new Error("Unsupported statement in simulator: " + stmt.substring(0, 20) + "...");
        }
      }
    } catch (err) {
      errorMsg = err.message;
    }

    var elapsed = (performance.now() - startTime).toFixed(2);

    // Update Status Bar
    if (errorMsg) {
      $("#studioStatus").html(
        '<span class="status-badge err"><i class="fas fa-times-circle"></i> Error</span> ' +
        '<span style="color:var(--accent-rose);">' + escapeHtml(errorMsg) + '</span>'
      );
    } else {
      var txLabel = inTransaction ? ' <span class="nav-tag" style="background:rgba(245,158,11,0.2);color:var(--accent-amber);">TX Active</span>' : '';
      $("#studioStatus").html(
        '<span class="status-badge ok"><i class="fas fa-check-circle"></i> SQLITE_OK</span> ' +
        'Time: <strong>' + elapsed + ' ms</strong> | Changes: <strong>' + lastChanges + '</strong> | Last ID: <strong>' + lastInsertId + '</strong>' + txLabel
      );
    }

    // Render Results
    if (isSelect && lastResult && !errorMsg) {
      renderGridTable(lastResult);
      renderAssocView(lastResult);
      renderRowView(lastResult);
    } else if (!errorMsg) {
      $("#pane-grid").html(
        '<div class="empty-results-msg"><i class="fas fa-check-circle" style="font-size:28px;color:var(--accent-emerald);margin-bottom:8px;display:block;"></i>' +
        'Query executed successfully. Rows affected: <strong>' + lastChanges + '</strong>.</div>'
      );
      $("#pane-assoc").html('<pre style="color:var(--text-muted);">// No rows returned by non-query statement</pre>');
      $("#pane-row").html('<pre style="color:var(--text-muted);">// No rows returned by non-query statement</pre>');
    } else {
      $("#pane-grid").html('<div class="empty-results-msg" style="color:var(--accent-rose);"><i class="fas fa-exclamation-triangle"></i> ' + escapeHtml(errorMsg) + '</div>');
    }

    // Always update Schema view and Generated Djazair code
    renderSchemaView();
    renderGeneratedDjazair(rawSql, isSelect);
  }

  // Simulator Query Parsers
  function handleSelect(stmt) {
    // Regex for: SELECT <cols> FROM <table> [WHERE <col> <op> <val>] [ORDER BY <col> [ASC|DESC]] [LIMIT <n>]
    var m = stmt.match(/SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+ORDER\s+BY\s+([a-zA-Z0-9_]+)(?:\s+(ASC|DESC))?)?(?:\s+LIMIT\s+(\d+))?$/i);
    if (!m) {
      throw new Error("Unable to parse SELECT query in simulator. Syntax: SELECT cols FROM table [WHERE ...] [ORDER BY ...] [LIMIT ...]");
    }

    var colStr = m[1].trim();
    var tableName = m[2].trim();
    var whereClause = m[3] ? m[3].trim() : null;
    var orderBy = m[4] ? m[4].trim() : null;
    var orderDir = (m[5] || "ASC").toUpperCase();
    var limit = m[6] ? parseInt(m[6], 10) : null;

    if (!sampleDatabase[tableName]) {
      throw new Error("no such table: " + tableName);
    }

    var rows = JSON.parse(JSON.stringify(sampleDatabase[tableName]));

    // WHERE filter
    if (whereClause) {
      rows = rows.filter(function(row) {
        return evaluateCondition(row, whereClause);
      });
    }

    // ORDER BY
    if (orderBy) {
      rows.sort(function(a, b) {
        var valA = a[orderBy];
        var valB = b[orderBy];
        if (valA < valB) return orderDir === "ASC" ? -1 : 1;
        if (valA > valB) return orderDir === "ASC" ? 1 : -1;
        return 0;
      });
    }

    // LIMIT
    if (limit !== null) {
      rows = rows.slice(0, limit);
    }

    // Column projections
    var finalColumns = [];
    if (colStr === "*") {
      if (rows.length > 0) {
        finalColumns = Object.keys(rows[0]);
      } else if (sampleDatabase[tableName].length > 0) {
        finalColumns = Object.keys(sampleDatabase[tableName][0]);
      } else {
        finalColumns = ["id"];
      }
    } else {
      finalColumns = colStr.split(",").map(function(c) { return c.trim(); });
      rows = rows.map(function(row) {
        var projected = {};
        finalColumns.forEach(function(col) {
          projected[col] = row[col] !== undefined ? row[col] : null;
        });
        return projected;
      });
    }

    return { columns: finalColumns, rows: rows };
  }

  function handleInsert(stmt) {
    var m = stmt.match(/INSERT\s+INTO\s+([a-zA-Z0-9_]+)\s*(?:\((.+?)\))?\s+VALUES\s*\((.+?)\)/i);
    if (!m) throw new Error("Invalid INSERT statement syntax.");

    var tableName = m[1].trim();
    var colNames = m[2] ? m[2].split(",").map(function(c) { return c.trim(); }) : null;
    var rawValues = parseValues(m[3]);

    if (!sampleDatabase[tableName]) {
      throw new Error("no such table: " + tableName);
    }

    var newRow = {};
    if (colNames) {
      for (var i = 0; i < colNames.length; i++) {
        newRow[colNames[i]] = rawValues[i] !== undefined ? rawValues[i] : null;
      }
    } else {
      var sampleRow = sampleDatabase[tableName][0] || {};
      var keys = Object.keys(sampleRow);
      for (var j = 0; j < keys.length; j++) {
        newRow[keys[j]] = rawValues[j] !== undefined ? rawValues[j] : null;
      }
    }

    lastInsertId++;
    if (!newRow.id) {
      newRow.id = lastInsertId;
    } else {
      lastInsertId = Number(newRow.id);
    }

    sampleDatabase[tableName].push(newRow);
    lastChanges = 1;
  }

  function handleUpdate(stmt) {
    var m = stmt.match(/UPDATE\s+([a-zA-Z0-9_]+)\s+SET\s+(.+?)(?:\s+WHERE\s+(.+?))?$/i);
    if (!m) throw new Error("Invalid UPDATE statement syntax.");

    var tableName = m[1].trim();
    var setExpr = m[2].trim();
    var whereClause = m[3] ? m[3].trim() : null;

    if (!sampleDatabase[tableName]) throw new Error("no such table: " + tableName);

    var count = 0;
    var rows = sampleDatabase[tableName];

    for (var i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!whereClause || evaluateCondition(row, whereClause)) {
        applySet(row, setExpr);
        count++;
      }
    }

    lastChanges = count;
  }

  function handleDelete(stmt) {
    var m = stmt.match(/DELETE\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?$/i);
    if (!m) throw new Error("Invalid DELETE statement syntax.");

    var tableName = m[1].trim();
    var whereClause = m[2] ? m[2].trim() : null;

    if (!sampleDatabase[tableName]) throw new Error("no such table: " + tableName);

    var initialLen = sampleDatabase[tableName].length;
    sampleDatabase[tableName] = sampleDatabase[tableName].filter(function(row) {
      if (!whereClause) return false;
      return !evaluateCondition(row, whereClause);
    });

    lastChanges = initialLen - sampleDatabase[tableName].length;
  }

  function handleCreateTable(stmt) {
    var m = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([a-zA-Z0-9_]+)\s*\((.+?)\)/i);
    if (!m) throw new Error("Invalid CREATE TABLE statement.");

    var tableName = m[1].trim();
    if (!sampleDatabase[tableName]) {
      sampleDatabase[tableName] = [];
    }
    lastChanges = 0;
  }

  function evaluateCondition(row, whereClause) {
    var tokens = whereClause.match(/([a-zA-Z0-9_]+)\s*(=|!=|>|<|>=|<=|LIKE)\s*(.+)/i);
    if (!tokens) return true;

    var col = tokens[1].trim();
    var op = tokens[2].trim().toUpperCase();
    var rawVal = tokens[3].trim().replace(/^['"]|['"]$/g, "");

    var targetVal = row[col];
    if (targetVal === undefined) return false;

    if (op === "=") return String(targetVal).toLowerCase() === String(rawVal).toLowerCase();
    if (op === "!=") return String(targetVal).toLowerCase() !== String(rawVal).toLowerCase();
    if (op === ">") return Number(targetVal) > Number(rawVal);
    if (op === "<") return Number(targetVal) < Number(rawVal);
    if (op === ">=") return Number(targetVal) >= Number(rawVal);
    if (op === "<=") return Number(targetVal) <= Number(rawVal);
    if (op === "LIKE") {
      var pat = rawVal.replace(/%/g, ".*");
      return new RegExp("^" + pat + "$", "i").test(String(targetVal));
    }
    return true;
  }

  function applySet(row, setExpr) {
    var parts = setExpr.split(",");
    parts.forEach(function(part) {
      var pair = part.split("=");
      var col = pair[0].trim();
      var valExpr = pair[1].trim();

      // Simple arithmetic: col = col + 500
      var mathMatch = valExpr.match(/([a-zA-Z0-9_]+)\s*([+\-*/])\s*([0-9.]+)/);
      if (mathMatch && mathMatch[1] === col) {
        var base = Number(row[col]) || 0;
        var op = mathMatch[2];
        var delta = Number(mathMatch[3]);
        if (op === "+") row[col] = base + delta;
        else if (op === "-") row[col] = base - delta;
        else if (op === "*") row[col] = base * delta;
        else if (op === "/") row[col] = base / delta;
      } else {
        var cleanVal = valExpr.replace(/^['"]|['"]$/g, "");
        if (!isNaN(cleanVal) && cleanVal !== "") {
          row[col] = Number(cleanVal);
        } else {
          row[col] = cleanVal;
        }
      }
    });
  }

  function parseValues(str) {
    return str.split(",").map(function(s) {
      s = s.trim();
      if (/^['"].*['"]$/.test(s)) return s.slice(1, -1);
      if (s.toUpperCase() === "NULL") return null;
      if (!isNaN(s)) return Number(s);
      return s;
    });
  }

  // Renderers
  function renderGridTable(result) {
    if (!result.rows || result.rows.length === 0) {
      $("#pane-grid").html('<div class="empty-results-msg"><i class="fas fa-info-circle"></i> Query executed successfully: 0 rows returned.</div>');
      return;
    }

    var html = '<table class="result-grid-table"><thead><tr>';
    result.columns.forEach(function(col) {
      html += '<th>' + escapeHtml(col) + '</th>';
    });
    html += '</tr></thead><tbody>';

    result.rows.forEach(function(row) {
      html += '<tr>';
      result.columns.forEach(function(col) {
        var val = row[col];
        var formatted = val === null ? '<em style="color:var(--text-muted);">NULL</em>' : escapeHtml(String(val));
        html += '<td>' + formatted + '</td>';
      });
      html += '</tr>';
    });

    html += '</tbody></table>';
    $("#pane-grid").html(html);
  }

  function renderAssocView(result) {
    var formatted = JSON.stringify(result.rows, null, 2);
    var code = '<pre style="color:var(--accent-blue);font-family:var(--font-mono);font-size:12.5px;">// fetchAllAssoc() output in Djazair:\n' + escapeHtml(formatted) + '</pre>';
    $("#pane-assoc").html(code);
  }

  function renderRowView(result) {
    var arrayFormat = result.rows.map(function(r) {
      return result.columns.map(function(c) { return r[c]; });
    });
    var formatted = JSON.stringify(arrayFormat, null, 2);
    var code = '<pre style="color:var(--accent-emerald);font-family:var(--font-mono);font-size:12.5px;">// fetchRow() output in Djazair (indexed):\n' + escapeHtml(formatted) + '</pre>';
    $("#pane-row").html(code);
  }

  function renderSchemaView() {
    var html = '<div style="font-size:13px;font-family:var(--font-mono);">';
    var tableNames = Object.keys(sampleDatabase);

    tableNames.forEach(function(tbl) {
      var rows = sampleDatabase[tbl];
      var cols = rows.length > 0 ? Object.keys(rows[0]) : ["(empty)"];
      html += '<div style="margin-bottom:12px;">';
      html += '<strong style="color:var(--accent-cyan);"><i class="fas fa-table"></i> ' + escapeHtml(tbl) + '</strong> ';
      html += '<span style="color:var(--text-muted);font-size:11px;">(' + rows.length + ' rows)</span>';
      html += '<div style="color:var(--text-secondary);padding-left:18px;margin-top:4px;">';
      cols.forEach(function(col) {
        html += '<span style="display:inline-block;margin-right:12px;"><i class="fas fa-columns" style="font-size:10px;color:var(--accent-blue);"></i> ' + escapeHtml(col) + '</span>';
      });
      html += '</div></div>';
    });

    html += '</div>';
    $("#pane-schema").html(html);
  }

  function renderGeneratedDjazair(sql, isSelect) {
    var code = "";
    if (isSelect) {
      code = 'use sqlite\n\n' +
             'let db = sqlite.connect("app.db")\n' +
             'if db.isConnected()\n' +
             '    let res = db.query("' + sql.replace(/"/g, '\\"') + '")\n' +
             '    if !isNull(res)\n' +
             '        let rows = res.fetchAllAssoc()\n' +
             '        for row in rows\n' +
             '            print(row)\n' +
             '        end\n' +
             '        res.close()\n' +
             '    end\n' +
             '    db.close()\n' +
             'end';
    } else {
      code = 'use sqlite\n\n' +
             'let db = sqlite.connect("app.db")\n' +
             'if db.isConnected()\n' +
             '    let ok = db.execute("' + sql.replace(/"/g, '\\"') + '")\n' +
             '    if ok\n' +
             '        print("Executed! Changes: " + str(db.changes()) + ", Last ID: " + str(db.insertId()))\n' +
             '    else\n' +
             '        print("Failed: " + db.error())\n' +
             '    end\n' +
             '    db.close()\n' +
             'end';
    }

    $("#simDjazairCode").text(code);
  }

  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initial Simulator Run
  renderSchemaView();
  executeSql($("#sqlInput").val());
});
