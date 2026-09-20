// =============================================================================
// Project:      Djazair Prayer Times Desktop Application
// File:         ui/js/ipc.js
// Description:  IPC Bridge Client Wrapper for Djazair Backend Communication.
// =============================================================================

window.PrayerApp = window.PrayerApp || {};

(function(App) {
    'use strict';

    const isBridgeAvailable = () => Boolean(window.djazair && window.djazair.invoke);

    App.IPC = {
        isAvailable() {
            return isBridgeAvailable();
        },

        async invoke(channel, args = {}) {
            if (!isBridgeAvailable()) {
                console.warn(`[IPC] Bridge unavailable. Channel '${channel}' ignored.`);
                return null;
            }
            try {
                return await window.djazair.invoke(channel, args);
            } catch (err) {
                console.error(`[IPC] Error invoking '${channel}':`, err);
                throw err;
            }
        },

        on(event, callback) {
            if (window.djazair && window.djazair.on) {
                window.djazair.on(event, callback);
            }
        },

        // Typed IPC API
        getInitialData() {
            return this.invoke('getInitialData');
        },

        changeLocation(country, city, method) {
            return this.invoke('changeLocation', { country, city, method });
        },

        autoDetectLocation() {
            return this.invoke('autoDetectLocation');
        },

        refreshPrayerTimes(country, city, method) {
            return this.invoke('refreshPrayerTimes', { country, city, method });
        },

        saveSettings(settings) {
            return this.invoke('saveSettings', settings);
        },

        selectCustomAudio() {
            return this.invoke('selectCustomAudio');
        },

        saveTasbeeh(count) {
            return this.invoke('saveTasbeeh', { count });
        },

        notifyPrayer(prayer, time) {
            return this.invoke('notifyPrayer', { prayer, time });
        },

        notifyMessage(title, message, sub = '') {
            return this.invoke('notifyMessage', { title, message, sub });
        },

        testNotification() {
            return this.invoke('testNotification');
        },

        minimizeToTray() {
            return this.invoke('minimizeToTray');
        },

        restoreWindow() {
            return this.invoke('restoreWindow');
        },

        winMinimize() {
            return this.invoke('win_minimize');
        },

        winToggleMaximize() {
            return this.invoke('win_toggleMaximize');
        },

        winClose() {
            return this.invoke('win_close');
        }
    };

})(window.PrayerApp);
