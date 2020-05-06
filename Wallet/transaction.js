const { v1: uuidv1 } = require("uuid");
const { verifySignature } = require("../Utilities/index");
const { REWARD_INPUT, MINING_REWARD } = require("../config");

// import { v1 as uuidv1 } from 'uuid';

class Transaction {
    constructor({ senderWallet, recipient, amount, outputMap, input }) {
        this.id = uuidv1();
        this.outputMap = outputMap || this.createOutputMap({
            senderWallet, recipient, amount
        });
        this.input = input || this.createInput({ 
            senderWallet, 
            outputMap: this.outputMap 
        });
    }

    createOutputMap({ senderWallet, recipient, amount }) {
        const outputMap = {};

        outputMap[recipient] = amount;
        outputMap[senderWallet.publicKey] = senderWallet.balance - amount;

        return outputMap;
    }

    createInput({ senderWallet, outputMap }) {
        return {
            timestamp: Date.now(),
            amount: senderWallet.balance,
            address: senderWallet.publicKey,
            signature: senderWallet.sign(outputMap)
        };
    }

    static validTransaction(transaction) {
        const { 
                input: { address, amount, signature },
                outputMap 
              } = transaction;

        const outputTotal = Object.values(outputMap)
                    .reduce((accumulator, amount) => accumulator + amount);
        
        if(amount !== outputTotal) {
            console.error(`Invalid Transaction from ${address}`);
            return false;
        }

        if(!verifySignature({
            publicKey: address,
            data: outputMap,
            signature
        })) {
            console.error(`Invalid Signature from ${address}`);
            return false;
        }

        return true;
    }

    static rewardTransaction({ minerWallet }) {
        return new this({
            input: REWARD_INPUT,
            outputMap: { [minerWallet.publicKey]: MINING_REWARD }
        });
    }

    update({ senderWallet, amount, recipient }) {
        if(amount > this.outputMap[senderWallet.publicKey])
            throw new Error("Amount exceeds balance");

        if(!this.outputMap[recipient]) 
            this.outputMap[recipient] = amount;
        else 
            this.outputMap[recipient] += amount;

        this.outputMap[senderWallet.publicKey] -= amount;
        this.input = this.createInput({
            senderWallet,
            outputMap: this.outputMap
        });
    }
}

module.exports = Transaction;