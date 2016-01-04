// TODO get the api key from a db
//var _DBAPIKEYS = {
//    "key": {
//        user: "userId",
//        apps: {
//            appId: "role"
//        }
//    }
//};

// check user access
//if (apiUser.user !== options.session.user) {
//    return next(new Error('Flow-API: Access denied (User has no access)'));
//}

// check application access
//var role = apiKey.apps[appId];
//if (!role) {
//    return next(new Error('Flow-API: Access denied (API Key has no rights to modify the app)'));
//}

module.exports = {
    key: function () {},
    cache: function () {}
    flow: function (options, data, next) {

        // check for apiKey
        data.key = data.key || options.key || options.session.key;
        if (!data.key) {
            return next(new Error('Flow-API: Access denied (No API Key found).'));
        }

        // check for application id
        data.app = data.app || options.app;
        if (!data.app) {
            return next(new Error('Flow-API: No AppID found.'));
        }

        // check for required composition name
        data.comp = data.comp || options.comp;
        if (options.compReq && !data.comp) {
            return next(new Error('Flow-API: Missing required composition name.'));
        }

        // receive a role or deny access
        data.role = Service.Access.cache(data.key, options.session.user, data.app);
        
        if (data.role instanceof Error) {
            return next(data.role);
        }

        if (!data.role) {
            return Service.Access.key(data.key, options.session.user, data.app, function (err, role) {

                if (err) {
                    return next(err);
                }

                data.role = role;
                next(null, data);
            });
        }

        next(null, data);
    }
};
