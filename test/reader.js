'use strict';

const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const Config = require('config');
const Sinon = require('sinon');
const { promises: FS } = require('fs');
const { v4: uuid } = require('uuid');

const Reader = require('../src/reader');
const BunnyBus = require('@tenna-llc/bunnybus');

const { readFile, logger } = require('../src/helpers');
const { generateErrors, sendErrors } = require('./helpers');

const { before, after, beforeEach, afterEach, describe, it } = (exports.lab = Lab.script());
const sandbox = Sinon.createSandbox();
const bunnyBus = new BunnyBus(Config.bunnyBus);
const options = Config.queues;
const reader = new Reader({ options, bunnyBus, logger: logger() });

const bunnyBusSpy = sandbox.spy(bunnyBus);
const readerSpy = sandbox.spy(reader);

describe('Reader', () => {
    beforeEach(async () => {
        await bunnyBus.createQueue({ name: options.errorQueue });
        await bunnyBus.purgeQueue({ name: options.errorQueue });
        sandbox.resetHistory();
    });

    it('should not write empty queue', async () => {
        const filename = await reader.start();

        expect(bunnyBusSpy.getAll.calledOnce).to.be.true();
        expect(bunnyBusSpy.getAll.args[0][0]).to.contain({ queue: options.errorQueue });
        expect(readerSpy.dump.called).to.be.false();

        const output = await readFile({ filename });
        expect(output).to.equal([]);

        await FS.unlink(filename);
    });

    it('should write error queue', async () => {
        const errors = [generateErrors({ eventType: 'abc', data: [] }), generateErrors({ eventType: '123', data: [] })];
        await sendErrors({ bunnyBus, queue: options.errorQueue, errors });

        const filename = await reader.start();

        expect(bunnyBusSpy.getAll.calledOnce).to.be.true();
        expect(bunnyBusSpy.getAll.args[0][0]).to.contain({ queue: options.errorQueue });
        expect(readerSpy.dump.calledTwice).to.be.true();

        const output = await readFile({ filename });
        expect(output.length).to.equal(errors.length);

        for (let i = 1; i < errors.length; i = i + 1) {
            expect(output[i].mesaage).to.equal(errors[i].message);
        }

        await FS.unlink(filename);
    });
});
