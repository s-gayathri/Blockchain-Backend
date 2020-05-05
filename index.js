const express = require("express");

const cors = require('cors');

const app = express();

const Blockchain = require("./Blockchain");

const TransactionPool = require("./Wallet/transaction-pool");

const Wallet = require("./Wallet");

const PubSub = require("./App/pubsub");

const TransactionMiner = require("./App/transaction-miner");

const got = require("got");

//---------------------------------------------------------------------//

const blockchain = new Blockchain();

const transactionPool = new TransactionPool();

const wallet = new Wallet();

const pubsub = new PubSub({ blockchain, transactionPool, wallet });

const transactionMiner = new TransactionMiner({ 
    blockchain, transactionPool, wallet, pubsub });

const DEFAULT_PORT = 3001;
let PEER_PORT;

const ROOT_NODE_ADDRESS = "http://localhost:3001";

const isDevelopment = process.env.ENV === 'development';

//---------------------------------------------------------------------//

app.use(express.json());

app.use(cors());

//---------------------------------------------------------------------//

app.get("/api/blocks", (req, res) => {
    res.json(blockchain.chain);
});

app.post("/api/mine", (req, res) => {
    const { data } = req.body;

    blockchain.addBlock({ data });

    pubsub.broadcastChain();

    res.redirect("/api/blocks");
});

app.post('/api/transact', (req, res) => {
    const { amount, recipient } = req.body;

    let transaction = transactionPool
        .existingTransaction({ inputAddress: wallet.publicKey });

    try {
        if(transaction) {
            transaction.update({
                senderWallet: wallet,
                recipient,
                amount
            });
        } else 
            transaction = wallet.createTransaction({
                amount, 
                recipient, 
                chain: blockchain.chain 
            });
    } catch (error) {
        return res.status(400).json({ type: "error", message: error.message });
    }

    transactionPool.setTransaction(transaction);

    pubsub.broadcastTransaction(transaction);

    res.json({ type: "success", transaction });
});

app.get('/api/transaction-pool-map', (req, res) => {
    res.json(transactionPool.transactionMap);
});

app.get("/api/mine-transactions", (req, res) => {
    transactionMiner.mineTransactions();

    res.redirect("/api/blocks");
});

app.get("/api/wallet-info", (req, res) => {
    const address = wallet.publicKey;

    res.json({ 
        address, 
        balance: Wallet.calculateBalance({
            chain: blockchain.chain,
            address
        })
    });
});

const syncWithRootState = () => {
    console.log("In syncWithRootState()\n");
    (async () => {
        try {
            const response = await got(`${ROOT_NODE_ADDRESS}/api/blocks`);
            const rootChain = JSON.parse(response.body);
               
            console.log("replacing chain with", rootChain);
            blockchain.replaceChain(rootChain);
        }  catch(error) {
            console.log("Error:",error);
        }
    })();

    (async () => {
        try {
            const response = await got(`${ROOT_NODE_ADDRESS}/api/transaction-pool-map`);
            const rootTransactionPool = JSON.parse(response.body);

            console.log("replacing transaction pool map with", rootTransactionPool);
            transactionPool.setMap(rootTransactionPool);
        } catch (error) {
            console.log("Error:", error);
        }
    })();
};

//---------------------------------------------------------------------//

if(isDevelopment) {
    const walletTest1 = new Wallet();
    const walletTest2 = new Wallet();

    const generateWalletTransaction = ({ wallet, recipient, amount }) => {
        const transaction = wallet.createTransaction({
            recipient,
            amount,
            chain: blockchain.chain
        });

        transactionPool.setTransaction(transaction);
    };

    const walletAction = () => generateWalletTransaction({
        wallet,
        recipient: walletTest1.publicKey,
        amount: 5
    });

    const walletTest1Action = () => generateWalletTransaction({
        wallet: walletTest1,
        recipient: walletTest2.publicKey,
        amount: 10
    });

    const walletTest2Action = () => generateWalletTransaction({
        wallet: walletTest2,
        recipient: wallet.publicKey,
        amount: 15
    });

    for (let i = 0; i < 10; i++) {
        if (i % 3 === 0) {
            walletAction();
            walletTest1Action();
        } else if (i % 3 === 1) {
            walletAction();
            walletTest2Action();
        } else {
            walletTest1Action();
            walletTest2Action();
        }

        transactionMiner.mineTransactions();
    }
}

//---------------------------------------------------------------------//

if(process.env.GENERATE_PEER_PORT === 'true')
    PEER_PORT = Math.round(DEFAULT_PORT + (Math.random() * 1000));

const PORT = process.env.PORT || PEER_PORT || DEFAULT_PORT;
app.listen(PORT, () => {
    console.log(`App is running on localhost:${PORT}\n`);

    if (PORT !== DEFAULT_PORT) {
        syncWithRootState();
    }
});

//---------------------------------------------------------------------//
