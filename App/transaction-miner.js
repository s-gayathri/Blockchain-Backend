const Transaction = require("../Wallet/transaction");

class TransactionMiner {
    constructor({ blockchain, transactionPool, wallet, pubsub }) {
        this.blockchain = blockchain;
        this.transactionPool = transactionPool;
        this.wallet = wallet;
        this.pubsub = pubsub;
    }

    mineTransactions() {
        //get all valid transactions from the transaction pool
        const validTransactions = this.transactionPool.validTransactions();

        //generate miner's reward transaction for doing this mining work
        validTransactions.push(
            Transaction.rewardTransaction({ minerWallet: this.wallet })
        );

        //miner will generate a valid hash consuming CPU power and 
        //add a block consisting of these transactions to the blockchain
        this.blockchain.addBlock({ data: validTransactions });

        //broadcast the updated blockchain
        this.pubsub.broadcastChain();

        //clear the transaction pool
        this.transactionPool.clear();

    }
}

module.exports = TransactionMiner;