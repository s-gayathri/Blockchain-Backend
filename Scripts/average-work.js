//Purely experimemtation code to decide whether hex or binary form 
//of the hash is more efficient in terms of proof of work and difficulty

const Blockchain = require("../Blockchain/index");

const blockchain = new Blockchain();

blockchain.addBlock({ data: "initial-data" });

console.log("first block", blockchain.chain[blockchain.chain.length-1]);

let prevTimestamp, nextTimestamp, nextBlock, timeDiff, average;

const times = [];

for(let i=0; i<10000; i++) {
    prevTimestamp = blockchain.chain[blockchain.chain.length-1].timestamp;
    
    blockchain.addBlock({ data: `block ${i}` });
    
    nextBlock = blockchain.chain[blockchain.chain.length-1];
    nextTimestamp = nextBlock.timestamp;
    timeDiff = nextTimestamp - prevTimestamp;
    times.push(timeDiff);

    const sum = times.reduce((accumulator, item) => item+accumulator ,0 );
    const average = sum/times.length;

    console.log(`Time to mine block: ${timeDiff}ms\t
                Difficulty: ${nextBlock.difficulty}\t
                Average time: ${average}ms\n`);
}