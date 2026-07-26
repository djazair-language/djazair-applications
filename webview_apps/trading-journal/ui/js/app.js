(function() {
    'use strict';

    const dz = window.djazair;

    const App = {
        charts: {},
        currentPage: 'dashboard',
        calendarDate: new Date(),
        allTrades: [],

        async init() {
            this.bindNavigation();
            this.bindModal();
            this.bindFilters();
            this.bindSettings();
            this.bindCalendar();
            this.setCurrentDate();
            await this.loadDashboard();
        },

        // ==================== IPC Bridge Helpers ====================

        async invoke(channel, data) {
            try {
                return await dz.invoke(channel, data || {});
            } catch (e) {
                console.error(`Bridge error [${channel}]:`, e);
                return null;
            }
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
            $('.nav-item').removeClass('active');
            $(`.nav-item[data-page="${page}"]`).addClass('active').removeClass('text-surface-400').addClass('active');
            $('.page').removeClass('active');
            $(`#page-${page}`).addClass('active fade-in');
            const titles = { dashboard: 'Dashboard', trades: 'Trade Log', analytics: 'Analytics', calendar: 'Calendar', settings: 'Settings' };
            $('#pageTitle').text(titles[page] || page);

            if (page === 'dashboard') this.loadDashboard();
            else if (page === 'trades') this.loadTrades();
            else if (page === 'analytics') this.loadAnalytics();
            else if (page === 'calendar') this.renderCalendar();
            else if (page === 'settings') this.loadSettings();
        },

        setCurrentDate() {
            const now = new Date();
            const options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
            $('#currentDate').text(now.toLocaleDateString('en-US', options));
        },

        // ==================== Dashboard ====================

        async loadDashboard() {
            const stats = await this.invoke('get_journal_stats');
            if (stats) this.updateDashboardStats(stats);

            const equity = await this.invoke('get_equity_curve', {});
            if (equity) this.renderEquityChart(equity);

            const daily = await this.invoke('get_daily_pnl', {});
            if (daily) this.renderDailyPnlChart(daily);

            const symbols = await this.invoke('get_performance_by_symbol', {});
            if (symbols) this.renderSymbolChart(symbols);

            const trades = await this.invoke('get_trades', { limit: 5 });
            if (trades) this.renderRecentTrades(trades);
        },

        updateDashboardStats(s) {
            const pnl = s.total_pnl;
            $('#statTotalPnl')
                .text('$' + this.formatNumber(pnl))
                .removeClass('text-profit text-loss')
                .addClass(pnl >= 0 ? 'text-profit' : 'text-loss');
            $('#statTotalPnl').closest('.stat-card')
                .removeClass('glow-profit glow-loss')
                .addClass(pnl >= 0 ? 'glow-profit' : 'glow-loss');
            $('#statWinRate').text(s.win_rate + '%');
            $('#statWins').text(s.winning_trades);
            $('#statLosses').text(s.losing_trades);
            $('#statProfitFactor').text(s.profit_factor.toFixed(2));
            $('#statEquity').text('$' + this.formatNumber(s.equity));
            $('#statTotalPnl').parent().find('p:last').text(`${s.closed_trades} trades closed`);
        },

        renderRecentTrades(trades) {
            const $c = $('#recentTrades').empty();
            if (!trades.length) {
                $c.html('<p class="text-surface-500 text-xs text-center py-4">No recent trades</p>');
                return;
            }
            trades.forEach(t => {
                const pnl = t.net_pnl || 0;
                const isProfit = pnl >= 0;
                const dir = t.direction === 'buy' ? 'LONG' : 'SHORT';
                const dirClass = t.direction === 'buy' ? 'text-profit' : 'text-loss';
                const date = t.entry_time ? new Date(t.entry_time).toLocaleDateString() : '-';
                $c.append(`
                    <div class="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-800/30 transition">
                        <div class="flex items-center gap-3">
                            <span class="text-xs font-semibold text-white">${t.symbol}</span>
                            <span class="badge ${dirClass} bg-surface-800">${dir}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-xs font-mono font-semibold ${isProfit ? 'text-profit' : 'text-loss'}">$${pnl.toFixed(2)}</span>
                            <span class="text-[10px] text-surface-500 block">${date}</span>
                        </div>
                    </div>
                `);
            });
        },

        // ==================== Charts ====================

        getChartDefaults() {
            return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(15,23,42,0.95)',
                        titleColor: '#e2e8f0',
                        bodyColor: '#94a3b8',
                        borderColor: 'rgba(51,65,85,0.5)',
                        borderWidth: 1,
                        padding: 10,
                        cornerRadius: 8,
                        titleFont: { family: 'Inter', size: 11, weight: '600' },
                        bodyFont: { family: 'JetBrains Mono', size: 10 }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(51,65,85,0.2)', drawBorder: false },
                        ticks: { color: '#64748b', font: { family: 'Inter', size: 10 } }
                    },
                    y: {
                        grid: { color: 'rgba(51,65,85,0.2)', drawBorder: false },
                        ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 } }
                    }
                }
            };
        },

        destroyChart(id) {
            if (this.charts[id]) {
                this.charts[id].destroy();
                delete this.charts[id];
            }
        },

        renderEquityChart(data) {
            this.destroyChart('equity');
            const ctx = document.getElementById('equityChart');
            if (!ctx) return;
            const labels = data.map(d => d.date === 'Start' ? 'Start' : d.date.split(' ')[0]);
            const values = data.map(d => d.equity);
            const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 220);
            gradient.addColorStop(0, 'rgba(59,130,246,0.2)');
            gradient.addColorStop(1, 'rgba(59,130,246,0)');

            this.charts.equity = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Equity',
                        data: values,
                        borderColor: '#3b82f6',
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.4,
                        borderWidth: 2,
                        pointRadius: 0,
                        pointHoverRadius: 5,
                        pointHoverBackgroundColor: '#3b82f6',
                        pointHoverBorderColor: '#fff',
                        pointHoverBorderWidth: 2
                    }]
                },
                options: {
                    ...this.getChartDefaults(),
                    interaction: { intersect: false, mode: 'index' },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 10 } },
                        y: { grid: { color: 'rgba(51,65,85,0.15)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: v => '$' + v.toLocaleString() } }
                    }
                }
            });
        },

        renderDailyPnlChart(data) {
            this.destroyChart('dailyPnl');
            const ctx = document.getElementById('dailyPnlChart');
            if (!ctx) return;
            const labels = data.map(d => d.date);
            const values = data.map(d => d.pnl);
            const colors = values.map(v => v >= 0 ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.8)');

            this.charts.dailyPnl = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Daily P&L',
                        data: values,
                        backgroundColor: colors,
                        borderRadius: 4,
                        borderSkipped: false,
                        barThickness: 12
                    }]
                },
                options: {
                    ...this.getChartDefaults(),
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9 }, maxTicksLimit: 8 } },
                        y: { grid: { color: 'rgba(51,65,85,0.15)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: v => '$' + v } }
                    }
                }
            });
        },

        renderSymbolChart(data) {
            this.destroyChart('symbol');
            const ctx = document.getElementById('symbolChart');
            if (!ctx) return;
            const labels = data.map(d => d.symbol);
            const values = data.map(d => d.total_pnl);
            const colors = values.map(v => v >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)');

            this.charts.symbol = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'P&L by Symbol',
                        data: values,
                        backgroundColor: colors,
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    ...this.getChartDefaults(),
                    indexAxis: 'y',
                    scales: {
                        x: { grid: { color: 'rgba(51,65,85,0.15)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: v => '$' + v } },
                        y: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { size: 11, weight: '500' } } }
                    }
                }
            });
        },

        renderDirectionChart(analytics) {
            this.destroyChart('direction');
            const ctx = document.getElementById('directionChart');
            if (!ctx) return;
            this.charts.direction = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Long Wins', 'Long Losses', 'Short Wins', 'Short Losses'],
                    datasets: [{
                        data: [
                            Math.round(analytics.long_trades * analytics.long_win_rate / 100),
                            Math.round(analytics.long_trades * (100 - analytics.long_win_rate) / 100),
                            Math.round(analytics.short_trades * analytics.short_win_rate / 100),
                            Math.round(analytics.short_trades * (100 - analytics.short_win_rate) / 100)
                        ],
                        backgroundColor: ['#22c55e', '#16a34a', '#3b82f6', '#2563eb'],
                        borderWidth: 0,
                        hoverOffset: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: '65%',
                    plugins: {
                        legend: { position: 'bottom', labels: { color: '#94a3b8', font: { size: 10 }, padding: 12, usePointStyle: true, pointStyleWidth: 8 } },
                        tooltip: { backgroundColor: 'rgba(15,23,42,0.95)', titleColor: '#e2e8f0', bodyColor: '#94a3b8', borderColor: 'rgba(51,65,85,0.5)', borderWidth: 1, padding: 10, cornerRadius: 8 }
                    }
                }
            });
        },

        renderDayOfWeekChart(data) {
            this.destroyChart('dayOfWeek');
            const ctx = document.getElementById('dayOfWeekChart');
            if (!ctx) return;
            const labels = data.map(d => d.day);
            const pnlValues = data.map(d => d.total_pnl);
            const wrValues = data.map(d => d.win_rate);

            this.charts.dayOfWeek = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'P&L',
                            data: pnlValues,
                            backgroundColor: pnlValues.map(v => v >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'),
                            borderRadius: 4,
                            borderSkipped: false,
                            yAxisID: 'y'
                        },
                        {
                            label: 'Win Rate %',
                            data: wrValues,
                            type: 'line',
                            borderColor: '#f59e0b',
                            backgroundColor: 'transparent',
                            tension: 0.4,
                            borderWidth: 2,
                            pointRadius: 4,
                            pointBackgroundColor: '#f59e0b',
                            yAxisID: 'y1'
                        }
                    ]
                },
                options: {
                    ...this.getChartDefaults(),
                    plugins: {
                        ...this.getChartDefaults().plugins,
                        legend: { display: true, position: 'top', labels: { color: '#94a3b8', font: { size: 10 }, usePointStyle: true, pointStyleWidth: 8 } }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
                        y: { position: 'left', grid: { color: 'rgba(51,65,85,0.15)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: v => '$' + v } },
                        y1: { position: 'right', grid: { display: false }, ticks: { color: '#f59e0b', font: { family: 'JetBrains Mono', size: 10 }, callback: v => v + '%' }, min: 0, max: 100 }
                    }
                }
            });
        },

        renderSessionChart(data) {
            this.destroyChart('session');
            const ctx = document.getElementById('sessionChart');
            if (!ctx) return;
            if (!data.length) {
                ctx.parentElement.innerHTML = '<p class="text-surface-500 text-xs text-center py-8">No session data</p>';
                return;
            }
            const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
            this.charts.session = new Chart(ctx, {
                type: 'radar',
                data: {
                    labels: data.map(d => d.session),
                    datasets: [{
                        label: 'Win Rate',
                        data: data.map(d => d.win_rate),
                        backgroundColor: 'rgba(59,130,246,0.15)',
                        borderColor: '#3b82f6',
                        borderWidth: 2,
                        pointBackgroundColor: '#3b82f6',
                        pointRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            angleLines: { color: 'rgba(51,65,85,0.3)' },
                            grid: { color: 'rgba(51,65,85,0.2)' },
                            pointLabels: { color: '#e2e8f0', font: { size: 11 } },
                            ticks: { display: false },
                            suggestedMin: 0,
                            suggestedMax: 100
                        }
                    },
                    plugins: { legend: { display: false } }
                }
            });
        },

        renderSymbolPnlChart(data) {
            this.destroyChart('symbolPnl');
            const ctx = document.getElementById('symbolPnlChart');
            if (!ctx) return;
            const sorted = [...data].sort((a, b) => b.total_pnl - a.total_pnl);
            this.charts.symbolPnl = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sorted.map(d => d.symbol),
                    datasets: [{
                        data: sorted.map(d => d.total_pnl),
                        backgroundColor: sorted.map(d => d.total_pnl >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'),
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },
                options: {
                    ...this.getChartDefaults(),
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { size: 10, weight: '500' } } },
                        y: { grid: { color: 'rgba(51,65,85,0.15)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: v => '$' + v } }
                    }
                }
            });
        },

        // ==================== Analytics ====================

        async loadAnalytics() {
            const data = await this.invoke('get_analytics', {});
            if (data) {
                $('#analyticsAvgWin').text('$' + data.avg_win.toFixed(2));
                $('#analyticsAvgLoss').text('$' + data.avg_loss.toFixed(2));
                $('#analyticsExpectancy').text('$' + data.expectancy.toFixed(2));
                $('#analyticsAvgPips').text(data.avg_pips.toFixed(1));
                $('#analyticsBestTrade').text('$' + data.best_trade.toFixed(2));
                $('#analyticsWorstTrade').text('$' + data.worst_trade.toFixed(2));
                $('#analyticsMaxWins').text(data.max_consecutive_wins);
                $('#analyticsMaxLosses').text(data.max_consecutive_losses);
                this.renderDirectionChart(data);
            }

            const byDay = await this.invoke('get_performance_by_day', {});
            if (byDay) this.renderDayOfWeekChart(byDay);

            const bySession = await this.invoke('get_performance_by_session', {});
            if (bySession) this.renderSessionChart(bySession);

            const bySymbol = await this.invoke('get_performance_by_symbol', {});
            if (bySymbol) this.renderSymbolPnlChart(bySymbol);
        },

        // ==================== Trades ====================

        async loadTrades() {
            const filter = this.getFilterValues();
            const trades = await this.invoke('get_trades', filter);
            this.allTrades = trades || [];
            this.renderTradesTable(this.allTrades);
        },

        getFilterValues() {
            return {
                symbol: $('#filterSymbol').val(),
                direction: $('#filterDirection').val(),
                status: $('#filterStatus').val(),
                date_from: $('#filterDateFrom').val(),
                date_to: $('#filterDateTo').val(),
                search: $('#globalSearch').val()
            };
        },

        renderTradesTable(trades) {
            const $body = $('#tradesTableBody').empty();
            const $empty = $('#tradesEmpty');

            if (!trades.length) {
                $body.closest('table').addClass('hidden');
                $empty.removeClass('hidden');
                return;
            }

            $body.closest('table').removeClass('hidden');
            $empty.addClass('hidden');

            trades.forEach(t => {
                const pnl = t.net_pnl || 0;
                const isProfit = pnl >= 0;
                const dirClass = t.direction === 'buy' ? 'text-profit' : 'text-loss';
                const dirBadge = t.direction === 'buy'
                    ? '<span class="badge text-profit bg-profit/10">LONG</span>'
                    : '<span class="badge text-loss bg-loss/10">SHORT</span>';
                const statusBadge = t.status === 'open'
                    ? '<span class="badge text-yellow-400 bg-yellow-500/10">OPEN</span>'
                    : '<span class="badge text-surface-400 bg-surface-700/50">CLOSED</span>';
                const date = t.entry_time ? new Date(t.entry_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
                const symbolDisplay = t.symbol.replace(/(.{3})/, '$1/');

                $body.append(`
                    <tr class="table-row transition border-b border-surface-800/30">
                        <td class="px-4 py-3"><span class="text-sm font-semibold text-white">${symbolDisplay}</span></td>
                        <td class="px-4 py-3">${dirBadge}</td>
                        <td class="px-4 py-3 font-mono text-xs text-surface-300">${t.entry_price || '-'}</td>
                        <td class="px-4 py-3 font-mono text-xs text-surface-300">${t.exit_price || '-'}</td>
                        <td class="px-4 py-3 font-mono text-xs text-surface-400">${t.lot_size}</td>
                        <td class="px-4 py-3">
                            <span class="font-mono text-sm font-semibold ${isProfit ? 'text-profit' : 'text-loss'}">${isProfit ? '+' : ''}$${pnl.toFixed(2)}</span>
                        </td>
                        <td class="px-4 py-3 font-mono text-xs ${t.pnl_pips >= 0 ? 'text-profit' : 'text-loss'}">${t.pnl_pips || 0}</td>
                        <td class="px-4 py-3 text-xs text-surface-400">${t.strategy || '-'}</td>
                        <td class="px-4 py-3 text-[11px] text-surface-500">${date}</td>
                        <td class="px-4 py-3">${statusBadge}</td>
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-1">
                                <button class="btn-edit p-1.5 hover:bg-surface-700/50 rounded transition" data-id="${t.id}" title="Edit">
                                    <svg class="w-3.5 h-3.5 text-surface-400 hover:text-accent-light" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button class="btn-delete p-1.5 hover:bg-surface-700/50 rounded transition" data-id="${t.id}" title="Delete">
                                    <svg class="w-3.5 h-3.5 text-surface-400 hover:text-loss" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `);
            });

            this.bindTradeActions();
        },

        bindTradeActions() {
            const self = this;
            $('.btn-edit').on('click', function() {
                const id = $(this).data('id');
                const trade = self.allTrades.find(t => t.id === id);
                if (trade) self.openEditModal(trade);
            });
            $('.btn-delete').on('click', function() {
                const id = $(this).data('id');
                if (confirm('Delete this trade? This cannot be undone.')) {
                    self.invoke('delete_trade', { id: id }).then(() => {
                        self.showToast('Trade deleted', 'success');
                        self.loadTrades();
                    });
                }
            });
        },

        // ==================== Modal ====================

        bindModal() {
            const self = this;
            $('#btnAddTrade').on('click', () => self.openAddModal());
            $('#btnCloseModal, #btnCancelModal, #modalOverlay').on('click', () => self.closeModal());
            $('#tradeForm').on('submit', function(e) {
                e.preventDefault();
                self.saveTrade();
            });
            $(document).on('keydown', function(e) {
                if (e.key === 'Escape') self.closeModal();
            });
        },

        openAddModal() {
            $('#modalTitle').text('New Trade');
            $('#tradeForm')[0].reset();
            $('#tradeId').val('');
            $('#tradeLotSize').val('0.01');
            $('#tradeSetupQuality').val('5');
            $('#tradeCommission').val('0');
            $('#tradeSwap').val('0');
            const now = new Date();
            const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
            $('#tradeEntryTime').val(local);
            $('#tradeModal').removeClass('hidden');
        },

        openEditModal(trade) {
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
            $('#tradeModal').removeClass('hidden');
        },

        closeModal() {
            $('#tradeModal').addClass('hidden');
        },

        async saveTrade() {
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
                screenshot: '',
                emotions: $('#tradeEmotions').val(),
                setup_quality: $('#tradeSetupQuality').val(),
                market_condition: $('#tradeMarketCondition').val(),
                confidence_level: 5
            };

            if (id) {
                trade.id = parseInt(id);
                await this.invoke('update_trade', trade);
                this.showToast('Trade updated successfully', 'success');
            } else {
                await this.invoke('add_trade', trade);
                this.showToast('Trade added successfully', 'success');
            }

            this.closeModal();
            if (this.currentPage === 'trades') this.loadTrades();
            else if (this.currentPage === 'dashboard') this.loadDashboard();
        },

        // ==================== Filters ====================

        bindFilters() {
            const self = this;
            $('#btnApplyFilter').on('click', () => self.loadTrades());
            $('#btnClearFilter').on('click', function() {
                $('#filterSymbol, #filterDirection, #filterStatus').val('');
                $('#filterDateFrom, #filterDateTo').val('');
                self.loadTrades();
            });
            $('#globalSearch').on('keyup', function() {
                clearTimeout(self._searchTimeout);
                self._searchTimeout = setTimeout(() => self.loadTrades(), 400);
            });
            $('#btnExportCsv').on('click', () => self.exportData());
        },

        async exportData() {
            const result = await this.invoke('export_data', {});
            if (result && result.success) {
                this.showToast(`Exported ${result.count} trades to ${result.path}`, 'success');
            }
        },

        // ==================== Calendar ====================

        bindCalendar() {
            const self = this;
            $('#calPrev').on('click', function() {
                self.calendarDate.setMonth(self.calendarDate.getMonth() - 1);
                self.renderCalendar();
            });
            $('#calNext').on('click', function() {
                self.calendarDate.setMonth(self.calendarDate.getMonth() + 1);
                self.renderCalendar();
            });
        },

        async renderCalendar() {
            const year = this.calendarDate.getFullYear();
            const month = this.calendarDate.getMonth();
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            $('#calMonth').text(`${monthNames[month]} ${year}`);

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const today = new Date();

            const dateFrom = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const dateTo = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
            const dailyPnl = await this.invoke('get_daily_pnl', { date_from: dateFrom, date_to: dateTo });

            const pnlMap = {};
            if (dailyPnl) {
                dailyPnl.forEach(d => { pnlMap[d.date] = d; });
            }

            const $grid = $('#calGrid').empty();

            for (let i = 0; i < firstDay; i++) {
                $grid.append('<div class="h-20 bg-surface-900/20 rounded-lg"></div>');
            }

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
                const dayData = pnlMap[dateStr];
                let pnlHtml = '';
                let borderClass = '';
                let bgClass = '';

                if (dayData) {
                    const pnl = dayData.pnl;
                    const color = pnl >= 0 ? 'text-profit' : 'text-loss';
                    pnlHtml = `<div class="text-[10px] font-mono ${color}">${pnl >= 0 ? '+' : ''}$${pnl.toFixed(0)}</div><div class="text-[9px] text-surface-500">${dayData.trades}T</div>`;
                    borderClass = 'has-trades';
                    bgClass = pnl >= 0 ? 'bg-profit/5' : 'bg-loss/5';
                }

                const todayBorder = isToday ? 'ring-1 ring-accent/50' : '';

                $grid.append(`
                    <div class="calendar-day h-20 p-1.5 rounded-lg ${bgClass} ${borderClass} ${todayBorder} cursor-pointer hover:bg-surface-800/40 transition">
                        <div class="text-[10px] ${isToday ? 'text-accent-light font-bold' : 'text-surface-400'} mb-0.5">${day}</div>
                        ${pnlHtml}
                    </div>
                `);
            }
        },

        // ==================== Settings ====================

        async loadSettings() {
            const settings = await this.invoke('get_settings', {});
            if (settings) {
                if (settings.account_balance) $('#settingBalance').val(settings.account_balance);
                if (settings.risk_per_trade) $('#settingRisk').val(settings.risk_per_trade);
                if (settings.default_lot_size) $('#settingLotSize').val(settings.default_lot_size);
                if (settings.max_daily_loss) $('#settingMaxLoss').val(settings.max_daily_loss);
                if (settings.max_daily_trades) $('#settingMaxTrades').val(settings.max_daily_trades);
                if (settings.currency) $('#settingCurrency').val(settings.currency);
            }
        },

        bindSettings() {
            const self = this;
            $('#btnSaveSettings').on('click', async function() {
                const settings = {
                    account_balance: $('#settingBalance').val(),
                    risk_per_trade: $('#settingRisk').val(),
                    default_lot_size: $('#settingLotSize').val(),
                    max_daily_loss: $('#settingMaxLoss').val(),
                    max_daily_trades: $('#settingMaxTrades').val(),
                    currency: $('#settingCurrency').val()
                };
                await self.invoke('save_settings', settings);
                self.showToast('Settings saved', 'success');
            });
        },

        // ==================== Utilities ====================

        formatNumber(num) {
            if (typeof num !== 'number') return '0.00';
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },

        showToast(message, type) {
            const colors = {
                success: 'border-profit/50 bg-profit/10 text-profit',
                error: 'border-loss/50 bg-loss/10 text-loss',
                info: 'border-accent/50 bg-accent/10 text-accent-light'
            };
            const icons = {
                success: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>',
                error: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>',
                info: '<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>'
            };
            const $toast = $(`
                <div class="flex items-center gap-2 px-4 py-2.5 rounded-lg border ${colors[type] || colors.info} text-sm font-medium shadow-lg animate-[modalIn_0.2s_ease-out]">
                    ${icons[type] || icons.info}
                    <span>${message}</span>
                </div>
            `);
            $('#toastContainer').append($toast);
            setTimeout(() => { $toast.fadeOut(300, function() { $(this).remove(); }); }, 3000);
        }
    };

    $(document).ready(function() {
        App.init();
    });

    window.TradingApp = App;
})();
