*Status: DEV*

PINF JavaScript Loader for Mozilla Addon-SDK
============================================

A [Mozilla Addon-SDK](https://developer.mozilla.org/en-US/Add-ons/SDK) [module](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Add_a_Menu_Item_to_Firefox) for
loading [PINF JavaScript Bundles](https://github.com/pinf/pinf-loader-js).


Install
-------

See `./examples/HelloWorld` and refer to [MDN Docs: Using third-party modules](https://developer.mozilla.org/en-US/Add-ons/SDK/Tutorials/Add_a_Menu_Item_to_Firefox).


Usage
-----

`lib/main.js`

	const { data } = require("sdk/self");
	const { sandbox } = require("pinf-for-mozilla-addon-sdk");

	sandbox(data.url("bundle.js"), function(sandbox) {
		sandbox.main();
	});

`data/bundle.js`

    PINF.bundle("", function(require) {
        require.memoize("/main.js", function(require, exports, module) {
            exports.main = function(options) {
                console.log("HelloWorld!");
            }
        });
    });


Test & Development
==================

Requirements:

  * [NodeJS](http://nodejs.org/) via [nvm](https://github.com/creationix/nvm)

Install:

	source bin/activate
	nvm use 0.10
	npm install

Run tests:

	bin/test

Run examples:

	test-example HelloWorld
	run-example HelloWorld

Build
-----

	bin/build


License
=======

[UNLICENSE](http://unlicense.org/)
