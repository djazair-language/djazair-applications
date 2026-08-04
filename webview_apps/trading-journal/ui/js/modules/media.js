(function() {
    'use strict';

    window.AppMedia = {
        tradeImages: [],

        init() {
            const self = this;
            $('#btnCloseLightbox, #lightboxModal').on('click', function(e) {
                if (e.target === this || $(e.target).closest('#btnCloseLightbox').length > 0) {
                    self.closeLightbox();
                }
            });

            $('#tradeImage').on('change', async function(e) {
                const files = Array.from(e.target.files);
                if (!files || files.length === 0) return;

                $('#imageLabel').text(`Uploading ${files.length} image(s)...`);

                for (let file of files) {
                    await new Promise((resolve) => {
                        const reader = new FileReader();
                        reader.onload = function(event) {
                            const img = new Image();
                            img.onload = async function() {
                                const canvas = document.createElement('canvas');
                                const MAX_WIDTH = 1200;
                                const MAX_HEIGHT = 1200;
                                let width = img.width;
                                let height = img.height;

                                if (width > height) {
                                    if (width > MAX_WIDTH) {
                                        height *= MAX_WIDTH / width;
                                        width = MAX_WIDTH;
                                    }
                                } else {
                                    if (height > MAX_HEIGHT) {
                                        width *= MAX_HEIGHT / height;
                                        height = MAX_HEIGHT;
                                    }
                                }

                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx.drawImage(img, 0, 0, width, height);

                                const base64 = canvas.toDataURL('image/jpeg', 0.7);

                                const res = await AppAPI.invoke('upload_image', { base64: base64 });
                                if (res && res.success && res.path) {
                                    self.tradeImages.push({ path: res.path, url: base64 });
                                }
                                resolve();
                            };
                            img.src = event.target.result;
                        };
                        reader.readAsDataURL(file);
                    });
                }

                self.renderImageGallery();
                $('#imageLabel').text('Click to upload analysis images (Multiple allowed)');
                if (window.App && window.App.showToast) window.App.showToast('Images attached!', 'success');
                $(this).val('');
            });
        },

        renderImageGallery() {
            const $container = $('#imageGallery').empty();
            if (!this.tradeImages || this.tradeImages.length === 0) {
                $container.append('<p class="text-xs text-surface-500 my-auto mx-auto" id="emptyGalleryText">No images attached yet</p>');
                $('#tradeScreenshotBase64').val('');
                return;
            }

            const paths = this.tradeImages.map(img => img.path);
            $('#tradeScreenshotBase64').val(JSON.stringify(paths));

            const self = this;
            this.tradeImages.forEach((imgObj, idx) => {
                const $item = $(`
                    <div class="relative group w-14 h-14 rounded-lg border border-surface-600/60 overflow-hidden bg-surface-800 bg-cover bg-center cursor-pointer shadow-sm" style="background-image: url('${imgObj.url}')">
                        <div class="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1">
                            <button type="button" class="btn-view-img text-white p-1 hover:text-accent-light" title="View Full Image">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                            </button>
                            <button type="button" class="btn-del-img text-white p-1 hover:text-red-400" title="Remove Image">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                        </div>
                    </div>
                `);
                $item.find('.btn-view-img').on('click', (e) => {
                    e.stopPropagation();
                    self.openLightbox(imgObj.url);
                });
                $item.find('.btn-del-img').on('click', (e) => {
                    e.stopPropagation();
                    self.tradeImages.splice(idx, 1);
                    self.renderImageGallery();
                });
                $container.append($item);
            });
        },

        openLightbox(url) {
            $('#lightboxImg').attr('src', url);
            $('#lightboxModal').removeClass('hidden');
        },

        closeLightbox() {
            $('#lightboxModal').addClass('hidden');
            $('#lightboxImg').attr('src', '');
        },

        clearGallery() {
            this.tradeImages = [];
            this.renderImageGallery();
        },

        async loadSavedImages(screenshotField) {
            this.tradeImages = [];
            this.renderImageGallery();
            if (!screenshotField) return;

            $('#imageLabel').text('Loading attached images...');
            let paths = [];
            try {
                paths = JSON.parse(screenshotField);
                if (!Array.isArray(paths)) paths = [screenshotField];
            } catch(e) {
                paths = [screenshotField];
            }

            for (let p of paths) {
                if (p) {
                    const res = await AppAPI.invoke('get_image_data', { path: p });
                    if (res && res.success && res.dataUrl) {
                        this.tradeImages.push({ path: p, url: res.dataUrl });
                    }
                }
            }
            this.renderImageGallery();
            $('#imageLabel').text('Click to upload analysis images (Multiple allowed)');
        }
    };
})();
