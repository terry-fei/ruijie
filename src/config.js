import dotenv from 'dotenv';
dotenv.config();

const {
  MONGO_URL,
  EKEY,
  UPLOAD_KEY,
  SERVER_PORT,
  ADMIN_OPENID,
  WECHAT_APPID,
  WECHAT_SECRET,
  KDT_APPID,
  KDT_SECRET,
} = process.env;

export default {
  mongoUrl: MONGO_URL,
  ekey: EKEY,
  uploadKey: UPLOAD_KEY,
  port: SERVER_PORT,
  adminOpenid: ADMIN_OPENID,
  wechatAppid: WECHAT_APPID,
  wechatSecret: WECHAT_SECRET,
  kdtAppid: KDT_APPID,
  kdtSecret: KDT_SECRET,
};
