// Dependencies
var crypto = require('crypto');

/* Public functions */

/**
 * create
 * Creates a new user
 *
 * @name create
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `givenName` (String): The user first name (required).
 *  - `familyName` (String): The user last name (required).
 *  - `username` (String):  The user username (required).
 *  - `email` (String): The user email (required).
 *  - `password` (String): The user password (required).
 *  - `verifyPassword` (String): The user password confirmation. must be the same as the password. (required).
 *
 * @param {Function} next The next function.
 */
exports.create = function (options, data, next) {

    // check preconditions
    _checkRequired(data, 
        [
            'givenName',
            'familyName',
            'username',
            'email',
            'password',
            'verifyPassword'
        ], function (err) {

        if (err) {
            return next(new Error(err.message));
        }

        if (data.password !== data.verifyPassword) {
            return next(new Error('Service-api.user.create: Passwords do not match'));
        }

        // create a valid jsonld document from the provided data
        var userDocument = {
            '@context': 'http://jillix.net/general.jsonld',
            '@id': 'http://service.jillix.com/' + data.username,
            '@type': ['Person', 'Identity'],
            'givenName': data.givenName,
            'familyName': data.familyName,
            'username': data.username,
            'email': data.email,
            'password': _hashPassword(data.password, 'sha1')
        };

        // call service-api
        options._Service.User.create(userDocument, next);
    });
};

/**
 * get
 * Returns a user in jsonld compact form
 *
 * @name get
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `username` (String):  The user username (required).
 *
 * @param {Function} next The next function.
 */
exports.get = function (options, data, next) {

    // call service-api
    options._Service.User.get(data.username, next);
};

/**
 * getLoggedUser
 * Returns the logged user in jsonld compact form
 *
 * @name get
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *
 * @param {Function} next The next function.
 */
exports.getLoggedUser = function (options, data, next) {

    if (!options.session || !options.session.id) {
        return next(new Error('Service-api.user.getLoggedUser: User not logged in'));
    }

    var username = options.session.id.split('/').pop();

    next(null, {
        username: username
    });
};

/**
 * updateName
 * Updates the name fields of a user
 *
 * @name updateName
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `givenName` (String):  The new first name of a user (required).
 *  - `familyName` (String):  The new last name of a user (required).
 *
 * @param {Function} next The next function.
 */
exports.updateName = function (options, data, next) {
    options.session = options.session || {};

    var fields = [ 'givenName', 'familyName' ];
    var updateData = {
        givenName: data.givenName || '',
        familyName: data.familyName || ''
    };
    
    // call service-api
    options._Service.User.update(fields, options.session.id, updateData, next);
};

/**
 * updateLocation
 * Updates the address field of a user
 *
 * @name updateLocation
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `address` (String):  The new address of a user (required).
 *
 * @param {Function} next The next function.
 */
exports.updateLocation = function (options, data, next) {
    options.session = options.session || {};

    var fields = [ 'address'];
    var updateData = {
        address: data.address || ''
    };
    
    // call service-api
    options._Service.User.update(fields, options.session.id, updateData, next);
};

/**
 * updateWebsite
 * Updates the website field of a user
 *
 * @name updateWebsite
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `website` (String):  The new website of a user (required).
 *
 * @param {Function} next The next function.
 */
exports.updateWebsite = function (options, data, next) {
    options.session = options.session || {};

    var fields = [ 'website'];
    var updateData = {
        website: data.website || ''
    };
    
    // call service-api
    options._Service.User.update(fields, options.session.id, updateData, next);
};

/**
 * updateCompany
 * Updates the worksFor field of a user
 *
 * @name updateCompany
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `worksFor` (String):  The new worksFor of a user (required).
 *
 * @param {Function} next The next function.
 */
exports.updateCompany = function (options, data, next) {
    options.session = options.session || {};

    var fields = [ 'worksFor'];
    var updateData = {
        worksFor: data.worksFor || ''
    };
    
    // call service-api
    options._Service.User.update(fields, options.session.id, updateData, next);
};

/**
 * deleteSession
 * Deletes the user session
 *
 * type http
 * @name deleteSession
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 * @param {Function} next The next function.
 */
exports.deleteSession = function(options, data, next) {
    // empty the session
    console.log(options.session);
    options.session.destroy();

    next(null, JSON.stringify({}));
};

/**
 * authenticate
 * authenticates user and sets session
 *
 * type http
 * @name authenticate
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `username` (String):  The user username (required).
 *  - `password` (String): The user password (required).
 *
 * @param {Function} next The next function.
 */
exports.authenticate = function (options, data, next) {

    // parse incoming http data
    try {
        data = JSON.parse(data);
    } catch (e) {
        return next(new Error('Service-api.user.authenticate: Failed to parse incoming data.'));
    }

    // call service-api
    options._Service.User.authenticate(data.username, data.password, function (err, valid, userInfo) {

        if (err) {
            return next(new Error(err.msg));
        }

        if (valid) {
            // set session
            options.session.id = userInfo.id;
            options.session.locale = 'en_US';
            options.session.role = 'private';

            return next(null, JSON.stringify({}));
        } else {
            return next(new Error('Service-api.user.authenticate: username/password invalid.'));
        }
    });
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

// hash user password
function _hashPassword (password, hashType) {

    var hash = crypto.createHash(hashType);
    hash.update(password);
    password = hash.digest('hex').toLowerCase();

    return password;
}

/* End private functions */