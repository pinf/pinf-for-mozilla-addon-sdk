
const { data } = require("sdk/self");
const { sandbox } = require("pinf-for-mozilla-addon-sdk");

exports["test sandbox: Hello World"] = function(assert, done) {
	sandbox(data.url("bundle.js"), function(sandbox) {
		sandbox.main();
		assert.pass("HelloWorld sandbox running!");
		done();
	});
};

require("sdk/test").run(exports);
