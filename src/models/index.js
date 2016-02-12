import mongoose from 'mongoose';

import NetCardSchema from './netcard';

import config from '../config';

mongoose.connect(config.mongoUrl);

const conn = mongoose.connection;
conn.on('open', () => {
  console.log(`connect to ${config.mongoUrl} success!`);
});

conn.on('error', (err) => {
  console.error(`connect to ${config.mongoUrl} error!`, err);
});

export default {
  NetCard: conn.model('NetCard', NetCardSchema),
};
