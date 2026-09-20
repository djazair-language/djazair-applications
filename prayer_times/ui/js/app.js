// =============================================================================
// Project:      Djazair Prayer Times Desktop Application
// File:         ui/js/app.js
// Description:  Main Application Orchestrator & Lifecycle Bootstrap.
// =============================================================================

window.PrayerApp = window.PrayerApp || {};

(function(App) {
    'use strict';

    App.init = async function() {
        // Ensure AudioContext is resumed on any user interaction
        document.addEventListener('pointerdown', () => {
            if (App.state && App.state.audioContext && App.state.audioContext.state === 'suspended') {
                App.state.audioContext.resume().catch(() => {});
            }
        }, { once: false });

        App.initElements();
        App.Settings.bindEvents();
        setupEventListeners();
        App.Clock.startTimer();

        try {
            if (App.IPC && App.IPC.isAvailable()) {
                const data = await App.IPC.getInitialData();
                handleInitialData(data);
            } else {
                console.warn('[App] Djazair IPC bridge not detected, using demo fallback data');
                useDemoData();
            }
        } catch (err) {
            console.error('[App] Error fetching initial data from backend:', err);
            useDemoData();
        }
    };

    function handleInitialData(data) {
        if (!data) return;
        const state = App.state;
        const elements = App.elements;

        state.countries = data.countries || [];
        state.settings = data.settings || state.settings;
        state.settingsPath = data.settingsPath || '';
        state.athkarData = data.athkar || null;
        state.currentCountry = state.settings.country;
        state.currentCity = state.settings.city;
        state.tasbeehTotal = state.settings.tasbeehCount || 0;

        if (elements.lblSettingsJsonPath && state.settingsPath) {
            elements.lblSettingsJsonPath.textContent = state.settingsPath;
        }

        App.Clock.populateCountryDropdown();
        App.Clock.populateCityDropdown(state.currentCountry);

        if (elements.countrySelect) elements.countrySelect.value = state.currentCountry;
        if (elements.citySelect) elements.citySelect.value = state.currentCity;

        if (data.prayerData) {
            App.Clock.updatePrayerUI(data.prayerData);
        }

        App.Athkar.initUI();
        App.Tasbeeh.initUI();
    }

    function useDemoData() {
        const state = App.state;
        state.countries = [
            {
                code: 'DZ', name: 'Algeria', ar: 'الجزائر', defaultMethod: 13,
                cities: [
                    { name: 'Algiers', ar: 'الجزائر العاصمة', lat: 36.753, lng: 3.058 },
                    { name: 'Oran', ar: 'وهران', lat: 35.698, lng: -0.633 },
                    { name: 'Constantine', ar: 'قسنطينة', lat: 36.365, lng: 6.614 }
                ]
            }
        ];
        App.Clock.populateCountryDropdown();
        App.Clock.populateCityDropdown('DZ');

        App.Clock.updatePrayerUI({
            success: true,
            source: 'online',
            country: 'DZ',
            city: 'Algiers',
            method: 13,
            qibla: 102.5,
            hijri: { formatted: '6 ربيع الثاني 1448 هـ' },
            gregorian: { formatted: '17 سبتمبر 2026' },
            timings: {
                Fajr: '05:04',
                Sunrise: '06:24',
                Dhuhr: '12:47',
                Asr: '16:17',
                Maghrib: '18:59',
                Isha: '20:14',
                Imsak: '04:54',
                Midnight: '00:42'
            }
        });
    }

    async function changeLocation(country, city) {
        const state = App.state;
        state.settings.country = country;
        state.settings.city = city;

        if (App.IPC && App.IPC.isAvailable()) {
            try {
                const data = await App.IPC.changeLocation(country, city, state.settings.method);
                if (data) {
                    App.Clock.updatePrayerUI(data);
                }
            } catch (err) {
                console.error('[App] Location change error:', err);
            }
        }
    }

    function setupEventListeners() {
        const elements = App.elements;
        const state = App.state;

        // Tab Navigation
        elements.navTabs.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.navTabs.forEach(t => t.classList.remove('active'));
                elements.tabContents.forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                const targetId = btn.getAttribute('data-tab');
                const targetContent = document.getElementById(targetId);
                if (targetContent) targetContent.classList.add('active');
            });
        });

        // Athkar Subtabs
        elements.athkarSubtabs.forEach(sub => {
            sub.addEventListener('click', () => {
                elements.athkarSubtabs.forEach(s => s.classList.remove('active'));
                sub.classList.add('active');
                App.Athkar.setTab(sub.getAttribute('data-type'));
            });
        });

        // Reset Athkar
        if (elements.btnResetAthkar) {
            elements.btnResetAthkar.addEventListener('click', () => {
                App.Athkar.reset();
            });
        }

        // Tasbeeh Preset Change
        if (elements.tasbeehPreset) {
            elements.tasbeehPreset.addEventListener('change', (e) => {
                App.Tasbeeh.setPreset(Number(e.target.value));
            });
        }

        // Tap Tasbeeh
        if (elements.btnTapTasbeeh) {
            elements.btnTapTasbeeh.addEventListener('click', () => {
                App.Tasbeeh.tap();
            });
        }

        // Reset Tasbeeh
        if (elements.btnResetTasbeeh) {
            elements.btnResetTasbeeh.addEventListener('click', () => {
                App.Tasbeeh.reset();
            });
        }

        // Minimize to System Tray
        if (elements.btnMinimizeTray) {
            elements.btnMinimizeTray.addEventListener('click', () => {
                if (App.IPC) App.IPC.minimizeToTray().catch(console.error);
            });
        }

        // Auto-Location via IP
        if (elements.btnAutoLoc) {
            elements.btnAutoLoc.addEventListener('click', async () => {
                elements.btnAutoLoc.style.opacity = '0.5';
                if (App.IPC) {
                    try {
                        const res = await App.IPC.autoDetectLocation();
                        if (res && res.success && res.detected) {
                            state.currentCountry = res.detected.country;
                            state.currentCity = res.detected.city;

                            App.Clock.populateCityDropdown(state.currentCountry);
                            if (elements.countrySelect) elements.countrySelect.value = state.currentCountry;
                            if (elements.citySelect) elements.citySelect.value = state.currentCity;

                            if (res.prayerData) App.Clock.updatePrayerUI(res.prayerData);
                        }
                    } catch (e) {
                        console.error('[App] Auto loc error:', e);
                    }
                }
                elements.btnAutoLoc.style.opacity = '1';
            });
        }

        // Country Select Changed
        if (elements.countrySelect) {
            elements.countrySelect.addEventListener('change', async (e) => {
                const newCountry = e.target.value;
                state.currentCountry = newCountry;
                App.Clock.populateCityDropdown(newCountry);

                const firstCity = elements.citySelect ? elements.citySelect.value : '';
                state.currentCity = firstCity;
                await changeLocation(newCountry, firstCity);
            });
        }

        // City Select Changed
        if (elements.citySelect) {
            elements.citySelect.addEventListener('change', async (e) => {
                const newCity = e.target.value;
                state.currentCity = newCity;
                await changeLocation(state.currentCountry, newCity);
            });
        }

        // Refresh Button
        if (elements.btnRefresh) {
            elements.btnRefresh.addEventListener('click', async () => {
                elements.btnRefresh.style.transform = 'rotate(180deg)';
                setTimeout(() => { elements.btnRefresh.style.transform = ''; }, 400);

                if (App.IPC) {
                    try {
                        const data = await App.IPC.refreshPrayerTimes(
                            state.currentCountry,
                            state.currentCity,
                            state.settings.method
                        );
                        if (data) App.Clock.updatePrayerUI(data);
                    } catch (err) {
                        console.error('[App] Refresh error:', err);
                    }
                }
            });
        }

        // Toggle Adhan Playback (Test / Stop)
        App.toggleAdhan = function() {
            if (state.isPlayingAdhan) {
                if (App.Audio) App.Audio.stopAdhan();
            } else {
                const prayerKey = (state.nextPrayer && state.nextPrayer.key) || 'Fajr';
                const vol = (state.settings && state.settings.adhanVolume != null) ? Number(state.settings.adhanVolume) : 80;
                if (App.Audio) App.Audio.playAdhan(null, vol, prayerKey);
                if (App.IPC) App.IPC.testNotification().catch(console.error);
            }
        };

        // Test Adhan Button
        if (elements.btnTestAdhan) {
            elements.btnTestAdhan.addEventListener('click', App.toggleAdhan);
        }

        // Frameless Custom Titlebar Controls
        function updateMaxIcon(isMax) {
            if (!elements.iconWinMax) return;
            if (isMax) {
                elements.iconWinMax.innerHTML = `
                    <rect x="5" y="5" width="14" height="14" rx="1.5" fill="none" stroke="currentColor" stroke-width="2"/>
                    <path d="M9 5V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-2" fill="none" stroke="currentColor" stroke-width="2"/>
                `;
            } else {
                elements.iconWinMax.innerHTML = `<rect x="4" y="4" width="16" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="2"/>`;
            }
        }

        if (elements.btnWinMin) {
            elements.btnWinMin.addEventListener('click', () => {
                if (App.IPC) App.IPC.winMinimize();
            });
        }

        if (elements.btnWinMax) {
            elements.btnWinMax.addEventListener('click', async () => {
                if (App.IPC) {
                    try {
                        const isMax = await App.IPC.winToggleMaximize();
                        updateMaxIcon(isMax);
                    } catch (e) {
                        console.error('[App] win_toggleMaximize error:', e);
                    }
                }
            });
        }

        if (elements.btnWinClose) {
            elements.btnWinClose.addEventListener('click', () => {
                if (App.IPC) App.IPC.winClose();
            });
        }

        if (App.IPC) {
            App.IPC.on('window_state_changed', (payload) => {
                if (payload && typeof payload.isMaximized !== 'undefined') {
                    updateMaxIcon(payload.isMaximized);
                }
            });
        }

        // Compact Floating Mode Toggle
        async function setCompactMode(enable) {
            state.settings.isCompactMode = enable;
            if (enable) {
                document.body.classList.add('compact-mode');
            } else {
                document.body.classList.remove('compact-mode');
            }
            if (App.IPC) {
                try {
                    await App.IPC.toggleCompactMode(enable);
                } catch (e) {
                    console.error('[App] toggleCompactMode error:', e);
                }
            }
        }
        App.setCompactMode = setCompactMode;

        if (elements.btnCompactMode) {
            elements.btnCompactMode.addEventListener('click', () => setCompactMode(true));
        }

        if (elements.btnExpandFromCompact) {
            elements.btnExpandFromCompact.addEventListener('click', () => setCompactMode(false));
        }

        if (elements.btnCompactMute) {
            elements.btnCompactMute.addEventListener('click', App.toggleAdhan);
        }

        if (elements.btnCompactClose) {
            elements.btnCompactClose.addEventListener('click', () => {
                if (App.IPC) App.IPC.winClose();
            });
        }

        // Global Keyboard Shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                if (App.Tasbeeh) App.Tasbeeh.tap();
            }
            if ((e.key === 'm' || e.key === 'M') && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                if (App.Audio) App.Audio.stopAdhan();
            }
            if (e.key === 'Escape') {
                if (elements.settingsModal && !elements.settingsModal.classList.contains('hidden')) {
                    if (App.Settings) App.Settings.close();
                } else if (document.body.classList.contains('compact-mode')) {
                    setCompactMode(false);
                } else if (App.IPC) {
                    App.IPC.minimizeToTray().catch(console.error);
                }
            }
        });
    }

    // Auto-bootstrap on DOM Ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', App.init);
    } else {
        App.init();
    }

})(window.PrayerApp);
