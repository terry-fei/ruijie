const dotenv = require('dotenv');
dotenv.config();

const env = process.env;

module.exports = {
  mongoUrl: env.MONGO_URL,
  ekey: env.EKEY,
  uploadKey: env.UPLOAD_KEY,
  port: env.SERVER_PORT,
  adminOpenid: env.ADMIN_OPENID,
  wechatAppid: env.WECHAT_APPID,
  wechatSecret: env.WECHAT_SECRET,
  kdtAppid: env.KDT_APPID,
  kdtSecret: env.KDT_SECRET,
};
