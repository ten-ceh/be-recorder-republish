'use strict';

const BunnyBus = require('@tenna-llc/bunnybus');
const Config = require('config');
const Reader = require('./Reader');
const Republish = require('./republish');
const { logger: Logger } = require('./helpers');

module.exports = (async () => {
    const logger = Logger();
    const bunnyBus = new BunnyBus(Config.bunnyBus);
    const filename = await new Reader({ options: Config.queues, bunnyBus, logger }).start();
    await new Republish({ options: Config.queues, bunnyBus, logger }).start({ filename });

    await logger.flush();

    console.log('DONE!!!!');
})();
