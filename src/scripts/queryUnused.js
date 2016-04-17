const Datastore = require('nedb');
const path = require('path');
const async = require('async');

const Cards = new Datastore({ filename: path.join(__dirname, 'cards.db'), autoload: true });

Cards.find({ isChecked: true, isCharged: false }, (err, cards) => {
  if (err) return console.error(err);

  const batches = {};
  const values = {
    20: 0,
    30: 0,
    50: 0,
  };
  async.each(cards, (card, callback) => {
    batches[card.batch] = batches[card.batch] || 0;
    batches[card.batch] += 1;
    values[card.value] += 1;
    callback();
  }, () => {
    console.log(batches);
    console.log(values);
  });
});
