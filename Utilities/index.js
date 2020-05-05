const cryptoHash = require("./crypto-hash");

const EC = require("elliptic").ec;

const ec = new EC('secp256k1');
//Standards of Efficient Cryptography 256bits prime number - first implementation

const verifySignature = ({ publicKey, data, signature }) => {
    const keyFromPublic = ec.keyFromPublic(publicKey, "hex");

    return keyFromPublic.verify(cryptoHash(data), signature);
};

module.exports = { ec, verifySignature, cryptoHash };