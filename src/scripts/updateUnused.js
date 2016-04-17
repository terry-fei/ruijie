const Datastore = require('nedb');
const path = require('path');

import Models from '../models';

const { NetCard } = Models;

const Cards = new Datastore({ filename: path.join(__dirname, 'cards.db'), autoload: true });

Cards.find({ isChecked: true, isCharged: false }, (err, cards) => {
  if (err) return console.error(err);

  cards.forEach(card => {
    NetCard.update({ ka: card.ka }, {
      $set: {
        isUsed: false,
        orderID: '',
      },
    }, (e1, row) => {
      if (e1) console.error(err);
      if (!row.nModified) console.log(`Card Not Found: ${card.ka}`);
    });
  });
});
