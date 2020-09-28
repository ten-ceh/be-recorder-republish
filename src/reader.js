'use strict';

const { inputFileName, getFileHandle } = require('./helpers');

class Reader {
    constructor({ options, bunnyBus, logger }) {
        Object.assign(this, { options, bunnyBus, logger });
    }

    async start() {
        const filename = inputFileName({ filename: this.options.filename });

        const output = await getFileHandle({ filename });
        await output.appendFile('[\n');
        let comma = false;
        let count = 0;

        // read error queue
        await this.bunnyBus.getAll({
            queue: this.options.errorQueue,
            handler: async ({ ...args }) => {
                await this.dump({ comma, output, ...args });
                comma = true;
                count++;
            }
        });

        await output.appendFile(']\n');
        await output.close();

        this.logger.info(`Read ${count} messages into ${filename}`);

        return filename;
    }

    async dump({ comma, output, message, metaData, ack }) {
        await output.appendFile(`${comma ? ',' : ''}${JSON.stringify({ message, metaData })}\n`);
        await ack();
    }
}

module.exports = Reader;
