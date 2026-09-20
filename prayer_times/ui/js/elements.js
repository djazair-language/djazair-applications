// =============================================================================
// Project:      Djazair Prayer Times Desktop Application
// File:         ui/js/elements.js
// Description:  DOM Element Cache and Selectors.
// =============================================================================

window.PrayerApp = window.PrayerApp || {};

(function(App) {
    'use strict';

    App.elements = {};

    App.initElements = function() {
        App.elements = {
            // Header & Window Status
            hijriDate: document.getElementById('hijriDate'),
            gregDate: document.getElementById('gregDate'),
            statusBadge: document.getElementById('statusBadge'),
            statusText: document.getElementById('statusText'),
            btnRefresh: document.getElementById('btnRefresh'),
            btnTestAdhan: document.getElementById('btnTestAdhan'),
            btnSettings: document.getElementById('btnSettings'),

            // Navigation Tabs
            navTabs: document.querySelectorAll('.nav-tab'),
            tabContents: document.querySelectorAll('.tab-content'),

            // Tab 1: Prayer Times
            countrySelect: document.getElementById('countrySelect'),
            citySelect: document.getElementById('citySelect'),
            btnAutoLoc: document.getElementById('btnAutoLoc'),
            nextPrayerName: document.getElementById('nextPrayerName'),
            countdown: document.getElementById('countdown'),
            nextPrayerTime: document.getElementById('nextPrayerTime'),
            dailyReminderText: document.getElementById('dailyReminderText'),
            dailyReminderSource: document.getElementById('dailyReminderSource'),
            timelinePrevPrayer: document.getElementById('timelinePrevPrayer'),
            timelineNextPrayer: document.getElementById('timelineNextPrayer'),
            timelineProgressPercent: document.getElementById('timelineProgressPercent'),
            timelineProgressBar: document.getElementById('timelineProgressBar'),
            calcMethodText: document.getElementById('calcMethodText'),
            timeImsak: document.getElementById('time-Imsak'),
            timeMidnight: document.getElementById('time-Midnight'),

            // Tab 2: Athkar
            athkarList: document.getElementById('athkarList'),
            athkarSubtabs: document.querySelectorAll('.athkar-subtabs .subtab'),
            btnResetAthkar: document.getElementById('btnResetAthkar'),

            // Tab 3: Tasbeeh
            tasbeehPreset: document.getElementById('tasbeehPreset'),
            btnTapTasbeeh: document.getElementById('btnTapTasbeeh'),
            currentDhikrText: document.getElementById('currentDhikrText'),
            tasbeehDisplay: document.getElementById('tasbeehDisplay'),
            tasbeehTarget: document.getElementById('tasbeehTarget'),
            tasbeehTotal: document.getElementById('tasbeehTotal'),
            btnResetTasbeeh: document.getElementById('btnResetTasbeeh'),

            // Tab 4: Ramadan
            iftarCountdown: document.getElementById('iftarCountdown'),
            iftarTime: document.getElementById('iftarTime'),
            imsakCountdown: document.getElementById('imsakCountdown'),
            imsakTime: document.getElementById('imsakTime'),

            // Settings Modal
            settingsModal: document.getElementById('settingsModal'),
            btnCloseSettings: document.getElementById('btnCloseSettings'),
            btnCancelSettings: document.getElementById('btnCancelSettings'),
            btnSaveSettings: document.getElementById('btnSaveSettings'),
            methodSelect: document.getElementById('methodSelect'),
            voiceSelect: document.getElementById('voiceSelect'),
            btnPreviewVoice: document.getElementById('btnPreviewVoice'),
            iconPreviewVoice: document.getElementById('iconPreviewVoice'),
            textPreviewVoice: document.getElementById('textPreviewVoice'),
            customAudioGroup: document.getElementById('customAudioGroup'),
            btnPickAudio: document.getElementById('btnPickAudio'),
            lblCustomAudioPath: document.getElementById('lblCustomAudioPath'),
            chkAdhan: document.getElementById('chkAdhan'),
            rngVolume: document.getElementById('rngVolume'),
            lblVolume: document.getElementById('lblVolume'),
            chkNotifications: document.getElementById('chkNotifications'),
            chkStartup: document.getElementById('chkStartup'),
            startupOptionsGroup: document.getElementById('startupOptionsGroup'),
            txtStartupName: document.getElementById('txtStartupName'),
            txtCustomExeName: document.getElementById('txtCustomExeName'),
            chkMinimizeTray: document.getElementById('chkMinimizeTray'),

            // New Settings Controls
            chkPreAdhan: document.getElementById('chkPreAdhan'),
            selPreAdhanMinutes: document.getElementById('selPreAdhanMinutes'),
            chkPerPrayerVoices: document.getElementById('chkPerPrayerVoices'),
            groupPerPrayerVoices: document.getElementById('groupPerPrayerVoices'),
            selVoiceFajr: document.getElementById('selVoiceFajr'),
            selVoiceDhuhr: document.getElementById('selVoiceDhuhr'),
            selVoiceAsr: document.getElementById('selVoiceAsr'),
            selVoiceMaghrib: document.getElementById('selVoiceMaghrib'),
            selVoiceIsha: document.getElementById('selVoiceIsha'),
            chkIqama: document.getElementById('chkIqama'),
            groupIqamaOffsets: document.getElementById('groupIqamaOffsets'),
            numIqamaFajr: document.getElementById('numIqamaFajr'),
            numIqamaDhuhr: document.getElementById('numIqamaDhuhr'),
            numIqamaAsr: document.getElementById('numIqamaAsr'),
            numIqamaMaghrib: document.getElementById('numIqamaMaghrib'),
            numIqamaIsha: document.getElementById('numIqamaIsha'),
            chkAthkarReminder: document.getElementById('chkAthkarReminder'),

            // Audio & Tray
            adhanAudio: document.getElementById('adhanAudio'),
            btnMinimizeTray: document.getElementById('btnMinimizeTray'),

            // Frameless Titlebar Controls
            btnCompactMode: document.getElementById('btnCompactMode'),
            btnWinMin: document.getElementById('btnWinMin'),
            btnWinMax: document.getElementById('btnWinMax'),
            iconWinMax: document.getElementById('iconWinMax'),
            btnWinClose: document.getElementById('btnWinClose'),

            // Compact Floating Widget Elements
            compactWidget: document.getElementById('compactWidget'),
            btnExpandFromCompact: document.getElementById('btnExpandFromCompact'),
            compactPrayerName: document.getElementById('compactPrayerName'),
            compactPrayerTime: document.getElementById('compactPrayerTime'),
            compactCountdown: document.getElementById('compactCountdown'),
            compactCity: document.getElementById('compactCity'),
            btnCompactMute: document.getElementById('btnCompactMute'),
            btnCompactClose: document.getElementById('btnCompactClose')
        };
    };

})(window.PrayerApp);
