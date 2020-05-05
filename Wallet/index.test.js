const Wallet = require('./index');
const Transaction = require("./transaction");
const Blockchain = require("../Blockchain");
const { verifySignature } = require("../Utilities");
const { STARTING_BALANCE } = require("../config");

describe("wallet Class", () => {
    let wallet;
    
    beforeEach(() => {
        wallet = new Wallet();
    });

    it("has a `balance` field", () => {
        expect(wallet).toHaveProperty('balance');
    });

    it("has a `publicKey`", () => {
        expect(wallet).toHaveProperty('publicKey');
    });

    describe("Signing data", () => {
        const data = 'new-data';

        it("Verifies a signature", () => {
            expect(verifySignature({
                publicKey: wallet.publicKey,
                data,
                signature: wallet.sign(data)
            })).toBe(true);
        });

        it("Doesn't verify on invalid signature", () => {
            expect(verifySignature({
                publicKey: wallet.publicKey,
                data,
                signature: new Wallet().sign(data)
            })).toBe(false);
        });
    });

    describe("createTransaction()", () => {
        describe("and the amount exceeds the balance", () => {
            it("throws and error", () => {
                expect(() => wallet.createTransaction({ amount: 1000000, recipient: 'randomDude' }))
                    .toThrow("Amount exceeds balance");
            });
        });

        describe("and the amount is valid", () => {
            let transaction, amount, recipient;

            beforeEach(() => {
                amount = 50;
                recipient = 'key of recipient';
                transaction = wallet.createTransaction({ amount, recipient });
            });

            it("creates an instance of `Transaction`", () => {
                expect(transaction instanceof Transaction).toBe(true);
            });

            it("matches transaction input with the sender's wallet", () => {
                expect(transaction.input.address).toEqual(wallet.publicKey);
            });

            it("outputs the amount to the recipient", () => {
                expect(transaction.outputMap[recipient]).toEqual(amount);
            });
        });

        describe("and a chain is passed", () => {
            it("calls `Wallet.calculateBalance()`", () => {
                const calculateBalanceMock = jest.fn();
                const originalCalculateBalance = Wallet.calculateBalance;
                Wallet.calculateBalance = calculateBalanceMock;

                wallet.createTransaction({
                    recipient: "test",
                    amount: 30,
                    chain: new Blockchain().chain
                });

                expect(calculateBalanceMock).toHaveBeenCalled();

                Wallet.calculateBalance = originalCalculateBalance;
            });
        });
    });

    describe("calculateBalance()", () => {
        let blockchain;

        beforeEach(() => {
            blockchain = new Blockchain();
        });

        describe("and there are no outputs for the wallet", () => {
            it("returns the STARTING_BALANCE", () => {
                expect(Wallet.calculateBalance({
                    chain: blockchain.chain,
                    address: wallet.publicKey
                })).toEqual(STARTING_BALANCE);
            });
        });

        describe("and there are outputs for the wallet", () => {
            let transactionOne, transactionTwo;

            beforeEach(() => {
                transactionOne = new Wallet().createTransaction({
                    recipient: wallet.publicKey,
                    amount: 50
                });

                transactionTwo = new Wallet().createTransaction({
                    recipient: wallet.publicKey,
                    amount: 50
                });

                blockchain.addBlock({ data: [transactionOne, transactionTwo] });
            });

            it("adds the sum of all outputs to the wallet balance", () => {
                expect(Wallet.calculateBalance({
                    chain: blockchain.chain,
                    address: wallet.publicKey
                })).toEqual(
                    STARTING_BALANCE +
                    transactionOne.outputMap[wallet.publicKey] +
                    transactionTwo.outputMap[wallet.publicKey]
                );
            });

            describe("and the wallet has made a transaction", () => {
                let recentTransaction;

                beforeEach(() => {
                    recentTransaction = wallet.createTransaction({
                        recipient: "test2",
                        amount: 10
                    });

                    blockchain.addBlock({ data: [recentTransaction] });
                });

                it("returns the outputamount of this recent transaction", () => {
                    expect(Wallet.calculateBalance({
                        chain: blockchain.chain,
                        address: wallet.publicKey
                    })).toEqual(recentTransaction.outputMap[wallet.publicKey]);
                });

                describe("and there are outputs next to and after the recent transaction", () => {
                    let sameBlockTransaction, nextBlockTransaction;

                    beforeEach(() => {
                        recentTransaction = wallet.createTransaction({
                            recipient: "test3",
                            amount: 30
                        });

                        sameBlockTransaction = Transaction.rewardTransaction({ minerWallet: wallet });
                        
                        blockchain.addBlock({ data: [recentTransaction, sameBlockTransaction] });
                        
                        nextBlockTransaction = new Wallet().createTransaction({
                            recipient: wallet.publicKey,
                            amount: 40
                        });

                        blockchain.addBlock({ data: [nextBlockTransaction] });
                    });

                    it("includes the output amounts in the return balance", () => {
                        expect(Wallet.calculateBalance({
                            chain: blockchain.chain,
                            address: wallet.publicKey
                        })).toEqual(
                            recentTransaction.outputMap[wallet.publicKey] +
                            sameBlockTransaction.outputMap[wallet.publicKey] +
                            nextBlockTransaction.outputMap[wallet.publicKey] 
                        );
                    });
                });
            });
        });
    });
});
