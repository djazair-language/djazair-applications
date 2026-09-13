/**
 * =============================================================================
 * Project:      Djazair WebView Desktop Application Framework
 * File:         assets/js/app.js
 * Description:  Showcase Application Frontend Controller & IPC Bridge Connector
 * Author:       Harizi Riyadh (hariziriyadh@gmail.com)
 * Copyright:    (c) 2026 Harizi Riyadh / Djazair Language Project. All rights reserved.
 * License:      MIT License
 * =============================================================================
 */

(function($) {
    'use strict';

    // ── Log Stream Management ────────────────────────────────────────────────
    const logBox = document.getElementById('logStream');
    let logCounter = 0;

    function appendLog(level, message, details) {
        logCounter++;
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
        
        let levelClass = 'log-level-info';
        let badge = 'INFO';
        if (level === 'success') { levelClass = 'log-level-success'; badge = 'OK'; }
        else if (level === 'warn') { levelClass = 'log-level-warn'; badge = 'WARN'; }
        else if (level === 'error') { levelClass = 'log-level-error'; badge = 'ERR'; }
        else if (level === 'event') { levelClass = 'log-level-event'; badge = 'EVT'; }

        const entry = document.createElement('div');
        entry.className = `log-entry ${levelClass}`;
        entry.setAttribute('data-level', level);
        entry.innerHTML = `
            <span class="log-time">[${timeStr}]</span>
            <span class="font-bold tracking-wider">[${badge}]</span>
            <span class="flex-1">${escapeHtml(message)}</span>
            ${details ? `<span class="text-slate-500 font-mono text-xs">${escapeHtml(JSON.stringify(details))}</span>` : ''}
        `;

        if (logBox) {
            logBox.appendChild(entry);
            logBox.scrollTop = logBox.scrollHeight;
        }

        // Keep maximum 200 logs
        if (logBox && logBox.children.length > 200) {
            logBox.removeChild(logBox.firstChild);
        }
    }

    function escapeHtml(str) {
        if (typeof str !== 'string') str = String(str);
        return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    // Expose log globally for inline testing
    window.showcaseLog = appendLog;

    // ── Document Ready ───────────────────────────────────────────────────────
    $(document).ready(function() {
        appendLog('success', 'Djazair WebView Showcase UI initialized.');

        // Verify window.djazair IPC bridge
        if (!window.djazair) {
            appendLog('error', 'window.djazair is not injected! Ensure IPC bridge is enabled.');
            $('#ipcStatusBadge').text('IPC Offline').removeClass('tag-green').addClass('tag-amber');
        } else {
            appendLog('info', 'window.djazair IPC Bridge detected and ready.');
            $('#ipcStatusBadge').text('IPC Connected').removeClass('tag-amber').addClass('tag-green');
        }

        // ── 1. Tab Navigation ────────────────────────────────────────────────
        $('.nav-tab-btn').on('click', function() {
            const target = $(this).data('tab');
            $('.nav-tab-btn').removeClass('active');
            $(this).addClass('active');

            $('.tab-content-panel').addClass('hidden');
            $(`#tab-${target}`).removeClass('hidden');

            appendLog('info', `Switched to tab: ${target}`);
        });

        // ── 2. Window Dragging & Controls ────────────────────────────────────
        $('#btnWinMin').on('click', function() {
            window.djazair.invoke('win_minimize');
        });

        $('#btnWinMax').on('click', function() {
            window.djazair.invoke('win_toggleMaximize').then(function(isMax) {
                updateMaximizeUI(isMax);
            });
        });

        $('#btnWinClose').on('click', function() {
            window.djazair.invoke('win_close');
        });

        // ── 3. Tab: Window Management ────────────────────────────────────────
        // Preset Sizes
        $('.btn-preset-size').on('click', function() {
            const w = $(this).data('w');
            const h = $(this).data('h');
            $('#inputWinW').val(w);
            $('#inputWinH').val(h);
            window.djazair.invoke('win_setSize', { width: w, height: h })
                .then(function(res) {
                    appendLog('success', `Window size updated to: ${res[0]}x${res[1]}`);
                });
        });

        // Apply Custom Size
        $('#btnApplySize').on('click', function() {
            const w = parseInt($('#inputWinW').val(), 10);
            const h = parseInt($('#inputWinH').val(), 10);
            if (isNaN(w) || isNaN(h)) return;
            window.djazair.invoke('win_setSize', { width: w, height: h })
                .then(function(res) {
                    appendLog('success', `Window resized to: ${res[0]}x${res[1]}`);
                });
        });

        // Apply Position
        $('#btnApplyPos').on('click', function() {
            const x = parseInt($('#inputWinX').val(), 10);
            const y = parseInt($('#inputWinY').val(), 10);
            if (isNaN(x) || isNaN(y)) return;
            window.djazair.invoke('win_setPosition', { x: x, y: y })
                .then(function(res) {
                    appendLog('success', `Window moved to coordinates: (${res[0]}, ${res[1]})`);
                });
        });

        // Center Window
        $('#btnCenterWin').on('click', function() {
            window.djazair.invoke('win_center')
                .then(function(res) {
                    appendLog('success', `Window centered at: (${res[0]}, ${res[1]})`);
                });
        });

        function updateMaximizeUI(isMax) {
            $('#valMaximized').text(isMax ? 'Yes' : 'No');
            const $btn = $('#btnWinMax');
            if (isMax) {
                $btn.attr('title', 'Restore').html('<i id="iconWinMax" class="far fa-window-restore text-xs"></i>');
                $('#btnActionMax').removeClass('btn-emerald').addClass('btn-secondary');
                $('#btnActionRestore').removeClass('btn-secondary').addClass('btn-emerald');
            } else {
                $btn.attr('title', 'Maximize').html('<i id="iconWinMax" class="far fa-square text-xs"></i>');
                $('#btnActionRestore').removeClass('btn-emerald').addClass('btn-secondary');
                $('#btnActionMax').removeClass('btn-secondary').addClass('btn-emerald');
            }
        }

        // Window States
        $('#btnActionMin').on('click', () => window.djazair.invoke('win_minimize'));
        $('#btnActionMax').on('click', function() {
            window.djazair.invoke('win_maximize').then(() => updateMaximizeUI(true));
        });
        $('#btnActionRestore').on('click', function() {
            window.djazair.invoke('win_restore').then(() => updateMaximizeUI(false));
        });

        function updateFullscreenUI(isFs) {
            $('#valFullscreen').text(isFs ? 'Yes' : 'No');
            if (isFs) {
                $('#btnActionFullscreen')
                    .html('<i class="fas fa-compress"></i> Exit Fullscreen')
                    .removeClass('btn-purple')
                    .addClass('btn-emerald');
            } else {
                $('#btnActionFullscreen')
                    .html('<i class="fas fa-expand"></i> Fullscreen')
                    .removeClass('btn-emerald')
                    .addClass('btn-purple');
            }
        }

        $('#btnActionFullscreen').on('click', function() {
            window.djazair.invoke('win_toggleFullscreen')
                .then(function(isFs) {
                    appendLog('info', `Fullscreen toggled (isFullscreen = ${isFs})`);
                    updateFullscreenUI(isFs);
                });
        });

        // Attention / Flash
        $('#btnFlashWin').on('click', function() {
            window.djazair.invoke('win_flash', { enable: true })
                .then(() => appendLog('info', 'Taskbar attention flash triggered'));
        });

        $('#btnReqAttention').on('click', function() {
            window.djazair.invoke('win_requestAttention')
                .then(() => appendLog('info', 'Window attention requested'));
        });

        // Always on Top
        let alwaysOnTopState = false;
        $('#btnToggleAlwaysOnTop').on('click', function() {
            alwaysOnTopState = !alwaysOnTopState;
            window.djazair.invoke('win_setAlwaysOnTop', { enable: alwaysOnTopState })
                .then(function(val) {
                    appendLog('info', `Always On Top set to: ${val}`);
                    $('#valAlwaysOnTop').text(val ? 'Enabled' : 'Disabled');
                });
        });

        // Resizable
        let resizableState = true;
        $('#btnToggleResizable').on('click', function() {
            resizableState = !resizableState;
            window.djazair.invoke('win_setResizable', { enable: resizableState })
                .then(function(val) {
                    appendLog('info', `Resizable toggled: ${val}`);
                    $('#valResizable').text(val ? 'Yes' : 'No');
                });
        });

        // Set Title
        $('#btnApplyTitle').on('click', function() {
            const newTitle = $('#inputWinTitle').val();
            window.djazair.invoke('win_setTitle', { title: newTitle })
                .then(function(title) {
                    appendLog('success', `Window title updated to: "${title}"`);
                    $('#titlebarText').text(title);
                });
        });

        // Opacity Slider
        $('#sliderOpacity').on('input', function() {
            const alpha = parseFloat($(this).val());
            $('#valOpacity').text(`${Math.round(alpha * 100)}%`);
            window.djazair.invoke('win_setOpacity', { opacity: alpha });
        });

        // Zoom Controls
        $('.btn-zoom-preset').on('click', function() {
            const zoom = parseFloat($(this).data('zoom'));
            window.djazair.invoke('win_setZoomLevel', { zoom: zoom })
                .then(function(res) {
                    appendLog('info', `Zoom level set to: ${res}`);
                    $('#valZoomLevel').text(`${Math.round(res * 100)}%`);
                });
        });

        // Dark Titlebar
        let isDarkTitlebar = true;
        $('#btnToggleDarkTitle').on('click', function() {
            isDarkTitlebar = !isDarkTitlebar;
            window.djazair.invoke('win_setDarkMode', { enable: isDarkTitlebar })
                .then(() => appendLog('info', `Dark titlebar set to: ${isDarkTitlebar}`));
        });

        // Background Color Presets
        $('.btn-bg-swatch').on('click', function() {
            const r = $(this).data('r');
            const g = $(this).data('g');
            const b = $(this).data('b');
            window.djazair.invoke('win_setBackgroundColor', { r: r, g: g, b: b })
                .then(() => appendLog('info', `Background color set to RGB(${r}, ${g}, ${b})`));
        });

        // ── 4. Tab: Native System Dialogs ────────────────────────────────────
        // Message Boxes
        $('#btnDlgInfo').on('click', function() {
            window.djazair.invoke('dialog_message', {
                type: 'info',
                title: 'Operation Complete',
                message: 'All tasks completed successfully.',
                detail: 'The requested operation was executed with zero errors.'
            }).then(res => {
                appendLog('success', `Message Dialog Result: "${res}"`);
                $('#badgeDlgResult').text(`Result: ${res}`);
            });
        });

        $('#btnDlgWarn').on('click', function() {
            window.djazair.invoke('dialog_message', {
                type: 'warn',
                title: 'Resource Alert',
                message: 'High disk activity detected.',
                detail: 'Please ensure sufficient storage remains.'
            }).then(res => {
                appendLog('warn', `Warning Dialog Result: "${res}"`);
                $('#badgeDlgResult').text(`Result: ${res}`);
            });
        });

        $('#btnDlgError').on('click', function() {
            window.djazair.invoke('dialog_message', {
                type: 'error',
                title: 'Connection Refused',
                message: 'Failed to establish remote socket.',
                detail: 'Check your internet connection and retry.'
            }).then(res => {
                appendLog('error', `Error Dialog Result: "${res}"`);
                $('#badgeDlgResult').text(`Result: ${res}`);
            });
        });

        $('#btnDlgQuestion').on('click', function() {
            window.djazair.invoke('dialog_message', {
                type: 'question',
                title: 'Confirm Operation',
                message: 'Do you wish to commit the transaction?',
                buttons: 'yesnocancel',
                defaultId: 0,
                cancelId: 2
            }).then(res => {
                appendLog('info', `Question Dialog Selection: "${res}"`);
                $('#badgeDlgResult').text(`Choice: ${res}`);
            });
        });

        // File Dialogs
        $('#btnDlgOpenFile').on('click', function() {
            window.djazair.invoke('dialog_openFile', {
                title: 'Choose Document or Code File',
                filters: [
                    { name: 'Djazair & Scripts', extensions: ['dz', 'json', 'js', 'html', 'txt'] },
                    { name: 'All Files (*.*)', extensions: ['*'] }
                ],
                multiSelections: false
            }).then(res => {
                appendLog('success', `Selected File: ${res || 'Cancelled'}`);
                $('#valFileSelected').text(res || 'None');
            });
        });

        $('#btnDlgOpenMulti').on('click', function() {
            window.djazair.invoke('dialog_openFile', {
                title: 'Select Multiple Files',
                multiSelections: true
            }).then(res => {
                const count = Array.isArray(res) ? res.length : (res ? 1 : 0);
                appendLog('success', `Selected ${count} file(s): ${JSON.stringify(res)}`);
                $('#valFileSelected').text(`${count} files selected`);
            });
        });

        $('#btnDlgSaveFile').on('click', function() {
            window.djazair.invoke('dialog_saveFile', {
                title: 'Save Application Export',
                defaultPath: 'export_report.json',
                filters: [
                    { name: 'JSON Document (*.json)', extensions: ['json'] },
                    { name: 'Plain Text (*.txt)', extensions: ['txt'] }
                ]
            }).then(res => {
                appendLog('success', `Save Target: ${res || 'Cancelled'}`);
                $('#valFileSelected').text(res || 'Cancelled');
            });
        });

        $('#btnDlgOpenFolder').on('click', function() {
            window.djazair.invoke('dialog_openFolder', {
                title: 'Select Project Working Directory'
            }).then(res => {
                appendLog('success', `Selected Directory: ${res || 'Cancelled'}`);
                $('#valFileSelected').text(res || 'None');
            });
        });

        $('#btnDlgPickColor').on('click', function() {
            window.djazair.invoke('dialog_pickColor', {
                title: 'Choose Theme Accent Color'
            }).then(res => {
                if (res) {
                    appendLog('success', `Selected Color: ${res}`);
                    $('#swatchColorPreview').css('background-color', res);
                    $('#valColorPicked').text(res);
                } else {
                    appendLog('info', 'Color picker was dismissed without selection');
                }
            });
        });

        // ── 5. Tab: IPC Bridge & RPC ─────────────────────────────────────────
        // Calculator RPC
        $('#btnCalculateRpc').on('click', function() {
            const a = parseFloat($('#calcNumA').val()) || 0;
            const b = parseFloat($('#calcNumB').val()) || 0;
            const op = $('#calcOp').val();
            const t0 = performance.now();

            window.djazair.invoke('rpc_calculate', { a: a, b: b, op: op })
                .then(function(res) {
                    const elapsed = (performance.now() - t0).toFixed(2);
                    appendLog('success', `RPC Result: ${res.operation} = ${res.result} (${elapsed}ms)`);
                    $('#calcResultBadge').text(`= ${res.result}`).removeClass('text-rose-400').addClass('text-emerald-400');
                })
                .catch(function(err) {
                    appendLog('error', `Calculation Error: ${err.message}`);
                    $('#calcResultBadge').text(`Error: ${err.message}`).removeClass('text-emerald-400').addClass('text-rose-400');
                });
        });

        // Ping / Roundtrip Latency
        $('#btnRpcPing').on('click', function() {
            const t0 = performance.now();
            window.djazair.invoke('rpc_ping', { clientTime: Date.now() })
                .then(function(res) {
                    const rtt = (performance.now() - t0).toFixed(2);
                    appendLog('success', `Pong received! Roundtrip Latency: ${rtt}ms`, res);
                    $('#badgeLatency').text(`${rtt} ms`);
                });
        });

        // System Info RPC
        $('#btnRpcSystemInfo').on('click', function() {
            window.djazair.invoke('rpc_systemInfo')
                .then(function(info) {
                    appendLog('info', 'System Information:', info);
                    $('#sysInfoScriptDir').text(info.scriptDir);
                    $('#sysInfoLibsDir').text(info.libsDir);
                    $('#sysInfoEngine').text(info.djazairEngine);
                    $('#sysInfoVersion').text(info.frameworkVersion);
                });
        });

        // Timeout Resilience Test
        $('#btnTestTimeout').on('click', function() {
            appendLog('info', 'Testing invoke() timeout (1500ms limit on nonexistent/slow channel)...');
            window.djazair.invoke('__slow_channel_test__', {}, 1500)
                .then(function() {
                    appendLog('error', 'Unexpected: slow call resolved instead of timing out!');
                })
                .catch(function(err) {
                    appendLog('success', `Timeout successfully caught: ${err.message}`);
                });
        });

        // Backend Exception Test
        $('#btnTestBackendError').on('click', function() {
            appendLog('info', 'Triggering backend exception to test error isolation...');
            window.djazair.invoke('rpc_testError', { reason: 'Intentional fault test from UI' })
                .then(function() {
                    appendLog('error', 'Unexpected: error call should have rejected!');
                })
                .catch(function(err) {
                    appendLog('warn', `Error correctly surfaced to JS: ${err.message}`);
                });
        });

        // Direct Native Binding Call (window.nativeMultiply)
        $('#btnTestNativeMultiply').on('click', function() {
            try {
                if (typeof window.nativeMultiply === 'function') {
                    window.nativeMultiply(9, 9).then(function(res) {
                        var val = (res !== null && typeof res === 'object' && ('__dz_data' in res)) ? res.__dz_data : res;
                        appendLog('success', `window.nativeMultiply(9, 9) returned: ${val}`);
                        $('#valMultiplyRes').text(val);
                    }).catch(function(err) {
                        appendLog('error', `window.nativeMultiply failed: ${err.message}`);
                    });
                } else {
                    appendLog('error', 'window.nativeMultiply is not exposed!');
                }
            } catch (e) {
                appendLog('error', `Binding call failed: ${e.message}`);
            }
        });

        // Push Ticker Stream
        let tickerInterval = null;
        $('#btnStartTicker').on('click', function() {
            window.djazair.invoke('rpc_startTicker').then(function() {
                appendLog('info', 'Backend push event stream started');
                $('#btnStartTicker').addClass('opacity-50 pointer-events-none');
                $('#btnStopTicker').removeClass('opacity-50 pointer-events-none');
                
                // Trigger pulses every 1s
                tickerInterval = setInterval(function() {
                    window.djazair.invoke('rpc_triggerTickerPulse');
                }, 1000);
            });
        });

        $('#btnStopTicker').on('click', function() {
            clearInterval(tickerInterval);
            window.djazair.invoke('rpc_stopTicker').then(function() {
                appendLog('info', 'Backend push event stream stopped');
                $('#btnStartTicker').removeClass('opacity-50 pointer-events-none');
                $('#btnStopTicker').addClass('opacity-50 pointer-events-none');
            });
        });

        // ── 6. Tab: Menus, Tray & Notifications ──────────────────────────────
        $('#btnShowContextMenu').on('click', function() {
            window.djazair.invoke('menu_showContext');
        });

        // Right-click anywhere in showcase triggers native context menu
        $(document).on('contextmenu', function(e) {
            e.preventDefault();
            window.djazair.invoke('menu_showContext');
        });

        // System Tray Controls
        $('#btnCreateTray').on('click', function() {
            window.djazair.invoke('tray_create', { tooltip: 'Djazair Master Showcase' })
                .then(function(res) {
                    appendLog('success', 'System Tray icon created', res);
                    $('#badgeTrayStatus').text('Active').removeClass('tag-amber').addClass('tag-green');
                });
        });

        $('#btnUpdateTrayTooltip').on('click', function() {
            const tip = $('#inputTrayTooltip').val();
            window.djazair.invoke('tray_setTooltip', { tooltip: tip })
                .then(() => appendLog('info', `Tray tooltip updated to: "${tip}"`));
        });

        $('#btnTrayBalloon').on('click', function() {
            window.djazair.invoke('tray_showBalloon', {
                title: 'Showcase Alert',
                message: 'Notification balloon sent from Djazair system tray integration!',
                timeout: 5
            }).then(() => appendLog('info', 'Tray balloon notification sent'));
        });

        $('#btnDestroyTray').on('click', function() {
            window.djazair.invoke('tray_destroy')
                .then(function() {
                    appendLog('info', 'System Tray icon destroyed');
                    $('#badgeTrayStatus').text('Destroyed').removeClass('tag-green').addClass('tag-amber');
                });
        });

        // Desktop Toast Notification
        $('#btnSendNotification').on('click', function() {
            const title = $('#inputNotifTitle').val() || 'Djazair Desktop';
            const msg = $('#inputNotifMsg').val() || 'Standard desktop notification dispatched.';
            const sound = $('#chkNotifSound').is(':checked');
            window.djazair.invoke('notification_show', {
                title: title,
                message: msg,
                sound: sound,
                timeout: 5
            }).then(() => appendLog('success', `Desktop notification dispatched: "${title}"`));
        });

        // ── 7. Tab: Browser Engine & Navigation ──────────────────────────────
        function navigateBrowser(targetUrl) {
            if (!targetUrl) targetUrl = $('#inputNavUrl').val() || 'https://wikipedia.org';
            targetUrl = targetUrl.trim();
            if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://') && !targetUrl.startsWith('file://')) {
                targetUrl = 'https://' + targetUrl;
            }
            $('#inputNavUrl').val(targetUrl);
            $('#lblCurrentBrowserUrl').text(targetUrl);

            const iframe = document.getElementById('browserViewport');
            if (iframe) {
                $('#browserLoadingOverlay').removeClass('hidden');
                iframe.src = targetUrl;
            }

            appendLog('info', `Browser navigating to: ${targetUrl}`);
            window.djazair.invoke('nav_navigate', { url: targetUrl }).then(function(res) {
                if (res && res.target === 'browserWindow') {
                    appendLog('success', `Dedicated browser window synced to: ${targetUrl}`);
                }
            });
        }

        const browserIframe = document.getElementById('browserViewport');
        if (browserIframe) {
            browserIframe.addEventListener('load', function() {
                $('#browserLoadingOverlay').addClass('hidden');
                appendLog('event', `Browser viewport loaded: ${browserIframe.src}`);
            });
        }

        $('#btnNavGo').on('click', function() {
            navigateBrowser($('#inputNavUrl').val());
        });

        $('#inputNavUrl').on('keypress', function(e) {
            if (e.which === 13) {
                navigateBrowser($(this).val());
            }
        });

        $('#btnNavNewWin, #btnPopoutBrowser').on('click', function() {
            const targetUrl = $('#inputNavUrl').val() || 'https://google.com';
            appendLog('info', `Spawning dedicated native browser window: ${targetUrl}`);
            window.djazair.invoke('nav_openInWindow', { url: targetUrl })
                .then(function(res) {
                    appendLog('success', `Dedicated browser window opened for: ${targetUrl}`, res);
                    $('#badgeViewportType').text('Popout Native Window (Active)').removeClass('tag-blue').addClass('tag-purple');
                });
        });

        $('.btn-quick-url').on('click', function() {
            const url = $(this).data('url');
            $('#inputNavUrl').val(url);
            navigateBrowser(url);
        });

        $('#btnNavReload').on('click', function() {
            window.djazair.invoke('nav_reload').then(function(res) {
                if (res && res.target === 'browserWindow') {
                    appendLog('info', 'Reloaded dedicated browser window');
                } else {
                    const iframe = document.getElementById('browserViewport');
                    if (iframe) {
                        $('#browserLoadingOverlay').removeClass('hidden');
                        iframe.src = iframe.src;
                        appendLog('info', 'Reloaded embedded browser viewport');
                    }
                }
            });
        });

        $('#btnNavBack').on('click', function() {
            window.djazair.invoke('nav_goBack').then(function(res) {
                if (res && res.target === 'browserWindow') {
                    appendLog('info', 'Navigated back in dedicated browser window');
                } else {
                    const iframe = document.getElementById('browserViewport');
                    if (iframe && iframe.contentWindow) {
                        try {
                            iframe.contentWindow.history.back();
                            appendLog('info', 'Navigated back in embedded browser');
                        } catch(e) {
                            appendLog('warn', 'History back restricted by cross-origin policy');
                        }
                    }
                }
            });
        });

        $('#btnNavForward').on('click', function() {
            window.djazair.invoke('nav_goForward').then(function(res) {
                if (res && res.target === 'browserWindow') {
                    appendLog('info', 'Navigated forward in dedicated browser window');
                } else {
                    const iframe = document.getElementById('browserViewport');
                    if (iframe && iframe.contentWindow) {
                        try {
                            iframe.contentWindow.history.forward();
                            appendLog('info', 'Navigated forward in embedded browser');
                        } catch(e) {
                            appendLog('warn', 'History forward restricted by cross-origin policy');
                        }
                    }
                }
            });
        });

        $('#btnNavDevTools').on('click', function() {
            window.djazair.invoke('nav_openDevTools');
        });

        $('#btnNavClearCache').on('click', function() {
            window.djazair.invoke('nav_clearCache')
                .then(() => appendLog('success', 'WebView2 browser cache cleared'));
        });

        $('#btnSetUserAgent').on('click', function() {
            const ua = $('#inputUserAgent').val();
            window.djazair.invoke('nav_setUserAgent', { userAgent: ua })
                .then(() => appendLog('info', `Custom User-Agent applied: "${ua}"`));
        });

        // ── 8. Tab: Multi-Window Spawner ─────────────────────────────────────
        $('#btnSpawnSecondary').on('click', function() {
            window.djazair.invoke('multiwin_spawn', { title: 'Secondary Diagnostic Window' })
                .then(function(res) {
                    appendLog('success', 'Secondary native window spawned successfully', res);
                    $('#badgeSecondaryStatus').text('Running').removeClass('tag-amber').addClass('tag-green');
                });
        });

        $('#btnCloseSecondary').on('click', function() {
            window.djazair.invoke('win_closeSecondary')
                .then(function(res) {
                    appendLog('info', 'Secondary window closed');
                    $('#badgeSecondaryStatus').text('Closed').removeClass('tag-green').addClass('tag-amber');
                });
        });

        // ── 9. Clear Console ─────────────────────────────────────────────────
        $('#btnClearLogs').on('click', function() {
            if (logBox) logBox.innerHTML = '';
            appendLog('info', 'Console logs cleared.');
        });

        // ── 10. Register Incoming Native Event Listeners ─────────────────────
        if (window.djazair && window.djazair.on) {
            window.djazair.on('evt_windowMoved', function(data) {
                $('#metricWinX').text(data.x);
                $('#metricWinY').text(data.y);
                appendLog('event', `Window Moved -> X: ${data.x}, Y: ${data.y}`);
            });

            window.djazair.on('evt_windowResized', function(data) {
                $('#metricWinW').text(data.width);
                $('#metricWinH').text(data.height);
                appendLog('event', `Window Resized -> ${data.width}x${data.height}`);
            });

            window.djazair.on('evt_windowFocus', function() {
                $('#badgeFocus').text('Active (Focused)').removeClass('tag-amber').addClass('tag-green');
                appendLog('event', 'Window gained keyboard focus');
            });

            window.djazair.on('evt_windowBlur', function() {
                $('#badgeFocus').text('Unfocused').removeClass('tag-green').addClass('tag-amber');
                appendLog('event', 'Window lost focus');
            });

            window.djazair.on('evt_windowMaximize', function() {
                updateMaximizeUI(true);
                appendLog('event', 'Window Maximized');
            });

            window.djazair.on('evt_windowRestore', function() {
                updateMaximizeUI(false);
                appendLog('event', 'Window Restored');
            });

            window.djazair.on('evt_windowLoaded', function(data) {
                appendLog('event', `Page content fully loaded: ${data.url}`);
            });

            window.djazair.on('evt_tickerTick', function(data) {
                $('#valTickerPulse').text(data.counter);
                $('#pulseIndicator').addClass('scale-125').delay(150).queue(function(next) {
                    $(this).removeClass('scale-125');
                    next();
                });
                appendLog('event', `Push Ticker Pulse #${data.counter} (Timestamp: ${data.timestamp})`);
            });

            window.djazair.on('evt_secondaryClosed', function() {
                appendLog('info', 'Secondary window closed');
                $('#badgeSecondaryStatus').text('Closed').removeClass('tag-green').addClass('tag-amber');
            });

            window.djazair.on('evt_browserWinClosed', function() {
                appendLog('info', 'Dedicated browser window closed');
                $('#badgeViewportType').text('Embedded In-App View').removeClass('tag-purple').addClass('tag-blue');
            });

            window.djazair.on('evt_log', function(data) {
                appendLog(data.level || 'info', data.msg);
            });
        }

        // Initialize state from backend
        if (window.djazair) {
            window.djazair.invoke('win_getState').then(function(state) {
                if (state) {
                    if (state.size) {
                        $('#metricWinW').text(state.size[0]);
                        $('#metricWinH').text(state.size[1]);
                        $('#inputWinW').val(state.size[0]);
                        $('#inputWinH').val(state.size[1]);
                    }
                    if (state.position) {
                        $('#metricWinX').text(state.position[0]);
                        $('#metricWinY').text(state.position[1]);
                        $('#inputWinX').val(state.position[0]);
                        $('#inputWinY').val(state.position[1]);
                    }
                    if (state.title) {
                        $('#titlebarText').text(state.title);
                        $('#inputWinTitle').val(state.title);
                    }
                    if (state.zoomLevel) {
                        $('#valZoomLevel').text(`${Math.round(state.zoomLevel * 100)}%`);
                    }
                    if (state.isMaximized !== undefined) {
                        updateMaximizeUI(state.isMaximized);
                    }
                    if (state.isFullscreen !== undefined) {
                        updateFullscreenUI(state.isFullscreen);
                    }
                }
            });
        }
        // ── 11. Feature Code Snippets & Modal Viewer ─────────────────────────
        const SNIPPETS = {
            win_geometry: {
                title: "Window Dimensions & Coordinates",
                subtitle: "Native Win32 Window Sizing, Positioning, Screen Centering & Metrics",
                dz: `use webview\n\n# 1. Set window dimensions (width, height in pixels)\nwin.setSize(1240, 820)\n\n# 2. Set window screen coordinates (X, Y)\nwin.setPosition(100, 100)\n\n# 3. Center window dynamically on primary display\nwin.center()\n\n# 4. Query current geometry\nlet size = win.getSize()       # [width, height]\nlet pos = win.getPosition()    # [x, y]\nprintln("Window size: " + str(size[0]) + "x" + str(size[1]))\nprintln("Window pos:  (" + str(pos[0]) + ", " + str(pos[1]) + ")")`,
                js: `// 1. Resize native window\nawait window.djazair.invoke('win_setSize', { width: 1240, height: 820 });\n\n// 2. Move window to screen coordinates\nawait window.djazair.invoke('win_setPosition', { x: 100, y: 100 });\n\n// 3. Center window on primary monitor\nawait window.djazair.invoke('win_center');\n\n// 4. Query current geometry and window state\nconst state = await window.djazair.invoke('win_getState');\nconsole.log(\`Dimensions: \${state.size[0]}x\${state.size[1]}, Position: (\${state.position[0]}, \${state.position[1]})\`);`
            },
            win_states: {
                title: "Window States, Opacity & Title",
                subtitle: "Minimize, Maximize, Fullscreen, Flash, Opacity, Zoom & Titlebar",
                dz: `use webview\n\n# 1. Determine current window states\nlet isFs = win.isFullscreen()      # Returns True if fullscreen, False otherwise\nlet isMax = win.isMaximized()      # Returns True if maximized\nlet isMin = win.isMinimized()      # Returns True if minimized\nlet isTop = win.isAlwaysOnTop()    # Returns True if always on top\nlet isVisible = win.isVisible()    # Returns True if window is visible\nlet isFocused = win.isFocused()    # Returns True if window has focus\n\n# 2. Toggle or set fullscreen mode based on state\nif win.isFullscreen()\n    win.setFullscreen(False)       # Exit fullscreen (normal window)\nelse\n    win.setFullscreen(True)        # Enter fullscreen mode\nend\n\n# Or toggle directly with helper alias:\nwin.toggleFullscreen()\n\n# 3. Window state controls\nwin.minimize()\nwin.maximize()\nwin.restore()\nwin.toggleMaximize()               # Toggle between maximized and restored\n\n# 4. Attention & Always On Top\nwin.setAlwaysOnTop(True)\nwin.flash(True)\n\n# 5. Opacity, Zoom & Title\nwin.setOpacity(0.95)\nwin.setZoomLevel(1.25)\nwin.setTitle("Showcase Application v0.4.0")`,
                js: `// 1. Determine current window states\nconst isFs = await window.djazair.invoke('win_isFullscreen');\nconsole.log('Is Fullscreen:', isFs);\n\n// Or query full state snapshot\nconst state = await window.djazair.invoke('win_getState');\nconsole.log('Fullscreen:', state.isFullscreen, 'Maximized:', state.isMaximized);\n\n// 2. Toggle fullscreen mode\nconst updatedFs = await window.djazair.invoke('win_toggleFullscreen');\nconsole.log('Updated Fullscreen:', updatedFs);\n\n// 3. Window actions\nawait window.djazair.invoke('win_minimize');\nawait window.djazair.invoke('win_toggleMaximize');\nawait window.djazair.invoke('win_restore');\nawait window.djazair.invoke('win_setAlwaysOnTop', { enable: true });\nawait window.djazair.invoke('win_flash');\nawait window.djazair.invoke('win_setOpacity', { opacity: 0.95 });\nawait window.djazair.invoke('win_setZoom', { level: 1.25 });\nawait window.djazair.invoke('win_setTitle', { title: 'Showcase Application v0.4.0' });`
            },
            dialog_message: {
                title: "Native Message Boxes & Alerts",
                subtitle: "OS Modal Message Prompts (Info, Warning, Error, Question)",
                dz: `use webview\n\n# 1. Information Message Box\nwebview.showMessageBox({\n    "title": "Notice",\n    "message": "Operation completed successfully!",\n    "type": "info",\n    "buttons": "ok"\n})\n\n# 2. Warning Message Box\nwebview.showMessageBox({\n    "title": "Warning",\n    "message": "Configuration changes require restart.",\n    "type": "warning",\n    "buttons": "ok"\n})\n\n# 3. Error Message Box\nwebview.showMessageBox({\n    "title": "Critical Failure",\n    "message": "Failed to connect to backend server.",\n    "type": "error",\n    "buttons": "ok"\n})\n\n# 4. Confirmation Question Box (returns "yes", "no", or "cancel")\nlet answer = webview.showMessageBox({\n    "title": "Confirm Delete",\n    "message": "Are you sure you want to delete this item?",\n    "type": "question",\n    "buttons": "yesnocancel"\n})\nif answer == "yes"\n    println("User confirmed deletion.")\nend`,
                js: `// 1. Information prompt\nawait window.djazair.invoke('dlg_info', {\n    title: 'Notice',\n    msg: 'Operation completed successfully!'\n});\n\n// 2. Warning alert\nawait window.djazair.invoke('dlg_warn', {\n    title: 'Warning',\n    msg: 'Configuration changes require restart.'\n});\n\n// 3. Error modal\nawait window.djazair.invoke('dlg_error', {\n    title: 'Critical Failure',\n    msg: 'Failed to connect to backend server.'\n});\n\n// 4. Question confirmation (returns "yes", "no", or "cancel")\nconst answer = await window.djazair.invoke('dlg_question', {\n    title: 'Confirm Delete',\n    msg: 'Are you sure you want to delete this item?'\n});\nconsole.log('User response:', answer);`
            },
            dialog_pickers: {
                title: "Native File & Folder Pickers",
                subtitle: "Open Single/Multiple Files, Save File As, and Select Directory Dialogs",
                dz: `use webview\n\n# 1. Open Single File Dialog\nlet filePath = webview.showOpenFileDialog({\n    "title": "Select Source Code",\n    "directory": "C:\\\\",\n    "filter": "Code Files (*.dz;*.js)|*.dz;*.js|All Files (*.*)|*.*"\n})\nif filePath != ""\n    println("Selected file: " + filePath)\nend\n\n# 2. Open Multiple Files Dialog\nlet fileList = webview.showOpenFileDialog({\n    "title": "Select Assets",\n    "directory": "C:\\\\",\n    "filter": "All Files (*.*)|*.*",\n    "multiSelections": True\n})\nfor f in fileList\n    println("File: " + f)\nend\n\n# 3. Save File As Dialog\nlet savePath = webview.showSaveFileDialog({\n    "title": "Save Document",\n    "defaultName": "report.pdf",\n    "filter": "PDF Documents (*.pdf)|*.pdf|All Files (*.*)|*.*"\n})\n\n# 4. Select Folder Dialog\nlet folderPath = webview.showOpenFolderDialog({\n    "title": "Select Target Directory",\n    "directory": "C:\\\\"\n})`,
                js: `// 1. Open single file\nconst file = await window.djazair.invoke('dlg_openFile', {\n    title: 'Select Source Code',\n    filter: 'Code Files (*.dz;*.js)|*.dz;*.js|All Files (*.*)|*.*'\n});\nconsole.log('Selected file:', file);\n\n// 2. Open multiple files\nconst files = await window.djazair.invoke('dlg_openMultiple');\nconsole.log('Selected files array:', files);\n\n// 3. Save file as\nconst saveTarget = await window.djazair.invoke('dlg_saveFile', {\n    defaultName: 'export.json',\n    filter: 'JSON Files (*.json)|*.json'\n});\nconsole.log('Target save path:', saveTarget);\n\n// 4. Open folder\nconst folder = await window.djazair.invoke('dlg_openFolder', {\n    title: 'Select Destination Directory'\n});\nconsole.log('Selected directory:', folder);`
            },
            dialog_color: {
                title: "Windows Native Color Palette",
                subtitle: "System Color Chooser Modal with Hex Color Return",
                dz: `use webview\n\n# Launch native Windows color picker palette\n# Optional initialColor specifies starting hex color\nlet chosenColor = webview.showColorPicker({\n    "initialColor": "#10b981"\n})\n\nif chosenColor != ""\n    println("User selected hex color: " + chosenColor) # e.g. "#38bdf8"\nend`,
                js: `// Launch OS color picker\nconst hexColor = await window.djazair.invoke('dlg_pickColor', {\n    initialColor: '#10b981'\n});\n\nif (hexColor) {\n    console.log('Chosen color:', hexColor);\n    // Apply picked color to document or UI elements\n    document.getElementById('swatchColorPreview').style.backgroundColor = hexColor;\n}`
            },
            ipc_rpc: {
                title: "IPC Remote Procedure Calls (RPC)",
                subtitle: "Bidirectional JSON Message Dispatching between JS and Djazair VM",
                dz: `# In Djazair backend: register handler on IPC bridge\nbridge.on("rpc_calculate", fn(payload)\n    let a = num(payload["a"])\n    let b = num(payload["b"])\n    let op = payload["op"]\n\n    if op == "+"\n        return a + b\n    elif op == "-"\n        return a - b\n    elif op == "*"\n        return a * b\n    elif op == "/"\n        if b == 0\n            throw "Division by zero error!"\n        end\n        return a / b\n    elif op == "^"\n        return a ^ b\n    end\n    return 0\nend)`,
                js: `// In JavaScript frontend: invoke backend handler via Promise\ntry {\n    const result = await window.djazair.invoke('rpc_calculate', {\n        a: 42,\n        b: 58,\n        op: '+'\n    });\n    console.log('Calculation result from Djazair VM:', result); // 100\n} catch (err) {\n    console.error('RPC invocation failed:', err.message);\n}`
            },
            ipc_ping_error: {
                title: "IPC Diagnostics & Error Handling",
                subtitle: "Latency Measurement, Timeout Protection & Exception Surfacing",
                dz: `use datetime\n\n# 1. Fast roundtrip ping echo handler\nbridge.on("rpc_ping", fn(payload)\n    return {\n        "pong": True,\n        "receivedAt": datetime.timestamp(),\n        "echo": payload\n    }\nend)\n\n# 2. Exception propagation handler\nbridge.on("rpc_testError", fn(payload)\n    # Exceptions thrown inside handlers are caught by bridge\n    # and cleanly propagated to the JS Promise rejection!\n    throw "Intentional backend fault test from Djazair VM"\nend)`,
                js: `// 1. Measure IPC latency\nconst t0 = performance.now();\nawait window.djazair.invoke('rpc_ping', { timestamp: Date.now() });\nconst latency = (performance.now() - t0).toFixed(2);\nconsole.log(\`Roundtrip ping latency: \${latency} ms\`);\n\n// 2. Timeout protection (auto-rejects if backend takes too long)\ntry {\n    await window.djazair.invoke('rpc_testTimeout', {}, { timeout: 1500 });\n} catch (err) {\n    console.warn('Timeout handled correctly:', err.message);\n}\n\n// 3. Exception propagation test\ntry {\n    await window.djazair.invoke('rpc_testError');\n} catch (err) {\n    console.error('Backend exception caught in JS:', err.message);\n}`
            },
            ipc_expose: {
                title: "Direct Global Function Bindings (expose)",
                subtitle: "Expose Native Backend Functions Directly into window Scope",
                dz: `# Directly expose a native function into window global scope\nbridge.expose("nativeMultiply", fn(args)\n    let a = num(args[0])\n    let b = num(args[1])\n    return a * b\nend)\n\n# Web scripts can now call window.nativeMultiply(x, y) directly!`,
                js: `// Directly call exposed native function without invoke()\nif (window.nativeMultiply) {\n    const answer = await window.nativeMultiply(9, 9);\n    console.log('Result of window.nativeMultiply(9, 9):', answer); // 81\n}`
            },
            ipc_events: {
                title: "Real-Time Push Event Stream",
                subtitle: "Push Asynchronous Events from Djazair to Web Listeners",
                dz: `use datetime\n\n# Broadcast real-time push events from Djazair to web listeners\nbridge.send("evt_tickerTick", {\n    "counter": count,\n    "timestamp": datetime.timestamp()\n})\n\n# Push system telemetry\nbridge.send("evt_telemetry", {\n    "cpu": 14.2,\n    "ram": 128.5\n})`,
                js: `// Register event listener for native events\nwindow.djazair.on('evt_tickerTick', function(data) {\n    console.log(\`Tick event #\${data.counter} at \${data.timestamp}\`);\n    $('#valTickerPulse').text(data.counter);\n});\n\nwindow.djazair.on('evt_telemetry', function(stats) {\n    console.log(\`CPU: \${stats.cpu}%, RAM: \${stats.ram} MB\`);\n});`
            },
            menus_context: {
                title: "Native Popup Context Menus",
                subtitle: "Win32 Context Menus with Submenus, Separators & Callbacks",
                dz: `use webview\n\n# Create native Win32 context popup menu\nlet menu = new webview.Menu()\n\nmenu.addItem("Inspect DevTools", fn()\n    win.openDevTools()\nend)\nmenu.addSeparator()\n\n# Add submenu\nlet zoomSub = new webview.Menu()\nzoomSub.addItem("Reset (100%)", fn() win.setZoomLevel(1.0) end)\nzoomSub.addItem("Zoom In (125%)", fn() win.setZoomLevel(1.25) end)\nmenu.addSubmenu("Zoom Level", zoomSub)\n\nmenu.addSeparator()\nmenu.addItem("Exit Showcase", fn() app.quit() end)\n\n# Display menu at cursor coordinates\nmenu.popup(win)`,
                js: `// Intercept browser contextmenu event\nwindow.addEventListener('contextmenu', function(e) {\n    e.preventDefault(); // Suppress default browser right-click menu\n\n    // Trigger native context menu popup via IPC\n    window.djazair.invoke('menu_showContext', {\n        x: e.screenX,\n        y: e.screenY\n    });\n});`
            },
            tray_notifications: {
                title: "System Tray & Taskbar Integration",
                subtitle: "Taskbar Notification Area Icon, Tooltips, Tray Clicks & Balloons",
                dz: `use webview\n\n# 1. Create taskbar system tray icon\nlet tray = new webview.Tray("Showcase Tray v0.4.0", "assets/app.ico")\n\n# 2. Handle tray icon click event\ntray.onClick(fn()\n    win.restore()\n    win.show()\n    win.focus()\nend)\n\n# 3. Show tray balloon notification\ntray.showBalloon("Background Service", "Data synchronized with cloud.", 5)\n\n# 4. Update hover tooltip dynamically\ntray.setTooltip("Active Tasks: 3")\n\n# 5. Remove tray icon when done\ntray.destroy()`,
                js: `// 1. Initialize system tray\nawait window.djazair.invoke('tray_create', {\n    tooltip: 'Showcase Application Tray'\n});\n\n// 2. Update tray tooltip\nawait window.djazair.invoke('tray_setTooltip', {\n    tooltip: 'Djazair Background Service (Online)'\n});\n\n// 3. Dispatch tray balloon notification\nawait window.djazair.invoke('tray_showBalloon', {\n    title: 'Task Synchronized',\n    msg: 'All local records successfully uploaded.',\n    icon: 'info'\n});\n\n// 4. Remove tray icon\nawait window.djazair.invoke('tray_destroy');`
            },
            toast_notifications: {
                title: "Desktop Action Center Toast Notifications",
                subtitle: "Dispatches Native Windows Desktop Notifications with Audio Chimes",
                dz: `use webview\n\n# Dispatch native Windows desktop action center notification\n# Parameters: title, message, subtitle, sound, iconPath, timeout\nwebview.notificationShow(\n    "Task Finished",\n    "All background jobs succeeded.",\n    "Notification",\n    True,\n    "assets/app.ico",\n    5\n)`,
                js: `// Dispatch native Windows desktop toast notification\nawait window.djazair.invoke('notif_send', {\n    title: 'Compilation Complete',\n    msg: 'Application package built without errors.',\n    sound: true\n});`
            },
            browser_nav: {
                title: "Web Navigation & History Controls",
                subtitle: "In-App Navigation, Go Back, Forward, Reload & Dedicated Browser Windows",
                dz: `use webview\n\n# 1. Navigate primary window to specific URL\nwin.navigate("https://wikipedia.org")\n\n# 2. Browser history controls\nwin.goBack()\nwin.goForward()\nwin.reload()\n\n# 3. Open dedicated native browser window\nlet navWin = app.createWindow({\n    "title": "Djazair Web Navigator",\n    "url": "https://google.com",\n    "width": 1100,\n    "height": 750,\n    "resizable": True,\n    "darkTitleBar": True\n})`,
                js: `// 1. History navigation on active browser viewport\nconst viewport = document.getElementById('browserViewport');\nviewport.contentWindow.history.back();\nviewport.contentWindow.history.forward();\nviewport.contentWindow.location.reload();\n\n// 2. Navigate primary window via IPC\nawait window.djazair.invoke('browser_navigate', {\n    url: 'https://google.com'\n});\n\n// 3. Open URL in dedicated native desktop window\nawait window.djazair.invoke('browser_openWindow', {\n    url: 'https://wikipedia.org'\n});`
            },
            browser_viewport: {
                title: "Embedded In-App Browser Viewport",
                subtitle: "Isolated Web Viewport with Loading State & Popout Controls",
                dz: `use webview\n\n# Handle opening dedicated browser window from embedded viewport\nbridge.on("browser_openWindow", fn(payload)\n    let browserWin = app.createWindow({\n        "title": "Web View - " + payload["url"],\n        "url": payload["url"],\n        "width": 1024,\n        "height": 720,\n        "resizable": True,\n        "darkTitleBar": True\n    })\n    return {"opened": True, "url": payload["url"]}\nend)`,
                js: `// In-App Browser Viewport Management\nconst viewport = document.getElementById('browserViewport');\nconst overlay = document.getElementById('browserLoadingOverlay');\n\n// Navigate iframe viewport with visual loading indicator\noverlay.classList.remove('hidden');\nviewport.src = 'https://wikipedia.org';\nviewport.onload = () => overlay.classList.add('hidden');\n\n// Popout current viewport into a native desktop window\nawait window.djazair.invoke('browser_openWindow', {\n    url: viewport.src\n});`
            },
            browser_diagnostics: {
                title: "Chromium DevTools & Cache Management",
                subtitle: "Launch Edge DevTools Inspector, Clear Cookies, Cache & Storage",
                dz: `use webview\n\n# 1. Launch Microsoft Edge Chromium DevTools Inspector\nwin.openDevTools()\n\n# 2. Clear cookies, cache, and HTTP storage\nwin.clearCache()`,
                js: `// Launch Edge Chromium DevTools inspector window\nawait window.djazair.invoke('browser_devTools');\n\n// Clear WebView2 cookies, session storage and cache\nawait window.djazair.invoke('browser_clearCache');`
            },
            browser_useragent: {
                title: "Custom User-Agent Configuration",
                subtitle: "Override Default Browser User-Agent Header",
                dz: `use webview\n\n# Configure custom HTTP User-Agent header for WebView2\nwin.setUserAgent("DjazairBrowser/1.0 (Windows NT 10.0; Win64; x64) WebView2")`,
                js: `// Apply custom User-Agent string to WebView2 engine\nawait window.djazair.invoke('browser_setUserAgent', {\n    ua: 'DjazairBrowser/1.0 (Windows NT 10.0; Win64; x64) WebView2'\n});`
            },
            multi_window: {
                title: "Multi-Window Application Architecture",
                subtitle: "Spawn & Manage Multiple Native Windows with Shared Event Loop",
                dz: `use webview\n\n# Initialize application and create primary window\nlet app = webview.createWindow({\n    "title": "Primary Dashboard",\n    "width": 1240,\n    "height": 820,\n    "resizable": True,\n    "darkTitleBar": True\n})\n\n# Spawn secondary native window dynamically\nlet secWin = app.createWindow({\n    "title": "Secondary Inspector Window",\n    "width": 640,\n    "height": 480,\n    "resizable": True,\n    "darkTitleBar": True\n})\n\n# Close secondary window programmatically\nsecWin.close()\n\n# Run application event loop\napp.run()`,
                js: `// Spawn secondary window dynamically via IPC\nconst res = await window.djazair.invoke('win_spawnSecondary');\nconsole.log('Spawn response:', res);\n\n// Close secondary window\nawait window.djazair.invoke('win_closeSecondary');\n\n// Listen for secondary window lifecycle events\nwindow.djazair.on('evt_secondaryClosed', function() {\n    console.log('Secondary window was closed by user or system.');\n});`
            }
        };

        let currentSnippetKey = 'win_geometry';
        let currentSnippetLang = 'dz';

        function highlightCode(rawCode, lang) {
            const tokens = [];
            // Extract comments and strings
            const tokenRegex = (lang === 'dz')
                ? /(#[^\n]*|\/\/[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g
                : /(\/\/[^\n]*)|("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g;

            let text = rawCode.replace(tokenRegex, function(m, comment, str) {
                const id = tokens.length;
                if (comment) {
                    tokens.push(`<span class="token-comment">${escapeHtml(comment)}</span>`);
                } else {
                    tokens.push(`<span class="token-string">${escapeHtml(str)}</span>`);
                }
                return `___TOKEN_${id}___`;
            });

            text = escapeHtml(text);

            const kwRegex = (lang === 'dz')
                ? /\b(use|let|fn|end|class|init|return|if|elif|else|while|for|in|throw|try|catch|new|self|selfRef|or|and|not|as|True|False|Null)\b/g
                : /\b(const|let|var|function|async|await|return|if|else|while|for|of|in|try|catch|throw|new|class|true|false|null|undefined)\b/g;

            text = text.replace(kwRegex, function(m) {
                if (m === 'True' || m === 'False' || m === 'Null' || m === 'true' || m === 'false' || m === 'null' || m === 'undefined') {
                    return `<span class="token-boolean">${m}</span>`;
                }
                return `<span class="token-keyword">${m}</span>`;
            });

            text = text.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="token-number">$1</span>');

            text = text.replace(/___TOKEN_(\d+)___/g, function(_, idx) {
                return tokens[parseInt(idx, 10)];
            });

            return text;
        }

        function renderModalSnippet() {
            const snippet = SNIPPETS[currentSnippetKey] || SNIPPETS.win_geometry;
            $('#codeModalTitle').text(snippet.title);
            $('#codeModalSubtitle').text(snippet.subtitle);

            const rawCode = snippet[currentSnippetLang] || snippet.dz;
            const highlighted = highlightCode(rawCode, currentSnippetLang);
            const codeBox = document.getElementById('codeSnippetContent');
            if (codeBox) {
                codeBox.innerHTML = highlighted;
            }

            $('#btnCopySnippet').html('<i class="fas fa-copy"></i> <span id="lblCopySnippet">Copy Code</span>');
        }

        function openCodeModal(key) {
            currentSnippetKey = key && SNIPPETS[key] ? key : 'win_geometry';
            renderModalSnippet();
            $('#codeModal').addClass('active');
        }

        function closeCodeModal() {
            $('#codeModal').removeClass('active');
        }

        // View code button trigger
        $(document).on('click', '.btn-view-code', function(e) {
            e.stopPropagation();
            const key = $(this).data('snippet');
            openCodeModal(key);
            appendLog('info', `Opened code snippet: ${key}`);
        });

        // Language tab switching
        $('.code-tab-btn').on('click', function() {
            $('.code-tab-btn').removeClass('active');
            $(this).addClass('active');
            currentSnippetLang = $(this).data('lang') || 'dz';
            renderModalSnippet();
        });

        // Copy snippet to clipboard
        $('#btnCopySnippet').on('click', function() {
            const snippet = SNIPPETS[currentSnippetKey] || SNIPPETS.win_geometry;
            const rawCode = snippet[currentSnippetLang] || snippet.dz;

            function onCopied() {
                $('#btnCopySnippet').html('<i class="fas fa-check text-emerald-400"></i> <span id="lblCopySnippet">Copied!</span>');
                appendLog('success', `Copied ${currentSnippetLang.toUpperCase()} snippet for: ${currentSnippetKey}`);
                setTimeout(function() {
                    $('#btnCopySnippet').html('<i class="fas fa-copy"></i> <span id="lblCopySnippet">Copy Code</span>');
                }, 2000);
            }

            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(rawCode).then(onCopied).catch(function() {
                    fallbackCopyText(rawCode, onCopied);
                });
            } else {
                fallbackCopyText(rawCode, onCopied);
            }
        });

        function fallbackCopyText(text, cb) {
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                if (cb) cb();
            } catch (err) {
                appendLog('error', 'Clipboard write failed: ' + err);
            }
            document.body.removeChild(textarea);
        }

        // Close modal handlers
        $('#btnCloseCodeModal, #btnFooterCloseModal').on('click', function() {
            closeCodeModal();
        });

        $('#codeModal').on('click', function(e) {
            if ($(e.target).is('#codeModal')) {
                closeCodeModal();
            }
        });

        $(document).on('keydown', function(e) {
            if (e.key === 'Escape' && $('#codeModal').hasClass('active')) {
                closeCodeModal();
            }
        });
    });

})(jQuery);