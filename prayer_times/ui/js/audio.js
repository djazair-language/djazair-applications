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
            if (elements.btnCompactMute) {
                if (isPlaying) {
                    elements.btnCompactMute.classList.add('playing');
                    elements.btnCompactMute.title = 'إيقاف صوت الأذان (Stop)';
                    elements.btnCompactMute.innerHTML = `
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="pointer-events: none;">
                            <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>
                        </svg>
                    `;
                } else {
                    elements.btnCompactMute.classList.remove('playing');
                    elements.btnCompactMute.title = 'سماع الأذان / تجربة الصوت';
                    elements.btnCompactMute.innerHTML = `
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" style="pointer-events: none;">
                            <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z"/>
                        </svg>
                    `;
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

        async playAdhan(overrideVoice, customVolume, prayerKey) {
            const state = App.state;

            // If already playing, stop current playback first before starting new
            if (state.isPlayingAdhan) {
                this.stopAdhan();
            }

            let voice = overrideVoice;
            if (!voice && prayerKey && state.settings.perPrayerVoicesEnabled && state.settings.prayerVoices) {
                voice = state.settings.prayerVoices[prayerKey];
            }
            if (!voice) {
                voice = state.settings.selectedVoice || 'chime';
            }

            const rawVol = customVolume !== undefined ? customVolume : (state.settings.adhanVolume !== undefined ? state.settings.adhanVolume : 80);
            const volume = Math.max(0, Math.min(1, rawVol / 100));

            state.isPlayingAdhan = true;
            this.updateUIState(true);

            if (voice === 'chime') {
                this.playSyntheticChime(volume);
                return;
            }

            let audioPath = '';
            if (voice === 'makkah') {
                audioPath = 'audio/makkah.mp3';
            } else if (voice === 'madinah') {
                audioPath = 'audio/madinah.mp3';
            } else if (voice === 'algerian') {
                audioPath = 'audio/algerian.mp3';
            } else if (voice === 'custom') {
                audioPath = 'audio/custom.mp3?t=' + Date.now();
            }

            if (!audioPath) {
                this.playSyntheticChime(volume);
                return;
            }

            const fullAudioUrl = new URL(audioPath, window.location.href).href;

            // PRIMARY: Web Audio API Buffer Playback (Bypasses WebView2 Range-request media bug)
            try {
                await this.playAudioBuffer(fullAudioUrl, volume);
            } catch (err) {
                console.warn('[Audio] Web Audio buffer decoding failed, trying HTML5 Audio fallback:', err);
                try {
                    await this.playHtmlAudioFallback(fullAudioUrl, volume);
                } catch (err2) {
                    console.warn('[Audio] HTML5 Audio also failed, fallback to synthetic chime:', err2);
                    this.playSyntheticChime(volume);
                }
            }
        },

        async playAudioBuffer(fullUrl, volume) {
            const state = App.state;
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) throw new Error('AudioContext not supported');

            if (!state.audioContext) {
                state.audioContext = new AudioContext();
            }
            const ctx = state.audioContext;
            if (ctx.state === 'suspended') {
                await ctx.resume();
            }

            // Cache decoded buffers in memory for instant playback
            state.audioCache = state.audioCache || {};
            let audioBuffer = state.audioCache[fullUrl];

            if (!audioBuffer) {
                const response = await fetch(fullUrl);
                if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${fullUrl}`);
                const arrayBuffer = await response.arrayBuffer();
                audioBuffer = await ctx.decodeAudioData(arrayBuffer);
                state.audioCache[fullUrl] = audioBuffer;
            }

            if (!state.isPlayingAdhan) return; // user cancelled while fetching/decoding

            const source = ctx.createBufferSource();
            source.buffer = audioBuffer;

            const gainNode = ctx.createGain();
            gainNode.gain.setValueAtTime(volume, ctx.currentTime);

            source.connect(gainNode);
            gainNode.connect(ctx.destination);

            state.currentSourceNode = source;
            state.currentGainNode = gainNode;

            source.onended = () => {
                if (state.currentSourceNode === source) {
                    state.currentSourceNode = null;
                    state.currentGainNode = null;
                    state.isPlayingAdhan = false;
                    this.updateUIState(false);
                }
            };

            source.start(0);
        },

        playHtmlAudioFallback(fullUrl, volume) {
            return new Promise((resolve, reject) => {
                const state = App.state;
                const audio = new Audio();
                audio.src = fullUrl;
                audio.volume = volume;

                audio.onended = () => {
                    state.isPlayingAdhan = false;
                    this.updateUIState(false);
                };

                audio.onerror = (e) => {
                    reject(new Error('HTML5 audio error'));
                };

                audio.play()
                    .then(resolve)
                    .catch(reject);
            });
        },

        setVolume(volume) {
            const state = App.state;
            const vol = Math.max(0, Math.min(1, volume));
            if (state.currentGainNode && state.audioContext) {
                try {
                    state.currentGainNode.gain.setValueAtTime(vol, state.audioContext.currentTime);
                } catch (e) {}
            }
            if (App.elements.adhanAudio) {
                try {
                    App.elements.adhanAudio.volume = vol;
                } catch (e) {}
            }
        },

        stopAdhan() {
            const state = App.state;
            const elements = App.elements;

            if (state.currentSourceNode) {
                try {
                    state.currentSourceNode.stop();
                    state.currentSourceNode.disconnect();
                } catch (e) {}
                state.currentSourceNode = null;
                state.currentGainNode = null;
            }
            if (elements.adhanAudio) {
                try {
                    elements.adhanAudio.pause();
                    elements.adhanAudio.currentTime = 0;
                } catch (e) {}
            }
            if (state.chimeTimeoutId) {
                clearTimeout(state.chimeTimeoutId);
                state.chimeTimeoutId = null;
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

                state.chimeTimeoutId = setTimeout(() => {
                    state.isPlayingAdhan = false;
                    this.updateUIState(false);
                    state.chimeTimeoutId = null;
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
