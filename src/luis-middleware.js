var request = require('request');

module.exports = {
    middleware: {
        receive: receive,
        hereIntent: hereIntent,
        hereAction: hereAction
    }
};

function receive(options) {
    if (!options || !options.serviceUri) {
        throw new Error('No LUIS service url specified.');
    }

    var serviceUri = options.serviceUri.trim();
	console.log(serviceUri.length);
    if (serviceUri.lastIndexOf('&q=') != serviceUri.length - 3) {
        serviceUri += '&q=';
    }
    var minThreshold = options.minThreshold || 0.1;
    var captureThreshold = options.captureThreshold || 0.7;
    return function (bot, message, next) {
        // We will only process the text and either there's no topIntent
        // or the score for the topIntent is below the captureThreshold.
        if (message.text &&
            (!message.topIntent || message.topIntent.score < captureThreshold)) {
            var uri = serviceUri + encodeURIComponent(message.text);
            request.get(uri, function (err, res, body) {
                try {
                    if (!err) {

                        var result = JSON.parse(body);
			    
			    console.log(result)

						if (result.topScoringIntent) {
							// API v2.0
							message.topIntent = result.topScoringIntent;
							message.entities = result.entities || [];
							message.action = result.topScoringIntent.actions && result.topScoringIntent.actions[0].triggered ? result.topScoringIntent.actions[0] : null;
						} else {
							// API v1.0

							// Intents for the builtin Cortana app don't return a score.
							if (result.intents.length == 1 && !result.intents[0].hasOwnProperty('score')) {
	                            result.intents[0].score = 1.0;
	                        }

	                        // Find top intent
	                        // - Only return entities for the model with the top intent.
	                        for (var i = 0; i < result.intents.length; i++) {
	                            var intent = result.intents[i];
	                            if (intent.score > minThreshold &&
	                                (!message.topIntent || intent.score > message.topIntent.score)) {
	                                message.topIntent = intent;
	                                message.entities = result.entities || [];
	                                message.action = intent.actions && intent.actions[0].triggered ? intent.actions[0] : null;
	                            }
	                        }
						}
                    } else {
                       console.error(err.toString());
                    }
                } catch (e) {
                    console.error(e.toString());
                }
                next();
            });
        } else {
            next();
        }
    };
}

function hereIntent(tests, message) {
    if (message.topIntent) {
        var intent = message.topIntent.intent.toLowerCase();
        for (var i = 0; i < tests.length; i++) {
            if (tests[i].trim().toLowerCase() == intent) {
                return true;
            }
        }
    }
    return false;
}

function hereAction(tests, message) {
    if (message.action) {
        var action = message.action.name.toLowerCase();
        for (var i = 0; i < tests.length; i++) {
            if (tests[i].trim().toLowerCase() == action) {
                return true;
            }
        }
    }
    return false;
}
