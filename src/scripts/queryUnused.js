const Datastore = require('nedb');
const path = require('path');

const Cards = new Datastore({ filename: path.join(__dirname, 'cards.db'), autoload: true });

Cards.find({ value: 50, isChecked: true, isCharged: false }, (err, cards) => {
  if (err) return console.error(err);

  console.log(cards);
  console.log(cards.length);
});
