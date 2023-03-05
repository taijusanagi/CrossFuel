import Web3 from 'web3';
import { PrivateKeyProviderConnector, FusionSDK } from '@1inch/fusion-sdk';

const blockchainProvider = new PrivateKeyProviderConnector(
  `0x${process.env.PRIVATE_KEY}`,
  new Web3(
    `https://polygon-mainnet.infura.io/v3/{${process.env.INFURA_PROJECT_ID}}`,
  ),
);

const sdk = new FusionSDK({
  url: 'https://fusion.1inch.io',
  network: 137,
  blockchainProvider,
});

// before run this, token is approved
sdk
  .placeOrder({
    fromTokenAddress: '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270', // WMATIC
    toTokenAddress: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174', // USDC
    amount: '500000000000000000', // 0.5 MATIC
    walletAddress: '0xa8dBa26608565e1F69d81Efae4cbB5cB8e87013d',
  })
  .then(console.log);
