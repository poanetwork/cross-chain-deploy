require('dotenv').config();
const EthereumTx = require('ethereumjs-tx');
const EthereumUtils = require('ethereumjs-util');
const Web3 = require('web3');

const RPC_URL = process.env.RPC_URL;
const UNLOCKED_ADDRESS = process.env.UNLOCKED_ADDRESS;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const BYTECODE = process.env.BYTECODE;
let GAS_PRICE = process.env.GAS_PRICE;

const provider = new Web3.providers.HttpProvider(RPC_URL);
const web3 = new Web3(provider);

GAS_PRICE = web3.utils.toWei(GAS_PRICE, 'gwei');

//has to start with 0x
const code = BYTECODE;


generateDeployTx = (gasLimit) => {
    const rawTx = {
        nonce: 0,
        gasPrice: web3.utils.toHex(GAS_PRICE),
        gasLimit: web3.utils.toHex(gasLimit),
        value: 0,
        data: code,
        v: 27,
        r: '0x79BE667EF9DCBBAC55A06295CE870B07029BFCDB2DCE28D959F2815B16F81799',
        s: '0x0aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
    };
    const tx = new EthereumTx(rawTx);
    const res = {
        sender: '0x'+tx.getSenderAddress().toString('hex'),
        rawTx: '0x'+tx.serialize().toString('hex'),
        contractAddr: '0x'+EthereumUtils.generateAddress( '0x'+tx.getSenderAddress().toString('hex') , 0 ).toString('hex')
    }
    return res;
};


deploy = async (web3, account) => {
    let gasLimit = await web3.eth.estimateGas({
        from: account,
        data: BYTECODE,
        value: '0x0'
    })
    console.log('gasLimit', gasLimit);
    const BN = web3.utils.BN;
    const toFund = new BN(GAS_PRICE).mul(new BN(gasLimit))
    console.log('toFund', toFund.toString(10));
    const res = generateDeployTx(gasLimit);
    // check if address doesn't exist
    const deployedCode = await web3.eth.getCode(res.contractAddr);
    
    if (deployedCode.length <=3 ) {
        // console.log(res);
        await sendSignedTx(account, res.sender, toFund.toString(16));
        await web3.eth.sendSignedTransaction(res.rawTx)
        .on('transactionHash', function(hash){console.log('contract deployment hash', hash)})
        .on('error', console.error);
        console.log("Deployed Contract:", res.contractAddr);
    } else {
        console.error("Address already exists, please modify r or gasLimit");
    }
};
deploy(web3, UNLOCKED_ADDRESS)

async function sendSignedTx(from, to, toFund){
    var txcount = await web3.eth.getTransactionCount(UNLOCKED_ADDRESS);
    console.log('txcou', txcount)
    const privateKey = Buffer.from(PRIVATE_KEY, 'hex')

    const nonce = web3.utils.toHex(txcount);
    var rawTx = {
        nonce: nonce,
        gasPrice:  web3.utils.toHex(GAS_PRICE),
        gasLimit:   web3.utils.toHex('21000'),
        to,
        value: '0x' + toFund
      }
      var tx = new EthereumTx(rawTx);
      tx.sign(privateKey);
      var serializedTx = tx.serialize();
      await web3.eth.sendSignedTransaction('0x' + serializedTx.toString('hex'))
      .on('transactionHash', function(hash){console.log('sender hash', hash)})
      .on('error', console.error)

}