// =============================================================================
// Project:      Djazair Prayer Times Desktop Application
// File:         ui/js/athkar.js
// Description:  Daily Athkar Display, Subtabs, and Counter Tracker.
// =============================================================================

window.PrayerApp = window.PrayerApp || {};

(function(App) {
    'use strict';

    App.Athkar = {
        initUI() {
            if (!App.state.athkarData) return;
            this.renderList(App.state.currentAthkarTab);
        },

        renderList(type) {
            const state = App.state;
            const elements = App.elements;
            if (!state.athkarData || !state.athkarData[type] || !elements.athkarList) return;

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
                        if (App.Audio && App.Audio.playClickTone) {
                            App.Audio.playClickTone();
                        }

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
        },

        setTab(type) {
            App.state.currentAthkarTab = type;
            this.renderList(type);
        },

        reset() {
            App.state.athkarProgress = {};
            this.renderList(App.state.currentAthkarTab);
        }
    };

})(window.PrayerApp);
