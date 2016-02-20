/* eslint-disable */
const server = require('./dist/app');
const config = require('./config');

// start sync order
require('./dist/lib/sync-order');

server.app.listen(config.port, function listenCallback() {
  console.log('Server Start! listening ' + config.port);
});
