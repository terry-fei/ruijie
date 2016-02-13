import express from 'express';

import Models from './models';

const app = express();
const { NetCard } = Models;

app.get('/', async (req, res) => {
  const order = {
    orderID: 'test1',
    value: 20,
    count: 2,
  };

  let netcards;
  try {
    netcards = await NetCard.findAndMark(order);
  } catch (e) {
    res.json(e);
    return;
  }

  res.json(netcards);
});

app.use(express.static('../public'));

app.listen(3000, () => {
  console.log('server start!');
});
