// Dependencies
var crypto = require('crypto');
var utils = require('../utils');

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
            '@type': 'Person',
            'username': data.username,
            'email': [{
                'value': data.email,
                'primary': true,
                'active': false
            }],
            'password': _hashPassword(data.password, 'sha1')
        };

        // call service-api
        options._Service.User.create(userDocument, function (err, result) {

            if (err) {
                return next(err);
            }

            // find the emailId of the document
            options._Service.User.get(
                [
                    userDocument['@id']
                ],
                [
                    'http://schema.org/email',
                ], function (err, res) {

                if (err) {
                    return next(err);
                }
                if (!res || !res.jsonld) {
                    return next(new Error('Service-api.user.create: user not created.'));
                }
                var emailId = res.jsonld.email.id;

                // build the activation url
                var activationUrl = 'https://' + options.socket.upgradeReq.headers.host + '/flow/service_api:user.activateEmail?emailId=' + emailId;

                // send activation email
                utils.sendMail({
                    template: 'service-email-confirmation',
                    tos: [data.email],
                    merge_vars: {
                        activation_url: activationUrl,
                        user_email: data.email
                    }
                }, function (err) {

                    if (err) {
                        return next(err);
                    }

                    return next(null, {});
                });
            });
        });
    });
};

/**
 * activateEmail
 * activates email address of a user
 *
 * type http
 * @name activateEmail
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *
 * @param {Function} next The next function.
 */
exports.activateEmail = function (options, data, next) {
    var self = this;

    if (!options.req.query || !options.req.query.emailId) {
        return next('Service-api.user.activateEmail: No email id provided.');
    }
    var emailId = options.req.query.emailId;

    // get user with this email id
    options._Service.User.get(
        [
            emailId,
            ['Has', ['active', false]],
            ['Has', ['primary', true]],
            ['In', 'email']
        ],
        [
            'http://schema.org/email',
        ], function (err, res) {

        if (err) {
            return next(err);
        }
        if (!res || !res.jsonld) {
            return next(new Error('Service-api.user.activateEmail: Email id is inccorect or no longer valid.'));
        }

        // create an update data
        var updateData = {
            email: [res.jsonld.email]
        };
        updateData.email[0].active = true;

        // update user email
        options._Service.User.update(['email'], res.jsonld.id, updateData, function (err, response) {

            if (err) {
                return next(err);
            }

            // redirect to signin
            options.res.writeHead(302, {"location": "https://" + options.req.headers.host + "/signin"});

            return next(null, 'Email address activated.');
        });
    });
};


/**
 * sendEmailRecovery
 * sends a recovery email
 *
 * type http
 * @name sendEmailRecovery
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `email` (String):  The email of the user to recover (required).
 *
 * @param {Function} next The next function.
 */
exports.sendEmailRecovery = function (options, data, next) {
    var self = this;

    // check preconditions
    _checkRequired(data,
        [
            'email'
        ], function (err) {

        if (err) {
            return next(err);
        }

        // get user with this email
        options._Service.User.get( 
            [
                data.email,
                ['In', 'value'],
                ['Has', ['primary', true]],
                ['Has', ['active', true]],
                ['In', 'email']
            ],
            [
                'http://schema.org/email',
            ], function (err, res) {

            if (err) {
                return next(err);
            }
            if (!res || !res.jsonld) {
                return next(new Error('Service-api.user.sendEmailRecovery: User not found.'));
            }

            // create a security token
            options._Service.Access.createPwdResetToken(res.jsonld.id, function (err, token) {

                if (err) {
                    return next(err);
                }

                // build the recovery url
                var recoveryUrl = 'https://' + options.socket.upgradeReq.headers.host + '/reset/' + token

                // send activation email
                utils.sendMail({
                    template: 'service-account-recovery',
                    tos: [data.email],
                    merge_vars: {
                        recovery_url: recoveryUrl,
                        user_email: data.email
                    }
                }, function (err) {

                    if (err) {
                        return next(err);
                    }
                    return next(null, {});
                });
            });
        });
    });
};

/**
 * validatePwdResetToken
 * validates a password reset security token
 *
 * @name validatePwdSecurityToken
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `securityToken` (String): The security token (required)
 *
 * @param {Function} next The next function.
 */
exports.validatePwdResetToken = function (options, data, next) {

    if (!data.securityToken) {
        return next(new Error('Service-api.user.validatePwdResetToken: Security token not provided.'));
    }

    options._Service.Access.validatePwdResetToken(data.securityToken, function (err, res) {

        if (err) {
            return next(err);
        }

        if (!res.valid) {
            return next(new Error('Service-api.user.validatePwdResetToken: Security token not valid.'));
        } else {
            return next(null, {});
        }
    });
}

/**
 * resetPassword
 * Resets the user of a password
 *
 * @name resetPassword
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `securityToken` (String): The security token (required)
 *  - `newPassword` (String):  The new password (required).
 *  - `confirmPassword` (String):  Confirm new password (required).
 *
 * @param {Function} next The next function.
 */
exports.resetPassword = function (options, data, next) {
    options.session = options.session || {};

    // check preconditions
    _checkRequired(data,
        [
            'securityToken',
            'newPassword',
            'confirmPassword'
        ], function (err) {

        if (err) {
            return next(err);
        }

        // new password and confirm must match
        if (data.newPassword !== data.confirmPassword) {
            return next(new Error('Service-api.user.resetPassword: Passwords do not match.'));
        }

        // get user from token
        options._Service.Access.validatePwdResetToken(data.securityToken, function (err, res) {

            if (err) {
                return next(err);
            }

            if (!res.valid || !res.userId) {
                return next(new Error('Service-api.user.resetPassword: Security token not valid.'));
            };

            // update password
            var fields = [ 'password'];
            var updateData = {
                password: _hashPassword(data.newPassword, 'sha1')
            };
            
            // call service-api
            options._Service.User.update(fields, res.userId, updateData, function (err, res) {

                if (err) {
                    return next(err);
                }

                // remove token
                options._Service.Access.deletePwdResetToken(data.securityToken, next);
            });
        });
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
    options.session = options.session || {};

    // take username from session if not username provided
    var username = data.username;
    if (!username && options.session.id) {
        username = options.session.id.split('/').pop();
    }

    // call service-api
    options._Service.User.get(
        [
            username,
            ['In', 'username']
        ], 
        [
            'http://schema.org/email',
            'http://schema.org/givenName',
            'http://schema.org/familyName',
            'http://schema.org/address',
            'http://schema.org/website',
            'http://schema.org/worksFor',
            'http://schema.org/alternateName'
        ], function (err, res) {

        if (err) {
            return next(err);
        }
        if (!res || !res.jsonld) {
            return next(new Error('Service-api.user.get: User not found.'));
        }

        return next(null, res.jsonld);
    });
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
 * updateUsername
 * Updates the username field of a user
 *
 * @name updateUsername
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `username` (String):  The new username (required).
 *
 * @param {Function} next The next function.
 */
exports.updateUsername = function (options, data, next) {
    options.session = options.session || {};

    var fields = [ 'username' ];
    var updateData = {
        username: data.username || '',
    };

    return next(new Error("Service-api.user.changeUsername: Not implemented yet."));
    
    // call service-api
    options._Service.User.update(fields, options.session.id, updateData, next);
};

/**
 * changePassword
 * Changes the password of a user
 *
 * @name changePassword
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `oldPassword` (String):  The old password (required).
 *  - `newPassword` (String):  The new password (required).
 *  - `confirmPassword` (String):  Confirm new password (required).
 *
 * @param {Function} next The next function.
 */
exports.changePassword = function (options, data, next) {
    options.session = options.session || {};

    // check preconditions
    _checkRequired(data, 
        [
            'oldPassword',
            'newPassword',
            'confirmPassword'
        ], function (err) {

        if (err) {
            return next(err);
        }

        // new password and confirm must match
        if (data.newPassword !== data.confirmPassword) {
            return next(new Error('Service-api.user.changePassword: Passwords do not match.'));
        }

        // get old password
        var userId = options.session.id;
        options._Service.User.get([userId], ['https://w3id.org/security#password'], function (err, res) {

            if (err) {
                return callback(err);
            }
            if (!res || !res.jsonld) {
                return next(new Error('Service-api.user.changePassword: User not found.'));
            }

            // validate old password
            data.oldPassword = _hashPassword(data.oldPassword, 'sha1');
            if (data.oldPassword !== res.jsonld.password) {
                return next(new Error('Service-api.user.changePassword: Incorrect password.'));
            }

            // update password
            var fields = [ 'password'];
            var updateData = {
                password: _hashPassword(data.newPassword, 'sha1')
            };
            
            // call service-api
            options._Service.User.update(fields, options.session.id, updateData, next);
        });
    });
};

/**
 * addEmail
 * Assigns email address to user
 *
 * @name addEmail
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `email` (String):  The email address (required).
 *
 * @param {Function} next The next function.
 */
exports.addEmail = function (options, data, next) {
    options.session = options.session || {};

    // call service-api
    options._Service.User.addEmail(data.email, options.session.id, function (err, response) {

        if (err) {
            return next(err);
        }

        // if all went ok sent back the added email
        next(null, {
            value: data.email,
            active: false,
            primary: false
        });
    });
};

/**
 * getEmails
 * gets all emails of a user
 *
 * @name getEmail
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `userId` (String):  The id of the user.
 *
 * @param {Function} next The next function.
 */
exports.getEmails = function (options, data, next) {
    options.session = options.session || {};

    if (!data.userId && !options.session.id) {
        return next(new Error('Service-api.user.getEmails: User id not provided.'));
    }

    var userId = data.userId || options.session.id;

    // call service-api
    options._Service.User.getEmails(userId, function (err, result) {

        if (err) {
            return next(err);
        }
        if (!result || !result.emails || !result.emails.length) {
            return next(new Error("No email found."));
        }

        // check if multiple items inside document
        result.emails.forEach(function (item) {
            next(item, true);
        });
        next(null, null)
    });
};

/**
 * deleteAccount
 * deletes user account
 *
 * @name deleteAccount
 * @function
 * @param {Object} options Object containig data handler options
 * @param {Object} data An object containing the following fields:
 *
 *  - `password` (String):  The user password (required).
 *
 * @param {Function} next The next function.
 */
exports.deleteAccount = function (options, data, next) {
    options.session = options.session || {};

    // check preconditions
    _checkRequired(data,
        [
            'password',
        ], function (err) {

        if (err) {
            return next(err);
        }

        // get the current user
        userId = options.session.id;
        options._Service.User.get([userId], [ 'https://w3id.org/security#password' ], function (err, result) {

            if (err) {
                return next(err);
            }
            if (!result || !result.jsonld) {
                return next(new Error('Service-api.user.deleteAccount: User not found'));
            }
            var user = result.jsonld;
            user.id = user.id || user['@id'];

            if (user.password !== _hashPassword(data.password, 'sha1')) {
                return next(new Error('Service-api.user.deleteAccount: Password is incorrect'));
            }

            // delete user
            options._Service.User.delete(user.id, next);
        });
    });
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
 *  - `email` (String):  The user email (required).
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
    options._Service.User.authenticate(data.email, data.password, function (err, valid, userInfo) {

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
            return next(new Error('Service-api.user.authenticate: email/password invalid.'));
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