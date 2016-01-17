var ServiceApi = require('service-api');
var Service = new ServiceApi();

exports.context = function (options, data, next) {
    // TODO extend data object with api instances
    next(null, data);
}

function premethod (name, method) {
    return function (options, data, next) {

        // do stuff before the method is called

        // call the method
        Service[name](options, data, next);
    }
}

// export api methods
function exportMethods () {

    // get all public methods of the service-api instance
    for (var name of Object.getOwnPropertyNames(Object.getPrototypeOf(Service))) {
        var method = Service[name];

        // ignore constructor and private methods
        if (typeof method === 'function' && name !== 'constructor' && name[0] !== '_') {
            exports[name] = premethod(name, method);
        }
    }
}

exportMethods();