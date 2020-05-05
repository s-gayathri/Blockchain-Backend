const Block = require("./block");
const Transaction = require("../Wallet/transaction"); 
const Wallet = require("../Wallet");
const { cryptoHash } = require("../Utilities");
const { REWARD_INPUT, MINING_REWARD } = require("../config");

class Blockchain {
    constructor() {
        this.chain = [Block.genesis()];
    }

    addBlock({ data }) {
        const newBlock = Block.mineBlock({
            lastBlock: this.chain[this.chain.length-1],
            data: data
        });

        this.chain.push(newBlock);
    }

    static isValidChain(chain) {
        if(JSON.stringify(chain[0]) !== JSON.stringify(Block.genesis()))
            return false;
        
        for(let i=1; i<chain.length; i++) {
            const { timestamp, lastHash, hash, nonce, difficulty, data } = chain[i];
            const actualLastHash = chain[i-1].hash;
            const prevDifficulty = chain[i-1].difficulty;
            
            if(lastHash !== actualLastHash)
                return false;
            
            const validatedHash = cryptoHash(timestamp, lastHash, data, nonce, difficulty);
            if(hash !== validatedHash)
                return false;

            if(Math.abs(prevDifficulty - difficulty) > 1)
                return false;
        }    

        return true;
    }

    //One part of validating the cryptocurrency rules is that 
    //we want to make sure that what input balances are valid 
    //according to the blockchain history but 
    //we shouldn't accept the blockchain history of an incoming chain
    //Otherwise the newChain could fake that history as well.
    //So we're going to validate the balances based on 
    //instances of our own blockchain history which is why 
    //we need this to be a non - static method.

    validTransactionData({ chain }) {
        for (let i = 1; i <  chain.length; i++) {
            const block =  chain[i];
            const transactionSet = new Set();
            let rewardTransactionCount = 0;
            
            for (const transaction of block.data) {
                if (transaction.input.address === REWARD_INPUT.address) {
                    rewardTransactionCount++;

                     //only one reward
                    if (rewardTransactionCount > 1) {
                        console.error("Miner rewards exceed limit");
                        return false;
                    }

                    //valid transaction inputs and amounts
                    if (Object.values(transaction.outputMap)[0] !== MINING_REWARD) {
                        console.error("Miner reward amount is invalid");
                        return false;
                    }

                } else {

                    //valid transaction inputs and amounts
                    if(!Transaction.validTransaction(transaction)) {
                        console.error("Invalid Transaction");
                        return false;
                    }

                    //valid input balances according to history
                    const trueBalance = Wallet.calculateBalance({
                        chain: this.chain,
                        address: transaction.input.address
                    });

                    if(transaction.input.amount !== trueBalance) {
                        console.error("Invalid input amount");
                        return false;
                    }

                    //a unique set of block transactions
                    if(transactionSet.has(transaction)) {
                        console.error("Identical transaction appears multiple times block");
                        return false;
                    } else
                        transactionSet.add(transaction);
                }
            }
        }
        
        return true;
    }

    replaceChain(chain, validateTransactions, onSuccess) {
        if(chain.length <= this.chain.length) {
            console.error("The incoming chain is not longer");
            return;
        }
        if (!Blockchain.isValidChain(chain)) {
            console.error(("The incoming error is invalid"));
            return;
        }

        if(validateTransactions && !this.validTransactionData({ chain })) {
            console.error("Incoming chain has has invalid data");
            return;
        }

        if(onSuccess)   onSuccess();
        
        console.log("The chain is being replaced with: ",chain);
        this.chain = chain;
    }
}

module.exports = Blockchain;