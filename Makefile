test:
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec -t 25s test/spec/unit/*.js test/spec/integration/*.js
test-unit:
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec -t 1s test/spec/unit/*.js
test-server:
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec -t 5s test/spec/integration/server.js
test-load:
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec -t 25s test/spec/integration/load.js
.PHONY: test test-unit test-server
