var mandrill = require('mandrill-api/mandrill');
var mandrill_client = new mandrill.Mandrill('4FIIiEwbJOPangXwn7_ZQA');

// send mail util function
exports.sendMail = function (options, callback) {

	var template = {
        'template_name': options.template,
        'template_content': [],
        'message': {
            'to': []
        }
    };

    // custom from email and name
    if (options.from) {
        template.message.from_email = options.from.email;
        if (options.from.name) {
            template.message.from_name = options.from.name;
        }
    }

    // handle TO array
    if (!options.tos || !options.tos.length) {
        return callback(new Error('No email destination provided.'));
    }
    for (var i = 0; i < options.tos.length; ++i) {
        template.message.to.push({
            'type': 'to',
            'email': options.tos[i]
        });
    }

    // add subject if given
    if (options.subject) {
        template.message.subject = options.subject;
    }

    // build merge vars
    if (options.merge_vars) {
        template.message.global_merge_vars = buildMergeVars(options.merge_vars);
    }

    // if custom headers
    if (options.headers) {
        template.message.headers = options.headers;
    }

    mandrill_client.messages.sendTemplate(template, function(result) {

        // check to see if rejected
        if (result[0].status === 'rejected' || result[0].status === 'invalid') {
            return callback(new Error(result[0].reject_reason) || new Error('Email is invalid.'));
        }
        return callback(null);

    }, function(e) {
        // Mandrill returns the error as an object with name and message keys
        callback(new Error('A mandrill error occurred: ' + e.name + ' - ' + e.message));
    });
}

/**
 *  Build the merge fields structure
 */
function buildMergeVars (data) {
    var global_merge_vars = [];

    for (var key in data) {
        var curVar = {
            name: key,
            content: data[key]
        }

        global_merge_vars.push(curVar);
    }

    return global_merge_vars;
}