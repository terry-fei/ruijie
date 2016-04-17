/* eslint-disable no-console*/
'use strict';
const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const Datastore = require('nedb');

const Cards = new Datastore({ filename: path.join(__dirname, 'cards.db'), autoload: true });

Cards.ensureIndex({ fieldName: 'ka', unique: true }, (err) => {
  if (err) console.log(err);
});

const NET_CARDS_PATH = '/Volumes/FEIT/all-cards/';

fs.readdirSync(NET_CARDS_PATH).filter(fileName => fileName.startsWith('201')).forEach(fileName => {
  const filePath = path.join(NET_CARDS_PATH, fileName);
  let workBook;
  try {
    workBook = XLSX.readFile(filePath);
  } catch (error) {
    console.warn(`parse File Failed -> ${filePath}`);
    return process.exit(1);
  }

  const workSheet = workBook.Sheets[workBook.SheetNames[0]];
  const netCardRows = XLSX.utils.sheet_to_json(workSheet);

  const batch = fileName.split('.')[0];
  netCardRows.forEach(row => {
    const newCard = {
      ka: row['卡号'],
      mi: row['密码'],
      value: parseInt(row['面额(元)'], 10),
      batch,
      expireAt: row['卡截止日期'],
      chargeFor: '',
      isChecked: false,
      isCharged: false,
    };

    Cards.findOne({ ka: newCard.ka }, (err, card) => {
      if (err) return console.error(err);
      if (!card) Cards.insert(newCard);
    });
  });
});
