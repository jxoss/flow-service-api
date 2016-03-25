/* Public functions */

/**
 * create
 * Creates a new application
 *
 * @name create
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `name` (String): The application name (required).
 *  - `project` (String): The name of the application project (require).
 *  - `owner` (String): The name of the application owner. (required).
 *
 * @param {Function} next The next function.
 */
exports.create = function (options, data, next) {

    // check preconditions
    _checkRequired(data, 
        [
            'name',
            'owner',
            'project'
        ], function (err) {

        if (err) {
            return next(new Error(err.message));
        }

        // TODO
        // NOTICE! This is temporary
        data.owner = options.session.id;

        // create a valid jsonld document from the provided data
        var appDocument = {
            '@context': 'http://schema.org',
            '@id': 'http://service.jillix.com/' + data.owner.split('/').pop() + '/' + data.project.split('/').pop() + '/' + _nameToSlug(data.name),
            'slug': data.owner.split('/').pop() + '/' + data.project.split('/').pop() + '/' + _nameToSlug(data.name),
            '@type': ['Application'],
            'name': data.name,
            'partOfProject': data.project,
            'author': data.owner
        };

        // call service-api
        options._Service.App.create(appDocument,  function (err, response) {

            if (err) {
                return next(new Error(err.message));
            }

            // create a link between the user and app
            options._Service.Access.link(data.owner, appDocument['@id'], 'admin', next);
        });
    });
};

/**
 * get
 * Returns an app in jsonld compact form
 *
 * @name get
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `appId` (String):  The app id (required).
 *
 * @param {Function} next The next function.
 */
exports.get = function (options, data, next) {

    if (!data.appId) {
        return next(new Error('Service-api.app.get: A valid appId must be provided'));
    }

    // call service-api
    options._Service.App.get(
        [
            data.appId
        ], 
        function (err, res) {

        if (err) {
            return next(err);
        }
        if (!res || !res.jsonld) {
            return next(new Error('Service-api.app.get: App not found.'));
        }

        return next(null, res.jsonld);
    });
};

/**
 * list
 * Returns all user/org apps in jsonld compact form
 *
 * @name list
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `project` (String): The project id (required).
 *
 * @param {Function} next The next function.
 */
exports.list = function (options, data, next) {

    // check preconditions
    _checkRequired(data, 
        [
            'project'
        ], function (err) {

        if (err) {
            return next(new Error(err.message));
        }

        var user = options.session.id;

        // call service-api
        options._Service.App.list(user, data.project, {}, function (err, result) {

            if (err) {
                return next(err);
            }
            if (!result || !result.jsonld) {
                return next(new Error("No jsonld document."));
            }

            // check if multiple items inside document
            if (result.jsonld.hasOwnProperty('@graph')) {
                result.jsonld['@graph'].forEach(function (item) {
                    next(item, true);
                });
                next(null, null)
            } else {
                next(null, result.jsonld);
            }
        });
    });
};

/**
 * updateName
 * Updates the name of an app
 *
 * @name updateName
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `name` (String):  The new name (required).
 *  - `appId` (String):  The app id (required).
 *
 * @param {Function} next The next function.
 */
exports.updateName = function (options, data, next) {

    if (!data.appId) {
        return next(new Error('Service-api.app.updateName: A valid appId must be provided'));
    }

    var fields = [ 'name' ];
    var updateData = {
        name: data.name || ''
    };
    
    // call service-api
    options._Service.App.update(fields, data.appId, updateData, next);
};

/**
 * delete
 * Deletes an app
 *
 * @name delete
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `appId` (String):  The app id (required).
 *  - `nameConfirm` (String):  The app name (required).
 *
 * @param {Function} next The next function.
 */
exports.delete = function (options, data, next) {

    // check preconditions
    _checkRequired(data,
        [
            'appId',
            'nameConfirm',
        ], function (err) {

        if (err) {
            return next(err);
        }

        // get the app
        options._Service.App.get([data.appId], [ 'http://schema.org/name' ], function (err, result) {

            if (err) {
                return next(err);
            }
            if (!result || !result.jsonld) {
                return next(new Error('Service-api.app.delete: App not found'));
            }
            var app = result.jsonld;
            app.id = app.id || app['@id'];

            if (app.name !== data.nameConfirm) {
                return next(new Error('Service-api.app.delete: App name is incorrect'));
            }

            // delete app
            options._Service.App.delete(app.id, next);
        });
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

function _nameToSlug (str) {
    str = str.replace(/^\s+|\s+$/g, ''); // trim
    str = str.toLowerCase();

    // remove accents, swap ñ for n, etc
    var from = "àáäâèéëêìíïîòóöôùúüûñç·/_,:;";
    var to   = "aaaaeeeeiiiioooouuuunc------";
    for (var i=0, l=from.length ; i<l ; i++) {
        str = str.replace(new RegExp(from.charAt(i), 'g'), to.charAt(i));
    }

    str = str.replace(/[^a-z0-9 -]/g, '') // remove invalid chars
        .replace(/\s+/g, '-') // collapse whitespace and replace by -
        .replace(/-+/g, '-'); // collapse dashes

    return str;
}

/* End private functions */