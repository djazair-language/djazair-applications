// =============================================================================
// Project:      Djazair Prayer Times Desktop Application
// File:         ui/app.js
// Description:  Interactive Frontend Controller, Tabs, Athkar, Tasbeeh,
//               Qibla Direction, Ramadan Mode, and Audio Adhan Engine.
// =============================================================================

(function() {
    'use strict';

    // Application State
    let state = {
        countries: [],
        currentCountry: 'DZ',
        currentCity: 'Algiers',
        settings: {
            country: 'DZ',
            city: 'Algiers',
            method: 13,
            adhanEnabled: true,
            adhanVolume: 80,
            notificationEnabled: true,
            startWithWindows: false,
            minimizeToTray: true,
            ramadanMode: false,
            selectedVoice: 'chime',
            customAudioPath: '',
            tasbeehCount: 0
        },
        prayerData: null,
        athkarData: null,
        currentAthkarTab: 'morning',
        athkarProgress: {},
        tasbeehCurrent: 0,
        tasbeehTotal: 0,
        tasbeehTarget: 33,
        nextPrayer: null,
        timerId: null,
        isPlayingAdhan: false,
        audioContext: null
    };

    const PRAYER_NAMES = {
        'Fajr': 'الفجر',
        'Sunrise': 'الشروق',
        'Dhuhr': 'الظهر',
        'Asr': 'العصر',
        'Maghrib': 'المغرب',
        'Isha': 'العشاء'
    };

    const PRAYER_KEYS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    const DAILY_REMINDERS = [
        { text: '«إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا»', source: 'سورة النساء: 103' },
        { text: '«سُئِلَ النَّبِيُّ ﷺ: أَيُّ الْعَمَلِ أَحَبُّ إِلَى اللَّهِ؟ قَالَ: الصَّلَاةُ عَلَى وَقْتِهَا»', source: 'صحيح البخاري' },
        { text: '«وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِّنَ اللَّيْلِ ۚ إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ»', source: 'سورة هود: 114' },
        { text: '«مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ (الفجر والعصر)»', source: 'متفق عليه' },
        { text: '«رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ»', source: 'سورة إبراهيم: 40' },
        { text: '«وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ»', source: 'سورة البقرة: 45' },
        { text: '«وَأَقِمِ الصَّلَاةَ لِذِكْرِي»', source: 'سورة طه: 14' },
        { text: '«مَنْ غَدَا إِلَى الْمَسْجِدِ أَوْ رَاحَ أَعَدَّ اللَّهُ لَهُ فِي الْجَنَّةِ نُزُلًا كُلَّمَا غَدَا أَوْ رَاحَ»', source: 'متفق عليه' }
    ];

    function updateDailyReminder() {
        if (!elements.dailyReminderText || !elements.dailyReminderSource) return;
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 0);
        const dayOfYear = Math.floor((now - start) / (1000 * 60 * 60 * 24));
        const reminder = DAILY_REMINDERS[dayOfYear % DAILY_REMINDERS.length];
        elements.dailyReminderText.textContent = reminder.text;
        elements.dailyReminderSource.textContent = reminder.source;
    }

    // DOM Elements
    const elements = {
        // Header
        hijriDate: document.getElementById('hijriDate'),
        gregDate: document.getElementById('gregDate'),
        statusBadge: document.getElementById('statusBadge'),
        statusText: document.getElementById('statusText'),
        btnMinimizeTray: document.getElementById('btnMinimizeTray'),
        btnRefresh: document.getElementById('btnRefresh'),
        btnTestAdhan: document.getElementById('btnTestAdhan'),
        btnSettings: document.getElementById('btnSettings'),

        // Tabs
        navTabs: document.querySelectorAll('.nav-tab'),
        tabContents: document.querySelectorAll('.tab-content'),

        // Tab 1: Prayers
        countrySelect: document.getElementById('countrySelect'),
        citySelect: document.getElementById('citySelect'),
        btnAutoLoc: document.getElementById('btnAutoLoc'),
        nextPrayerName: document.getElementById('nextPrayerName'),
        countdown: document.getElementById('countdown'),
        nextPrayerTime: document.getElementById('nextPrayerTime'),
        dailyReminderText: document.getElementById('dailyReminderText'),
        dailyReminderSource: document.getElementById('dailyReminderSource'),
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
        customAudioGroup: document.getElementById('customAudioGroup'),
        btnPickAudio: document.getElementById('btnPickAudio'),
        lblCustomAudioPath: document.getElementById('lblCustomAudioPath'),
        chkAdhan: document.getElementById('chkAdhan'),
        rngVolume: document.getElementById('rngVolume'),
        lblVolume: document.getElementById('lblVolume'),
        chkNotifications: document.getElementById('chkNotifications'),
        chkStartup: document.getElementById('chkStartup'),
        chkMinimizeTray: document.getElementById('chkMinimizeTray'),

        // Audio
        adhanAudio: document.getElementById('adhanAudio')
    };

    // ── Initialization ─────────────────────────────────────────────────────────

    async function init() {
        setupEventListeners();
        startTimer();

        try {
            if (window.djazair && window.djazair.invoke) {
                const data = await window.djazair.invoke('getInitialData');
                handleInitialData(data);
            } else {
                console.warn('Djazair IPC bridge not detected, using demo data');
                useDemoData();
            }
        } catch (err) {
            console.error('Error fetching initial data from backend:', err);
            useDemoData();
        }
    }

    function handleInitialData(data) {
        if (!data) return;
        state.countries = data.countries || [];
        state.settings = data.settings || state.settings;
        state.athkarData = data.athkar || null;
        state.currentCountry = state.settings.country;
        state.currentCity = state.settings.city;
        state.tasbeehTotal = state.settings.tasbeehCount || 0;

        populateCountryDropdown();
        populateCityDropdown(state.currentCountry);

        elements.countrySelect.value = state.currentCountry;
        elements.citySelect.value = state.currentCity;

        if (data.prayerData) {
            updatePrayerUI(data.prayerData);
        }

        initAthkarUI();
        initTasbeehUI();
    }

    function useDemoData() {
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
        populateCountryDropdown();
        populateCityDropdown('DZ');

        updatePrayerUI({
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

    // ── Dropdowns Population ───────────────────────────────────────────────────

    function populateCountryDropdown() {
        elements.countrySelect.innerHTML = '';
        state.countries.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c.code;
            opt.textContent = `${c.ar} (${c.name})`;
            elements.countrySelect.appendChild(opt);
        });
    }

    function populateCityDropdown(countryCode) {
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
    }

    // ── Update Prayer UI & Qibla ───────────────────────────────────────────────

    function updatePrayerUI(data) {
        if (!data || !data.timings) return;
        state.prayerData = data;

        if (data.hijri && data.hijri.formatted) {
            elements.hijriDate.textContent = data.hijri.formatted;
        }
        if (data.gregorian && data.gregorian.formatted) {
            elements.gregDate.textContent = data.gregorian.formatted;
        }

        if (data.source === 'online') {
            elements.statusBadge.className = 'status-badge online';
            elements.statusText.textContent = 'متصل بالإنترنت';
        } else {
            elements.statusBadge.className = 'status-badge offline';
            elements.statusText.textContent = 'حساب فلكي محلي (بدون إنترنت)';
        }

        PRAYER_KEYS.forEach(key => {
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
        updateDailyReminder();

        // Calculation Method Text
        const methodNames = {
            13: 'وزارة الشؤون الدينية والأوقاف (الجزائر)',
            4: 'جامعة أم القرى (مكة المكرمة)',
            3: 'رابطة العالم الإسلامي',
            5: 'الهيئة المصرية العامة للمساحة',
            1: 'جامعة العلوم الإسلامية بكراتشي',
            2: 'الجمعية الإسلامية لأمريكا الشمالية'
        };
        elements.calcMethodText.textContent = methodNames[data.method] || `طريقة رقم ${data.method}`;

        // Update Ramadan View Timings
        if (elements.iftarTime && data.timings.Maghrib) {
            elements.iftarTime.textContent = data.timings.Maghrib;
        }
        if (elements.imsakTime && (data.timings.Imsak || data.timings.Fajr)) {
            elements.imsakTime.textContent = data.timings.Imsak || data.timings.Fajr;
        }

        calculateNextPrayer();
    }

    // ── Live Countdown & Next Prayer Logic ─────────────────────────────────────

    function parseTimeToToday(timeStr) {
        if (!timeStr) return null;
        const [h, m] = timeStr.split(':').map(Number);
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0);
    }

    function calculateNextPrayer() {
        if (!state.prayerData || !state.prayerData.timings) return;

        const now = new Date();
        const timings = state.prayerData.timings;

        let nextKey = null;
        let nextTime = null;
        let minDiff = Infinity;

        for (const key of PRAYER_KEYS) {
            const pTime = parseTimeToToday(timings[key]);
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
            const fajrTime = parseTimeToToday(timings['Fajr']);
            if (fajrTime) {
                nextTime = new Date(fajrTime.getTime() + 24 * 60 * 60 * 1000);
                minDiff = nextTime.getTime() - now.getTime();
            }
        }

        state.nextPrayer = {
            key: nextKey,
            nameAr: PRAYER_NAMES[nextKey] || nextKey,
            timeStr: timings[nextKey],
            targetTime: nextTime
        };

        elements.nextPrayerName.textContent = state.nextPrayer.nameAr;
        elements.nextPrayerTime.textContent = state.nextPrayer.timeStr;

        PRAYER_KEYS.forEach(key => {
            const card = document.getElementById(`card-${key}`);
            const status = document.getElementById(`status-${key}`);
            if (!card) return;

            card.classList.remove('active', 'passed');

            const pTime = parseTimeToToday(timings[key]);
            if (key === nextKey) {
                card.classList.add('active');
                if (status && key !== 'Sunrise') status.textContent = 'الصلاة القادمة';
            } else if (pTime && pTime.getTime() < now.getTime()) {
                card.classList.add('passed');
                if (status && key !== 'Sunrise') status.textContent = 'مضت';
            } else {
                if (status && key !== 'Sunrise') status.textContent = 'قادمة';
            }
        });

        updateCountdownDisplay(minDiff);
        updateRamadanCountdowns();
    }

    function updateCountdownDisplay(diffMs) {
        if (diffMs <= 0) {
            elements.countdown.textContent = '00:00:00';
            onPrayerTimeReached();
            return;
        }

        const totalSeconds = Math.floor(diffMs / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        elements.countdown.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    function updateRamadanCountdowns() {
        if (!state.prayerData || !state.prayerData.timings) return;
        const now = new Date();

        // Iftar = Maghrib
        const iftarTime = parseTimeToToday(state.prayerData.timings.Maghrib);
        if (iftarTime) {
            let diffIftar = iftarTime.getTime() - now.getTime();
            if (diffIftar < 0) diffIftar += 24 * 3600 * 1000;
            const sec = Math.floor(diffIftar / 1000);
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            elements.iftarCountdown.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }

        // Imsak = Imsak or Fajr
        const imsakTarget = state.prayerData.timings.Imsak || state.prayerData.timings.Fajr;
        const imsakTime = parseTimeToToday(imsakTarget);
        if (imsakTime) {
            let diffImsak = imsakTime.getTime() - now.getTime();
            if (diffImsak < 0) diffImsak += 24 * 3600 * 1000;
            const sec = Math.floor(diffImsak / 1000);
            const h = Math.floor(sec / 3600);
            const m = Math.floor((sec % 3600) / 60);
            const s = sec % 60;
            elements.imsakCountdown.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        }
    }

    function startTimer() {
        if (state.timerId) clearInterval(state.timerId);
        state.timerId = setInterval(() => {
            if (state.nextPrayer && state.nextPrayer.targetTime) {
                const now = new Date();
                const diff = state.nextPrayer.targetTime.getTime() - now.getTime();
                updateCountdownDisplay(diff);
                updateRamadanCountdowns();
            } else {
                calculateNextPrayer();
            }
        }, 1000);
    }

    function onPrayerTimeReached() {
        if (state.nextPrayer) {
            const prayerName = state.nextPrayer.nameAr;
            const timeStr = state.nextPrayer.timeStr;

            if (state.settings.notificationEnabled && window.djazair && window.djazair.invoke) {
                window.djazair.invoke('notifyPrayer', {
                    prayer: prayerName,
                    time: timeStr
                }).catch(console.error);
            }

            if (state.settings.adhanEnabled && state.nextPrayer.key !== 'Sunrise') {
                playAdhan();
            }
        }
        setTimeout(calculateNextPrayer, 2000);
    }

    // ── Audio & Adhan Voices ───────────────────────────────────────────────────

    function playAdhan() {
        if (state.isPlayingAdhan) return;
        state.isPlayingAdhan = true;

        const voice = state.settings.selectedVoice || 'chime';

        // Custom local audio file
        if (voice === 'custom' && state.settings.customAudioPath) {
            elements.adhanAudio.src = state.settings.customAudioPath;
            elements.adhanAudio.volume = state.settings.adhanVolume / 100;
            elements.adhanAudio.play()
                .then(() => {
                    elements.adhanAudio.onended = () => { state.isPlayingAdhan = false; };
                })
                .catch(() => {
                    playSyntheticChime();
                });
            return;
        }

        playSyntheticChime();
    }

    function playSyntheticChime() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            if (!state.audioContext) state.audioContext = new AudioContext();

            const ctx = state.audioContext;
            if (ctx.state === 'suspended') ctx.resume();

            // Hijaz / Bayati Maqam frequencies
            const notes = [293.66, 329.63, 349.23, 440.0, 523.25, 587.33];
            let delay = 0;

            notes.forEach((freq) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

                const vol = (state.settings.adhanVolume / 100) * 0.25;
                gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + delay + 0.1);
                gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 2.5);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + 2.6);

                delay += 0.45;
            });

            setTimeout(() => { state.isPlayingAdhan = false; }, (delay + 3) * 1000);
        } catch (e) {
            console.error('Web Audio error:', e);
            state.isPlayingAdhan = false;
        }
    }

    function playClickTone() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) return;
            if (!state.audioContext) state.audioContext = new AudioContext();
            const ctx = state.audioContext;
            if (ctx.state === 'suspended') ctx.resume();

            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(880, ctx.currentTime);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) {}
    }

    // ── Athkar UI Logic ───────────────────────────────────────────────────────

    function initAthkarUI() {
        if (!state.athkarData) return;
        renderAthkarList(state.currentAthkarTab);
    }

    function renderAthkarList(type) {
        if (!state.athkarData || !state.athkarData[type]) return;
        const list = state.athkarData[type];
        elements.athkarList.innerHTML = '';

        list.forEach(item => {
            const currentCount = state.athkarProgress[item.id] !== undefined ? state.athkarProgress[item.id] : item.repeat;
            const isDone = currentCount === 0;

            const card = document.createElement('div');
            card.className = `athkar-card ${isDone ? 'completed' : ''}`;
            card.id = `athkar-${item.id}`;

            card.innerHTML = `
                <div class="athkar-body">
                    <div class="athkar-title">${item.title}</div>
                    <div class="athkar-text">${item.text}</div>
                    <div class="athkar-virtue">${item.virtue || ''}</div>
                </div>
                <button class="athkar-btn ${isDone ? 'done' : ''}" data-id="${item.id}" data-max="${item.repeat}">
                    <span class="athkar-btn-count">${isDone ? '✓' : currentCount}</span>
                    <span class="athkar-btn-total">${isDone ? 'اكتمل' : 'من ' + item.repeat}</span>
                </button>
            `;

            const btn = card.querySelector('.athkar-btn');
            btn.addEventListener('click', () => {
                let count = state.athkarProgress[item.id] !== undefined ? state.athkarProgress[item.id] : item.repeat;
                if (count > 0) {
                    count--;
                    state.athkarProgress[item.id] = count;
                    playClickTone();

                    if (count === 0) {
                        btn.classList.add('done');
                        card.classList.add('completed');
                        btn.querySelector('.athkar-btn-count').textContent = '✓';
                        btn.querySelector('.athkar-btn-total').textContent = 'اكتمل';
                    } else {
                        btn.querySelector('.athkar-btn-count').textContent = count;
                    }
                }
            });

            elements.athkarList.appendChild(card);
        });
    }

    // ── Digital Tasbeeh Logic ─────────────────────────────────────────────────

    function initTasbeehUI() {
        if (!state.athkarData || !state.athkarData.tasbeehPresets) return;

        elements.tasbeehPreset.innerHTML = '';
        state.athkarData.tasbeehPresets.forEach((p, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = `${p.name} (${p.target})`;
            elements.tasbeehPreset.appendChild(opt);
        });

        elements.tasbeehTotal.textContent = state.tasbeehTotal;
        setTasbeehPreset(0);
    }

    function setTasbeehPreset(index) {
        if (!state.athkarData || !state.athkarData.tasbeehPresets) return;
        const p = state.athkarData.tasbeehPresets[index];
        if (!p) return;

        state.tasbeehCurrent = 0;
        state.tasbeehTarget = p.target;
        elements.currentDhikrText.textContent = p.name;
        elements.tasbeehDisplay.textContent = '0';
        elements.tasbeehTarget.textContent = `الهدف: ${p.target}`;
    }

    function tapTasbeeh() {
        state.tasbeehCurrent++;
        state.tasbeehTotal++;
        playClickTone();

        elements.tasbeehDisplay.textContent = state.tasbeehCurrent;
        elements.tasbeehTotal.textContent = state.tasbeehTotal;

        if (state.tasbeehCurrent >= state.tasbeehTarget) {
            state.tasbeehCurrent = 0;
            if (window.djazair && window.djazair.invoke) {
                window.djazair.invoke('notifyMessage', {
                    title: 'السبحة الإلكترونية',
                    message: `تم بحمد الله إكمال الهدف (${state.tasbeehTarget} مرة)!`,
                    sub: elements.currentDhikrText.textContent
                }).catch(console.error);
            }
        }

        // Persist count
        if (window.djazair && window.djazair.invoke) {
            window.djazair.invoke('saveTasbeeh', { count: state.tasbeehTotal }).catch(console.error);
        }
    }

    // ── Event Listeners ───────────────────────────────────────────────────────

    function setupEventListeners() {
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
                state.currentAthkarTab = sub.getAttribute('data-type');
                renderAthkarList(state.currentAthkarTab);
            });
        });

        // Reset Athkar
        elements.btnResetAthkar.addEventListener('click', () => {
            state.athkarProgress = {};
            renderAthkarList(state.currentAthkarTab);
        });

        // Tasbeeh Preset Change
        elements.tasbeehPreset.addEventListener('change', (e) => {
            setTasbeehPreset(Number(e.target.value));
        });

        // Tap Tasbeeh
        elements.btnTapTasbeeh.addEventListener('click', tapTasbeeh);

        // Reset Tasbeeh
        elements.btnResetTasbeeh.addEventListener('click', () => {
            state.tasbeehCurrent = 0;
            elements.tasbeehDisplay.textContent = '0';
        });

        // Minimize to System Tray
        elements.btnMinimizeTray.addEventListener('click', () => {
            if (window.djazair && window.djazair.invoke) {
                window.djazair.invoke('minimizeToTray').catch(console.error);
            }
        });

        // Auto-Location via IP
        elements.btnAutoLoc.addEventListener('click', async () => {
            elements.btnAutoLoc.style.opacity = '0.5';
            if (window.djazair && window.djazair.invoke) {
                try {
                    const res = await window.djazair.invoke('autoDetectLocation');
                    if (res && res.success && res.detected) {
                        state.currentCountry = res.detected.country;
                        state.currentCity = res.detected.city;

                        populateCityDropdown(state.currentCountry);
                        elements.countrySelect.value = state.currentCountry;
                        elements.citySelect.value = state.currentCity;

                        if (res.prayerData) updatePrayerUI(res.prayerData);
                    }
                } catch (e) {
                    console.error('Auto loc error:', e);
                }
            }
            elements.btnAutoLoc.style.opacity = '1';
        });

        // Country Select Changed
        elements.countrySelect.addEventListener('change', async (e) => {
            const newCountry = e.target.value;
            state.currentCountry = newCountry;
            populateCityDropdown(newCountry);

            const firstCity = elements.citySelect.value;
            state.currentCity = firstCity;
            await changeLocation(newCountry, firstCity);
        });

        // City Select Changed
        elements.citySelect.addEventListener('change', async (e) => {
            const newCity = e.target.value;
            state.currentCity = newCity;
            await changeLocation(state.currentCountry, newCity);
        });

        // Refresh Button
        elements.btnRefresh.addEventListener('click', async () => {
            elements.btnRefresh.style.transform = 'rotate(180deg)';
            setTimeout(() => { elements.btnRefresh.style.transform = ''; }, 400);

            if (window.djazair && window.djazair.invoke) {
                try {
                    const data = await window.djazair.invoke('refreshPrayerTimes', {
                        country: state.currentCountry,
                        city: state.currentCity,
                        method: state.settings.method
                    });
                    updatePrayerUI(data);
                } catch (err) {
                    console.error('Refresh error:', err);
                }
            }
        });

        // Test Adhan Button
        elements.btnTestAdhan.addEventListener('click', () => {
            playAdhan();
            if (window.djazair && window.djazair.invoke) {
                window.djazair.invoke('testNotification').catch(console.error);
            }
        });

        // Settings Modal Open/Close
        elements.btnSettings.addEventListener('click', () => {
            elements.methodSelect.value = String(state.settings.method || 13);
            elements.voiceSelect.value = state.settings.selectedVoice || 'chime';
            elements.chkAdhan.checked = state.settings.adhanEnabled;
            elements.rngVolume.value = state.settings.adhanVolume;
            elements.lblVolume.textContent = `${state.settings.adhanVolume}%`;
            elements.chkNotifications.checked = state.settings.notificationEnabled;
            elements.chkStartup.checked = state.settings.startWithWindows || false;
            elements.chkMinimizeTray.checked = state.settings.minimizeToTray !== false;

            if (elements.voiceSelect.value === 'custom') {
                elements.customAudioGroup.style.display = 'block';
                elements.lblCustomAudioPath.textContent = state.settings.customAudioPath || '';
            } else {
                elements.customAudioGroup.style.display = 'none';
            }

            elements.settingsModal.classList.remove('hidden');
        });

        elements.voiceSelect.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                elements.customAudioGroup.style.display = 'block';
            } else {
                elements.customAudioGroup.style.display = 'none';
            }
        });

        elements.btnPickAudio.addEventListener('click', async () => {
            if (window.djazair && window.djazair.invoke) {
                const res = await window.djazair.invoke('selectCustomAudio');
                if (res && res.success && res.path) {
                    state.settings.customAudioPath = res.path;
                    elements.lblCustomAudioPath.textContent = res.path;
                }
            }
        });

        elements.btnCloseSettings.addEventListener('click', () => {
            elements.settingsModal.classList.add('hidden');
        });

        elements.btnCancelSettings.addEventListener('click', () => {
            elements.settingsModal.classList.add('hidden');
        });

        elements.rngVolume.addEventListener('input', (e) => {
            elements.lblVolume.textContent = `${e.target.value}%`;
        });

        // Save Settings
        elements.btnSaveSettings.addEventListener('click', async () => {
            state.settings.method = parseInt(elements.methodSelect.value) || 13;
            state.settings.selectedVoice = elements.voiceSelect.value;
            state.settings.adhanEnabled = elements.chkAdhan.checked;
            state.settings.adhanVolume = parseInt(elements.rngVolume.value) || 80;
            state.settings.notificationEnabled = elements.chkNotifications.checked;
            state.settings.startWithWindows = elements.chkStartup.checked;
            state.settings.minimizeToTray = elements.chkMinimizeTray.checked;

            elements.settingsModal.classList.add('hidden');

            if (window.djazair && window.djazair.invoke) {
                try {
                    const res = await window.djazair.invoke('saveSettings', state.settings);
                    if (res && res.prayerData) {
                        updatePrayerUI(res.prayerData);
                    }
                } catch (err) {
                    console.error('Save settings error:', err);
                }
            }
        });
    }

    async function changeLocation(country, city) {
        state.settings.country = country;
        state.settings.city = city;

        if (window.djazair && window.djazair.invoke) {
            try {
                const data = await window.djazair.invoke('changeLocation', {
                    country: country,
                    city: city,
                    method: state.settings.method
                });
                updatePrayerUI(data);
            } catch (err) {
                console.error('Location change error:', err);
            }
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
