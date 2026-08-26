'use strict';


var devices       = [];
var selectedDev   = null;
var activeIdx     = -1;
var allProcs      = [];
var filteredProcs = [];
var currentPage   = 1;
var PAGE_SIZE     = 20;
var termHistory   = [];
var termHistIdx   = -1;
var confirmCb     = null;
var knownDevices  = {};
var isInitialScan = true;
var isScanning    = false;


function extractData(res) {
    if (!res) return null;
    if (typeof res === 'string') {
        try { res = JSON.parse(res); } catch (e) {}
    }
    if (Array.isArray(res)) return res;
    if (res && res.data !== undefined) {
        if (typeof res.data === 'string') {
            try { res.data = JSON.parse(res.data); } catch (e) {}
        }
        if (Array.isArray(res.data)) return res.data;
        return res.data;
    }
    return res;
}

$(function() {
    window.djazair.invoke('getSettings').then(function(sRes) {
        if (sRes.ok && sRes.data) {
            currentAppConfig = sRes.data;
            applyAutoScanInterval(currentAppConfig.auto_scan_interval !== undefined ? currentAppConfig.auto_scan_interval : 5);
        } else {
            applyAutoScanInterval(5);
        }
        
        window.djazair.invoke('loadDevices').then(function(res) {
            var d = extractData(res);
            devices = Array.isArray(d) ? d : [];
            renderDevices();
            if (devices.length > 0) selectDevice(0);
            performScan(false);
        });
    });
});


var ICONS = { success: 'fa-circle-check', danger: 'fa-circle-xmark', warning: 'fa-triangle-exclamation', info: 'fa-circle-info' };

function toast(msg, type) {
    type = type || 'info';
    var el = $('<div class="toast-item ' + type + '"></div>');
    el.html('<i class="fa-solid ' + (ICONS[type] || ICONS.info) + '" style="color:var(--' + (type === 'info' ? 'accent' : type === 'warning' ? 'warning' : type) + ');"></i><span>' + msg + '</span>');
    $('#toastWrap').append(el);
    setTimeout(function() { el.fadeOut(300, function() { el.remove(); }); }, 3500);
}


function confirmAction(title, body, cb) {
    $('#confirmTitle').text(title);
    $('#confirmBody').text(body);
    confirmCb = cb;
    new bootstrap.Modal('#confirmModal').show();
}
$('#confirmOk').on('click', function() {
    bootstrap.Modal.getInstance('#confirmModal').hide();
    if (confirmCb) confirmCb();
    confirmCb = null;
});


function renderDevices() {
    var list = $('#deviceList');
    list.empty();
    if (devices.length === 0) {
        list.html('<div class="empty-state" style="padding:24px 12px; font-size:12px;"><i class="fa-solid fa-magnifying-glass-location" style="font-size:26px; margin-bottom:10px;"></i><br>No devices found. Scan your network or add an IP manually.</div>');
        return;
    }
    devices.forEach(function(dev, idx) {
        var active = (selectedDev && selectedDev.ip === dev.ip) ? 'active' : '';
        var name   = dev.hostname || dev.ip;
        var item   = $('<div class="dev-item ' + active + '"></div>');
        item.html(
            '<div class="dev-avatar"><i class="fa-solid fa-laptop"></i></div>' +
            '<div class="dev-info">' +
                '<div class="dev-name">' + name + '</div>' +
                '<div class="dev-ip">' + dev.ip + '</div>' +
            '</div>' +
            '<div class="dev-dot" title="Agent running"></div>' +
            '<button class="dev-remove" title="Remove device"><i class="fa-solid fa-xmark"></i></button>'
        );
        item.on('click', function() { selectDevice(idx); });
        item.find('.dev-remove').on('click', function(e) { e.stopPropagation(); removeDevice(idx); });
        list.append(item);
    });
}

function selectDevice(idx) {
    selectedDev = devices[idx];
    renderDevices();
    $('#topbarTitle').text(selectedDev.hostname || selectedDev.ip);
    $('#topbarBadge').html('<span class="badge-online"><i class="fa-solid fa-circle" style="font-size:6px;"></i> Online</span>');
    $('#pingBtn').show();
    $('#welcomeScreen').hide();
    $('#controlPanel').css('display', 'flex');
    $('#termLabel').text('Remote Terminal — ' + selectedDev.ip);
}

function removeDevice(idx) {
    var wasSelected = selectedDev && devices[idx].ip === selectedDev.ip;
    devices.splice(idx, 1);
    window.djazair.invoke('saveDevices', devices);
    if (wasSelected) {
        selectedDev = null;
        $('#controlPanel').hide();
        $('#welcomeScreen').show();
        $('#topbarTitle').text('No device selected');
        $('#topbarBadge').html('');
        $('#pingBtn').hide();
    }
    renderDevices();
}

function addManualDevice() {
    var ip = $('#manualIp').val().trim();
    if (!ip) return;
    if (devices.some(function(d) { return d.ip === ip; })) { toast('Device already in the list.', 'warning'); return; }
    devices.push({ ip: ip, hostname: ip });
    window.djazair.invoke('saveDevices', devices);
    $('#manualIp').val('');
    renderDevices();
    toast('Device added: ' + ip, 'success');
}


function performScan(isManual) {
    if (isScanning) return;
    isScanning = true;

    if (isManual) {
        var btn = $('#scanBtn');
        btn.html('<span class="spin"></span> Scanning (4s)...');
        btn.prop('disabled', true);
        toast('Scanning network for agents...', 'info');
    }
    
    // Always use scanNetwork so it discovers new devices automatically, passing known devices in payload
    var endpoint = 'scanNetwork';
    var payload = JSON.stringify(devices);

    window.djazair.invoke(endpoint, payload).then(function(res) {
        isScanning = false;
        
        if (isManual) {
            var btn = $('#scanBtn');
            btn.html('<i class="fa-solid fa-radar"></i> Scan Network');
            btn.prop('disabled', false);
        }
        var found = extractData(res);
        if (!Array.isArray(found)) found = [];

        var oldDevices = devices.map(function(d) { return d.hostname; });
        var newDevices = found.map(function(d) { return d.hostname; });

        // Check if list changed
        var listChanged = false;
        if (oldDevices.length !== newDevices.length) {
            listChanged = true;
        } else {
            for (var i = 0; i < oldDevices.length; i++) {
                if (oldDevices[i] !== newDevices[i]) {
                    listChanged = true;
                    break;
                }
            }
        }

        var lostSelectedDevice = false;

        // Notifications
        found.forEach(function(d) {
            if (oldDevices.indexOf(d.hostname) === -1 && !isManual) {
                toast('New device connected: ' + d.hostname, 'success');
            }
        });

        devices.forEach(function(d) {
            if (newDevices.indexOf(d.hostname) === -1) {
                if (!isManual) {
                    toast('Device disconnected: ' + d.hostname, 'danger');
                }
                if (selectedDev && selectedDev.hostname === d.hostname) {
                    lostSelectedDevice = true;
                }
            }
        });

        devices = found;
        window.djazair.invoke('saveDevices', devices);

        if (devices.length === 0) {
            if (listChanged || isManual) {
                renderDevices();
                if (isManual) {
                    toast('No agents found. Make sure child_app.dz is running.', 'warning');
                }
            }
            if (lostSelectedDevice || selectedDev) {
                selectedDev = null;
                $('#controlPanel').hide();
                $('#welcomeScreen').show();
                $('#topbarTitle').text('No device selected');
                $('#topbarBadge').html('');
                $('#pingBtn').hide();
            }
            return;
        }

        if (listChanged || isManual) {
            // Keep selection if possible
            if (selectedDev && !lostSelectedDevice) {
                var idx = devices.findIndex(function(d) { return d.hostname === selectedDev.hostname; });
                if (idx !== -1) {
                    selectDevice(idx);
                } else {
                    selectDevice(0);
                }
            } else {
                // We lost the selected device or didn't have one, just pick the first available
                selectDevice(0);
            }
        }

        if (isManual) {
            toast('Found ' + found.length + ' active agent(s)!', 'success');
        }
    });
}

function startScan() {
    performScan(true);
}


function sendCmd(command, successCb, failCb, retryCount) {
    if (!selectedDev) { toast('No device selected.', 'warning'); return; }
    retryCount = retryCount || 0;
    
    window.djazair.invoke('agentCommand', { ip: selectedDev.ip, hostname: selectedDev.hostname, command: command }).then(function(res) {
        if (!res.ok) {
            if (retryCount < 1) {
                // Auto-retry once silently before failing
                setTimeout(function() { sendCmd(command, successCb, failCb, retryCount + 1); }, 300);
                return;
            }
            toast('Connection error: ' + res.data, 'danger');
            if (failCb) failCb(res.data);
            return;
        }

        if (res.data && res.data.indexOf && (res.data.indexOf('ERR:') === 0 || res.data.indexOf('ERROR:') === 0)) {
            toast(res.data, 'danger');
            if (failCb) failCb(res.data);
            return;
        }
        
        // Show latency indicator
        if (res.latency !== undefined) {
            var color = res.latency < 50 ? '#2ea043' : (res.latency < 200 ? '#d29922' : '#f85149');
            $('#topbarBadge').html('<span class="badge" style="background: ' + color + '">' + res.latency + ' ms</span>');
        }
        
        if (successCb) successCb(res.data, res.latency);
    });
}


function switchTab(id) {
    var btn = document.querySelector('[data-bs-target="#' + id + '"]');
    if (btn) bootstrap.Tab.getOrCreateInstance(btn).show();
}


function doPing() {
    sendCmd('PING', function(r, latency) { 
        toast('Pong! Device is online. Latency: ' + latency + 'ms', 'success'); 
    });
}

function doCmd(cmd) {
    sendCmd(cmd, function() { toast(cmd + ' command sent.', 'info'); });
}

function doMsg() {
    var m = $('#msgInput').val().trim();
    if (!m) return;
    sendCmd('MSG:' + m, function() {
        toast('Message sent.', 'success');
        $('#msgInput').val('');
    });
}


function doScreenshot() {
    var btn = $('#ssBtn');
    btn.html('<span class="spin"></span> Capturing...');
    btn.prop('disabled', true);
    sendCmd('SCREENSHOT', function(raw) {
        btn.html('<i class="fa-solid fa-camera"></i> Capture Now');
        btn.prop('disabled', false);
        if (!raw.startsWith('SCREENSHOT:')) { toast('Screenshot failed.', 'danger'); return; }
        var b64 = raw.substring(11).trim();
        $('#ss-preview').attr('src', 'data:image/jpeg;base64,' + b64).show();
        $('#ssCard').show();
        $('#ssTime').text('Captured at ' + new Date().toLocaleTimeString());
        toast('Screenshot captured!', 'success');
    }, function() {
        btn.html('<i class="fa-solid fa-camera"></i> Capture Now');
        btn.prop('disabled', false);
    });
}

function doWebcam() {
    var btn = $('#camBtn');
    btn.prop('disabled', true).html('<span class="spin"></span> Capturing...');
    sendCmd('WEBCAM', function(raw) {
        btn.prop('disabled', false).html('<i class="fa-solid fa-camera"></i> Capture Webcam');
        if(raw.startsWith("WEBCAM:")) {
            var b64 = raw.substring(7);
            if(b64.trim() === "NO_WEBCAM" || b64.trim() === "") {
                toast("No webcam detected on the target computer.", "danger");
                return;
            }
            $('#ssCard').show();
            $('#ss-preview').attr('src', 'data:image/jpeg;base64,' + b64);
            var d = new Date();
            $('#ssTime').text('Captured at ' + d.toLocaleTimeString());
        } else {
            toast("Failed to capture webcam.", "danger");
        }
    });
}

function openLightbox(src) {
    $('#lightboxImg').attr('src', src);
    $('#lightbox').css('display', 'flex');
}
function closeLightbox() { $('#lightbox').hide(); }


function doLoadProcesses() {
    var btn = $('#refreshProcBtn');
    btn.html('<span class="spin"></span> Loading...');
    btn.prop('disabled', true);
    $('#procBody').html('<tr><td colspan="6"><div class="empty-state" style="padding:20px;"><span class="spin"></span> Fetching process list...</div></td></tr>');
    sendCmd('TASKS', function(raw) {
        btn.html('<i class="fa-solid fa-rotate-right"></i> Refresh');
        btn.prop('disabled', false);
        var csv  = raw.startsWith('TASKS:') ? raw.substring(6) : raw;
        allProcs = parseCSV(csv);
        filteredProcs = allProcs.slice();
        currentPage   = 1;
        renderProcs();
        $('#procCount').text(allProcs.length + ' processes');
        toast('Loaded ' + allProcs.length + ' processes.', 'success');
    }, function() {
        btn.html('<i class="fa-solid fa-rotate-right"></i> Refresh');
        btn.prop('disabled', false);
    });
}

function parseCSV(csv) {
    var rows = [];
    csv = csv.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
    var lines = csv.split(/\r\n|\n|\r/);
    for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line) continue;
        var parts = line.split('","');
        if (parts.length >= 5) {
            rows.push({
                name:    parts[0].replace(/"/g, '').trim(),
                pid:     parts[1].replace(/"/g, '').trim(),
                session: parts[2].replace(/"/g, '').trim(),
                mem:     parts[4].replace(/"/g, '').trim()
            });
        }
    }
    return rows;
}

function filterProcs() {
    var q = $('#procSearch').val().toLowerCase();
    filteredProcs = q ? allProcs.filter(function(p) { return p.name.toLowerCase().indexOf(q) >= 0; }) : allProcs.slice();
    currentPage = 1;
    renderProcs();
    $('#procCount').text(filteredProcs.length + ' / ' + allProcs.length + ' processes');
}

function renderProcs() {
    var totalPages = Math.max(1, Math.ceil(filteredProcs.length / PAGE_SIZE));
    var start      = (currentPage - 1) * PAGE_SIZE;
    var slice      = filteredProcs.slice(start, start + PAGE_SIZE);

    $('#pageInfo').text('Page ' + currentPage + ' of ' + totalPages);
    $('#prevBtn').prop('disabled', currentPage <= 1);
    $('#nextBtn').prop('disabled', currentPage >= totalPages);

    var body = $('#procBody');
    body.empty();

    if (slice.length === 0) {
        body.html('<tr><td colspan="6"><div class="empty-state" style="padding:20px;">No processes found.</div></td></tr>');
        return;
    }

    slice.forEach(function(p, i) {
        var row = $('<tr></tr>');
        var rowNum = start + i + 1;
        var procName = p.name;
        row.html(
            '<td style="color:var(--text-muted); font-size:11px;">' + rowNum + '</td>' +
            '<td class="proc-name">' + procName + '</td>' +
            '<td class="proc-pid">' + p.pid + '</td>' +
            '<td class="proc-mem" style="color:var(--text-muted);">' + p.session + '</td>' +
            '<td class="proc-mem">' + p.mem + '</td>' +
            '<td><button class="btn-icon danger kill-btn" title="Terminate process"><i class="fa-solid fa-skull" style="font-size:11px;"></i></button></td>'
        );
        row.find('.kill-btn').on('click', function() { doKillProc(procName); });
        body.append(row);
    });
}

function doKillProc(name) {
    confirmAction('Terminate Process', 'Force-kill "' + name + '" on the remote device?', function() {
        sendCmd('KILL:' + name, function() {
            toast('Terminated: ' + name, 'success');
            setTimeout(doLoadProcesses, 600);
        });
    });
}

function prevPage() { if (currentPage > 1) { currentPage--; renderProcs(); } }
function nextPage() { var t = Math.ceil(filteredProcs.length / PAGE_SIZE); if (currentPage < t) { currentPage++; renderProcs(); } }


function doBlock()   { var d = $('#domainInput').val().trim(); if (d) sendCmd('BLOCK:'   + d, function() { toast('Blocked: '   + d, 'success'); }); }
function doUnblock() { var d = $('#domainInput').val().trim(); if (d) sendCmd('UNBLOCK:' + d, function() { toast('Unblocked: ' + d, 'success'); }); }


function termPrint(cls, text) {
    var out = $('#termOut');
    out.append('<span class="' + cls + '">' + text + '</span>');
    out.scrollTop(out[0].scrollHeight);
}

function clearTerm() {
    $('#termOut').html('<span class="t-sys">// Terminal cleared.\n\n</span>');
}

function runTerm() {
    var inp = $('#termIn');
    var cmd = inp.val().trim();
    if (!cmd) return;
    termHistory.unshift(cmd);
    termHistIdx = -1;
    inp.val('');
    termPrint('t-cmd', 'C:\\> ' + cmd + '\n');
    sendCmd('EXEC:' + cmd, function(raw) {
        var out = raw.startsWith('EXEC_RESULT:') ? raw.substring(12) : raw;
        termPrint('t-out', out.trim() + '\n\n');
    }, function(err) {
        termPrint('t-err', 'Error: ' + err + '\n\n');
    });
}

function termKeydown(e) {
    if (e.key === 'Enter') { runTerm(); return; }
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        termHistIdx = Math.min(termHistIdx + 1, termHistory.length - 1);
        if (termHistory[termHistIdx] !== undefined) $('#termIn').val(termHistory[termHistIdx]);
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        termHistIdx = Math.max(termHistIdx - 1, -1);
        $('#termIn').val(termHistIdx >= 0 ? termHistory[termHistIdx] : '');
    }
}


function doActiveWindow() {
    if(!selectedDev) return;
    toast("Requesting active window...", "success");
    sendCmd('ACTIVE_WINDOW', function(res) {
        let text = res;
        if(text.startsWith("ACTIVE_WINDOW:")) text = text.substring(14);
        alert("Currently Active Window:\n\n" + text);
    });
}

function doSetSchedule() {
    if(!selectedDev) return;
    let limit = prompt("Enter bedtime hour (0-23). The computer will automatically lock after this hour every day.\n\nEnter 0 to disable:", "22");
    if(limit !== null) {
        let h = parseInt(limit);
        if(!isNaN(h) && h >= 0 && h <= 23) {
            sendCmd("SCHEDULE:" + h, function(res) {
                if(res.startsWith("OK:")) toast("Bedtime schedule saved successfully!", "success");
                else toast("Failed to set schedule", "danger");
            });
        } else {
            alert("Please enter a valid hour (0-23)");
        }
    }
}

function doSysinfo() {
    var grid = $('#sysinfoGrid');
    grid.html('<div class="empty-state" style="grid-column:1/-1; padding:30px;"><span class="spin"></span> Loading...</div>');
    sendCmd('SYSINFO', function(raw) {
        if (!raw.startsWith('SYSINFO:')) { grid.html('<div class="empty-state" style="grid-column:1/-1;">Failed to parse response.</div>'); return; }
        var info = {};
        try { info = JSON.parse(raw.substring(8)); } catch(e) { grid.html('<div>Parse error.</div>'); return; }
        var fields = [
            { label: 'Hostname',         value: info.hostname  || '—', icon: 'fa-server'        },
            { label: 'Username',          value: info.username  || '—', icon: 'fa-user'           },
            { label: 'Operating System',  value: info.os        || '—', icon: 'fa-windows'        },
            { label: 'Processor (CPU)',   value: info.cpu       || '—', icon: 'fa-microchip'      },
            { label: 'Total RAM',         value: info.ram_total || '—', icon: 'fa-memory'         },
            { label: 'Available RAM',     value: info.ram_free  || '—', icon: 'fa-memory'         },
            { label: 'Last Boot Time',    value: info.boot_time || '—', icon: 'fa-clock'          },
            { label: 'IP Address',        value: selectedDev ? selectedDev.ip : '—', icon: 'fa-network-wired' }
        ];
        grid.empty();
        fields.forEach(function(f) {
            grid.append(
                '<div class="si-card">' +
                    '<div class="si-label"><i class="fa-solid ' + f.icon + '"></i>' + f.label + '</div>' +
                    '<div class="si-value">' + f.value + '</div>' +
                '</div>'
            );
        });
        toast('System info loaded.', 'success');
    });
}

var currentAppConfig = {
    max_clients: 10,
    auto_scan_interval: 5,
};
var autoScanTimer = null;

function applyAutoScanInterval(seconds) {
    if (autoScanTimer) clearInterval(autoScanTimer);
    if (seconds > 0) {
        autoScanTimer = setInterval(function() {
            performScan(false);
        }, seconds * 1000);
    }
}

function openSettingsModal() {
    window.djazair.invoke('getSettings').then(function(res) {
        if (res && res.ok && res.data) {
            currentAppConfig = res.data;
            $('#cfgScanInterval').val(currentAppConfig.auto_scan_interval !== undefined ? currentAppConfig.auto_scan_interval : 5);
        }
        new bootstrap.Modal('#settingsModal').show();
    });
}

function saveSettings() {
    var newCfg = {
        auto_scan_interval: parseInt($('#cfgScanInterval').val(), 10),
    };

    window.djazair.invoke('saveSettings', newCfg).then(function(res) {
        if (res && res.ok) {
            currentAppConfig = newCfg;
            applyAutoScanInterval(newCfg.auto_scan_interval);
            bootstrap.Modal.getInstance('#settingsModal').hide();
            toast('Settings saved successfully!', 'success');
        } else {
            toast('Failed to save settings.', 'danger');
        }
    });
}