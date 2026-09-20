// =============================================================================
// Project:      Djazair Prayer Times Desktop Application
// File:         ui/js/audio.js
// Description:  Audio Engine, Adhan Player, Synthetic Chime, and Click Effects.
// =============================================================================

window.PrayerApp = window.PrayerApp || {};

(function(App) {
    'use strict';

    App.Audio = {
        updateUIState(isPlaying) {
            const elements = App.elements;
            if (elements.btnTestAdhan) {
                if (isPlaying) {
                    elements.btnTestAdhan.classList.add('playing');
                    elements.btnTestAdhan.title = 'إيقاف صوت الأذان (Stop)';
                } else {
                    elements.btnTestAdhan.classList.remove('playing');
                    elements.btnTestAdhan.title = 'سماع الأذان / تجربة الصوت';
                }
            }
            if (elements.btnPreviewVoice && elements.textPreviewVoice && elements.iconPreviewVoice) {
                if (isPlaying) {
                    elements.textPreviewVoice.textContent = 'إيقاف';
                    elements.iconPreviewVoice.innerHTML = '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>';
                    elements.btnPreviewVoice.classList.add('playing');
                } else {
                    elements.textPreviewVoice.textContent = 'تجربة الصوت';
                    elements.iconPreviewVoice.innerHTML = '<polygon points="5 3 19 12 5 21 5 3"/>';
                    elements.btnPreviewVoice.classList.remove('playing');
                }
            }
        },

        playAdhan(overrideVoice, customVolume) {
            const state = App.state;
            const elements = App.elements;

            if (state.isPlayingAdhan) {
                this.stopAdhan();
                return;
            }

            const voice = overrideVoice || state.settings.selectedVoice || 'chime';
            const rawVol = customVolume !== undefined ? customVolume : (state.settings.adhanVolume !== undefined ? state.settings.adhanVolume : 80);
            const volume = Math.max(0, Math.min(1, rawVol / 100));

            state.isPlayingAdhan = true;
            this.updateUIState(true);

            if (voice === 'chime') {
                this.playSyntheticChime(volume);
                return;
            }

            let audioSrc = '';
            if (voice === 'makkah') {
                audioSrc = 'audio/makkah.mp3';
            } else if (voice === 'madinah') {
                audioSrc = 'audio/madinah.mp3';
            } else if (voice === 'algerian') {
                audioSrc = 'audio/algerian.mp3';
            } else if (voice === 'custom') {
                audioSrc = 'audio/custom.mp3?t=' + Date.now();
            }

            if (audioSrc && elements.adhanAudio) {
                try {
                    elements.adhanAudio.pause();
                    elements.adhanAudio.currentTime = 0;
                } catch (e) {}

                elements.adhanAudio.src = audioSrc;
                elements.adhanAudio.volume = volume;

                elements.adhanAudio.onended = () => {
                    state.isPlayingAdhan = false;
                    this.updateUIState(false);
                };

                elements.adhanAudio.onerror = (e) => {
                    console.warn('[Audio] Audio tag playback error, fallback to chime:', e);
                    this.playSyntheticChime(volume);
                };

                elements.adhanAudio.play()
                    .catch(err => {
                        console.warn('[Audio] Audio play error, fallback to chime:', err);
                        this.playSyntheticChime(volume);
                    });
            } else {
                this.playSyntheticChime(volume);
            }
        },

        stopAdhan() {
            const state = App.state;
            const elements = App.elements;

            if (elements.adhanAudio) {
                try {
                    elements.adhanAudio.pause();
                    elements.adhanAudio.currentTime = 0;
                } catch (e) {}
            }
            if (state.audioContext && state.audioContext.state === 'running') {
                try {
                    state.audioContext.suspend();
                } catch (e) {}
            }
            state.isPlayingAdhan = false;
            this.updateUIState(false);
        },

        playSyntheticChime(volParam) {
            const state = App.state;
            try {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                if (!AudioContext) {
                    state.isPlayingAdhan = false;
                    this.updateUIState(false);
                    return;
                }
                if (!state.audioContext) state.audioContext = new AudioContext();

                const ctx = state.audioContext;
                if (ctx.state === 'suspended') ctx.resume();

                const notes = [293.66, 329.63, 349.23, 440.0, 523.25, 587.33];
                let delay = 0;
                const volume = volParam !== undefined ? volParam : (state.settings.adhanVolume / 100);

                notes.forEach((freq) => {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();

                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);

                    const vol = volume * 0.25;
                    gain.gain.setValueAtTime(0.001, ctx.currentTime + delay);
                    gain.gain.exponentialRampToValueAtTime(vol, ctx.currentTime + delay + 0.1);
                    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 2.5);

                    osc.connect(gain);
                    gain.connect(ctx.destination);

                    osc.start(ctx.currentTime + delay);
                    osc.stop(ctx.currentTime + delay + 2.6);

                    delay += 0.45;
                });

                setTimeout(() => {
                    state.isPlayingAdhan = false;
                    this.updateUIState(false);
                }, (delay + 3) * 1000);
            } catch (e) {
                console.error('[Audio] Web Audio error:', e);
                state.isPlayingAdhan = false;
                this.updateUIState(false);
            }
        },

        playClickTone() {
            const state = App.state;
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
    };

})(window.PrayerApp);
