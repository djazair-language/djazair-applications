(function() {
    'use strict';

    window.AppWizard = {
        currentStep: 1,

        init() {
            const self = this;
            $('#btnNextStep').on('click', () => self.nextStep());
            $('#btnPrevStep').on('click', () => self.prevStep());
        },

        setStep(step) {
            this.currentStep = step;
            $('.wizard-step').addClass('hidden').removeClass('block');
            $(`#wizardStep${step}`).removeClass('hidden').addClass('block');

            // Update Indicators
            $('.step-indicator').each(function() {
                const s = $(this).data('step');
                const $circle = $(this).find('div');
                const $text = $(this).find('span');
                if (s < step) {
                    $circle.removeClass('bg-surface-800 text-surface-500 bg-accent ring-surface-950').addClass('bg-profit text-white ring-profit/20');
                    $circle.html('<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"/></svg>');
                    $text.removeClass('text-surface-500 text-surface-300').addClass('text-profit');
                } else if (s === step) {
                    $circle.removeClass('bg-surface-800 text-surface-500 bg-profit ring-profit/20').addClass('bg-accent text-white ring-surface-950');
                    $circle.html(s);
                    $text.removeClass('text-surface-500 text-profit').addClass('text-surface-300');
                } else {
                    $circle.removeClass('bg-accent bg-profit text-white ring-profit/20 ring-surface-950').addClass('bg-surface-800 text-surface-500 ring-surface-950');
                    $circle.html(s);
                    $text.removeClass('text-surface-300 text-profit').addClass('text-surface-500');
                }
            });

            // Progress Line
            const progress = ((step - 1) / 3) * 100;
            $('#progressLine').css('width', `${progress}%`);

            // Navigation Buttons
            if (step === 1) {
                $('#btnPrevStep').addClass('invisible');
                $('#btnNextStep').removeClass('hidden');
                $('#btnSaveTrade').addClass('hidden');
            } else if (step === 4) {
                $('#btnPrevStep').removeClass('invisible');
                $('#btnNextStep').addClass('hidden');
                $('#btnSaveTrade').removeClass('hidden');
            } else {
                $('#btnPrevStep').removeClass('invisible');
                $('#btnNextStep').removeClass('hidden');
                $('#btnSaveTrade').addClass('hidden');
            }
        },

        nextStep() {
            if (this.currentStep < 4) {
                this.setStep(this.currentStep + 1);
            }
        },

        prevStep() {
            if (this.currentStep > 1) {
                this.setStep(this.currentStep - 1);
            }
        },

        reset() {
            this.setStep(1);
        }
    };
})();
