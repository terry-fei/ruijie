import express from 'express';

import Models from './models';

const app = express();
const { NetCard } = Models;

app.get('/', async (req, res) => {
  const netcards = await NetCard.find({}).exec();
  res.json(netcards);
});

app.listen(3000, () => {
  console.log('server start!');
});
