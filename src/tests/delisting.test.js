import kdtApi from '../lib/kdt-api';

kdtApi.delisting({ num_iid: '134046357' }).then((data) => {
  console.log(data);
}).catch((err) => {
  console.log(err);
});
