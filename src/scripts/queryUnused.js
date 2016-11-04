const Datastore = require('nedb');
const path = require('path');
const async = require('async');
const fs = require('fs');

const Cards = new Datastore({ filename: path.join(__dirname, 'cards.db'), autoload: true });
const unusedTxt = path.join(__dirname, 'unused.txt');
Cards.find({ isChecked: true, isCharged: false }, (err, cards) => {
  if (err) return console.error(err);

  const batches = {};
  const values = {
    20: 0,
    30: 0,
    50: 0,
  };
  const cardNos = [];
  async.each(cards, (card, callback) => {
    cardNos.push(card.ka);
    batches[card.batch] = batches[card.batch] || 0;
    batches[card.batch] += 1;
    values[card.value] += 1;
    callback();
  }, () => {
    cardNos.sort().forEach(cardNo => {
      fs.appendFileSync(unusedTxt, cardNo + '\n');
    });

    console.log('done');
  });
});
