// Dependencies
var config = require('./config');

/* Public functions */

/**
 * access
 * Checks if a user has access to a service-api method
 *
 * @name access
 * @function
 * @param {Object} options Object containig the following fields:
 *
 *  - `target` (String): The target id (optional).
 *  - 'apiName' (String): The name of api the role will be checked against (required).
 *
 * @param {Object} data
 * @param {Function} next The next function.
 */
module.exports = function (options, data, next) {
	var self = this;

	if (!options.apiName) {
		return next(new Error('Flow-service-api.access: No api name provided'));
	}

	// check session
	if (!options.session || !options.session.id) {
		return next(new Error('Flow-service-api.access: Access denied!'));
	}
	var user = options.session.id;
	var target = data.target || options.target || null;
	var apiConfig = getApiConfig(options.apiName);

	// an api config must exist
	if (!apiConfig) {
		return next(new Error('Flow-service-api.access: Access denied!'));
	}

	// BIG TODO also check for the target type

	// get user role over the given target
	getUserRole.call(self, user, target, options._Service, function (err, role) {

		if (err) {
			return next(new Error('Flow-service-api.access: ' + err.message));
		}
		if (!role) {
			return next(new Error('Flow-service-api.access: Access denied!'));
		}

		// check access
		if (apiConfig.access.indexOf(role) < 0) {
			return next(new Error('Flow-service-api.access: Access denied!'));
		}

		return next(null, data);
	});
};

/* End public functions */
/* Private functions */

function getUserRole (user, target, ServiceApi, callback) {
	var self = this;

	// if no target provided it means the user is the target
	if (!target || target === user) {
		return callback(null, 'admin')
	}

	ServiceApi.Access.role(user, target, callback);
}

function getApiConfig (apiName) {

	var splits = apiName.split('.');
	var result = config;

	for (var i = 0; i < splits.length; ++i) {

		if (typeof result[splits[i]] !== 'undefined') {
			result = result[splits[i]];
		} else {
			return null;
		}
	}

	if (!result.access) {
		return null;
	}
	return result;
}

/* End private functions */