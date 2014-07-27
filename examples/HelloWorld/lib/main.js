
const { data } = require("sdk/self");
const { sandbox } = require("pinf-for-mozilla-addon-sdk");


sandbox(data.url("bundle.js"), function(sandbox) {
	sandbox.main();
});
