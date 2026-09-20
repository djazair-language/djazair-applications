// =============================================================================
// Project:      Djazair Prayer Times Desktop Application
// File:         ui/js/settings.js
// Description:  Settings Modal, Audio Picker, Registry Autostart & Configurations.
// =============================================================================

window.PrayerApp = window.PrayerApp || {};

(function(App) {
    'use strict';

    App.Settings = {
        open() {
            const state = App.state;
            const elements = App.elements;
            if (!elements.settingsModal) return;

            if (elements.methodSelect) {
                elements.methodSelect.value = String(state.settings.method || 13);
            }
            if (elements.voiceSelect) {
                elements.voiceSelect.value = state.settings.selectedVoice || 'chime';
            }
            if (elements.chkAdhan) {
                elements.chkAdhan.checked = Boolean(state.settings.adhanEnabled);
            }
            if (elements.rngVolume) {
                elements.rngVolume.value = state.settings.adhanVolume !== undefined ? state.settings.adhanVolume : 80;
            }
            if (elements.lblVolume) {
                elements.lblVolume.textContent = `${elements.rngVolume.value}%`;
            }
            if (elements.chkNotifications) {
                elements.chkNotifications.checked = Boolean(state.settings.notificationEnabled);
            }
            if (elements.chkStartup) {
                elements.chkStartup.checked = Boolean(state.settings.startWithWindows);
            }
            if (elements.chkMinimizeTray) {
                elements.chkMinimizeTray.checked = state.settings.minimizeToTray !== false;
            }

            if (elements.txtStartupName) {
                elements.txtStartupName.value = state.settings.startupName || 'Djazair Prayer Times';
            }
            if (elements.txtCustomExeName) {
                elements.txtCustomExeName.value = state.settings.customExeName || '';
            }
            if (elements.startupOptionsGroup) {
                elements.startupOptionsGroup.style.display = elements.chkStartup && elements.chkStartup.checked ? 'block' : 'none';
            }

            if (elements.voiceSelect && elements.voiceSelect.value === 'custom') {
                if (elements.customAudioGroup) elements.customAudioGroup.style.display = 'block';
                if (elements.lblCustomAudioPath) elements.lblCustomAudioPath.textContent = state.settings.customAudioPath || '';
            } else {
                if (elements.customAudioGroup) elements.customAudioGroup.style.display = 'none';
            }

            elements.settingsModal.classList.remove('hidden');
        },

        close() {
            if (App.Audio && App.Audio.stopAdhan) {
                App.Audio.stopAdhan();
            }
            if (App.elements.settingsModal) {
                App.elements.settingsModal.classList.add('hidden');
            }
        },

        async pickCustomAudio() {
            if (!App.IPC) return;
            try {
                const res = await App.IPC.selectCustomAudio();
                if (res && res.success && res.path) {
                    App.state.settings.customAudioPath = res.path;
                    App.state.settings.selectedVoice = 'custom';
                    if (App.elements.voiceSelect) App.elements.voiceSelect.value = 'custom';
                    if (App.elements.lblCustomAudioPath) App.elements.lblCustomAudioPath.textContent = res.path;
                    if (App.Audio && App.Audio.playAdhan) {
                        const vol = Number(App.elements.rngVolume.value) || 80;
                        App.Audio.playAdhan('custom', vol);
                    }
                }
            } catch (err) {
                console.error('[Settings] Select custom audio error:', err);
            }
        },

        async save() {
            const state = App.state;
            const elements = App.elements;

            if (App.Audio && App.Audio.stopAdhan) {
                App.Audio.stopAdhan();
            }

            state.settings.method = parseInt(elements.methodSelect.value) || 13;
            state.settings.selectedVoice = elements.voiceSelect.value;
            state.settings.adhanEnabled = elements.chkAdhan.checked;
            state.settings.adhanVolume = parseInt(elements.rngVolume.value) || 80;
            state.settings.notificationEnabled = elements.chkNotifications.checked;
            state.settings.startWithWindows = elements.chkStartup.checked;
            state.settings.minimizeToTray = elements.chkMinimizeTray.checked;

            if (elements.txtStartupName) {
                state.settings.startupName = elements.txtStartupName.value.trim() || 'Djazair Prayer Times';
            }
            if (elements.txtCustomExeName) {
                state.settings.customExeName = elements.txtCustomExeName.value.trim();
            }

            this.close();

            if (App.IPC) {
                try {
                    const res = await App.IPC.saveSettings(state.settings);
                    if (res && res.prayerData && App.Clock && App.Clock.updatePrayerUI) {
                        App.Clock.updatePrayerUI(res.prayerData);
                    }
                } catch (err) {
                    console.error('[Settings] Save settings error:', err);
                }
            }
        },

        bindEvents() {
            const elements = App.elements;

            if (elements.btnSettings) {
                elements.btnSettings.addEventListener('click', () => this.open());
            }

            if (elements.btnCloseSettings) {
                elements.btnCloseSettings.addEventListener('click', () => this.close());
            }

            if (elements.btnCancelSettings) {
                elements.btnCancelSettings.addEventListener('click', () => this.close());
            }

            if (elements.btnSaveSettings) {
                elements.btnSaveSettings.addEventListener('click', () => this.save());
            }

            if (elements.btnPickAudio) {
                elements.btnPickAudio.addEventListener('click', () => this.pickCustomAudio());
            }

            if (elements.chkStartup) {
                elements.chkStartup.addEventListener('change', () => {
                    if (elements.startupOptionsGroup) {
                        elements.startupOptionsGroup.style.display = elements.chkStartup.checked ? 'block' : 'none';
                    }
                });
            }

            if (elements.voiceSelect) {
                elements.voiceSelect.addEventListener('change', (e) => {
                    if (App.Audio && App.Audio.stopAdhan) {
                        App.Audio.stopAdhan();
                    }
                    if (e.target.value === 'custom') {
                        if (elements.customAudioGroup) elements.customAudioGroup.style.display = 'block';
                    } else {
                        if (elements.customAudioGroup) elements.customAudioGroup.style.display = 'none';
                    }
                });
            }

            if (elements.btnPreviewVoice) {
                elements.btnPreviewVoice.addEventListener('click', () => {
                    if (App.state.isPlayingAdhan) {
                        if (App.Audio && App.Audio.stopAdhan) App.Audio.stopAdhan();
                    } else {
                        const voice = elements.voiceSelect ? elements.voiceSelect.value : 'chime';
                        const volume = elements.rngVolume ? (Number(elements.rngVolume.value) || 80) : 80;
                        if (App.Audio && App.Audio.playAdhan) App.Audio.playAdhan(voice, volume);
                    }
                });
            }

            if (elements.rngVolume) {
                elements.rngVolume.addEventListener('input', (e) => {
                    const vol = Number(e.target.value);
                    if (elements.lblVolume) elements.lblVolume.textContent = `${vol}%`;
                    if (elements.adhanAudio && App.state.isPlayingAdhan) {
                        elements.adhanAudio.volume = vol / 100;
                    }
                });
            }
        }
    };

})(window.PrayerApp);
