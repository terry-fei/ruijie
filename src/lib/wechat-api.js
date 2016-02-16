import WechatApi from 'wechat-api';
import WechatOAuth from 'wechat-oauth';

import config from '../config';

const { wechatAppid, wechatSecret, adminOpenid } = config;

const wechatApi = new WechatApi('whatever', 'whatever');

wechatApi.prefix = 'https://wechatserver.duapp.com/cgi-bin/';

wechatApi.preRequest = function preRequest(method, args) {
  this.token = {
    accessToken: `1&appid=${wechatAppid}&username=feit&password=f6788f17`,
  };

  method.apply(this, args);
};

wechatApi.oauthApi = new WechatOAuth(wechatAppid, wechatSecret);

// convenient methods
wechatApi.sendChargeCard = ({ openid, value, count, orderId, url }) => {
  const templateId = 'N6rDOwzxZSSkf4wCTlke7zARBzoJTEQFX2yua-ZSAwM';
  const topColor = '';
  const data = {
    first: {
      value: `${value * count}元校园网充值卡`,
      color: '#f44336',
    },
    accountType: {
      value: '订单号',
      color: '#000000',
    },
    account: {
      value: `${orderId}`,
      color: '#9e9e9e',
    },
    amount: {
      value: `${value * count}`,
      color: '#f44336',
    },
    result: {
      value: '未使用',
      color: '#f44336',
    },
    remark: {
      value: '\n请尽快点击使用！',
      color: '#9e9e9e',
    },
  };

  return new Promise((resolve, reject) => {
    wechatApi.sendTemplate(openid, templateId, url, topColor, data, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

export default wechatApi;
