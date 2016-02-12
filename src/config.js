import dotenv from 'dotenv';
dotenv.config();

const { MONGO_URL, EKEY } = process.env;

export default {
  mongoUrl: MONGO_URL,
  ekey: EKEY,
};
