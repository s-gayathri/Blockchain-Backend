const Blockchain = require("./index");
const Block = require("./block");
const Wallet = require("../Wallet");
const Transaction = require("../Wallet/transaction");
const { cryptoHash } = require("../Utilities");

describe("Blockchain", () => {
    let blockchain, newChain, originalChain, errorMock;

    beforeEach(() => {
        blockchain = new Blockchain();
        newChain = new Blockchain();
        originalChain = blockchain.chain;

        errorMock = jest.fn();
        global.console.error = errorMock;
    });

    it('contains a `chain` array instance', () => {
        expect(blockchain.chain instanceof Array).toBe(true);
    });

    it('starts with the genesis block', () => {
        expect(blockchain.chain[0]).toEqual(Block.genesis());
    });

    it('adds a new block to the chain', () => {
        const newData = "This is the new data.";
        blockchain.addBlock({ data: newData });

        expect(blockchain.chain[blockchain.chain.length-1].data)
            .toEqual(newData);
    });

    describe("isValidChain()",() => {
        describe('when chain does not start with genesis block', () => {
            it('returns false', () => {
                blockchain.chain[0] = { data: "not-genesis" };
                
                expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
            });
        });

        describe('when chain starts with genesis block and has multiple blocks', () => {
            beforeEach(() => {
                blockchain.addBlock({ data: "strawberries" });
                blockchain.addBlock({ data: "bread" });
                blockchain.addBlock({ data: "peanut butter" });
            });

            describe('and a lastHash reference has changed', () => {
                it("returns false", () => {

                    blockchain.chain[2].lastHash = 'tampered-lastHash';

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe("and the chain contains a block with an invalid field", () => {
                it("returns false", () => {
                    blockchain.chain[2].data = 'tampered-data';

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe("and the chain contains a block with a jumped difficulty", () => {
                it("returns false", () => {
                    const lastBlock = blockchain.chain[blockchain.chain.length-1];
                    const lastHash = lastBlock.hash;
                    const timestamp = Date.now();
                    const nonce = 0;
                    const data = [];
                    const difficulty = lastBlock.difficulty - 3;

                    const hash = cryptoHash(lastHash, timestamp, data, nonce, difficulty);
                    
                    const badBlock = new Block({ timestamp, data, lastHash, nonce, difficulty, hash });
                    blockchain.chain.push(badBlock);

                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(false);
                });
            });

            describe("and the chain does not contain any invalid blocks", () => {
                it("returns true", () => {
                    expect(Blockchain.isValidChain(blockchain.chain)).toBe(true);
                });
            });
        });
    });

    describe("replaceChain()", () => {
        let logMock;

        beforeEach(() => {
            logMock = jest.fn();
            global.console.log = logMock;
        });

        describe("when new chain is not longer", () => {
            beforeEach(() => {
                newChain.chain[0] = { new: 'chain' };
                blockchain.replaceChain(newChain.chain);
            });

            it("does not replace the chain", () => {
                expect(blockchain.chain).toEqual(originalChain);
            });

            it('logs an error', () => {
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe("when new chain is longer", () => {
            beforeEach(() => {
                newChain.addBlock({ data: "strawberries" });
                newChain.addBlock({ data: "bread" });
                newChain.addBlock({ data: "peanut butter" });
            });

            describe("and the chain is invalid", () => {
                beforeEach(() => {
                    newChain.chain[2].hash = 'tampered-hash';
                    blockchain.replaceChain(newChain.chain);
                });

                it("does not replace the chain",() => {
                    expect(blockchain.chain).toEqual(originalChain);
                });

                it('logs an error', () => {
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe("and the chain is valid", () => {
                beforeEach(() => {
                    blockchain.replaceChain(newChain.chain);
                });

                it("does replace the chain", () => {
                    expect(blockchain.chain).toEqual(newChain.chain);
                });

                it('logs about the chain replacement', () => {
                    expect(logMock).toHaveBeenCalled();
                });
            });
        });

        describe("and the validateTransactions flag is true", () => {
            it("calls validTransactionData()", () => {
                const validTransactionDataMock = jest.fn();

                blockchain.validTransactionData = validTransactionDataMock;

                newChain.addBlock({ data: "example-trans" });
                newChain.addBlock({ data: "example-trans2" });
                
                blockchain.replaceChain(newChain.chain, true);

                expect(validTransactionDataMock).toHaveBeenCalled();
            });
        });
    });

    describe("validTransactionData()", () => {
        let transaction, rewardTransaction, wallet;

        beforeEach(() => {
            wallet = new Wallet();
            transaction = wallet.createTransaction({
                recipient: "anyone",
                amount: 40
            });
            rewardTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
        });

        describe("and the transction data is valid", () => {
            it("returns true", () => {
                newChain.addBlock({ data: [transaction, rewardTransaction] });
                
                //here the function to check if it is valid is not static because
                //we rely on the correctness of the local blockchain history
                //and not on the incoming new chain's blockchain history
                expect(blockchain.validTransactionData({ chain: newChain.chain }))
                    .toBe(true);
                expect(errorMock).not.toHaveBeenCalled();
            });
        });

        describe("and the transaction data has multiple rewards", () => {
            it("returns false and logs an error", () => {
                newChain.addBlock({ data: [transaction, rewardTransaction, rewardTransaction] });
                
                expect(blockchain.validTransactionData({ chain: newChain.chain }))
                    .toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe("and the transaction data has at least one malformed outputMap", () => {
            describe("and the transaction is not a reward transaction", () => {
                it("returns false and logs an error", () => {
                    transaction.outputMap[wallet.publicKey] = 100000000;
                    newChain.addBlock({ data: [transaction, rewardTransaction] });
                    
                    expect(blockchain.validTransactionData({ chain: newChain.chain }))
                        .toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });

            describe("and the transaction is a reward transaction", () => {
                it("returns false and logs an error", () => {
                    rewardTransaction.outputMap[wallet.publicKey] = 100000000;
                    newChain.addBlock({ data: [transaction, rewardTransaction] });
                    
                    expect(blockchain.validTransactionData({ chain: newChain.chain }))
                        .toBe(false);
                    expect(errorMock).toHaveBeenCalled();
                });
            });
        });

        describe("and the transaction data has at least one malformed input", () => {
            it("returns false and logs an error", () => {
                wallet.balance = 18000;

                //refer transaction.js for creation of input and outputMap
                const evilOutputMap = {
                    [wallet.publicKey]: 17900,
                    testRecipient: 100
                };

                const evilTransaction = {
                    input: {
                        timestamp: Date.now(),
                        amount: wallet.balance,
                        address: wallet.publicKey,
                        signature: wallet.sign(evilOutputMap)
                    },
                    outputMap: evilOutputMap
                };

                newChain.addBlock({ data: [evilTransaction, rewardTransaction] });

                expect(blockchain.validTransactionData({ chain: newChain.chain }))
                    .toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });

        describe("and the block contains multiple identical transactions", () => {
            it("returns false and logs an error", () => {
                newChain.addBlock({ data: [transaction, transaction, transaction, rewardTransaction] });
            
                expect(blockchain.validTransactionData({ chain: newChain.chain }))
                    .toBe(false);
                expect(errorMock).toHaveBeenCalled();
            });
        });
    });
});