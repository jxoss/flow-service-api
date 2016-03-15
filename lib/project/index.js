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
 *  - 'owner' (String): The name of the project owner. (required)
 *
 * @param {Function} next The next function.
 */
exports.create = function (options, data, next) {

    // check preconditions
    _checkRequired(data, 
        [
            'name',
            'owner'
        ], function (err) {

        if (err) {
            return next(new Error(err.message));
        }

        // TODO
        // NOTICE! This is temporary
        data.owner = options.session.id;

        // create a valid jsonld document from the provided data
        var projectDocument = {
            '@context': 'http://schema.org',
            '@id': 'http://service.jillix.com/' + data.owner.split('/').pop() + '/' + _nameToSlug(data.name),
            'slug': data.owner.split('/').pop() + '/' + _nameToSlug(data.name),
            '@type': ['Project'],
            'name': data.name,
        };

        // call service-api
        options._Service.Project.create(projectDocument,  function (err, response) {

            if (err) {
                return next(new Error(err.message));
            }

            // create a link between the user and project
            options._Service.Access.link(data.owner, projectDocument['@id'], 'admin', next);
        });
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
 *  - `projectId` (String):  The project id (required).
 *
 * @param {Function} next The next function.
 */
exports.get = function (options, data, next) {

    if (!data.projectId) {
        return next(new Error('Service-api.project.get: A valid projectid must be provided'));
    }

    // call service-api
    options._Service.Project.get(
        [
            data.projectId
        ], 
        [
            'http://schema.org/name'
        ], function (err, res) {

        if (err) {
            return next(err);
        }
        if (!res || !res.jsonld) {
            return next(new Error('Service-api.project.get: Project not found.'));
        }

        return next(null, res.jsonld);
    });
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

    // TODO
    // NOTICE! This is temporary
    var id = options.session.id;

    // call service-api
    options._Service.Project.list(id, {}, function (err, result) {

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
};

/**
 * updateName
 * Updates the name of a project
 *
 * @name updateName
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `name` (String):  The new name (required).
 *  - `projectId` (String):  The new name (required).
 *
 * @param {Function} next The next function.
 */
exports.updateName = function (options, data, next) {

    if (!data.projectId) {
        return next(new Error('Service-api.project.updateName: A valid projectid must be provided'));
    }

    var fields = [ 'name' ];
    var updateData = {
        name: data.name || ''
    };
    
    // call service-api
    options._Service.Project.update(fields, data.projectId, updateData, next);
};

/**
 * toggleStatus
 * Toggles the active status of a project
 *
 * @name toggleStatus
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `id` (String):  The project id (required).
 *
 * @param {Function} next The next function.
 */
exports.toggleStatus = function (options, data, next) {

    next('not implemented yet');
};

/**
 * delete
 * Deletes a project
 *
 * @name delete
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `id` (String):  The project id (required).
 *
 * @param {Function} next The next function.
 */
exports.delete = function (options, data, next) {

    next('not implemented yet');
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