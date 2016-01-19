// Dependencies
var ServiceApi = require('service-api')
  , Service = new ServiceApi()
  , SetOrGet = require('set-or-get')
  , IterateObject = require('iterate-object')
  , Handlers = require('./lib');

module.exports = {};

/**
 * Generate a wrapper for the appended data handler
 *
 * @private
*/
function generateMethod (prefix, handler) {
    return function (options, data, next) {

        // append the ServiceApi instance to the options object
        options._Service = Service;

        /* Do custom stuff here before the handler is called
         * ...
        */

        // call the data handler
        handler.call(this, options, data, next);
    }
}

/**
 * Append the available data handlers to the module.exports object
 *
 * @private
*/
function appendDataHandlers (object, parent, prefix) {
    IterateObject(object, function (handler, name) {
        var cPref = prefix ? prefix + '.' + name : name;
        if (typeof handler === 'object') {
            return appendDataHandlers(handler, SetOrGet(parent, name, {}), cPref);
        }
        parent[name] = generateMethod(cPref, handler);
    });
}

// start appending the data handlers
appendDataHandlers(Handlers, module.exports, '');
