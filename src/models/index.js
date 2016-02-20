import mongoose from 'mongoose';

import NetCard from './netcard';
import Order from './order';

import config from '../../config';

mongoose.connect(config.mongoUrl);

const conn = mongoose.connection;
conn.on('open', () => {
  console.log(`connect to ${config.mongoUrl} success!`);
});

conn.on('error', (err) => {
  console.error(`connect to ${config.mongoUrl} error!`, err);
});

export default {
  NetCard,
  Order,
};
