import KDTApi from 'node-kdt';

import config from '../config';
const { kdtAppid, kdtSecret } = config;

const kdtApi = new KDTApi(kdtAppid, kdtSecret);

kdtApi.defaultOpts = {
  fields: 'tid,num,num_iid,weixin_user_id,status,created',
  status: 'WAIT_BUYER_CONFIRM_GOODS',
  page_no: 1,
  page_size: 100,
  use_has_next: true,
};

// convenient methods
kdtApi.markSign = (data) => {
  const method = 'kdt.logistics.online.marksign';
  return new Promise((resolve, reject) => {
    kdtApi.get(method, data, (err, result) => {
      if (err) return reject(err);

      resolve(result);
    });
  });
};

export default kdtApi;
