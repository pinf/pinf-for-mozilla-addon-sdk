
// NOTE: This implementation follows a reference implementation
//       at: https://github.com/pinf/pinf-for-jquery/blob/master/test/browser/loader-bundles.js

const Q = require("./vendor/q");
const { data } = require("sdk/self");
const { sandbox } = require("pinf-for-mozilla-addon-sdk");


var logBuffer = {};
var featuresPath = "vendor/pinf-loader-js/features";

function logToBuffer(moduleObj, arguments) {
    var uri = moduleObj.require.sandbox.id + moduleObj.id;
    if (uri.substring(0, featuresPath.length) === featuresPath) {
        uri = uri.substring(featuresPath.length);
    }
    logBuffer[uri] = arguments[0];
}

var config = {
    onInitModule: function(moduleInterface, moduleObj) {
        moduleObj.require.API = {
            Q: Q,
            FETCH: function(uri, callback) {
console.log("fetch", uri);
throw "stop";            	
                return $.get(uri).done(function(data, textStatus, jqXHR) {
                    return callback(null, data);
                }).fail(function(jqXHR, textStatus, errorThrown) {
                    return callback(new Error((errorThrown && errorThrown.message) || textStatus));
                });
            }
        };
        moduleInterface.log = function() {
            logToBuffer(moduleObj, arguments);
        };
        moduleInterface.logForModule = function(moduleObj, arguments) {
            logToBuffer(moduleObj, arguments);
        };
    }
};

function getFeatures() {
	return [
		// NOTE: DO NOT EDIT THIS LIST! IT IS AUTO-GENERATED ON `make build`.
		// @inject <features>
		'01-HelloWorld',
		'02-ReturnExports',
		'03-SpecifyMain',
		'04-PackageLocalDependencies',
		'05-CrossPackageDependencies',
		'06-JsonModule',
		'07-TextModule',
		'08-ResourceURI',
		'09-LoadBundle',
		'10-Sandbox',
		'11-CrossDomain',
		'12-Environment',
		'13-AssignExports',
		'14-NamedBundle',
		'15-GlobalDependencyFallback',
		'16-MemoizedDynamic',
		'17-LoadPackageDependency'
		// @inject </features>
	];
}

getFeatures().forEach(function(feature) {
	exports["test loader-bundles: " + feature] = function(assert, _done) {
		function done(err) {
			if (err) {
				console.log(err.stack);
				assert.fail("error");
			}
			return _done();
		}
	   	return sandbox(data.url(featuresPath + "/" + feature + ".js"), config, function(sandbox) {
	   		try {
	            return Q.when(sandbox.main({
	                debug: true
	            }), function() {
					assert.pass("ok");
	                return done(null);
	            }).fail(function (err) {
					return done(err);
	            });
	   		} catch(err) {
				return done(err);
	   		}
    	}, done);
    };
});

/*
exports["test verify output"] = function(assert, done) {
	assert.deepEqual(logBuffer, {
	    "/01-HelloWorld/main.js": "Hello from 01-HelloWorld!",
	    "/02-ReturnExports/main.js": "Hello from 02-ReturnExports!",
	    "/03-SpecifyMain/init.js": "Hello from 03-SpecifyMain!",
	    "/04-PackageLocalDependencies/main.js": "Hello from 04-PackageLocalDependencies!",
	    "/05-CrossPackageDependenciespackageA/logger.js": "Hello from 05-CrossPackageDependencies!",
	    "/06-JsonModule/main.js": "Hello from 06-JsonModule!",
	    "/07-TextModule/main.js": "Hello from 07-TextModule!",
	    "/08-ResourceURI/main.js": "Hello from 08-ResourceURI!",
	    "/09-LoadBundle/main.js": "Hello from 09-LoadBundle!",
	    "/09-LoadBundle/ExtraBundle.js": "Hello from 09-LoadBundle/ExtraBundle!",
	    "/10-Sandbox/main.js": "Hello from 10-Sandbox!",
	    "/10-Sandbox/SandboxedExtraBundle/main.js": "Hello from 10-Sandbox/SandboxedExtraBundle!",
	    "/11-CrossDomain/main.js": "Hello from 11-CrossDomain!",
	    "https://raw.github.com/pinf/pinf-loader-js/master/features/11-CrossDomain/CrossDomainBundle/main.js": "Hello from 11-CrossDomain/CrossDomainBundle!",
	    "/12-Environment/main.js": "Hello from 12-Environment!",
	    "/13-AssignExports/main.js": "Hello from 13-AssignExports!",
	    "/14-NamedBundle/main.js": "Hello from 14-NamedBundle!",
	    "/15-GlobalDependencyFallbackpackageA/logger.js": "Hello from 15-GlobalDependencyFallback!",
	    "/16-MemoizedDynamic/main.js": "Hello from 16-MemoizedDynamic!",
			"/16-MemoizedDynamic/Dynamic.js": "Hello from 16-MemoizedDynamic/Dynamic!",
			"/17-LoadPackageDependency/main.js": "Hello from 17-LoadPackageDependency!",
		"/17-LoadPackageDependencyExtraPackageID/ExtraModule.js": "Hello from 17-LoadPackageDependency/ExtraPackageID/ExtraModule!"
	});
	assert.pass("ok");
};
*/

require("sdk/test").run(exports);

