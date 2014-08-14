
PINF.bundle("", function(require) {
	require.memoize("/main.js", function(require, exports, module) {
		exports.main = function(options) {
			console.log("Hello World");			
		}
	});
}, {
    "hash": "sha256:2ba434dfcb3760f5fe4cc405d6dfe4f93f6b7a027758a9d7c8e3e45e00741351",
    "signature": "ecc:192af5f:215516cc7ad4e01cc961b1b63e84632668c108b41b1d1be0284e7c94836e94ba150f80252ae847b855e137ec19f2abc2"
});
