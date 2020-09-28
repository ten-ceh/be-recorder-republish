'use strict';

const { v4: uuid } = require('uuid');

const generateData = ({
    id = uuid(),
    asset_id = uuid(),
    site_id = uuid(),
    date = new Date().toISOString().substring(0, 10)
} = {}) => ({
    id,
    asset_id,
    site_id,
    date,
    metadata: {
        duration: {
            milliseconds: 45913000,
            dayProportion: 0.531,
            humanReadable: '12:45:13'
        },
        timezone: 'America/New_York'
    },
    updatedAt: '2020-09-24T04:00:45.254Z',
    createdAt: '2020-09-24T04:00:45.254Z'
});

const generateErrors = ({ eventType = 'asset_site_utilization', data = [generateData(), generateData()] } = {}) => ({
    eventType,
    data
});

const sendErrors = async ({ bunnyBus, queue, errors }) => {
    for (const error of errors) {
        await bunnyBus.send({ message: error, queue });
    }
};

module.exports = { generateData, generateErrors, sendErrors };
