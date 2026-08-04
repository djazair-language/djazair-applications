(function() {
    'use strict';

    window.AppCalendar = {
        currentDate: new Date(),

        init() {
            const self = this;
            $('#btnPrevMonth').on('click', () => {
                self.currentDate.setMonth(self.currentDate.getMonth() - 1);
                self.renderCalendar();
            });
            $('#btnNextMonth').on('click', () => {
                self.currentDate.setMonth(self.currentDate.getMonth() + 1);
                self.renderCalendar();
            });
        },

        async renderCalendar() {
            const year = this.currentDate.getFullYear();
            const month = this.currentDate.getMonth();
            
            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
            $('#calendarMonth').text(`${monthNames[month]} ${year}`);

            const firstDay = new Date(year, month, 1).getDay();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            const prevMonthDays = new Date(year, month, 0).getDate();

            const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
            
            const dailyData = await AppAPI.invoke('get_daily_pnl', { date_from: startDate, date_to: endDate });
            const pnlMap = {};
            if (dailyData) {
                dailyData.forEach(d => { pnlMap[d.date] = d.pnl; });
            }

            const $grid = $('#calendarGrid').empty();

            for (let i = firstDay - 1; i >= 0; i--) {
                const day = prevMonthDays - i;
                $grid.append(`<div class="bg-surface-900/20 p-2 rounded-lg border border-surface-800/30 opacity-40 min-h-[70px]"><span class="text-xs text-surface-600">${day}</span></div>`);
            }

            let monthPnl = 0;
            let monthWins = 0;
            let monthLosses = 0;

            for (let day = 1; day <= daysInMonth; day++) {
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const pnl = pnlMap[dateStr];
                
                let pnlBadge = '';
                let cellBg = 'bg-surface-800/30 border-surface-700/30';
                
                if (pnl !== undefined) {
                    monthPnl += pnl;
                    if (pnl > 0) {
                        monthWins++;
                        cellBg = 'bg-profit/10 border-profit/30';
                        pnlBadge = `<div class="text-xs font-mono font-bold text-profit mt-1">+$${pnl.toFixed(2)}</div>`;
                    } else if (pnl < 0) {
                        monthLosses++;
                        cellBg = 'bg-loss/10 border-loss/30';
                        pnlBadge = `<div class="text-xs font-mono font-bold text-loss mt-1">-$${Math.abs(pnl).toFixed(2)}</div>`;
                    } else {
                        pnlBadge = `<div class="text-xs font-mono text-surface-400 mt-1">$0.00</div>`;
                    }
                }

                $grid.append(`
                    <div class="${cellBg} p-2 rounded-lg border min-h-[70px] flex flex-col justify-between transition hover:border-accent/50">
                        <span class="text-xs font-semibold text-surface-300">${day}</span>
                        ${pnlBadge}
                    </div>
                `);
            }

            const remaining = (7 - ((firstDay + daysInMonth) % 7)) % 7;
            for (let day = 1; day <= remaining; day++) {
                $grid.append(`<div class="bg-surface-900/20 p-2 rounded-lg border border-surface-800/30 opacity-40 min-h-[70px]"><span class="text-xs text-surface-600">${day}</span></div>`);
            }

            $('#calendarMonthPnl').text((monthPnl >= 0 ? '+' : '') + '$' + monthPnl.toFixed(2)).className = `text-xl font-bold font-mono ${monthPnl >= 0 ? 'text-profit' : 'text-loss'}`;
            $('#calendarMonthWins').text(monthWins);
            $('#calendarMonthLosses').text(monthLosses);
        }
    };
})();
