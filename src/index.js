'use strict';

const BunnyBus = require('@tenna-llc/bunnybus');
const Config = require('config');
const Reader = require('./Reader');
const Republish = require('./republish');
const { logger } = require('./helpers');

module.exports = (async () => {
    const bunnyBus = new BunnyBus(Config.bunnyBus);
    const filename = await new Reader({ options: Config.queues, bunnyBus, logger: logger() }).start();
    await new Republish({ options: Config.queues, bunnyBus, logger: logger() }).start({ filename });

    process.exit(0);
})();
