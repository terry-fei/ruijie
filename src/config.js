import dotenv from 'dotenv';
dotenv.config();

const {
  MONGO_URL,
  EKEY,
  UPLOAD_KEY,
  SERVER_PORT,
} = process.env;

export default {
  mongoUrl: MONGO_URL,
  ekey: EKEY,
  uploadKey: UPLOAD_KEY,
  port: SERVER_PORT,
};
