(function() {
    'use strict';

    window.AppSettings = {
        init() {
            const self = this;
            $('#btnSaveSettings').on('click', () => self.saveSettings());
            $('#btnExportCsv').on('click', () => self.exportCsv());
        },

        async loadSettings() {
            const settings = await AppAPI.invoke('get_settings', {});
            if (settings) {
                $('#settingInitialBalance').val(settings.initialBalance || 10000);
                $('#settingCurrency').val(settings.currency || 'USD');
                $('#settingTheme').val(settings.theme || 'dark');
                $('#settingRisk').val(settings.riskPerTrade || 1);
                $('#settingMaxDrawdown').val(settings.maxDrawdown || 10);
            }
        },

        async saveSettings() {
            const settings = {
                initialBalance: parseFloat($('#settingInitialBalance').val()) || 10000,
                currency: $('#settingCurrency').val(),
                theme: $('#settingTheme').val(),
                riskPerTrade: parseFloat($('#settingRisk').val()) || 1,
                maxDrawdown: parseFloat($('#settingMaxDrawdown').val()) || 10
            };

            const res = await AppAPI.invoke('save_settings', settings);
            if (res && res.success !== false) {
                if (window.App && window.App.showToast) window.App.showToast('Settings saved successfully', 'success');
            } else {
                if (window.App && window.App.showToast) window.App.showToast('Failed to save settings', 'error');
            }
        },

        async exportCsv() {
            const res = await AppAPI.invoke('export_data', {});
            if (res && res.success) {
                if (window.App && window.App.showToast) window.App.showToast(`Data exported to: ${res.path}`, 'success');
                
                // Fallback browser download if supported
                if (res.csv) {
                    const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `trades_export_${new Date().toISOString().slice(0, 10)}.csv`;
                    link.click();
                }
            } else {
                if (window.App && window.App.showToast) window.App.showToast('Failed to export data', 'error');
            }
        }
    };
})();
