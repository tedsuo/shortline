test:
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec -t 5s test/spec/unit/*.js test/spec/integration/*.js
test-unit:
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec -t 5s test/spec/unit/*.js
test-server:
	@NODE_ENV=test ./node_modules/.bin/mocha -R spec -t 5s test/spec/integration/server.js
.PHONY: test test-server
