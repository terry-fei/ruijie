import fs from 'fs';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import { IncomingForm } from 'formidable';
import LruCache from 'lru-cache';
import { STATUS_CODES } from 'http';
import Parameter from 'parameter';

import config from '../config';
import Models from './models';
import * as ruijieHelper from './lib/ruijie-helper';
import wechatApi from './lib/wechat-api';

const { NetCard, Order } = Models;
const parameter = new Parameter();

const lruCache = new LruCache({
  maxAge: 1000 * 60 * 1,
});

export const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', async (req, res) => {
  res.end(STATUS_CODES[401]);
});

// netcards
app.post('/upcards', (req, res) => {
  const form = new IncomingForm();
  form.parse(req, (err, fields, files) => {
    if (err) {
      console.error(err);
      return res.json({ errcode: 1, errmsg: 'upload file error' });
    }

    const filePath = files.file.path;
    const fileName = fields.name;

    let result;
    try {
      result = NetCard.parseNetCardFile(filePath, fileName);
    } catch (e) {
      console.error(e);
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

    const checkBatch = await NetCard.findOne(batchId).exec();
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
      console.error(e);
      return res.json({ errcode: 3, errmsg: `save netcards error ${batchId}` });
    }

    result.push({
      batch,
      count: createResult.length,
    });
  }

  res.json({ errcode: 0, result });
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
    console.error(e);
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
    console.error(e);
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
    console.error(e);
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
      console.error(e);
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
});
// end orders

app.use(express.static(path.join(__dirname, '..', 'public')));
