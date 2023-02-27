const { EntryPoint__factory } = require('@account-abstraction/contracts');
const { DeterministicDeployer } = require('@account-abstraction/sdk');
const { ethers } = require('ethers');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const networks = require('../networks');
const FactoryJson = require('../build/SimpleAccountFactory.json');
const PaymasterJson = require('../build/VerifyingPaymaster.json');

const fs = require('fs');
const path = require('path');

require('dotenv').config({});

const mnemonicPhrase = process.env.MNEMONIC_PHRASE;
const infuraProjectId = process.env.INFURA_PROJECT_ID;

// @dev
// This is a custom multichain deployer that utilizes a create2 factory.
// We have added custom logic to enable deployment to multiple chains simultaneously,
// while ensuring that the deployed address remains consistent across all chains.

// TODO: replace with defender address
const verifyingPaymasterSigner = '0xa8dBa26608565e1F69d81Efae4cbB5cB8e87013d';

const main = async () => {
  let entryPointAddress;
  let factoryAddress;
  let paymasterAddress;

  try {
    for (const network of networks) {
      console.log(`Processing on ${network}`);

      // @dev
      // This requires deploying with creat2 to Multichain, so Truffle migrate cannot be used directly.
      // However, we attempt to create the same environment as Truffle.
      let hdWalletProvider = new HDWalletProvider({
        mnemonic: {
          phrase: mnemonicPhrase,
        },
        providerOrUrl: `https://${network}.infura.io/v3/${infuraProjectId}`,
      });

      const provider = new ethers.providers.Web3Provider(hdWalletProvider);
      const signer =
        ethers.Wallet.fromMnemonic(mnemonicPhrase).connect(provider);
      const dep = new DeterministicDeployer(provider);

      const deployIfNeeded = async (deploymentCode) => {
        const addr = DeterministicDeployer.getAddress(deploymentCode);
        if (await dep.isContractDeployed(addr)) {
          console.log('already deployed at', addr);
        } else {
          console.log('deploy now...');
          await dep.deterministicDeploy(deploymentCode);
          console.log('deployed at', addr);
        }
        return addr;
      };

      console.log('====== EntryPoint ======');
      const entryPointDeploymentCode = EntryPoint__factory.bytecode;
      entryPointAddress = await deployIfNeeded(entryPointDeploymentCode);

      console.log('====== Factory ======');
      const factoryDeploymentArgument = ethers.utils.defaultAbiCoder.encode(
        ['address'],
        [entryPointAddress],
      );
      const factoryDeploymentCode = ethers.utils.solidityPack(
        ['bytes', 'bytes'],
        [FactoryJson.bytecode, factoryDeploymentArgument],
      );
      factoryAddress = await deployIfNeeded(factoryDeploymentCode);

      console.log('====== Paymaster ======');
      const paymasterDeploymentArgument = ethers.utils.defaultAbiCoder.encode(
        ['address', 'address'],
        [entryPointAddress, verifyingPaymasterSigner],
      );
      const paymasterDeploymentCode = ethers.utils.solidityPack(
        ['bytes', 'bytes'],
        [PaymasterJson.bytecode, paymasterDeploymentArgument],
      );
      paymasterAddress = await deployIfNeeded(paymasterDeploymentCode);

      const paymasterContract = new ethers.Contract(
        paymasterAddress,
        PaymasterJson.abi,
        signer,
      );

      const deposit = await paymasterContract.getDeposit();
      if (deposit.lt(ethers.utils.parseEther('0.02'))) {
        console.log('paymaster deposit is too low');
        await paymasterContract.deposit({
          value: ethers.utils.parseEther('0.03'),
        });
        console.log('depositted');
      }
      // await paymaster.addStake(1, { value: parseEther('2') })
    }

    fs.writeFileSync(
      path.join(__dirname, `../deployments.json`),
      JSON.stringify({
        entryPointAddress,
        factoryAddress,
        paymasterAddress,
      }),
    );

    return;
  } catch (e) {
    console.log(e);
  } finally {
    process.exit();
  }
};

main();
