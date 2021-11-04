"use strict";
const { validationResult } = require('express-validator');
const validate = function validate(validations) {
    return async (req, res, next) => {
        await Promise.all(validations.map((validation) => validation.run(req)));
        const errors = validationResult(req);
        if (errors.isEmpty()) {
            return next();
        }
        res.status(400).json(errors);
        return next();
    };
};
const handle = (promise) => {
    promise
        .then((data) => [data, undefined])
        .catch((error) => Promise.resolve([undefined, error]));
};
module.exports = {
    validate,
    handle,
};
