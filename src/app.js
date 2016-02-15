import fs from 'fs';
import path from 'path';
import express from 'express';
import bodyParser from 'body-parser';
import { IncomingForm } from 'formidable';
import LruCache from 'lru-cache';
import { STATUS_CODES } from 'http';

import Models from './models';
const { NetCard } = Models;

const lruCache = new LruCache({
  maxAge: 1000 * 60 * 3,
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

    res.json({
      statistics,
      batch: statistics.batch,
    });
  });
});

app.post('/upcards/confirm', (req, res) => {
});

app.use(express.static(path.join(__dirname, '..', 'public')));

app.listen(3000, () => {
  console.log('server start!');
});
