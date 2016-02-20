/* eslint-disable no-param-reassign */
import XLSX from 'xlsx';
import mongoose from 'mongoose';
import Parameter from 'parameter';

import crypto from '../lib/crypto';
import config from '../../config';

const { Schema } = mongoose;
const cryptor = crypto(config.ekey);
const parameter = new Parameter();

const NetCardSchema = new Schema({
  ka: {
    type: String,
    unique: true,
  },
  mi: String,
  value: Number,
  batch: String,
  expireAt: Date,
  orderID: {
    type: String,
    default: '',
  },
  isUsed: {
    type: Boolean,
    default: false,
  },
});

function decrypt(netcard) {
  const { message } = cryptor.decrypt(netcard.mi);
  netcard.cardNo = netcard.ka;
  netcard.cardSecret = message;
}

NetCardSchema.statics.findAndMark = async function findAndMark({ orderID, value, count }) {
  let netcards;
  netcards = await this.find({ orderID }).exec();
  if (netcards.length) {
    netcards.forEach(decrypt);
    return netcards;
  }

  netcards = Array.from({ length: count }, async () => {
    const netcard = await this.findOneAndUpdate({
      value,
      orderID: '',
    }, { orderID }, { new: true }).sort({ ka: 1 }).exec();

    decrypt(netcard);
    return netcard;
  });

  return await Promise.all(netcards);
};

const netcardRule = {
  ka: 'string',
  mi: 'string',
  value: [20, 30, 50],
  batch: 'string',
  expireAt: 'date',
};

NetCardSchema.statics.parseNetCardFile = function parseNetCardFile(filePath, fileName) {
  const workBook = XLSX.readFile(filePath);

  const targetSheet = workBook.Sheets[workBook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(targetSheet);

  const batch = fileName.split('.')[0];
  const statistics = {
    batch,
    20: 0,
    30: 0,
    50: 0,
  };

  const netCardArr = [];
  for (const row of rows) {
    const netcard = {
      batch,
      ka: row['卡号'],
      mi: row['密码'],
      value: parseInt(row['面额(元)'], 10),
      expireAt: row['卡截止日期'],
    };

    const validateErr = parameter.validate(netcardRule, netcard);
    if (validateErr) throw validateErr;

    statistics[netcard.value] += 1;

    netcard.mi = cryptor.encrypt(netcard.ka, netcard.mi);
    netCardArr.push(netcard);
  }

  return { statistics, netCardArr };
};

NetCardSchema.path('ka').index({ unique: true });

export default mongoose.model('NetCard', NetCardSchema);
