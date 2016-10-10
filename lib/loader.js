
// NOTE: This implementation follows a reference implementation
//       at: https://github.com/pinf/pinf-for-nodejs/blob/master/lib/loader.js

/*
const ASSERT = equire("assert");
const FS = equire("fs-extra");
*/
const LOADER_ORIGINAL = require("./vendor/pinf-loader-js/loader");
const SELF = require("sdk/self");
const SDK_LOADER = require('sdk/loader/sandbox');
const URL = require("sdk/net/url");


// @source https://github.com/substack/path-browserify/blob/9d4dca5e63012c9e5f3d9334848e3d03ed3f722d/index.js#L26
function normalizeArray(parts, allowAboveRoot) {
  // if the path tries to go above the root, `up` ends up > 0
  var up = 0;
  for (var i = parts.length - 1; i >= 0; i--) {
    var last = parts[i];
    if (last === '.') {
      parts.splice(i, 1);
    } else if (last === '..') {
      parts.splice(i, 1);
      up++;
    } else if (up) {
      parts.splice(i, 1);
      up--;
    }
  }

  // if the path is allowed to go above the root, restore leading ..s
  if (allowAboveRoot) {
    for (; up--; up) {
      parts.unshift('..');
    }
  }

  return parts;
}

// @source https://github.com/substack/path-browserify/blob/9d4dca5e63012c9e5f3d9334848e3d03ed3f722d/index.js#L208
function filter (xs, f) {
    if (xs.filter) return xs.filter(f);
    var res = [];
    for (var i = 0; i < xs.length; i++) {
        if (f(xs[i], i, xs)) res.push(xs[i]);
    }
    return res;
}

const PATH = {
	// @source https://github.com/substack/path-browserify/blob/9d4dca5e63012c9e5f3d9334848e3d03ed3f722d/index.js#L93
	// @patch Allow for `protocol://` prefixes in paths.
	normalize: function(path) {
	  var isAbsolute = PATH.isAbsolute(path),
	      trailingSlash = /\/$/.test(path);

	  // Normalize the path
	  path = normalizeArray(filter(path.split('/'), function(p) {
	    return !!p;
	  }), !isAbsolute).join('/');

	  if (!path && !isAbsolute) {
	    path = '.';
	  }
	  if (path && trailingSlash) {
	    path += '/';
	  }

	  return (isAbsolute ? '/' : '') + path;
	},
	// @source https://github.com/substack/path-browserify/blob/9d4dca5e63012c9e5f3d9334848e3d03ed3f722d/index.js#L118
	join: function() {
	  var paths = Array.prototype.slice.call(arguments, 0);
	  return PATH.normalize(filter(paths, function(p, index) {
	    if (typeof p !== 'string') {
	      throw new TypeError('Arguments to path.join must be strings');
	    }
	    return p;
	  }).join('/'));
	},
	// @source https://github.com/substack/path-browserify/blob/9d4dca5e63012c9e5f3d9334848e3d03ed3f722d/index.js#L113
	// @patch Determine `protocol://` to be absolute.
	isAbsolute: function(path) {
		if (path.charAt(0) === '/') return true;
		return /^[^:]+:\/\//.test(path);
	}
}


var LOADER = LOADER_ORIGINAL;

exports.sandbox = function(sandboxIdentifier, sandboxOptions, loadedCallback, errorCallback) {

	if (!sandboxIdentifier) {
		if (errorCallback) return errorCallback(new Error("'sandboxIdentifier' not specified"));
		throw new Error("'sandboxIdentifier' not specified");
	}

	if (typeof sandboxOptions === "function" && typeof loadedCallback === "function" && typeof errorCallback === "undefined") {
		errorCallback = loadedCallback;
		loadedCallback = sandboxOptions;
		sandboxOptions = {};
	} else
	if (typeof sandboxOptions === "function" && typeof loadedCallback === "undefined") {
		loadedCallback = sandboxOptions;
		sandboxOptions = {};
	} else {
		sandboxOptions = sandboxOptions || {};
	}

	var options = {};
	for (var key in sandboxOptions) {
		options[key] = sandboxOptions[key];
	}
	delete options.globals;


	var globals = {};

	if (sandboxOptions.global) {
		// NOTE: This will stop the module singleston reset from working on previous loaders!
		// TODO: Get report and reset working even with multiple loaders.
		LOADER = LOADER_ORIGINAL.Loader(sandboxOptions.global);
	}

	// TODO: Inject and fix environment based on options.
	globals.PINF = LOADER;
	// TODO: Wrap to `console` object provided by `sandboxOptions` and inject module info.
	globals.console = console;
	if (sandboxOptions.globals) {
		for (var name in sandboxOptions.globals) {
			globals[name] = sandboxOptions.globals[name];
		}
	}
	if (sandboxOptions.test && sandboxOptions.rootPath) {
		globals.TEST_ROOT_PATH = sandboxOptions.rootPath;
	}

	var sandbox = SDK_LOADER.sandbox(null, {
		sandboxName: "pinf.sandbox:" + sandboxIdentifier,
		wantXrays: false,
		sandboxPrototype: globals
	});

	sandboxOptions._realpath = function(path) {
		if (/^resource:\/\//.test(path)) {
			return path;
		}
		if (!sandboxOptions.rootPath) return path;
//		if (/^\/|:\/\//.test(path)) return path;
		return PATH.join(sandboxOptions.rootPath, path);
	}


	// Set our own loader for the sandbox.
	options.load = function(uri, loadedCallback) {

		if (/^(resource):\/\//.test(uri)) {
			try {
				SDK_LOADER.load(sandbox, uri);
			} catch(err) {
	            return loadedCallback(err);
			}
            return loadedCallback(null);
		} else
        if (/^(https?|file):\/\//.test(uri)) {
			return URL.readURI(uri).then(function (code) {
				try {
					SDK_LOADER.evaluate(sandbox, code, uri);
				} catch(err) {
		            return loadedCallback(err);
				}
	            return loadedCallback(null);
			}, loadedCallback);
        } else {
        	return loadedCallback(new Error("Unable to load code from uri: " + uri));
        }
	}

	function loadResolvedDynamicSync(uri, bundleIdentifier, options) {
		if (sandboxOptions.debug) {
			dump("[loader-for-nodejs] loadResolveDynamicSync" + " uri " + uri + " bundleIdentifier " + bundleIdentifier + "\n");
			console.log("[loader-for-nodejs] loadResolveDynamicSync", "uri", uri, "bundleIdentifier", bundleIdentifier);
		}

		// Load the bundle SYNCHRONOUSLY as new modules must be available before we return.
		var code = null;
		try {
			code = FS.readFileSync(sandboxOptions._realpath(uri), "utf8");
		} catch(err) {
			console.error("Error reading file: " + sandboxOptions._realpath(uri));
			throw err;
		}
		evalBundle(uri, code);

		// Activate the new modules from the bundle.
		return options.finalizeLoad(bundleIdentifier);
	}

	function getBundleBasePath(moduleObj) {

//		ASSERT.equal(typeof moduleObj.bundle, "string");

		return moduleObj.bundle.replace(/\.js$/, "");
	}

	var lastModuleRequireContext = null;

	options.onInitModule = function(moduleInterface, moduleObj, pkg, sandbox, options) {

		// The loader removes all double slashes so we need to add it back in here.
		// TODO: Fix the loader not to remove the double slashes.
		var m = moduleInterface.filename.match(/^([^:]+):\/(.+)$/);
		if (m) {
			moduleInterface.filename = m[1] + "://" + m[2];
		}

		moduleInterface.filename = sandboxOptions._realpath(moduleInterface.filename);

		var origRequire = moduleObj.require;

		moduleObj.require = function(identifier) {

			lastModuleRequireContext = {
				moduleObj: moduleObj
			};

			if (/^\./.test(identifier)) {

				var moduleIdentifier = PATH.normalize(options.resolveIdentifier(identifier)[1]).replace(/^[\/\.]$/, "");
	            if (moduleIdentifier) {
	            	if (!/^\//.test(moduleIdentifier)) {
		                moduleIdentifier = "/" + options.libPath + moduleIdentifier;
		            }
					var canonicalId = pkg.id + moduleIdentifier;
	            } else {
	            	moduleIdentifier = pkg.main;
					var canonicalId = moduleIdentifier;
	            }

				if (options.initializedModules[canonicalId] || options.moduleInitializers[canonicalId]) {
					return origRequire(identifier);
				}

				if (options.initializedModules[canonicalId.replace(/\.js$/, "/index.js")] || options.moduleInitializers[canonicalId.replace(/\.js$/, "/index.js")]) {
					return origRequire(identifier + "/index");
				}

				// We encountered a dynamic sync require.

				if (sandboxOptions.debug) console.log("[loader-for-nodejs][moduleObj.require] relative", "identifier", identifier, "pkg.id", pkg.id, "moduleIdentifier", moduleIdentifier, "canonicalId", canonicalId);

				var bundleBasePath = getBundleBasePath(moduleObj);

				var uri = null;

				if (typeof sandboxOptions.resolveDynamicSync === "function") {
					// We have a runtime bundler.
					uri = sandboxOptions.resolveDynamicSync(moduleObj, pkg, sandbox, canonicalId, options);
				} else {
//					uri = PATH.join(bundleBasePath, canonicalId.replace(/^\//, "").replace(/\//g, "+"));
					uri = PATH.join(bundleBasePath, canonicalId.replace(/^\//, ""));
				}

//				loadResolvedDynamicSync(uri, PATH.join(bundleBasePath, canonicalId.replace(/^\//, "").replace(/\//g, "+")), options);
				loadResolvedDynamicSync(uri, PATH.join(bundleBasePath, canonicalId.replace(/^\//, "")), options);

				// Now let the loader continue.
				return origRequire(identifier);

			} else {

				var splitIdentifier = identifier.split("/");

				if (typeof pkg.mappings[splitIdentifier[0]] !== "undefined") return origRequire(identifier);

				try {
					var canonicalId = options.resolveIdentifier(identifier)[1];

					if (options.initializedModules[canonicalId] || options.moduleInitializers[canonicalId]) {
						return origRequire(identifier);
					}
				} catch(err) {
					// We get here when running `pinf-it-bundler` tests.
				}

				// Check if we are delaing with a native nodejs module.
				// TODO: Use a better flag than '__' to indicate that module should be loaded here! Use proper versioned uri.
				if (splitIdentifier[0] === "__SYSTEM__") {
					// Check if the system module is memoized first. If it is it takes precedence.
					var canonicalId = identifier + ".js";
					if (options.initializedModules[canonicalId] || options.moduleInitializers[canonicalId]) {
						return origRequire(identifier);
					}
					return require(splitIdentifier.slice(1).join("/"));
				}
				// HACK: We catch any module IDs that were not re-written in the hope that we catch any system modules.
				// This happens when wrapping r.js for example which tests for nodejs and requires system modules.
				// These system module requires should be rewritten by now.
				// TODO: Set in config file how to resolve these system modules.
				try {
					if (require.resolve(identifier) === identifier) {
						return require(identifier);
					}
				} catch(err) {}

				// We encountered a dynamic sync require.

				if (sandboxOptions.debug) console.log("[loader-for-nodejs][moduleObj.require] absolute", "identifier", identifier, "pkg.id", pkg.id);

				if (typeof sandboxOptions.resolveDynamicSync === "function") {
					// We have a runtime bundler.

					var uri = sandboxOptions.resolveDynamicSync(moduleObj, pkg, sandbox, identifier, options);

					loadResolvedDynamicSync(uri, PATH.join(moduleObj.bundle.replace(/\.js$/, ""), identifier), options);

					// Now let the loader continue.
					return origRequire(identifier);
				}
			}

			// HACK: We catch any module IDs that were not re-written in the hope that we catch any system modules.
			// TODO: Set in config file how to resolve these system modules.
			try {
				if (require.resolve(identifier) === identifier) {
					return require(identifier);
				}
			} catch(err) {}

			throw new Error("Could not find module '" + identifier + "'");
		}

		for (var property in origRequire) {
			moduleObj.require[property] = origRequire[property];
		}

		// @see http://nodejs.org/docs/latest/api/globals.html
		moduleObj.require.resolve = function() {
			return origRequire.id.apply(null, arguments);
		}

		moduleObj.require.async = function(id, successCallback, errorCallback) {
			if (sandboxOptions.ensureAsync) {
				return sandboxOptions.ensureAsync(moduleObj, pkg, sandbox, id, options, function(err) {
					if (err) return errorCallback(err);
					return origRequire.async(id, successCallback, errorCallback);
				});
			}
			return origRequire.async(id, successCallback, errorCallback);
		}


		if (typeof sandboxOptions.onInitModule === "function") {
			sandboxOptions.onInitModule(moduleInterface, moduleObj);
		}
	};

	options.onInitPackage = function(pkg, sandbox, options) {
		var origRequire = pkg.require;

		pkg.require = function(moduleIdentifier) {
			var origModuleIdentifier = PATH.normalize(moduleIdentifier).replace(/^\.$/, "").replace(/^\/$/, "");

			var canonicalId = null;
			if (origModuleIdentifier) {
				moduleIdentifier = origModuleIdentifier;
            	if (!/^\//.test(moduleIdentifier)) {
	                moduleIdentifier = "/" + ((moduleIdentifier.substring(0, pkg.libPath.length)===pkg.libPath)?"":pkg.libPath) + moduleIdentifier;
	            }
				canonicalId = pkg.id + moduleIdentifier;
			} else
			if (pkg.descriptor && pkg.descriptor.main) {
				canonicalId = moduleIdentifier = pkg.descriptor.main;
			} else {
				moduleIdentifier = "";
				canonicalId = pkg.id;
			}

			if (options.initializedModules[canonicalId] || options.moduleInitializers[canonicalId]) {
				return origRequire(origModuleIdentifier);
			}

			// If `canonicalId` is just an alias we assume that the main module is memoized
			// if the package descriptor for the alias is memoized.

			if (!/\//.test(canonicalId)) {
				if (options.initializedModules[canonicalId + "/package.json"] || options.moduleInitializers[canonicalId + "/package.json"]) {
					return origRequire(origModuleIdentifier);
				}
			}

			// We encountered a dynamic sync require.

			if (sandboxOptions.debug) console.log("[loader-for-nodejs][pkg.require]", "moduleIdentifier", moduleIdentifier, "pkg.id", pkg.id, "canonicalId", canonicalId);

			var bundleBasePath = getBundleBasePath(lastModuleRequireContext.moduleObj);

			var uri = null;

			if (typeof sandboxOptions.resolveDynamicSync === "function") {
				// We have a runtime bundler.

				var opts = {};
				for (var name in options) {
					opts[name] = options[name];
				}
				opts.lastModuleRequireContext = lastModuleRequireContext;

				uri = sandboxOptions.resolveDynamicSync(null, pkg, sandbox, canonicalId, opts);
			} else {

				// We assume that `canonicalId` is a package ID (not an alias) as the package mapping should
				// already be loaded if requiring a dependency by alias using pure bundles (without runtime bundler).

				var canonicalIdParts = canonicalId.split("/");
				var packageId = canonicalIdParts.shift();
				var moduleId = canonicalIdParts.join("/");
//				uri = PATH.join(bundleBasePath, options.normalizeIdentifier((packageId + ((moduleId) ? "/" + moduleId : "")).replace(/\//g, "+")));
				uri = PATH.join(bundleBasePath, options.normalizeIdentifier(packageId + ((moduleId) ? "/" + moduleId : "")));
			}

//			loadResolvedDynamicSync(uri, PATH.join(bundleBasePath, canonicalId.replace(/\//g, "+")), options);
			loadResolvedDynamicSync(uri, PATH.join(bundleBasePath, canonicalId), options);

			// Now let the loader continue.
			return origRequire(origModuleIdentifier);
		};

		for (var property in origRequire) {
			pkg.require[property] = origRequire[property];
		}
	}
	return LOADER.sandbox(sandboxIdentifier, options, loadedCallback, errorCallback);
}

exports.getReport = LOADER.getReport;

exports.reset = LOADER.reset;
