(function() {
    'use strict';

    window.App = {
        currentPage: 'dashboard',

        async init() {
            AppMedia.init();
            AppWizard.init();
            AppTrades.init();
            AppCalendar.init();
            AppSettings.init();

            this.bindNavigation();
            this.bindModal();
            this.bindQuickCloseModal();
            this.setCurrentDate();

            await this.loadDashboard();
        },

        // ==================== Navigation ====================

        bindNavigation() {
            const self = this;
            $('.nav-item').on('click', function(e) {
                e.preventDefault();
                const page = $(this).data('page');
                self.navigateTo(page);
            });
        },

        navigateTo(page) {
            this.currentPage = page;
            $('.nav-item').removeClass('active text-white bg-accent/20').addClass('text-surface-400');
            $(`.nav-item[data-page="${page}"]`).addClass('active text-white bg-accent/20').removeClass('text-surface-400');

            $('.page').removeClass('active').addClass('hidden');
            $(`#page-${page}`).addClass('active').removeClass('hidden');

            const titles = {
                dashboard: 'Dashboard',
                trades: 'Trade Log',
                analytics: 'Performance Analytics',
                calendar: 'Trading Calendar',
                settings: 'Settings'
            };
            $('#pageTitle').text(titles[page] || 'Dashboard');

            if (page === 'dashboard') this.loadDashboard();
            else if (page === 'trades') AppTrades.loadTrades();
            else if (page === 'analytics') this.loadAnalytics();
            else if (page === 'calendar') AppCalendar.renderCalendar();
            else if (page === 'settings') AppSettings.loadSettings();
        },

        setCurrentDate() {
            const now = new Date();
            const options = { weekday: 'short', month: 'short', day: 'numeric' };
            $('#currentDate').text(now.toLocaleDateString('en-US', options));
        },

        // ==================== Dashboard ====================

        async loadDashboard() {
            const stats = await AppAPI.invoke('get_journal_stats', {});
            if (stats) {
                $('#statNetPnl').text((stats.netPnl >= 0 ? '+' : '') + '$' + stats.netPnl.toFixed(2))
                    .className = `text-2xl font-bold font-mono ${stats.netPnl >= 0 ? 'text-profit' : 'text-loss'}`;
                $('#statWinRate').text(stats.winRate.toFixed(1) + '%');
                $('#statWins').text(stats.winningTrades);
                $('#statLosses').text(stats.losingTrades);
                $('#statTotalTrades').text(stats.totalTrades);

                const pf = stats.losingTrades > 0 ? (stats.winningTrades / stats.losingTrades).toFixed(2) : 'N/A';
                $('#statProfitFactor').text(pf);
            }

            const equityData = await AppAPI.invoke('get_daily_pnl', {});
            if (equityData) {
                let acc = 10000;
                const equityCurve = equityData.map(d => {
                    acc += d.pnl;
                    return { date: d.date, equity: acc };
                });
                AppCharts.renderEquityChart(equityCurve);
                AppCharts.renderDailyPnlChart(equityData);
            }

            const bySymbol = await AppAPI.invoke('get_performance_by_symbol', {});
            if (bySymbol) AppCharts.renderSymbolChart(bySymbol);

            const recent = await AppAPI.invoke('get_trades', {});
            if (recent) this.renderRecentTrades(recent.slice(0, 5));
        },

        renderRecentTrades(trades) {
            const $container = $('#recentTrades').empty();
            if (!trades.length) {
                $container.append('<p class="text-surface-500 text-xs text-center py-4">No recent trades</p>');
                return;
            }

            trades.forEach(t => {
                const pnl = t.net_pnl || 0;
                const isProfit = pnl >= 0;
                const color = isProfit ? 'text-profit' : 'text-loss';
                const bg = isProfit ? 'bg-profit/10' : 'bg-loss/10';

                $container.append(`
                    <div class="flex items-center justify-between p-2.5 rounded-lg bg-surface-800/40 hover:bg-surface-800 transition">
                        <div class="flex items-center gap-3">
                            <div class="w-8 h-8 rounded-lg ${bg} flex items-center justify-center font-bold text-xs ${color}">
                                ${t.direction === 'buy' ? 'L' : 'S'}
                            </div>
                            <div>
                                <span class="text-sm font-semibold text-white block">${t.symbol}</span>
                                <span class="text-[10px] text-surface-400">${t.timeframe || 'H1'} • ${t.status}</span>
                            </div>
                        </div>
                        <div class="text-right">
                            <span class="text-sm font-mono font-bold ${color} block">${isProfit ? '+' : ''}$${pnl.toFixed(2)}</span>
                            <span class="text-[10px] font-mono text-surface-400">${t.pnl_pips || 0} pips</span>
                        </div>
                    </div>
                `);
            });
        },

        // ==================== Analytics ====================

        async loadAnalytics() {
            const data = await AppAPI.invoke('get_analytics', {});
            if (data) {
                $('#analyticsAvgWin').text('$' + data.avg_win.toFixed(2));
                $('#analyticsAvgLoss').text('$' + data.avg_loss.toFixed(2));
                $('#analyticsExpectancy').text('$' + data.expectancy.toFixed(2));
                $('#analyticsAvgPips').text(data.avg_pips.toFixed(1));
                $('#analyticsBestTrade').text('$' + data.best_trade.toFixed(2));
                $('#analyticsWorstTrade').text('$' + data.worst_trade.toFixed(2));
                $('#analyticsMaxWins').text(data.max_consecutive_wins);
                $('#analyticsMaxLosses').text(data.max_consecutive_losses);
                AppCharts.renderDirectionChart(data);
            }

            const byDay = await AppAPI.invoke('get_performance_by_day', {});
            if (byDay) AppCharts.renderDayOfWeekChart(byDay);

            const bySession = await AppAPI.invoke('get_performance_by_session', {});
            if (bySession) AppCharts.renderSessionChart(bySession);

            const bySymbol = await AppAPI.invoke('get_performance_by_symbol', {});
            if (bySymbol) AppCharts.renderSymbolPnlChart(bySymbol);
        },

        // ==================== Modals ====================

        bindModal() {
            const self = this;
            $('#btnAddTrade').on('click', () => self.openAddModal());
            $('#btnCloseModal, #btnCancelModal, #modalOverlay').on('click', () => self.closeModal());

            $('#tradeForm').on('submit', function(e) {
                e.preventDefault();
                self.saveTrade();
            });

            $(document).on('keydown', function(e) {
                if (e.key === 'Escape') {
                    self.closeModal();
                    AppMedia.closeLightbox();
                    $('#closeTradeModal').addClass('hidden');
                }
            });
        },

        openAddModal() {
            $('#modalTitle').text('New Trade Wizard');
            $('#tradeForm')[0].reset();
            $('#tradeId').val('');
            $('#tradeLotSize').val('0.01');
            $('#tradeSetupQuality').val('5');
            $('#tradeCommission').val('0');
            $('#tradeSwap').val('0');

            AppMedia.clearGallery();
            AppWizard.reset();

            const now = new Date();
            const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            $('#tradeEntryTime').val(local);

            $('#tradeModal').removeClass('hidden');
        },

        async openEditModal(trade) {
            $('#modalTitle').text('Edit Trade');
            $('#tradeId').val(trade.id);
            $('#tradeSymbol').val(trade.symbol);
            $('#tradeDirection').val(trade.direction);
            $('#tradeLotSize').val(trade.lot_size);
            $('#tradeStatus').val(trade.status);
            $('#tradeEntry').val(trade.entry_price);
            $('#tradeExit').val(trade.exit_price || '');
            $('#tradeSL').val(trade.stop_loss || '');
            $('#tradeTP').val(trade.take_profit || '');
            $('#tradePnl').val(trade.pnl || '');
            $('#tradePips').val(trade.pnl_pips || '');
            $('#tradeCommission').val(trade.commission || 0);
            $('#tradeSwap').val(trade.swap || 0);

            if (trade.entry_time) {
                const d = new Date(trade.entry_time);
                $('#tradeEntryTime').val(d.toISOString().slice(0, 16));
            }
            if (trade.exit_time) {
                const d = new Date(trade.exit_time);
                $('#tradeExitTime').val(d.toISOString().slice(0, 16));
            }
            $('#tradeTimeframe').val(trade.timeframe || 'H1');
            $('#tradeSession').val(trade.session || '');
            $('#tradeStrategy').val(trade.strategy || '');
            $('#tradeMarketCondition').val(trade.market_condition || '');
            $('#tradeEmotions').val(trade.emotions || '');
            $('#tradeSetupQuality').val(trade.setup_quality || 5);

            let tags = '';
            try { tags = JSON.parse(trade.tags || '[]').join(', '); } catch(e) { tags = trade.tags || ''; }
            $('#tradeTags').val(tags);
            $('#tradeNotes').val(trade.notes || '');

            AppWizard.reset();
            await AppMedia.loadSavedImages(trade.screenshot);

            $('#tradeModal').removeClass('hidden');
        },

        closeModal() {
            $('#tradeModal').addClass('hidden');
        },

        async saveTrade() {
            const symbol = $('#tradeSymbol').val();
            const entryVal = $('#tradeEntry').val();

            if (!symbol) {
                this.showToast('Please select a Symbol', 'error');
                AppWizard.setStep(1);
                return;
            }
            if (!entryVal || isNaN(parseFloat(entryVal))) {
                this.showToast('Please enter an Entry Price in Execution step', 'error');
                AppWizard.setStep(2);
                return;
            }

            const id = $('#tradeId').val();
            const tags = $('#tradeTags').val().split(',').map(t => t.trim()).filter(t => t);
            const trade = {
                symbol: $('#tradeSymbol').val(),
                direction: $('#tradeDirection').val(),
                entry_price: parseFloat($('#tradeEntry').val()) || 0,
                exit_price: parseFloat($('#tradeExit').val()) || null,
                lot_size: parseFloat($('#tradeLotSize').val()) || 0.01,
                stop_loss: parseFloat($('#tradeSL').val()) || null,
                take_profit: parseFloat($('#tradeTP').val()) || null,
                entry_time: $('#tradeEntryTime').val() || new Date().toISOString(),
                exit_time: $('#tradeExitTime').val() || null,
                pnl: parseFloat($('#tradePnl').val()) || 0,
                pnl_pips: parseFloat($('#tradePips').val()) || 0,
                commission: parseFloat($('#tradeCommission').val()) || 0,
                swap: parseFloat($('#tradeSwap').val()) || 0,
                status: $('#tradeStatus').val(),
                timeframe: $('#tradeTimeframe').val(),
                strategy: $('#tradeStrategy').val(),
                session: $('#tradeSession').val(),
                tags: JSON.stringify(tags),
                notes: $('#tradeNotes').val(),
                screenshot: $('#tradeScreenshotBase64').val(),
                emotions: $('#tradeEmotions').val(),
                setup_quality: $('#tradeSetupQuality').val(),
                market_condition: $('#tradeMarketCondition').val(),
                confidence_level: 5
            };

            if (id) {
                trade.id = parseInt(id);
                const res = await AppAPI.invoke('update_trade', trade);
                if (res && res.error) {
                    this.showToast('Error: ' + res.error, 'error');
                    return;
                }
                this.showToast('Trade updated successfully', 'success');
            } else {
                const res = await AppAPI.invoke('add_trade', trade);
                if (res && res.error) {
                    this.showToast('Error: ' + res.error, 'error');
                    return;
                }
                this.showToast('Trade added successfully', 'success');
            }

            this.closeModal();
            if (this.currentPage === 'trades') AppTrades.loadTrades();
            else if (this.currentPage === 'dashboard') this.loadDashboard();
        },

        // ==================== Quick Close Modal ====================

        bindQuickCloseModal() {
            const self = this;
            $('#btnCancelClose').on('click', () => $('#closeTradeModal').addClass('hidden'));
            $('#btnConfirmClose').on('click', async () => {
                const id = $('#closeTradeId').val();
                const exitPrice = parseFloat($('#closeExitPrice').val());
                const exitTime = $('#closeExitTime').val();

                if (!exitPrice || isNaN(exitPrice)) {
                    self.showToast('Please enter a valid Exit Price', 'error');
                    return;
                }

                const trade = AppTrades.allTrades.find(t => t.id === parseInt(id));
                if (!trade) return;

                let pnlPips = 0;
                if (trade.direction === 'buy') {
                    pnlPips = (exitPrice - trade.entry_price) * 10000;
                } else {
                    pnlPips = (trade.entry_price - exitPrice) * 10000;
                }

                trade.exit_price = exitPrice;
                trade.exit_time = exitTime || new Date().toISOString();
                trade.status = 'closed';
                trade.pnl_pips = parseFloat(pnlPips.toFixed(1));
                trade.pnl = parseFloat((pnlPips * trade.lot_size * 0.1).toFixed(2));

                const res = await AppAPI.invoke('update_trade', trade);
                if (res && res.error) {
                    self.showToast('Error closing trade: ' + res.error, 'error');
                    return;
                }

                $('#closeTradeModal').addClass('hidden');
                self.showToast('Trade closed successfully!', 'success');
                if (self.currentPage === 'trades') AppTrades.loadTrades();
                else if (self.currentPage === 'dashboard') self.loadDashboard();
            });
        },

        openQuickCloseModal(trade) {
            $('#closeTradeId').val(trade.id);
            $('#closeSymbolDir').text(`${trade.symbol} (${trade.direction.toUpperCase()})`);
            $('#closeEntryPrice').text(trade.entry_price);
            $('#closeExitPrice').val('');

            const now = new Date();
            const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            $('#closeExitTime').val(local);

            $('#closeTradeModal').removeClass('hidden');
        },

        // ==================== Toast Notifications ====================

        showToast(message, type = 'info') {
            const colors = {
                success: 'bg-profit/90 text-white border-profit',
                error: 'bg-loss/90 text-white border-loss',
                info: 'bg-accent/90 text-white border-accent'
            };

            const $toast = $(`
                <div class="px-4 py-3 rounded-lg border shadow-lg backdrop-blur-md text-xs font-semibold flex items-center gap-2 transform transition-all duration-300 translate-y-2 opacity-0 ${colors[type]}">
                    <span>${message}</span>
                </div>
            `);

            $('#toastContainer').append($toast);
            setTimeout(() => {
                $toast.removeClass('translate-y-2 opacity-0').addClass('translate-y-0 opacity-100');
            }, 10);

            setTimeout(() => {
                $toast.addClass('opacity-0 translate-y-2');
                setTimeout(() => $toast.remove(), 300);
            }, 3000);
        }
    };

    $(document).ready(() => App.init());
})();
