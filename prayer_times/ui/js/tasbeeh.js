// =============================================================================
// Project:      Djazair Prayer Times Desktop Application
// File:         ui/js/tasbeeh.js
// Description:  Digital Tasbeeh Counter, Dhikr Presets, and Target Completion.
// =============================================================================

window.PrayerApp = window.PrayerApp || {};

(function(App) {
    'use strict';

    App.Tasbeeh = {
        initUI() {
            const state = App.state;
            const elements = App.elements;
            if (!state.athkarData || !state.athkarData.tasbeehPresets || !elements.tasbeehPreset) return;

            elements.tasbeehPreset.innerHTML = '';
            state.athkarData.tasbeehPresets.forEach((p, idx) => {
                const opt = document.createElement('option');
                opt.value = idx;
                opt.textContent = `${p.name} (${p.target})`;
                elements.tasbeehPreset.appendChild(opt);
            });

            if (elements.tasbeehTotal) {
                elements.tasbeehTotal.textContent = state.tasbeehTotal;
            }
            this.setPreset(0);
        },

        setPreset(index) {
            const state = App.state;
            const elements = App.elements;
            if (!state.athkarData || !state.athkarData.tasbeehPresets) return;
            const p = state.athkarData.tasbeehPresets[index];
            if (!p) return;

            state.tasbeehCurrent = 0;
            state.tasbeehTarget = p.target;
            if (elements.currentDhikrText) elements.currentDhikrText.textContent = p.name;
            if (elements.tasbeehDisplay) elements.tasbeehDisplay.textContent = '0';
            if (elements.tasbeehTarget) elements.tasbeehTarget.textContent = `الهدف: ${p.target}`;
        },

        tap() {
            const state = App.state;
            const elements = App.elements;

            state.tasbeehCurrent++;
            state.tasbeehTotal++;

            if (App.Audio && App.Audio.playClickTone) {
                App.Audio.playClickTone();
            }

            if (elements.tasbeehDisplay) elements.tasbeehDisplay.textContent = state.tasbeehCurrent;
            if (elements.tasbeehTotal) elements.tasbeehTotal.textContent = state.tasbeehTotal;

            if (state.tasbeehCurrent >= state.tasbeehTarget) {
                state.tasbeehCurrent = 0;
                if (App.IPC) {
                    App.IPC.notifyMessage(
                        'السبحة الإلكترونية',
                        `تم بحمد الله إكمال الهدف (${state.tasbeehTarget} مرة)!`,
                        elements.currentDhikrText ? elements.currentDhikrText.textContent : ''
                    ).catch(console.error);
                }
            }

            // Persist count
            if (App.IPC) {
                App.IPC.saveTasbeeh(state.tasbeehTotal).catch(console.error);
            }
        },

        reset() {
            const state = App.state;
            const elements = App.elements;
            state.tasbeehCurrent = 0;
            if (elements.tasbeehDisplay) elements.tasbeehDisplay.textContent = '0';
        }
    };

})(window.PrayerApp);
