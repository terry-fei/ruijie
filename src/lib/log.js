import winston from 'winston';
import 'winston-mongodb';

import config from '../../config';

if (process.env.NODE_ENV === 'production') {
  winston.add(winston.transports.MongoDB, {
    db: config.mongoUrl,
    level: 'info',
  });
  winston.remove(winston.transports.Console);
} else {
  winston.transports.Console.level = 'debug';
  winston.transports.Console.colorize = true;
  winston.transports.Console.prettyPrint = true;
}

export default winston;
