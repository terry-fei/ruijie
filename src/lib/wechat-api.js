import WechatApi from 'wechat-api';
import WechatOAuth from 'wechat-oauth';
import moment from 'moment';

import config from '../../config';

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
wechatApi.sendChargeCard = ({ _id, openID, value, count, orderID }) => {
  const templateId = 'N6rDOwzxZSSkf4wCTlke7zARBzoJTEQFX2yua-ZSAwM';
  const url = `http://wp.feit.me/charge.html?oid=${_id}&yzoid=${orderID}&openid=${openID}`;
  const topColor = '';
  const data = {
    first: {
      value: `\n${value * count}元校园网充值卡`,
      color: '#f44336',
    },
    accountType: {
      value: '订单号',
      color: '#000000',
    },
    account: {
      value: `${orderID}`,
      color: '#f44336',
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
      value: '\n此卡仅限购买者微信使用\n可给任意校园网账户充值\n请尽快点击使用！',
      color: '#f44336',
    },
  };

  return new Promise((resolve, reject) => {
    wechatApi.sendTemplate(openID, templateId, url, topColor, data, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

wechatApi.sendToAdmin = (type, content) => {
  const templateId = '9v8rmU1Zga3JM_eEEpCRRcah4y4ZMYAVMmkpRkjoJ34';
  const url = '';
  const topColor = '';
  const data = {
    first: {
      value: '东农校园网充值系统通知',
      color: '#000000',
    },
    time: {
      value: moment().format('YYYY-MM-DD HH:mm'),
      color: '#000000',
    },
    ip_list: {
      value: '东农校园网充值服务器',
      color: '#000000',
    },
    sec_type: {
      value: type,
      color: '#000000',
    },
    remark: {
      value: content,
      color: '#f44336',
    },
  };

  return new Promise((resolve, reject) => {
    wechatApi.sendTemplate(adminOpenid, templateId, url, topColor, data, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
};

export default wechatApi;
