/* eslint-disable no-param-reassign */
import moment from 'moment';

import kdtApi from './kdt-api';
import wechatApi from './wechat-api';
import Models from '../models';

const { Order } = Models;

async function notify() {
  let orders;
  try {
    orders = await Order.find({ isNotified: false }).exec();
  } catch (e) {
    e.name = '[NotifyBuyer] Get Not Notified Oders Error';
    console.error(e);
    return;
  }

  orders.forEach(async (order) => {
    // most try three times
    if (order.tryNotifyTimes > 3) {
      order.isNotified = true;
      order.save();
      return;
    }

    const opts = {
      fields: 'weixin_openid',
      user_id: order.weixinID,
    };

    let fetchOpenidResult;
    try {
      fetchOpenidResult = await kdtApi.fetchOpenid(opts);
    } catch (e) {
      e.name = '[NotifyBuyer] Get Buyer Openid Error';
      console.error(e);
      return;
    }

    let openid;
    if (fetchOpenidResult.response) {
      openid = fetchOpenidResult.response.user.weixin_openid;
    }

    order.openID = openid;
    order.tryNotifyTimes = order.tryNotifyTimes || 0;
    order.tryNotifyTimes += 1;
    await order.save();

    const sendResult = await wechatApi.sendChargeCard(order);

    if (sendResult.errcode) return;

    order.isNotified = true;
    order.save();
  });
}

async function sync() {
  const opts = Object.assign({}, kdtApi.defaultOpts);

  // let latestOrder;
  // try {
  //   latestOrder = await Order.find().sort('-createAt -_id').limit(1).exec();
  // } catch (e) {
  //   e.name = '[SyncOrder] Get Latest Order Error';
  //   console.error(e);
  //   return;
  // }
  //
  // const date = latestOrder[0] ? moment(latestOrder[0].createAt) : moment();
  // opts.start_created = date.format('YYYY-MM-DD HH:mm:ss');

  let result;
  try {
    result = await kdtApi.fetchOrders(opts);
  } catch (e) {
    e.name = '[SyncOrder] Fetch Orders Error';
    console.error(e);
    return;
  }

  const trades = result && result.response && result.response.trades;

  if (!trades) return;

  trades.forEach(async (trade) => {
    let value = 0;
    if (trade.num_iid === '3032588') value = 50;
    if (trade.num_iid === '3032892') value = 30;
    if (trade.num_iid === '3032912') value = 20;

    if (value === 0) return;

    let order;
    try {
      order = await Order.findOne({ orderID: trade.tid }).exec();
    } catch (e) {
      e.name = '[SyncOrder] get order error';
      console.error(e);
      return;
    }

    if (order) {
      await kdtApi.applyVirtualCode({ code: order.orderID });
      return;
    }

    const createAt = moment(trade.created, 'YYYY-MM-DD HH:mm:ss');

    const newOrder = {
      value,
      createAt,
      orderID: trade.tid,
      weixinID: trade.weixin_user_id,
      count: trade.num,
    };

    try {
      await Order.create(newOrder);
    } catch (e) {
      e.name = '[SyncOrder] create new order fail';
      console.error(e);
    }

    await kdtApi.applyVirtualCode({ code: order.orderID });
  });

  setTimeout(notify, 1000);
}

setInterval(sync, 10000);
