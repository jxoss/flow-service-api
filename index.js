var Service = require('service-api');

// TODO export service-api public methods

// export access check data handler
exports.access = function (options, data, next) {

    // check for apiKey
    data.key = data.key || options.key || options.session.key;
    if (!data.key) {
        return next(new Error('Flow-API: Access denied (No API Key found).'));
    }

    // check for item type
    data.type = data.type || options.type;
    if (!data.type) {
        return next(new Error('Flow-API: Access denied (No type found).'));
    }

    // check for item id
    data.id = data.id || options.id;
    if (!data.id) {
        return next(new Error('Flow-API: Access denied (No item ID found).'));
    }

    // check for required composition name
    data.comp = data.comp || options.comp;
    if (options.compReq && !data.comp) {
        return next(new Error('Flow-API: Missing required composition name.'));
    }

    // receive a role or deny access
    data.role = Service.Access.cache(data.key, options.session.user, data.type, data.id);

    if (data.role instanceof Error) {
        return next(data.role);
    }

    if (!data.role) {
        return Service.Access.key(data.key, options.session.user, data.type, data.id, function (err, role) {

            if (err) {
                return next(err);
            }

            data.role = role;
            next(null, data);
        });
    }

    next(null, data);
};

exports.context = function (options, data, next) {
    // TODO extend data object with api instances
    next(null, data);
}

