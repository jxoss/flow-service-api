// Dependencies
var ServiceApi = require('service-api')
  , Service = new ServiceApi()
  , SetOrGet = require('set-or-get')
  , IterateObject = require('iterate-object')
  , Handlers = require('./lib')
  , Stream = require('stream');

module.exports = {};

/**
 * Generate a wrapper for the appended data handler
 *
 * @private
*/
function generateMethod (prefix, handler) {
    return function () {

        // get function arguments
        var args = arguments;

        /* Do custom stuff here before the handler is called
         * ...
        */

        // append the ServiceApi instance to the options object
        if (args[0].i && args[0].o && args[0].i instanceof Stream.Transform) {
            args[1]._Service = Service;
        } else {
            args[0]._Service = Service;
        }

        // check if 
        handler.apply(this, args);
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
