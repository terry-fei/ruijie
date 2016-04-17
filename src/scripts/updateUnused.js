const Datastore = require('nedb');
const path = require('path');
const async = require('async');

import Models from '../models';
import crypto from '../lib/crypto';
import config from '../../config';

const cryptor = crypto(config.ekey);

const { NetCard } = Models;

const Cards = new Datastore({ filename: path.join(__dirname, 'cards.db'), autoload: true });

Cards.find({ isChecked: true, isCharged: false }, (err, cards) => {
  if (err) return console.error(err);

  async.each(cards, (card, callback) => {
    NetCard.findOne({ ka: card.ka }, (e1, targetCard) => {
      if (e1) return console.error(e1);

      if (!targetCard) {
        console.log('not found: ' + card.ka);
        NetCard.create({
          ka: card.ka,
          mi: cryptor.encrypt(card.ka, card.mi),
          value: card.value,
          expireAt: card.expireAt,
        }, callback);
      } else {
        NetCard.update({ ka: card.ka }, {
          $set: {
            isUsed: false,
            orderID: '',
          },
        }, callback);
      }
    });
  }, () => {
    console.log('done');
  });
});
