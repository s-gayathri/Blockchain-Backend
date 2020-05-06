const PubNub = require("pubnub");

const credentials = {
    publishKey: "pub-c-b2bdb641-3d3e-439b-a844-4ad0b562163f",
    subscribeKey: "sub-c-ea80cc52-8531-11ea-b883-d2d532c9a1bf",
    secretKey: "sec-c-Y2M0YTE4OGUtMzFhMi00NTY5LTk1ZTctZDU5NGNhYWI0OTky"
};

const CHANNELS = {
    TEST: "TEST",
    BLOCKCHAIN: "BLOCKCHAIN",
    TRANSACTION: "TRANSACTION"
};

class PubSub {
    constructor({ blockchain, transactionPool, wallet }) {
        this.blockchain = blockchain;

        this.transactionPool = transactionPool;

        this.wallet = wallet;

        this.pubnub = new PubNub(credentials);

        this.pubnub.subscribe({ channels: Object.values(CHANNELS) });
        
        //Handling incoming messages
        this.pubnub.addListener(this.listener());
    }

    listener() {
        return (
            {
                message: (messageObject) => {
                const { channel, message } = messageObject;
                const parsedMessage = JSON.parse(message);
                console.log(`Message received. Channel: ${channel} Message: ${message}`);
                
                switch(channel) {
                    case CHANNELS.BLOCKCHAIN:
                        this.blockchain.replaceChain(parsedMessage, true, () => {
                            this.transactionPool.clearBlockchainTransactions({
                                chain: parsedMessage
                            });
                        });
                        break;
                    case CHANNELS.TRANSACTION:
                        if(!this.transactionPool.existingTransaction({
                            inputAddress: this.wallet.publicKey
                        }))
                            this.transactionPool.setTransaction(parsedMessage);
                        break;
                    default:
                        return;
                    }
                }
            }
        );
    }

    publish({ channel, message }) {
        //the publishers publishes a message to itself because
        //it broadcasts a message on a channel to every subscriber
        //to that channel

        // there is an unsubscribe function in pubnub
        // but it doesn't have a callback that fires after success
        // therefore, redundant publishes to the same local subscriber will be accepted as noisy NoOps
        
        this.pubnub.publish({ channel, message });
    }

    broadcastChain() {
        this.publish({ 
            channel: CHANNELS.BLOCKCHAIN, 
            message: JSON.stringify(this.blockchain.chain) 
        });
    }

    broadcastTransaction(transaction) {
        this.publish({
            channel: CHANNELS.TRANSACTION,
            message: JSON.stringify(transaction)
        });
    }
}

// const testPubSub = new PubSub();
// testPubSub.publish({ channel: CHANNELS.TEST, message:"Hello" });

module.exports = PubSub;