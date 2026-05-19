const { EventEmitter } = require("events");

const domainEventBus = new EventEmitter();
domainEventBus.setMaxListeners(100);

module.exports = domainEventBus;
