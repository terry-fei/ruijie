const Datastore = require('nedb');
const path = require('path');

const Cards = new Datastore({ filename: path.join(__dirname, 'cards.db'), autoload: true });

const data = {
  20: 0,
  30: 0,
  50: 0,
  value: 0,
};

Cards.find({}, (err, cards) => {
  if (err) return console.error(err);

  cards.forEach(card => {
    data[card.value] += 1;
    data.value = data.value + card.value;
  });

  console.log(data);
});
