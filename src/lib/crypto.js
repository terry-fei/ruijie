/* eslint-disable */
var crypto = require('crypto');

var PKCS7Encoder = {};
PKCS7Encoder.decode = function (text) {
  var pad = text[text.length - 1];

  if (pad < 1 || pad > 32) {
    pad = 0;
  }

  return text.slice(0, text.length - pad);
};

PKCS7Encoder.encode = function (text) {
  var blockSize = 32;
  var textLength = text.length;
  //计算需要填充的位数
  var amountToPad = blockSize - (textLength % blockSize);

  var result = new Buffer(amountToPad);
  result.fill(amountToPad);

  return Buffer.concat([text, result]);
};

var Crypto = function (encodingAESKey) {
  if (!encodingAESKey) {
    throw new Error('please check arguments');
  }
  var AESKey = new Buffer(encodingAESKey + '=', 'base64');
  if (AESKey.length !== 32) {
    throw new Error('encodingAESKey invalid');
  }
  this.key = AESKey;
  this.iv = AESKey.slice(0, 16);
};

Crypto.prototype.decrypt = function(text) {
  var decipher = crypto.createDecipheriv('aes-256-cbc', this.key, this.iv);
  decipher.setAutoPadding(false);
  var deciphered = Buffer.concat([decipher.update(text, 'base64'), decipher.final()]);

  deciphered = PKCS7Encoder.decode(deciphered);
  var content = deciphered.slice(16);
  var length = content.slice(0, 4).readUInt32BE(0);

  return {
    message: content.slice(4, length + 4).toString(),
    id: content.slice(length + 4).toString()
  };
};

Crypto.prototype.encrypt = function (id, text) {
  var randomString = crypto.pseudoRandomBytes(16);

  var msg = new Buffer(text);

  var msgLength = new Buffer(4);
  msgLength.writeUInt32BE(msg.length, 0);

  var id = new Buffer(id);

  var bufMsg = Buffer.concat([randomString, msgLength, msg, id]);

  var encoded = PKCS7Encoder.encode(bufMsg);

  var cipher = crypto.createCipheriv('aes-256-cbc', this.key, this.iv);
  cipher.setAutoPadding(false);

  var cipheredMsg = Buffer.concat([cipher.update(encoded), cipher.final()]);

  return cipheredMsg.toString('base64');
};

module.exports = function(ekey) {
  return new Crypto(ekey, 'feit');
}
