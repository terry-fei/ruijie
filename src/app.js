import fs from 'fs';
import path from 'path';
import ejs from 'ejs';
import express from 'express';
import moment from 'moment';
import bodyParser from 'body-parser';
import { IncomingForm } from 'formidable';
import LruCache from 'lru-cache';
import { STATUS_CODES } from 'http';
import Parameter from 'parameter';

import config from '../config';
import Models from './models';
import * as ruijieHelper from './lib/ruijie-helper';
import wechatApi from './lib/wechat-api';
import kdtApi from './lib/kdt-api';
import crypto from './lib/crypto';
import log from './lib/log';

const { NetCard, Order } = Models;
const parameter = new Parameter();
const cryptor = crypto(config.ekey);

const lruCache = new LruCache({
  maxAge: 1000 * 60 * 1,
});

export const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.set('views', path.join(__dirname, '..', 'views'));
app.set('view engine', 'html');
app.engine('html', ejs.renderFile);

const valueToNumiid = {
  50: '3032588',
  30: '3032892',
  20: '3032912',
};

const warningCout = 150;
const delistingCount = 20;
const checkSku = async (force) => {
  const v50sku = await NetCard.count({ value: 50, isUsed: false }).exec();
  const v30sku = await NetCard.count({ value: 30, isUsed: false }).exec();
  const v20sku = await NetCard.count({ value: 20, isUsed: false }).exec();

  if (v50sku === warningCout || v30sku === warningCout || v20sku === warningCout || force) {
    await wechatApi.sendToAdmin('库存通知', `
      面值 50 元网票
      剩余 ${v50sku} 张
      面值 30 元网票
      剩余 ${v30sku} 张
      面值 20 元网票
      剩余 ${v20sku} 张
    `);
  }

  const delisting = async (value, count) => {
    if (count === delistingCount) {
      const numiid = valueToNumiid[value];
      await kdtApi.delisting({ num_iid: numiid });
    }
  };

  await delisting(50, v50sku);
  await delisting(30, v30sku);
  await delisting(20, v20sku);
};

app.get('/', async (req, res) => {
  res.end(STATUS_CODES[401]);
});

app.get('/sku/check', async (req, res) => {
  await checkSku(true);
  res.send('done');
});

// netcards
app.post('/upcards', (req, res) => {
  const form = new IncomingForm();
  form.parse(req, (err, fields, files) => {
    if (err) {
      log.error(err);
      return res.json({ errcode: 1, errmsg: 'upload file error' });
    }

    const filePath = files.file.path;
    const fileName = fields.name;

    let result;
    try {
      result = NetCard.parseNetCardFile(filePath, fileName);
    } catch (e) {
      log.error(e);
      return res.json({ errcode: 2, errmsg: 'parse netcard file fail' });
    } finally {
      fs.unlink(filePath);
    }

    const { statistics, netCardArr } = result;

    lruCache.set(statistics.batch, netCardArr);

    res.json(statistics);
  });
});

const { uploadKey } = config;
app.post('/upcards/confirm', async (req, res) => {
  const { key, batches } = req.body;
  if (key !== uploadKey) {
    return res.json({ errcode: 1, errmsg: 'wrong upload key' });
  }

  for (const batch of batches) {
    const batchId = batch.batch;
    if (!lruCache.has(batchId)) {
      return res.json({ errcode: 2, errmsg: `batch not found ${batchId}` });
    }

    const checkBatch = await NetCard.findOne({ batch: batchId }).exec();
    if (checkBatch) {
      return res.json({ errcode: 2, errmsg: `batch exists ${batchId}` });
    }
  }

  // bulk insert
  const result = [];
  for (const batch of batches) {
    const batchId = batch.batch;

    let createResult;
    try {
      createResult = await NetCard.create(lruCache.get(batchId));
    } catch (e) {
      log.error(e);
      return res.json({ errcode: 3, errmsg: `save netcards error ${batchId}` });
    }

    result.push({
      batch,
      count: createResult.length,
    });
  }

  res.json({ errcode: 0, result });
  await checkSku(true);
});
// end netcards

// orders
app.get('/charge', (req, res) => {
  res.redirect('http://wap.koudaitong.com/v2/feature/15mtse28b');
});

app.post('/charge', async (req, res) => {
  const validateErr = parameter.validate({
    oid: 'string',
    yzoid: 'string',
    openid: 'string',
    stuid: 'string',
    pswd: 'string',
  }, req.body);

  if (validateErr) {
    return res.json({ errcode: 1, errmsg: '参数错误，请重新点击充值卡进入本页面' });
  }

  const { oid, yzoid, openid, stuid, pswd } = req.body;

  let order;
  try {
    order = await Order.findOne({ orderID: yzoid, _id: oid }).exec();
  } catch (e) {
    e.name = '[SelfCharge] Find Order Error';
    log.error(e);
    return res.json({ errcode: 2, errmsg: '数据库异常，请重试' });
  }

  if (!order) return res.json({ errcode: 3, errmsg: '未找到订单，请重试' });

  const { chargeFor } = order;
  if (chargeFor) {
    return res.json({ errcode: 4, errmsg: '充值卡已使用', chargeFor });
  }

  if (order.openID !== openid) {
    return res.json({ errcode: 5, errmsg: '请使用购买此卡的微信账户操作' });
  }

  let loginResult;
  try {
    loginResult = await ruijieHelper.login({ stuid, pswd });
  } catch (e) {
    e.name = '[SelfCharge] Login Ruijie Error';
    log.error(e);
    return res.json({ errcode: 6, errmsg: '网络出错，请重试' });
  }

  if (loginResult.errcode !== 0) {
    return res.json({ errcode: 7, errmsg: '请检查输入的校园网账户和密码' });
  }

  // lock for charging
  const inChargind = lruCache.get(yzoid);
  if (inChargind) {
    return res.json({ errcode: 8, errmsg: '该订单正在进行充值操作' });
  }

  lruCache.set(yzoid, true);

  let netcards;
  try {
    netcards = await NetCard.findAndMark(order);
  } catch (e) {
    e.name = '[SelfCharge] Get NetCards Error';
    log.error(e);
    lruCache.set(yzoid, false);
    return res.json({ errcode: 2, errmsg: '数据库异常，请重试' });
  }

  const chargeResults = await Promise.all(netcards.map(async (netcard) => {
    if (netcard.isUsed) return netcard;

    const { cardNo, cardSecret } = netcard;
    const { cookie, code } = loginResult;

    let chargeResult;
    try {
      chargeResult = await ruijieHelper.charge({ cardNo, cardSecret, cookie, code });
    } catch (e) {
      e.name = '[SelfCharge] Charge Card Error';
      log.error(e);
      return netcard;
    }

    if (chargeResult.errcode === 1) {
      const cardStatus = await ruijieHelper.getCardStatus({ cardNo, cardSecret, cookie, code });
      if (cardStatus.stuid === stuid) chargeResult.errcode = 0;
    }

    if (chargeResult.errcode !== 0) {
      await wechatApi.sendToAdmin('充值卡错误', `${chargeResult.errmsg}\n${yzoid}`);
      return netcard;
    }

    const chargedCard = await NetCard.findOneAndUpdate({ ka: cardNo }, {
      isUsed: true,
      orderID: yzoid,
    }, { new: true }).exec();

    return chargedCard;
  }));

  // clear lock
  lruCache.set(yzoid, false);

  let hasFailed = false;
  let failedValue = 0;
  let successValue = 0;
  chargeResults.map(item => {
    if (!item.isUsed) {
      hasFailed = true;
      failedValue += item.value;
      return;
    }

    successValue += item.value;
  });

  if (!hasFailed) {
    await Order.findOneAndUpdate({ orderID: yzoid }, {
      isUsed: true,
      chargeFor: stuid,
    }).exec();
    wechatApi.sendChargeSuccess(openid, stuid, successValue);
  }

  res.json({ errcode: 0, hasFailed, failedValue, successValue });
  await checkSku();
});

app.get('/charge/my', (req, res) => {
  const code = req.query.code;

  if (!code) {
    const oauthDispatherUrl = 'http://n.feit.me/wechat/oauth';
    const thisUrl = `${req.protocol}://${req.hostname + req.path}`;
    const state = JSON.stringify({ url: thisUrl });
    const oauthUrl = wechatApi.oauthApi.getAuthorizeURL(oauthDispatherUrl, state);
    res.redirect(oauthUrl);
    return;
  }

  const data = {
    errmsg: '',
    unUsedCards: [],
  };

  wechatApi.oauthApi.getAccessToken(code, (err, result) => {
    if (err) {
      log.error('[MyCards] get openid error', err);
      data.errmsg = '查询失败，请稍后再试';
      return res.render('my-cards', data);
    }

    const { openid } = result.data;

    Order.find({ openID: openid }).exists('chargeFor', false).exec((dberr, orders) => {
      if (dberr) {
        log.error('[MyCards] get order error', dberr);
        data.errmsg = '查询失败，请稍后再试';
        return res.render('my-cards', data);
      }

      if (orders.length === 0) {
        data.errmsg = '没找到未使用的充值卡';
        return res.render('my-cards', data);
      }

      data.unUsedCards = orders.map(order => ({
        openid,
        yzoid: order.orderID,
        value: order.value * order.count,
        oid: order._id,
      }));

      res.render('my-cards', data);
    });
  });
});

app.get('/od', async (req, res) => {
  const orderID = req.query.yzoid;

  let order;
  try {
    order = await Order.findOne({ orderID }).exec();
  } catch (e) {
    log.error(e);
    return res.json({ errcode: 1, errmsg: 'dberror' });
  }

  if (!order) {
    return res.json({ errcode: 2, errmsg: 'order not found' });
  }

  const data = {
    yzoid: order.orderID,
    value: order.value,
    count: order.count,
    chargeFor: order.chargeFor,
    time: moment.utc(order.createAt).format('YYYY-MM-DD HH:mm:ss'),
  };

  let netcards;
  try {
    netcards = await NetCard.find({ orderID }).exec();
  } catch (e) {
    log.error(e);
    return res.json({ errcode: 1, errmsg: 'dberror' });
  }

  if (netcards.length === 0) {
    data.usedCards = { msg: '该订单没有绑定网卡' };
    return res.json(data);
  }

  let loginResult;
  try {
    loginResult = await ruijieHelper.login({ stuid: 'test2', pswd: '654123' });
  } catch (e) {
    log.error(e);
    return res.json({ errcode: 6, errmsg: '网络出错，请重试' });
  }

  if (loginResult.errcode !== 0) {
    return res.json({ errcode: 7, errmsg: '管理员帐号密码错误' });
  }

  const allStatus = netcards.map(async (card) => {
    const query = Object.assign({}, loginResult);
    query.cardNo = card.ka;
    const secret = cryptor.decrypt(card.mi);
    query.cardSecret = secret.message;
    const status = await ruijieHelper.getCardStatus(query);
    return status;
  });

  data.usedCards = await Promise.all(allStatus);

  res.json(data);
});
// end orders

app.use(express.static(path.join(__dirname, '..', 'public')));

if (process.env.NODE_ENV !== 'production') {
  app.listen(config.port, () => {
    log.info(`[DEV] Server Start! listening ${config.port}`);
  });
}
