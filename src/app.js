import fs from 'fs';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import { IncomingForm } from 'formidable';
import LruCache from 'lru-cache';
import { STATUS_CODES } from 'http';

import config from './config';
import Models from './models';
const { NetCard } = Models;

const lruCache = new LruCache({
  maxAge: 1000 * 60 * 1,
});

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get('/', async (req, res) => {
  res.end(STATUS_CODES[401]);
});

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

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(config.port, () => {
  console.log(`server start! listening ${config.port}`);
});
