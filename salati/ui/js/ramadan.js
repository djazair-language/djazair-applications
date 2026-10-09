// =============================================================================
// Project:      Djazair Prayer Times Desktop Application
// File:         ui/js/ramadan.js
// Description:  Ramadan Mode, Iftar and Imsak Countdown Timers.
// =============================================================================

window.PrayerApp = window.PrayerApp || {};

(function(App) {
    'use strict';

    App.Ramadan = {
        updateCountdowns() {
            const state = App.state;
            const elements = App.elements;
            if (!state.prayerData || !state.prayerData.timings) return;
            if (!App.Clock || !App.Clock.parseTimeToToday) return;

            const now = new Date();

            // Iftar Countdown (Maghrib)
            if (elements.iftarCountdown && state.prayerData.timings.Maghrib) {
                const iftarTime = App.Clock.parseTimeToToday(state.prayerData.timings.Maghrib);
                if (iftarTime) {
                    let diffIftar = iftarTime.getTime() - now.getTime();
                    if (diffIftar < 0) diffIftar += 24 * 3600 * 1000;
                    const sec = Math.floor(diffIftar / 1000);
                    const h = Math.floor(sec / 3600);
                    const m = Math.floor((sec % 3600) / 60);
                    const s = sec % 60;
                    elements.iftarCountdown.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                }
            }

            // Imsak Countdown (Imsak or Fajr)
            if (elements.imsakCountdown) {
                const imsakTarget = state.prayerData.timings.Imsak || state.prayerData.timings.Fajr;
                if (imsakTarget) {
                    const imsakTime = App.Clock.parseTimeToToday(imsakTarget);
                    if (imsakTime) {
                        let diffImsak = imsakTime.getTime() - now.getTime();
                        if (diffImsak < 0) diffImsak += 24 * 3600 * 1000;
                        const sec = Math.floor(diffImsak / 1000);
                        const h = Math.floor(sec / 3600);
                        const m = Math.floor((sec % 3600) / 60);
                        const s = sec % 60;
                        elements.imsakCountdown.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
                    }
                }
            }
        }
    };

})(window.PrayerApp);
