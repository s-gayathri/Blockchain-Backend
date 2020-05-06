const Block = require('./block');
const { GENESIS_DATA, MINE_RATE } = require('../config');
const { cryptoHash } = require("../Utilities");
const hexToBinary = require("hex-to-binary");

describe('Block', () => {
    const timestamp = 2000;
    const lastHash = "any-value";
    const hash = "any-value";
    const data = ["This is the data","in the blockchain"];
    const difficulty = 1;
    const nonce = 1;
    const block = new Block({ timestamp, lastHash, hash, data, nonce, difficulty });

    it("has a timestamp, lastHash, hash and data ppty", () => {
        expect(block.timestamp).toEqual(timestamp);
        expect(block.lastHash).toEqual(lastHash);
        expect(block.hash).toEqual(hash);
        expect(block.data).toEqual(data);
        expect(block.difficulty).toEqual(difficulty);
        expect(block.nonce).toEqual(nonce);
    });

    describe('genesis()', () => {
        const genesisBlock = Block.genesis();
        // console.log("Genesis Block-",genesisBlock);
        
        it("returns a Block instance", () => {
            expect(genesisBlock instanceof Block).toBe(true);
        });

        it("returns the genesis data", () => {
            expect(genesisBlock).toEqual(GENESIS_DATA);
        });
    });

    describe("mineBlock()", () => {
        const lastBlock = Block.genesis();
        const data = "mined-block";
        const minedBlock = Block.mineBlock({ lastBlock, data });

        it('returns a Block instance', () => {
            expect(minedBlock instanceof Block).toBe(true);
        });

        it('sets the `lastHash` to be the `hash` of the last block', () => {
            expect(minedBlock.lastHash).toEqual(lastBlock.hash);
        });

        it('sets the data', () => {
            expect(minedBlock.data).toEqual(data);
        });

        it('sets a timestamp', () => {
            expect(minedBlock.timestamp).not.toEqual(undefined);
        });

        it("sets a `hash` that meets the difficulty criteria", () => {
            expect(hexToBinary(minedBlock.hash).substring(0,minedBlock.difficulty))
                .toEqual('0'.repeat(minedBlock.difficulty));
        });

        it('creates a SHA-256 hash based on the proper inputs', () => {
            expect(minedBlock.hash)
            .toEqual(
                cryptoHash(
                    minedBlock.timestamp, 
                    minedBlock.nonce, 
                    minedBlock.difficulty, 
                    lastBlock.hash, 
                    data
                    )
                );
        });

        it("adjusts the difficulty", () => {
            const possibleResults = [lastBlock.difficulty+1, lastBlock.difficulty-1];

            expect(possibleResults.includes(minedBlock.difficulty)).toBe(true);
        });
    });

    describe("adjustDifficulty()", () => {
        it("raises the difficulty for a quickly mined block", () => {
            expect(Block.adjustDifficulty({
                originalBlock: block,
                timestamp: block.timestamp + MINE_RATE - 100
                })).toEqual(block.difficulty+1);
        });

        it("lowers the difficulty for a slowly mined block", () => {
            expect(Block.adjustDifficulty({
                originalBlock: block,
                timestamp: block.timestamp + MINE_RATE + 100
                })).toEqual(block.difficulty-1);
        });

        it("has a lower limit of 1", () => {
            block.difficulty = -1;
            
            expect(Block.adjustDifficulty({ originalBlock: block })).toEqual(1);
        });
    });
});