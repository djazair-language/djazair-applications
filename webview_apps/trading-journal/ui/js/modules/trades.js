(function() {
    'use strict';

    window.AppTrades = {
        allTrades: [],
        currentFilter: 'all',

        init() {
            const self = this;
            $('.quick-filter').on('click', function() {
                $('.quick-filter').removeClass('active bg-accent text-white').addClass('bg-surface-800 text-surface-400');
                $(this).addClass('active bg-accent text-white').removeClass('bg-surface-800 text-surface-400');
                self.currentFilter = $(this).data('filter');
                self.applyQuickFilter();
            });

            $('#btnApplyFilter').on('click', () => self.loadTrades());
            $('#btnClearFilter').on('click', () => {
                $('#filterSymbol').val('');
                $('#filterDirection').val('');
                $('#filterStatus').val('');
                $('#filterDateFrom').val('');
                $('#filterDateTo').val('');
                $('#globalSearch').val('');
                self.loadTrades();
            });

            $('#globalSearch').on('input', () => self.loadTrades());
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

        async loadTrades() {
            const filter = this.getFilterValues();
            const trades = await AppAPI.invoke('get_trades', filter);
            this.allTrades = trades || [];
            this.applyQuickFilter();
        },

        applyQuickFilter() {
            let filtered = this.allTrades;
            if (this.currentFilter === 'open') {
                filtered = this.allTrades.filter(t => t.status === 'open');
            } else if (this.currentFilter === 'closed') {
                filtered = this.allTrades.filter(t => t.status === 'closed');
            } else if (this.currentFilter === 'winning') {
                filtered = this.allTrades.filter(t => t.net_pnl > 0);
            } else if (this.currentFilter === 'losing') {
                filtered = this.allTrades.filter(t => t.net_pnl < 0);
            }
            this.renderTradesTable(filtered);
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
                const dirBadge = t.direction === 'buy'
                    ? '<span class="badge text-profit bg-profit/10">LONG</span>'
                    : '<span class="badge text-loss bg-loss/10">SHORT</span>';
                const date = t.entry_time ? new Date(t.entry_time).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
                const symbolDisplay = t.symbol.replace(/(.{3})/, '$1/');

                let count = 0;
                if (t.screenshot) {
                    try {
                        let parsed = JSON.parse(t.screenshot);
                        if (Array.isArray(parsed)) count = parsed.length;
                        else if (t.screenshot) count = 1;
                    } catch(e) {
                        if (t.screenshot) count = 1;
                    }
                }

                const mediaIcon = count > 0 
                    ? `<button type="button" class="btn-view-trade-media flex items-center gap-1 text-accent hover:text-accent-light px-2 py-0.5 bg-accent/10 rounded-md transition" data-id="${t.id}" title="View ${count} screenshot(s)">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                        <span class="text-[11px] font-bold">${count}</span>
                       </button>`
                    : `<span class="text-surface-600">-</span>`;

                const closeBtn = t.status === 'open'
                    ? `<button class="btn-close-trade p-1.5 hover:bg-surface-700/50 rounded transition text-yellow-400 hover:text-yellow-300" data-id="${t.id}" title="Close Trade">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
                       </button>`
                    : '';

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
                        <td class="px-4 py-3">${mediaIcon}</td>
                        <td class="px-4 py-3">
                            <div class="flex items-center gap-1">
                                ${closeBtn}
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
                if (trade && window.App) window.App.openEditModal(trade);
            });

            $('.btn-delete').on('click', function() {
                const id = $(this).data('id');
                if (confirm('Delete this trade? This cannot be undone.')) {
                    AppAPI.invoke('delete_trade', { id: id }).then(() => {
                        if (window.App && window.App.showToast) window.App.showToast('Trade deleted', 'success');
                        self.loadTrades();
                    });
                }
            });

            $('.btn-close-trade').on('click', function() {
                const id = $(this).data('id');
                const trade = self.allTrades.find(t => t.id === id);
                if (trade && window.App) window.App.openQuickCloseModal(trade);
            });

            $('.btn-view-trade-media').on('click', async function(e) {
                e.stopPropagation();
                const id = $(this).data('id');
                const trade = self.allTrades.find(t => t.id === id);
                if (trade && trade.screenshot) {
                    let paths = [];
                    try {
                        paths = JSON.parse(trade.screenshot);
                        if (!Array.isArray(paths)) paths = [trade.screenshot];
                    } catch(err) {
                        paths = [trade.screenshot];
                    }
                    if (paths.length > 0 && paths[0]) {
                        if (window.App && window.App.showToast) window.App.showToast('Loading chart image...', 'info');
                        const res = await AppAPI.invoke('get_image_data', { path: paths[0] });
                        if (res && res.success && res.dataUrl) {
                            AppMedia.openLightbox(res.dataUrl);
                        } else {
                            if (window.App && window.App.showToast) window.App.showToast('Failed to load image', 'error');
                        }
                    }
                }
            });
        }
    };
})();
