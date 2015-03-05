
const { data:DATA } = require("sdk/self");
const { sandbox:SANDBOX } = require("pinf-for-mozilla-addon-sdk");


exports.main = function (options, callbacks) {

	SANDBOX(DATA.url("bundle.js"), function(sandbox) {

		sandbox.main();
	});
};

exports.onUnload = function () {
};
