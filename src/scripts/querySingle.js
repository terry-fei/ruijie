const Datastore = require('nedb');
const path = require('path');

const Cards = new Datastore({ filename: path.join(__dirname, 'cards.db'), autoload: true });

Cards.findOne({ ka: 'D16053003' }, (err, card) => {
  if (err) return console.error(err);

  console.log(card);
});
