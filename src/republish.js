'use strict';

const { readFile } = require('../src/helpers');

class Republish {
    constructor({ options, bunnyBus, logger }) {
        Object.assign(this, { options, bunnyBus, logger });
    }

    async start({ filename }) {
        this.logger.info(`Processing ${filename}`);
        const data = await readFile({ filename });

        for (const { message, metaData } of data) {
            // inspect message event type
            if (message.eventType === this.options.eventType) {
                //republish
                await this.publish({ message, metaData });
            } else {
                //requeue
                await this.requeue({ message, metaData });
            }
        }
    }

    async publish({ message: original, metaData }) {
        try {
            // clean payload
            const { data } = original;
            const values = {};
            for (const value of data) {
                Object.assign(values, { [data.id]: value });
            }

            // re publish
            const message = {
                ...original,
                data: Object.values(values)
            };
            await this.bunnyBus.publish({
                message,
                options: {
                    routeKey: `${this.options.namespace}.${this.options.eventType}`,
                    headers: metaData.headers
                }
            });

            this.logger.info({ message: 'Published', data: { original, message, metaData } });
        } catch (error) {
            this.logger.error({ error, message: original, metaData });
        }
    }

    async requeue({ message, metaData }) {
        try {
            // send back to to error queue
            await this.bunnyBus.send({ message, queue: this.options.errorQueue, options: metaData });

            this.logger.info({ message: 'Requeued', data: { message, metaData } });
        } catch (error) {
            this.logger.error({ error, message, metaData });
        }
    }
}

module.exports = Republish;
