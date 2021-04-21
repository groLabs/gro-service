const wrapAsync = function wrapAsync(fn) {
    return function wrap(req, res, next) {
        fn(req, res, next).catch(next);
    };
};

module.exports.wrapAsync = wrapAsync;
