'use strict';

const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const Config = require('config');
const Sinon = require('sinon');
const { v4: uuid } = require('uuid');

const BunnyBus = require('@tenna-llc/bunnybus');

const { generateErrors, generateData, sendErrors } = require('./helpers');

const { before, after, beforeEach, afterEach, describe, it } = (exports.lab = Lab.script());
const sandbox = Sinon.createSandbox();
const bunnyBus = new BunnyBus(Config.bunnyBus);
const options = Config.queues;

describe('Seeder', () => {
    beforeEach(async () => {
        await bunnyBus.createQueue({ name: options.errorQueue });
        await bunnyBus.purgeQueue({ name: options.errorQueue });
        sandbox.resetHistory();
    });

    it.only('should write error queue', async () => {
        const id = uuid();
        const errors = [
            generateErrors({ eventType: 'abc', data: [] }),
            generateErrors(),
            generateErrors({ data: [generateData({ id }), generateData({ id })] })
        ];
        await sendErrors({ bunnyBus, queue: options.errorQueue, errors });
    });
});
