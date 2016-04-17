/* eslint-disable no-console*/
'use strict';
const path = require('path');
const async = require('async');
const Datastore = require('nedb');
const Promise = require('bluebird');

import * as ruijieHelper from '../lib/ruijie-helper';

Promise.promisifyAll(Datastore.prototype);
const Cards = new Datastore({ filename: path.join(__dirname, 'cards.db'), autoload: true });

const selector = {
  isChecked: true,
  isCharged: false,
};

async function syncCardsStatus() {
  let loginResult;
  try {
    loginResult = await ruijieHelper.login({ stuid: 'test2', pswd: '654123' });
  } catch (e) {
    e.name = 'Login Ruijie Error';
    console.error(e);
    return;
  }

  if (loginResult.errcode !== 0) {
    console.error('登录失败，请检查重试！');
    return;
  }

  const cards = await Cards.findAsync(selector);

  let checkedCount = 0;
  const timer = setInterval(() => {
    console.log(`${checkedCount} / ${cards.length}`);
  }, 10e3);

  function done() {
    clearInterval(timer);
    console.log('done');
  }

  async.eachSeries(cards, async (card, callback) => {
    const query = Object.assign({}, loginResult);
    query.cardNo = card.ka;
    query.cardSecret = card.mi;
    let cardStatus;
    try {
      cardStatus = await ruijieHelper.getCardStatus(query);
    } catch (e) {
      console.log(`network error: ${card.ka}`);
      // when network error wait 30s before next query, and skip this card
      console.log('wait 30s...');
      setTimeout(() => callback(null), 30e3);
      return;
    }

    checkedCount += 1;
    const status = cardStatus.status;
    const stuid = cardStatus.stuid;
    // not normal status skip
    if (!~['已充值', '未充值'].indexOf(status)) {
      console.log(`status error: ${card.ka}`);
      callback(null);
      return;
    }

    const update = { isChecked: true };
    if (status === '已充值') {
      update.isCharged = true;
      update.chargeFor = stuid;
    } else {
      update.isCharged = false;
    }

    await Cards.updateAsync({ ka: card.ka }, { $set: update });
    callback(null);
  }, done);
}

syncCardsStatus();
