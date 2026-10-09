// =============================================================================
// Project:      Djazair Prayer Times Desktop Application
// File:         ui/js/state.js
// Description:  Central Application State & Constants Store.
// =============================================================================

window.PrayerApp = window.PrayerApp || {};

(function(App) {
    'use strict';

    App.state = {
        countries: [],
        currentCountry: 'DZ',
        currentCity: 'Algiers',
        settings: {
            country: 'DZ',
            city: 'Algiers',
            method: 19,
            timeOffset: 0,
            adhanEnabled: true,
            adhanVolume: 80,
            notificationEnabled: true,
            startWithWindows: false,
            startupName: 'Djazair Prayer Times',
            customExeName: '',
            minimizeToTray: true,
            ramadanMode: false,
            selectedVoice: 'chime',
            customAudioPath: '',
            tasbeehCount: 0,
            preAdhanEnabled: true,
            preAdhanMinutes: 10,
            perPrayerVoicesEnabled: false,
            prayerVoices: {
                Fajr: 'algerian',
                Dhuhr: 'chime',
                Asr: 'chime',
                Maghrib: 'chime',
                Isha: 'chime'
            },
            iqamaEnabled: true,
            iqamaOffsets: {
                Fajr: 20,
                Dhuhr: 15,
                Asr: 15,
                Maghrib: 10,
                Isha: 15
            },
            athkarReminderEnabled: true,
            isCompactMode: false,
            dndEnabled: false,
            fridayRemindersEnabled: true,
            fastingRemindersEnabled: true,
            dhikrTickerEnabled: true,
            dhikrTickerInterval: 30
        },
        prayerData: null,
        athkarData: null,
        currentAthkarTab: 'morning',
        athkarProgress: {},
        tasbeehCurrent: 0,
        tasbeehTotal: 0,
        tasbeehTarget: 33,
        nextPrayer: null,
        currentPrayerForIqama: null,
        timerId: null,
        isPlayingAdhan: false,
        audioContext: null,
        preAdhanFired: {},
        iqamaFired: {},
        athkarFired: {},
        specialRemindersFired: {},
        lastDhikrTickerTime: 0,
        lastTooltipMinute: -1
    };

    App.PRAYER_NAMES = {
        'Fajr': 'الفجر',
        'Sunrise': 'الشروق',
        'Dhuhr': 'الظهر',
        'Asr': 'العصر',
        'Maghrib': 'المغرب',
        'Isha': 'العشاء'
    };

    App.PRAYER_KEYS = ['Fajr', 'Sunrise', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];

    App.DAILY_REMINDERS = [
        { text: '«إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَوْقُوتًا»', source: 'سورة النساء: 103' },
        { text: '«سُئِلَ النَّبِيُّ ﷺ: أَيُّ الْعَمَلِ أَحَبُّ إِلَى اللَّهِ؟ قَالَ: الصَّلَاةُ عَلَى وَقْتِهَا»', source: 'صحيح البخاري' },
        { text: '«وَأَقِمِ الصَّلَاةَ طَرَفَيِ النَّهَارِ وَزُلَفًا مِّنَ اللَّيْلِ ۚ إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ»', source: 'سورة هود: 114' },
        { text: '«مَنْ صَلَّى الْبَرْدَيْنِ دَخَلَ الْجَنَّةَ (الفجر والعصر)»', source: 'متفق عليه' },
        { text: '«رَبِّ اجْعَلْنِي مُقِيمَ الصَّلَاةِ وَمِن ذُرِّيَّتِي ۚ رَبَّنَا وَتَقَبَّلْ دُعَاءِ»', source: 'سورة إبراهيم: 40' },
        { text: '«وَاسْتَعِينُوا بِالصَّبْرِ وَالصَّلَاةِ ۚ وَإِنَّهَا لَكَبِيرَةٌ إِلَّا عَلَى الْخَاشِعِينَ»', source: 'سورة البقرة: 45' },
        { text: '«وَأَقِمِ الصَّلَاةَ لِذِكْرِي»', source: 'سورة طه: 14' },
        { text: '«مَنْ غَدَا إِلَى الْمَسْجِدِ أَوْ رَاحَ أَعَدَّ اللَّهُ لَهُ فِي الْجَنَّةِ نُزُلًا كُلَّمَا غَدَا أَوْ رَاحَ»', source: 'متفق عليه' }
    ];

    App.DHIKR_TICKER_ITEMS = [
        "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ",
        "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ الْعَلِيِّ الْعَظِيمِ",
        "اللَّهُمَّ صَلِّ وَسَلِّمْ وَبَارِكْ عَلَى نَبِيِّنَا مُحَمَّدٍ",
        "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ وَأَتُوبُ إِلَيْهِ",
        "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
        "سُبْحَانَ اللَّهِ، وَالْحَمْدُ لِلَّهِ، وَلَا إِلَهَ إِلَّا اللَّهُ، وَاللَّهُ أَكْبَرُ",
        "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ وَشُكْرِكَ وَحُسْنِ عِبَادَتِكَ",
        "يَا مُقَلِّبَ الْقُلُوبِ ثَبِّتْ قَلْبِي عَلَى دِينِكَ",
        "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
        "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
        "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْهُدَى وَالتُّقَى وَالْعَفَافَ وَالْغِنَى",
        "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
        "اللَّهُمَّ إِنَّكَ عَفُوٌّ كَرِيمٌ تُحِبُّ الْعَفْوَ فَاعْفُ عَنِّي",
        "رَبِّ إِنِّي لِمَا أَنْزَلْتَ إِلَيَّ مِنْ خَيْرٍ فَقِيرٌ",
        "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        "سُبْحَانَ اللَّهِ عَدَدَ خَلْقِهِ، وَرِضَا نَفْسِهِ، وَزِنَةَ عَرْشِهِ، وَمِدَادَ كَلِمَاتِهِ",
        "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ وَالْعَجْزِ وَالْكَسَلِ",
        "رَبِّ زِدْنِي عِلْمًا وَارْزُقْنِي فَهْمًا",
        "اللَّهُمَّ يَا مُصَرِّفَ الْقُلُوبِ صَرِّفْ قُلُوبَنَا عَلَى طَاعَتِكَ",
        "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ مِائَةَ مَرَّةٍ"
    ];

})(window.PrayerApp);
