import mongoose from 'mongoose';

import NetCard from './netcard';
import Order from './order';

import config from '../../config';
import log from '../lib/log';

mongoose.connect(config.mongoUrl);

const conn = mongoose.connection;
conn.on('open', () => {
  log.info(`connect to ${config.mongoUrl} success!`);
});

conn.on('error', (err) => {
  log.error(`connect to ${config.mongoUrl} error!`, err);
});

export default {
  NetCard,
  Order,
};
