import kdtApi from '../lib/kdt-api';

kdtApi.getBillUrl({
  source: 'dnhand',
  price: 50000,
  order_type: 1,
  num: 1,
  kdt_id: '123',
  goods_id: '123',
}).then((data) => {
  console.log(data);
}).catch((err) => {
  console.log(err);
});
