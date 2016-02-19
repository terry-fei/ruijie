import cheerio from 'cheerio';
import urllib from 'urllib';

const baseUrl = 'http://202.118.166.244:8080/selfservice';

export const login = async ({ stuid, pswd }) => {
  if (!stuid || !pswd) {
    throw new Error('Stuid and Password are required');
  }

  const url = `http://nvc.feit.me/rj?stuid=${stuid}&pswd=${pswd}`;
  const loginResult = await urllib.request(url, { dataType: 'json' });
  return loginResult;
};

function _makeHeader(cookie) {
  return {
    Host: '202.118.166.244:8080',
    Referer: 'http://202.118.166.244:8080/selfservice/module/webcontent/web/index_self.jsf?',
    Cookie: cookie,
  };
}

const cardStatusUrl = `${baseUrl}/module/chargecardself/web/chargecardself_list.jsf`;
export const getCardStatus = async ({ cardNo, cardSecret, cookie, vcode }) => {
  if (!cardNo || !cardSecret || !cookie || !vcode) {
    throw new Error('cardNo, cardSecret, cookie and vcode are required');
  }

  const headers = _makeHeader(cookie);

  const { data: viewIdHtml } = await urllib.request(cardStatusUrl, { headers, dataType: 'text' });

  const $viewIdHtml = cheerio.load(viewIdHtml);

  const form = {};
  const $inputs = $viewIdHtml('input');

  if ($inputs.length === 0) {
    throw new Error('[GetCardStatus] error viewIdHtml');
  }

  $inputs.each((i, e) => {
    const $e = $viewIdHtml(e);
    if ($e.val() === '重置') return;
    form[$e.attr('name')] = $e.val();
  });

  form['ChargeCardListForm:submitcode'] = vcode;
  form['ChargeCardListForm:cardNo'] = cardNo;
  form['ChargeCardListForm:password'] = cardSecret;

  const statusOpts = {
    headers,
    data: form,
    dataType: 'text',
    method: 'POST',
  };

  const { data: statusHtml } = await urllib.request(cardStatusUrl, statusOpts);

  if (!!~ statusHtml.indexOf('已作废或密码错误')) {
    throw new Error('已作废或密码错误');
  }

  const $statusHtml = cheerio.load(statusHtml);
  const elems = $statusHtml('.myTable2 [align=left]');
  const status = {
    cardNo: $statusHtml(elems[0]).text().trim(),
    value: $statusHtml(elems[1]).text().trim(),
    status: $statusHtml(elems[3]).text().trim(),
    stuid: $statusHtml(elems[5]).text().trim(),
    useDate: $statusHtml(elems[6]).text().trim(),
    expireDate: $statusHtml(elems[7]).text().trim(),
  };

  return status;
};

const chargeUrl = `${baseUrl}/module/chargecardself/web/chargecardself_charge.jsf`;
export const charge = async ({ cardNo, cardSecret, cookie, vcode }) => {
  if (!cardNo || !cardSecret || !cookie || !vcode) {
    throw new Error('cardNo, cardSecret, cookie and vcode are required');
  }

  const headers = _makeHeader(cookie);

  const { data: viewIdHtml } = await urllib.request(chargeUrl, { headers, dataType: 'text' });

  const $viewIdHtml = cheerio.load(viewIdHtml);

  const form = {};
  const $inputs = $viewIdHtml('input');

  if ($inputs.length === 0) {
    throw new Error('[Charge] error viewIdHtml');
  }

  $inputs.each((i, e) => {
    const $e = $viewIdHtml(e);
    const value = $e.val();
    if (value === '重置' || value === '查询') return;
    form[$e.attr('name')] = value;
  });

  form['ChargeCardForm:cardNo'] = cardNo;
  form['ChargeCardForm:password'] = cardSecret;
  form['ChargeCardForm:verify'] = vcode;

  form.test = 'on';
  delete form['ChargeCardForm:userId'];
  delete form['ChargeCardForm:user_password'];
  delete form['ChargeCardForm:canOverdraft'];
  delete form['ChargeCardForm:getSelfChargeInfo'];

  const opts = {
    headers,
    method: 'POST',
    data: form,
    dataType: 'text',
  };

  const { data: resultHtml } = await urllib.request(chargeUrl, opts);
  const result = {};

  if (!!~ resultHtml.indexOf('生成时间')) {
    result.errcode = 0;
    result.errmsg = '充值成功';
  } else if (!!~ resultHtml.indexOf('充值卡已被充值')) {
    result.errcode = 1;
    result.errmsg = '充值卡已被充值';
  } else if (!!~ resultHtml.indexOf('充值卡不存在或已作废')) {
    result.errcode = 2;
    result.errmsg = '充值卡不存在或已作废';
  } else if (!!~ resultHtml.indexOf('充值卡密码错误')) {
    result.errcode = 3;
    result.errmsg = '充值卡密码错误';
  } else {
    result.errcode = 4;
    result.errmsg = '未知状态';
  }

  return result;
};
