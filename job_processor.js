var EventEmitter = require('events').EventEmitter;

var JobProcessor = function(concurrency, host, port){
	var queue = [];
	var settings = {
		concurrency: concurrency,
		host: host,
		port: port
	};
};

JobProcessor.prototype.addToQueue = function(url, payload, timeout){
	this.queue.push({
		url: url,
		payload: payload,
		timeout: timeout
	});
}

module.exports = JobProcessor;
