const { GENESIS_DATA, MINE_RATE } = require("../config");
const { cryptoHash } = require("../Utilities");
const hexToBinary = require("hex-to-binary");

class Block {
    constructor({ timestamp, lastHash, hash, data, nonce, difficulty }) {
        this.timestamp = timestamp;
        this.lastHash = lastHash;
        this.hash = hash;
        this.data = data;
        this.nonce = nonce;
        this.difficulty = difficulty;
    }

    //factory method- create instances of class w/o directly using constructor
    static genesis() {
        return new this(GENESIS_DATA);
    }

    static mineBlock({ lastBlock, data }) {
        let hash, timestamp, nonce = 0;
        let { difficulty } = lastBlock;
        const lastHash = lastBlock.hash;

        do
        {
            nonce++;
            timestamp = Date.now();
            difficulty = this.adjustDifficulty({ originalBlock: lastBlock, timestamp });
            hash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);
        } while(hexToBinary(hash).substring(0, difficulty) !== '0'.repeat(difficulty));

        return new this({
            timestamp,
            lastHash,
            data,
            difficulty,
            nonce,
            hash
        });
    }

    static adjustDifficulty({ originalBlock, timestamp }) {
        const { difficulty } = originalBlock;

        if(difficulty < 1)
            return 1;

        if (timestamp - originalBlock.timestamp > MINE_RATE)
            return difficulty - 1;
        
        return difficulty+1;
    }
}

module.exports = Block;

