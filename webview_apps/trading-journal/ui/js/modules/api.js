(function() {
    'use strict';

    window.AppAPI = {
        async invoke(channel, data) {
            try {
                const dz = window.djazair;
                if (!dz) throw new Error("Djazair bridge is not available");
                return await dz.invoke(channel, data || {});
            } catch (e) {
                console.error(`Bridge error [${channel}]:`, e);
                return null;
            }
        }
    };
})();
