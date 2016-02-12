import XLSX from 'xlsx';
import mongoose from 'mongoose';

import Crypto from '../lib/crypto';
import config from '../config';

const { Schema } = mongoose;
const crypto = Crypto(config.ekey);

const NetCardSchema = new Schema({
  ka: {
    type: String,
    unique: true,
  },
  mi: String,
  value: Number,
  batch: String,
  expireAt: Date,
  orderID: String,
  isUsed: {
    type: Boolean,
    default: false,
  },
});

NetCardSchema.path('ka').index({ unique: true });

export default NetCardSchema;
