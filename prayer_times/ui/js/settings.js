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

            // Pre-Adhan Settings
            if (elements.chkPreAdhan) {
                elements.chkPreAdhan.checked = Boolean(state.settings.preAdhanEnabled);
            }
            if (elements.selPreAdhanMinutes) {
                elements.selPreAdhanMinutes.value = String(state.settings.preAdhanMinutes || 10);
            }

            // Per-Prayer Voice Settings
            if (elements.chkPerPrayerVoices) {
                elements.chkPerPrayerVoices.checked = Boolean(state.settings.perPrayerVoicesEnabled);
            }
            if (elements.groupPerPrayerVoices) {
                elements.groupPerPrayerVoices.style.display = elements.chkPerPrayerVoices && elements.chkPerPrayerVoices.checked ? 'block' : 'none';
            }
            const pv = state.settings.prayerVoices || {};
            if (elements.selVoiceFajr) elements.selVoiceFajr.value = pv.Fajr || 'algerian';
            if (elements.selVoiceDhuhr) elements.selVoiceDhuhr.value = pv.Dhuhr || 'chime';
            if (elements.selVoiceAsr) elements.selVoiceAsr.value = pv.Asr || 'chime';
            if (elements.selVoiceMaghrib) elements.selVoiceMaghrib.value = pv.Maghrib || 'chime';
            if (elements.selVoiceIsha) elements.selVoiceIsha.value = pv.Isha || 'chime';

            // Iqama Settings
            if (elements.chkIqama) {
                elements.chkIqama.checked = Boolean(state.settings.iqamaEnabled);
            }
            if (elements.groupIqamaOffsets) {
                elements.groupIqamaOffsets.style.display = elements.chkIqama && elements.chkIqama.checked ? 'block' : 'none';
            }
            const iq = state.settings.iqamaOffsets || {};
            if (elements.numIqamaFajr) elements.numIqamaFajr.value = iq.Fajr !== undefined ? iq.Fajr : 20;
            if (elements.numIqamaDhuhr) elements.numIqamaDhuhr.value = iq.Dhuhr !== undefined ? iq.Dhuhr : 15;
            if (elements.numIqamaAsr) elements.numIqamaAsr.value = iq.Asr !== undefined ? iq.Asr : 15;
            if (elements.numIqamaMaghrib) elements.numIqamaMaghrib.value = iq.Maghrib !== undefined ? iq.Maghrib : 10;
            if (elements.numIqamaIsha) elements.numIqamaIsha.value = iq.Isha !== undefined ? iq.Isha : 15;

            // Athkar Reminder
            if (elements.chkAthkarReminder) {
                elements.chkAthkarReminder.checked = Boolean(state.settings.athkarReminderEnabled);
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

            // Save new settings
            if (elements.chkPreAdhan) {
                state.settings.preAdhanEnabled = elements.chkPreAdhan.checked;
            }
            if (elements.selPreAdhanMinutes) {
                state.settings.preAdhanMinutes = parseInt(elements.selPreAdhanMinutes.value) || 10;
            }

            if (elements.chkPerPrayerVoices) {
                state.settings.perPrayerVoicesEnabled = elements.chkPerPrayerVoices.checked;
            }
            state.settings.prayerVoices = {
                Fajr: elements.selVoiceFajr ? elements.selVoiceFajr.value : 'algerian',
                Dhuhr: elements.selVoiceDhuhr ? elements.selVoiceDhuhr.value : 'chime',
                Asr: elements.selVoiceAsr ? elements.selVoiceAsr.value : 'chime',
                Maghrib: elements.selVoiceMaghrib ? elements.selVoiceMaghrib.value : 'chime',
                Isha: elements.selVoiceIsha ? elements.selVoiceIsha.value : 'chime'
            };

            if (elements.chkIqama) {
                state.settings.iqamaEnabled = elements.chkIqama.checked;
            }
            state.settings.iqamaOffsets = {
                Fajr: elements.numIqamaFajr ? parseInt(elements.numIqamaFajr.value) || 20 : 20,
                Dhuhr: elements.numIqamaDhuhr ? parseInt(elements.numIqamaDhuhr.value) || 15 : 15,
                Asr: elements.numIqamaAsr ? parseInt(elements.numIqamaAsr.value) || 15 : 15,
                Maghrib: elements.numIqamaMaghrib ? parseInt(elements.numIqamaMaghrib.value) || 10 : 10,
                Isha: elements.numIqamaIsha ? parseInt(elements.numIqamaIsha.value) || 15 : 15
            };

            if (elements.chkAthkarReminder) {
                state.settings.athkarReminderEnabled = elements.chkAthkarReminder.checked;
            }

            this.close();

            if (App.Clock && App.Clock.updateIqamaUI) {
                App.Clock.updateIqamaUI();
            }

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

            if (elements.chkPerPrayerVoices) {
                elements.chkPerPrayerVoices.addEventListener('change', () => {
                    if (elements.groupPerPrayerVoices) {
                        elements.groupPerPrayerVoices.style.display = elements.chkPerPrayerVoices.checked ? 'block' : 'none';
                    }
                });
            }

            if (elements.chkIqama) {
                elements.chkIqama.addEventListener('change', () => {
                    if (elements.groupIqamaOffsets) {
                        elements.groupIqamaOffsets.style.display = elements.chkIqama.checked ? 'block' : 'none';
                    }
                });
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
