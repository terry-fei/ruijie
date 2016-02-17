/* eslint-disable no-unused-expressions */
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

function wrapPromise(method, data) {
  return new Promise((resolve, reject) => {
    kdtApi.get(method, data, (err, result) => {
      if (err) return reject(err);

      resolve(result);
    });
  });
}

kdtApi.fetchOrders = (data) => {
  const method = 'kdt.trades.sold.get';
  return wrapPromise(method, data);
};

kdtApi.fetchOpenid = (data) => {
  const method = 'kdt.users.weixin.follower.get';
  return wrapPromise(method, data);
};

kdtApi.fetchVirtualCode = (data) => {
  const method = 'kdt.trade.virtualcode.get';
  return wrapPromise(method, data);
};

kdtApi.applyVirtualCode = (data) => {
  const method = 'kdt.trade.virtualcode.apply';
  return wrapPromise(method, data);
};


kdtApi.markSign = (data) => {
  const method = 'kdt.logistics.online.marksign';
  return wrapPromise(method, data);
};

export default kdtApi;
