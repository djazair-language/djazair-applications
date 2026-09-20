// =============================================================================
// Project:      Djazair Prayer Times Desktop Application
// File:         ui/js/clock.js
// Description:  Live Clock, Prayer Calculations, Countdown Timers, and Timeline.
// =============================================================================

window.PrayerApp = window.PrayerApp || {};

(function(App) {
    'use strict';

    App.Clock = {
        parseTimeToToday(timeStr) {
            if (!timeStr) return null;
            const [h, m] = timeStr.split(':').map(Number);
            const now = new Date();
            return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
        },

        updateDailyReminder() {
            const elements = App.elements;
            if (!elements.dailyReminderText || !elements.dailyReminderSource) return;
            const now = new Date();
            const start = new Date(now.getFullYear(), 0, 0);
            const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
            const reminder = App.DAILY_REMINDERS[dayOfYear % App.DAILY_REMINDERS.length];
            elements.dailyReminderText.textContent = reminder.text;
            elements.dailyReminderSource.textContent = reminder.source;
        },

        populateCountryDropdown() {
            const elements = App.elements;
            const state = App.state;
            if (!elements.countrySelect) return;
            elements.countrySelect.innerHTML = '';
            state.countries.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.code;
                opt.textContent = `${c.ar} (${c.name})`;
                elements.countrySelect.appendChild(opt);
            });
        },

        populateCityDropdown(countryCode) {
            const elements = App.elements;
            const state = App.state;
            if (!elements.citySelect) return;
            elements.citySelect.innerHTML = '';
            const country = state.countries.find(c => c.code === countryCode);
            if (!country || !country.cities) return;

            country.cities.forEach(city => {
                const opt = document.createElement('option');
                opt.value = city.name;
                const prefix = city.code ? `${city.code} - ` : '';
                opt.textContent = `${prefix}${city.ar}`;
                elements.citySelect.appendChild(opt);
            });
        },

        updatePrayerUI(data) {
            if (!data || !data.timings) return;
            const state = App.state;
            const elements = App.elements;
            state.prayerData = data;

            if (data.hijri && data.hijri.formatted && elements.hijriDate) {
                elements.hijriDate.textContent = data.hijri.formatted;
            }
            if (data.gregorian && data.gregorian.formatted && elements.gregDate) {
                const AR_MONTHS = {
                    'January': 'جانفي', 'February': 'فيفري', 'March': 'مارس', 'April': 'أفريل',
                    'May': 'ماي', 'June': 'جوان', 'July': 'جويلية', 'August': 'أوت',
                    'September': 'سبتمبر', 'October': 'أكتوبر', 'November': 'نوفمبر', 'December': 'ديسمبر'
                };
                let formatted = data.gregorian.formatted;
                for (const [en, ar] of Object.entries(AR_MONTHS)) {
                    formatted = formatted.replace(en, ar);
                }
                elements.gregDate.textContent = formatted;
            }

            if (elements.statusBadge && elements.statusText) {
                if (data.source === 'online') {
                    elements.statusBadge.className = 'status-badge online';
                    elements.statusText.textContent = 'متصل بالإنترنت';
                } else {
                    elements.statusBadge.className = 'status-badge offline';
                    elements.statusText.textContent = 'حساب فلكي محلي (بدون إنترنت)';
                }
            }

            App.PRAYER_KEYS.forEach(key => {
                const timeElem = document.getElementById(`time-${key}`);
                if (timeElem && data.timings[key]) {
                    timeElem.textContent = data.timings[key];
                }
            });

            if (elements.timeImsak && data.timings.Imsak) {
                elements.timeImsak.textContent = data.timings.Imsak;
            }
            if (elements.timeMidnight && data.timings.Midnight) {
                elements.timeMidnight.textContent = data.timings.Midnight;
            }

            // Daily Islamic Reminder
            this.updateDailyReminder();

            // Calculation Method Text
            if (elements.calcMethodText) {
                const methodNames = {
                    13: 'وزارة الشؤون الدينية والأوقاف (الجزائر)',
                    4: 'جامعة أم القرى (مكة المكرمة)',
                    3: 'رابطة العالم الإسلامي',
                    5: 'الهيئة المصرية العامة للمساحة',
                    1: 'جامعة العلوم الإسلامية بكراتشي',
                    2: 'الجمعية الإسلامية لأمريكا الشمالية'
                };
                elements.calcMethodText.textContent = methodNames[data.method] || `طريقة رقم ${data.method}`;
            }

            // Update Ramadan View Timings
            if (elements.iftarTime && data.timings.Maghrib) {
                elements.iftarTime.textContent = data.timings.Maghrib;
            }
            if (elements.imsakTime && (data.timings.Imsak || data.timings.Fajr)) {
                elements.imsakTime.textContent = data.timings.Imsak || data.timings.Fajr;
            }

            // Update Iqama Displays
            this.updateIqamaUI();

            this.calculateNextPrayer();
        },

        calculateNextPrayer() {
            const state = App.state;
            const elements = App.elements;
            if (!state.prayerData || !state.prayerData.timings) return;

            const now = new Date();
            const timings = state.prayerData.timings;

            let nextKey = null;
            let nextTime = null;
            let minDiff = Infinity;

            for (const key of App.PRAYER_KEYS) {
                const pTime = this.parseTimeToToday(timings[key]);
                if (!pTime) continue;

                const diff = pTime.getTime() - now.getTime();
                if (diff > 0 && diff < minDiff) {
                    minDiff = diff;
                    nextKey = key;
                    nextTime = pTime;
                }
            }

            if (!nextKey) {
                nextKey = 'Fajr';
                const fajrTime = this.parseTimeToToday(timings['Fajr']);
                if (fajrTime) {
                    nextTime = new Date(fajrTime.getTime() + 24 * 60 * 60 * 1000);
                    minDiff = nextTime.getTime() - now.getTime();
                }
            }

            // Determine previous prayer for the smart timeline
            let prevKey = null;
            let prevTime = null;
            const nextIdx = App.PRAYER_KEYS.indexOf(nextKey);
            if (nextIdx > 0) {
                prevKey = App.PRAYER_KEYS[nextIdx - 1];
                prevTime = this.parseTimeToToday(timings[prevKey]);
            } else {
                prevKey = 'Isha';
                const ishaTime = this.parseTimeToToday(timings['Isha']);
                if (ishaTime) {
                    prevTime = new Date(ishaTime.getTime() - 24 * 60 * 60 * 1000);
                }
            }

            state.nextPrayer = {
                key: nextKey,
                nameAr: App.PRAYER_NAMES[nextKey] || nextKey,
                timeStr: timings[nextKey],
                targetTime: nextTime
            };

            state.timeline = {
                prevKey: prevKey,
                prevName: `${App.PRAYER_NAMES[prevKey]} ${timings[prevKey]}`,
                prevTime: prevTime,
                nextKey: nextKey,
                nextName: `${state.nextPrayer.nameAr} ${state.nextPrayer.timeStr}`,
                nextTime: nextTime
            };

            if (elements.nextPrayerName) elements.nextPrayerName.textContent = state.nextPrayer.nameAr;
            if (elements.nextPrayerTime) elements.nextPrayerTime.textContent = state.nextPrayer.timeStr;

            App.PRAYER_KEYS.forEach(key => {
                const card = document.getElementById(`card-${key}`);
                const status = document.getElementById(`status-${key}`);
                if (!card) return;

                card.classList.remove('active', 'passed');

                const pTime = this.parseTimeToToday(timings[key]);
                if (key === nextKey) {
                    card.classList.add('active');
                    if (status && key !== 'Sunrise') {
                        status.innerHTML = '<span class="active-pulse-dot"></span> الصلاة القادمة';
                    }
                } else if (pTime && pTime.getTime() < now.getTime()) {
                    card.classList.add('passed');
                    if (status && key !== 'Sunrise') status.textContent = 'مضت';
                } else {
                    if (status && key !== 'Sunrise') status.textContent = 'قادمة';
                }
            });

            this.updateCountdownDisplay(minDiff);
            if (App.Ramadan && App.Ramadan.updateCountdowns) {
                App.Ramadan.updateCountdowns();
            }
            this.updateTimelineProgress(now);
        },

        updateTimelineProgress(now) {
            const state = App.state;
            const elements = App.elements;
            if (!state.timeline || !elements.timelineProgressBar) return;
            const { prevTime, nextTime, prevName, nextName } = state.timeline;
            if (!prevTime || !nextTime) return;

            const totalMs = nextTime.getTime() - prevTime.getTime();
            const elapsedMs = now.getTime() - prevTime.getTime();
            let percent = 0;
            if (totalMs > 0) {
                percent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
            }

            if (elements.timelineProgressBar) {
                elements.timelineProgressBar.style.width = `${percent}%`;
            }
            if (elements.timelineProgressPercent) {
                elements.timelineProgressPercent.textContent = `مضى ${percent}%`;
            }
            if (elements.timelinePrevPrayer) {
                elements.timelinePrevPrayer.textContent = prevName;
            }
            if (elements.timelineNextPrayer) {
                elements.timelineNextPrayer.textContent = nextName;
            }
        },

        updateCountdownDisplay(diffMs) {
            const elements = App.elements;
            if (!elements.countdown) return;

            if (diffMs <= 0) {
                elements.countdown.textContent = '00:00:00';
                this.onPrayerTimeReached();
                return;
            }

            const totalSeconds = Math.floor(diffMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            elements.countdown.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        },

        startTimer() {
            const state = App.state;
            if (state.timerId) clearInterval(state.timerId);
            state.timerId = setInterval(() => {
                const now = new Date();
                if (state.nextPrayer && state.nextPrayer.targetTime) {
                    const diff = state.nextPrayer.targetTime.getTime() - now.getTime();
                    this.updateCountdownDisplay(diff);
                    if (App.Ramadan && App.Ramadan.updateCountdowns) {
                        App.Ramadan.updateCountdowns();
                    }
                    this.updateTimelineProgress(now);
                    this.checkPreAdhanReminder(now, diff);
                    this.checkTrayTooltipUpdate(now, diff);
                    this.updateCompactModeUI(diff);
                } else {
                    this.calculateNextPrayer();
                }

                // Check periodic reminders
                this.checkIqamaReminder(now);
                this.checkAthkarTimedReminder(now);
            }, 1000);
        },

        stopTimer() {
            const state = App.state;
            if (state.timerId) {
                clearInterval(state.timerId);
                state.timerId = null;
            }
        },

        onPrayerTimeReached() {
            const state = App.state;
            if (!state.nextPrayer) return;

            const prayerKey = state.nextPrayer.key;
            const timeStr = state.nextPrayer.timeStr;
            const todayStr = new Date().toDateString();
            const triggerId = `${prayerKey}_${timeStr}_${todayStr}`;

            // Guard: ensure Adhan and notification only fire once per prayer arrival
            if (state.lastTriggeredPrayer === triggerId) {
                return;
            }
            state.lastTriggeredPrayer = triggerId;

            const prayerName = state.nextPrayer.nameAr;

            if (state.settings.notificationEnabled && App.IPC) {
                App.IPC.notifyPrayer(prayerName, timeStr).catch(console.error);
            }

            if (state.settings.adhanEnabled && prayerKey !== 'Sunrise' && App.Audio) {
                const vol = (state.settings && state.settings.adhanVolume != null) ? Number(state.settings.adhanVolume) : 80;
                App.Audio.playAdhan(null, vol, prayerKey);
            }

            // Advance to next prayer
            setTimeout(() => this.calculateNextPrayer(), 1500);
        },

        updateIqamaUI() {
            const state = App.state;
            if (!state.prayerData || !state.prayerData.timings) return;
            const timings = state.prayerData.timings;
            const offsets = state.settings.iqamaOffsets || { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 10, Isha: 15 };

            ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach(key => {
                const elem = document.getElementById(`iqama-${key}`);
                if (elem && timings[key]) {
                    const pTime = this.parseTimeToToday(timings[key]);
                    if (pTime) {
                        const offsetMin = offsets[key] || 15;
                        const iqamaDate = new Date(pTime.getTime() + offsetMin * 60 * 1000);
                        const h = String(iqamaDate.getHours()).padStart(2, '0');
                        const m = String(iqamaDate.getMinutes()).padStart(2, '0');
                        elem.textContent = `الإقامة: ${h}:${m}`;
                        elem.style.display = state.settings.iqamaEnabled ? 'inline-block' : 'none';
                    }
                }
            });
        },

        checkPreAdhanReminder(now, diffMs) {
            const state = App.state;
            if (!state.settings.preAdhanEnabled || !state.nextPrayer) return;

            const targetMinutes = state.settings.preAdhanMinutes || 10;
            const targetMs = targetMinutes * 60 * 1000;
            const windowMs = 60 * 1000;

            if (diffMs > 0 && diffMs <= targetMs && diffMs > (targetMs - windowMs)) {
                const key = `${state.nextPrayer.key}_${now.toDateString()}`;
                if (!state.preAdhanFired[key]) {
                    state.preAdhanFired[key] = true;
                    if (App.IPC) {
                        App.IPC.notifyPreAdhan(state.nextPrayer.nameAr, targetMinutes).catch(console.error);
                    }
                    if (App.Audio && App.Audio.playSyntheticChime) {
                        App.Audio.playSyntheticChime(0.4);
                    }
                }
            }
        },

        checkIqamaReminder(now) {
            const state = App.state;
            if (!state.settings.iqamaEnabled || !state.prayerData || !state.prayerData.timings) return;
            const timings = state.prayerData.timings;
            const offsets = state.settings.iqamaOffsets || { Fajr: 20, Dhuhr: 15, Asr: 15, Maghrib: 10, Isha: 15 };

            ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'].forEach(key => {
                const pTime = this.parseTimeToToday(timings[key]);
                if (!pTime) return;
                const offsetMin = offsets[key] || 15;
                const iqamaTime = new Date(pTime.getTime() + offsetMin * 60 * 1000);
                const diff = now.getTime() - iqamaTime.getTime();

                if (diff >= 0 && diff < 60 * 1000) {
                    const fireKey = `${key}_${now.toDateString()}`;
                    if (!state.iqamaFired[fireKey]) {
                        state.iqamaFired[fireKey] = true;
                        const nameAr = App.PRAYER_NAMES[key] || key;
                        if (App.IPC) {
                            App.IPC.notifyIqama(nameAr).catch(console.error);
                        }
                        if (App.Audio && App.Audio.playClickTone) {
                            App.Audio.playClickTone();
                        }
                    }
                }
            });
        },

        checkAthkarTimedReminder(now) {
            const state = App.state;
            if (!state.settings.athkarReminderEnabled || !state.prayerData || !state.prayerData.timings) return;
            const timings = state.prayerData.timings;
            const todayStr = now.toDateString();

            // Morning Athkar: 20 mins after Fajr
            if (timings.Fajr) {
                const fajrTime = this.parseTimeToToday(timings.Fajr);
                if (fajrTime) {
                    const morningTarget = new Date(fajrTime.getTime() + 20 * 60 * 1000);
                    const diff = now.getTime() - morningTarget.getTime();
                    if (diff >= 0 && diff < 60 * 1000 && !state.athkarFired['morning_' + todayStr]) {
                        state.athkarFired['morning_' + todayStr] = true;
                        if (App.IPC) App.IPC.notifyAthkarTime('morning').catch(console.error);
                    }
                }
            }

            // Evening Athkar: 20 mins after Asr
            if (timings.Asr) {
                const asrTime = this.parseTimeToToday(timings.Asr);
                if (asrTime) {
                    const eveningTarget = new Date(asrTime.getTime() + 20 * 60 * 1000);
                    const diff = now.getTime() - eveningTarget.getTime();
                    if (diff >= 0 && diff < 60 * 1000 && !state.athkarFired['evening_' + todayStr]) {
                        state.athkarFired['evening_' + todayStr] = true;
                        if (App.IPC) App.IPC.notifyAthkarTime('evening').catch(console.error);
                    }
                }
            }
        },

        checkTrayTooltipUpdate(now, diffMs) {
            const state = App.state;
            if (!state.nextPrayer) return;
            const currentMin = now.getMinutes();
            if (state.lastTooltipMinute !== currentMin) {
                state.lastTooltipMinute = currentMin;
                const hours = Math.floor(diffMs / (3600 * 1000));
                const mins = Math.floor((diffMs % (3600 * 1000)) / (60 * 1000));
                const timeStr = hours > 0 ? `${hours}س ${mins}د` : `${mins} دقيقة`;
                const text = `مواقيت الصلاة | ${state.nextPrayer.nameAr} بعد ${timeStr} (${state.currentCity})`;
                if (App.IPC) App.IPC.updateTrayTooltip(text).catch(console.error);
            }
        },

        updateCompactModeUI(diffMs) {
            const state = App.state;
            const elements = App.elements;
            if (!elements.compactWidget || !state.nextPrayer) return;

            if (elements.compactPrayerName) elements.compactPrayerName.textContent = state.nextPrayer.nameAr;
            if (elements.compactPrayerTime) elements.compactPrayerTime.textContent = state.nextPrayer.timeStr;
            if (elements.compactCity) elements.compactCity.textContent = state.currentCity;

            if (diffMs > 0 && elements.compactCountdown) {
                const totalSeconds = Math.floor(diffMs / 1000);
                const hours = Math.floor(totalSeconds / 3600);
                const minutes = Math.floor((totalSeconds % 3600) / 60);
                const seconds = totalSeconds % 60;
                elements.compactCountdown.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
            }
        }
    };

})(window.PrayerApp);
