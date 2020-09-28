'use strict';

const { promises: FS } = require('fs');
const Path = require('path');
const Pino = require('pino');
const Papertrail = require('pino-papertrail');
const Config = require('config');

const inputFileName = ({ filename }) =>
    Path.resolve(__dirname, `../input/${process.env.NODE_ENV}-${filename}-${new Date().toISOString()}.json`);

const getFileHandle = async ({ filename }) => await FS.open(filename, 'a+');

const readFileHandle = async ({ fileHandle }) => await fileHandle.readFile({ encoding: 'utf8' });

const readFile = async ({ filename }) => {
    const fileHandle = await getFileHandle({ filename });
    const output = await readFileHandle({ fileHandle });
    await fileHandle.close();
    return JSON.parse(output);
};

const logger = () => {
    const ptStream = Papertrail.createWriteStream({ ...Config.papertrail });

    return Pino({}, ptStream);
};

module.exports = { inputFileName, getFileHandle, readFileHandle, readFile, logger };
