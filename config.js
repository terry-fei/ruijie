const dotenv = require('dotenv');

const env = process.env;

// if (env.NODE_ENV !== 'production') {
//   dotenv.config();
// }
dotenv.config();
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
