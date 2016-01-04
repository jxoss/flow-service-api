var Access = require('./lib/access');

// export access check data handler
exports.access = Access.flow;
exports.context = function (options, data, next) {
    // TODO extend data object with api instances
    next(null, data);
}

// TODO export service-api public methods
