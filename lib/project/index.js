// Dependencies
var crypto = require('crypto');

/* Public functions */

/**
 * create
 * Creates a new project
 *
 * @name create
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `name` (String): The project name (required).
 *
 * @param {Function} next The next function.
 */
exports.create = function (options, data, next) {

    // check preconditions
    _checkRequired(data, 
        [
            'name'
        ], function (err) {

        if (err) {
            return next(new Error(err.message));
        }

        // create a valid jsonld document from the provided data
        var projectDocument = {};

        // call service-api
        options._Service.Project.create(projectDocument, next);
    });
};

/**
 * get
 * Returns a project in jsonld compact form
 *
 * @name get
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `id` (String):  The project id (required).
 *
 * @param {Function} next The next function.
 */
exports.get = function (options, data, next) {

    // call service-api
    options._Service.Project.get(data.id, next);
};

/**
 * list
 * Returns all user/org projects in jsonld compact form
 *
 * @name list
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `id` (String):  The user/org id (required).
 *
 * @param {Function} next The next function.
 */
exports.list = function (options, data, next) {

    // call service-api
    options._Service.Project.list(data.id, {}, next);
};


/* End public functions */
/* Private functions */

// check for required fields
function _checkRequired (data, required, cb) {

    for (var i = 0; i < required.length; ++i) {
        var field = required[i];
        if (typeof data[field] !== 'string' || !data[field].length) {
            return cb(new Error('Missing required field "' + field + '".'));
        }
    }

    return cb(null);
}

/* End private functions */