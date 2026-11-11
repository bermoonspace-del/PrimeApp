(function (root, factory) {
    'use strict';

    var api = factory();

    if (typeof module === 'object' && module.exports) {
        module.exports = api;
    }

    if (root) {
        root.PrimeTransitionProfile = api;
    }
}(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this), function () {
    'use strict';

    function getTransitionProfile(environment) {
        environment = environment || {};

        if (environment.reducedMotion) {
            return 'reduced';
        }

        var width = Number(environment.width);
        var isNarrow = Number.isFinite(width) && width <= 768;

        if (environment.coarsePointer || isNarrow) {
            return 'lite';
        }

        return 'full';
    }

    return {
        getTransitionProfile: getTransitionProfile
    };
}));
