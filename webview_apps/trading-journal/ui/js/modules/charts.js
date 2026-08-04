(function() {
    'use strict';

    window.AppCharts = {
        charts: {},

        getChartDefaults() {
            return {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } }
            };
        },

        renderEquityChart(equityData) {
            const ctx = $('#equityChart')[0]?.getContext('2d');
            if (!ctx) return;

            if (this.charts.equity) this.charts.equity.destroy();

            const gradient = ctx.createLinearGradient(0, 0, 0, 200);
            gradient.addColorStop(0, 'rgba(99, 102, 241, 0.3)');
            gradient.addColorStop(1, 'rgba(99, 102, 241, 0)');

            this.charts.equity = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: equityData.map(d => d.date),
                    datasets: [{
                        data: equityData.map(d => d.equity),
                        borderColor: '#6366f1',
                        borderWidth: 2,
                        backgroundColor: gradient,
                        fill: true,
                        tension: 0.3,
                        pointRadius: 0,
                        pointHoverRadius: 5
                    }]
                },
                options: {
                    ...this.getChartDefaults(),
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
                        y: { grid: { color: 'rgba(51,65,85,0.15)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: v => '$' + v } }
                    }
                }
            });
        },

        renderDailyPnlChart(dailyData) {
            const ctx = $('#dailyPnlChart')[0]?.getContext('2d');
            if (!ctx) return;

            if (this.charts.dailyPnl) this.charts.dailyPnl.destroy();

            this.charts.dailyPnl = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: dailyData.map(d => d.date),
                    datasets: [{
                        data: dailyData.map(d => d.pnl),
                        backgroundColor: dailyData.map(d => d.pnl >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'),
                        borderRadius: 4,
                        borderSkipped: false
                    }]
                },
                options: {
                    ...this.getChartDefaults(),
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10 } } },
                        y: { grid: { color: 'rgba(51,65,85,0.15)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: v => '$' + v } }
                    }
                }
            });
        },

        renderSymbolChart(symbolData) {
            const ctx = $('#symbolChart')[0]?.getContext('2d');
            if (!ctx) return;

            if (this.charts.symbol) this.charts.symbol.destroy();

            this.charts.symbol = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: symbolData.map(d => d.symbol),
                    datasets: [{
                        data: symbolData.map(d => d.total_pnl),
                        backgroundColor: symbolData.map(d => d.total_pnl >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'),
                        borderRadius: 4
                    }]
                },
                options: {
                    ...this.getChartDefaults(),
                    indexAxis: 'y',
                    scales: {
                        x: { grid: { color: 'rgba(51,65,85,0.15)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: v => '$' + v } },
                        y: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { size: 10, weight: '500' } } }
                    }
                }
            });
        },

        renderDirectionChart(data) {
            const ctx = $('#directionChart')[0]?.getContext('2d');
            if (!ctx) return;
            if (this.charts.direction) this.charts.direction.destroy();

            this.charts.direction = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: ['Long (Buy)', 'Short (Sell)'],
                    datasets: [{
                        data: [data.long_count || 0, data.short_count || 0],
                        backgroundColor: ['#22c55e', '#ef4444'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { color: '#cbd5e1', font: { size: 11 } } } }
                }
            });
        },

        renderDayOfWeekChart(data) {
            const ctx = $('#dayOfWeekChart')[0]?.getContext('2d');
            if (!ctx) return;
            if (this.charts.dayOfWeek) this.charts.dayOfWeek.destroy();

            this.charts.dayOfWeek = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.day),
                    datasets: [{
                        data: data.map(d => d.total_pnl),
                        backgroundColor: data.map(d => d.total_pnl >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'),
                        borderRadius: 4
                    }]
                },
                options: {
                    ...this.getChartDefaults(),
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { size: 10 } } },
                        y: { grid: { color: 'rgba(51,65,85,0.15)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: v => '$' + v } }
                    }
                }
            });
        },

        renderSessionChart(data) {
            const ctx = $('#sessionChart')[0]?.getContext('2d');
            if (!ctx) return;
            if (this.charts.session) this.charts.session.destroy();

            this.charts.session = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: data.map(d => d.session),
                    datasets: [{
                        data: data.map(d => d.total_pnl),
                        backgroundColor: data.map(d => d.total_pnl >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'),
                        borderRadius: 4
                    }]
                },
                options: {
                    ...this.getChartDefaults(),
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#e2e8f0', font: { size: 10 } } },
                        y: { grid: { color: 'rgba(51,65,85,0.15)' }, ticks: { color: '#64748b', font: { family: 'JetBrains Mono', size: 10 }, callback: v => '$' + v } }
                    }
                }
            });
        },

        renderSymbolPnlChart(data) {
            const ctx = $('#symbolPnlChart')[0]?.getContext('2d');
            if (!ctx) return;
            if (this.charts.symbolPnl) this.charts.symbolPnl.destroy();

            const sorted = [...data].sort((a, b) => b.total_pnl - a.total_pnl);
            this.charts.symbolPnl = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: sorted.map(d => d.symbol),
                    datasets: [{
                        data: sorted.map(d => d.total_pnl),
                        backgroundColor: sorted.map(d => d.total_pnl >= 0 ? 'rgba(34,197,94,0.7)' : 'rgba(239,68,68,0.7)'),
                        borderRadius: 6
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
        }
    };
})();
