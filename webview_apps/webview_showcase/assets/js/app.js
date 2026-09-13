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
            window.djazair.invoke('win_maximize');
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

        // Window States
        $('#btnActionMin').on('click', () => window.djazair.invoke('win_minimize'));
        $('#btnActionMax').on('click', () => window.djazair.invoke('win_maximize'));
        $('#btnActionRestore').on('click', () => window.djazair.invoke('win_restore'));
        $('#btnActionFullscreen').on('click', function() {
            window.djazair.invoke('win_toggleFullscreen')
                .then(function(isFs) {
                    appendLog('info', `Fullscreen toggled: ${isFs}`);
                    $('#valFullscreen').text(isFs ? 'Yes' : 'No');
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
        $('#btnNavNewWin').on('click', function() {
            const targetUrl = $('#inputNavUrl').val() || 'https://google.com';
            appendLog('info', `Spawning dedicated native browser window: ${targetUrl}`);
            window.djazair.invoke('nav_openInWindow', { url: targetUrl })
                .then(function(res) {
                    appendLog('success', `Dedicated browser window opened for: ${targetUrl}`, res);
                });
        });

        $('#btnNavGo').on('click', function() {
            const targetUrl = $('#inputNavUrl').val();
            if (targetUrl) {
                appendLog('warn', `Navigating primary window directly to: ${targetUrl}`);
                window.djazair.invoke('nav_navigate', { url: targetUrl });
            }
        });

        $('.btn-quick-url').on('click', function() {
            const url = $(this).data('url');
            $('#inputNavUrl').val(url);
            appendLog('info', `Selected bookmark: ${url}`);
        });

        $('#btnNavReload').on('click', () => window.djazair.invoke('nav_reload'));
        $('#btnNavBack').on('click', () => window.djazair.invoke('nav_goBack'));
        $('#btnNavForward').on('click', () => window.djazair.invoke('nav_goForward'));
        $('#btnNavDevTools').on('click', () => window.djazair.invoke('nav_openDevTools'));
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
                $('#valMaximized').text('Yes');
                appendLog('event', 'Window Maximized');
            });

            window.djazair.on('evt_windowRestore', function() {
                $('#valMaximized').text('No');
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
                    $('#valMaximized').text(state.isMaximized ? 'Yes' : 'No');
                    $('#valFullscreen').text(state.isFullscreen ? 'Yes' : 'No');
                }
            });
        }
    });

})(jQuery);