'use strict';

const Lab = require('@hapi/lab');
const { expect } = require('@hapi/code');
const Config = require('config');
const Sinon = require('sinon');
const { promises: FS } = require('fs');
const { v4: uuid } = require('uuid');

const Reader = require('../src/reader');
const Republish = require('../src/republish');
const BunnyBus = require('@tenna-llc/bunnybus');

const { logger } = require('../src/helpers');
const { generateErrors, sendErrors, generateData } = require('./helpers');

const { before, after, beforeEach, afterEach, describe, it } = (exports.lab = Lab.script());
const sandbox = Sinon.createSandbox();
const bunnyBus = new BunnyBus(Config.bunnyBus);
const options = Config.queues;
const reader = new Reader({ options, bunnyBus, logger: logger() });
const republish = new Republish({ options, bunnyBus, logger: logger() });

const bunnyBusSpy = sandbox.spy(bunnyBus);
const readerSpy = sandbox.spy(reader);
const republishSpy = sandbox.spy(republish);

describe('Republish', () => {
    beforeEach(async () => {
        await bunnyBus.createQueue({ name: options.errorQueue });
        await bunnyBus.purgeQueue({ name: options.errorQueue });
        sandbox.resetHistory();
    });

    it('should do nothing when empty file', async () => {
        const filename = await reader.start();
        await republish.start({ filename });

        expect(bunnyBusSpy.publish.called).to.be.false();
        expect(bunnyBusSpy.send.called).to.be.false();
        expect(republishSpy.publish.called).to.be.false();
        expect(republishSpy.requeue.called).to.be.false();

        await FS.unlink(filename);
    });

    it(`should republish and requeue`, async () => {
        const errors = [generateErrors({ eventType: 'abc', data: [] }), generateErrors()];

        await sendErrors({ bunnyBus, queue: options.errorQueue, errors });
        sandbox.resetHistory();

        const filename = await reader.start();
        await republish.start({ filename });

        // requeue
        expect(republishSpy.requeue.calledOnce).to.be.true();
        expect(bunnyBusSpy.send.calledOnce).to.be.true();
        expect(bunnyBusSpy.send.args[0][0]).to.part.contain({ message: errors[0], queue: options.errorQueue });

        // republish
        expect(republishSpy.publish.calledOnce).to.be.true();
        expect(bunnyBusSpy.publish.calledOnce).to.be.true();
        expect(bunnyBusSpy.publish.args[0][0]).to.part.contain({
            message: errors[1],
            options: { routeKey: `${options.namespace}.${options.eventType}` }
        });

        await FS.unlink(filename);
    });

    it(`should clean and republish`, async () => {
        const id = uuid();
        const errors = [generateErrors({ data: [generateData({ id }), generateData({ id }), generateData({ id })] })];

        await sendErrors({ bunnyBus, queue: options.errorQueue, errors });
        sandbox.resetHistory();

        const filename = await reader.start();
        await republish.start({ filename });

        // requeue
        expect(republishSpy.requeue.called).to.be.false();
        expect(bunnyBusSpy.send.called).to.be.false();

        // republish
        expect(republishSpy.publish.calledOnce).to.be.true();
        expect(bunnyBusSpy.publish.calledOnce).to.be.true();

        const clean = [errors[0].data[2]];
        expect(bunnyBusSpy.publish.args[0][0]).to.part.contain({
            message: { ...errors[0], data: clean },
            options: { routeKey: `${options.namespace}.${options.eventType}` }
        });

        await FS.unlink(filename);
    });
});
