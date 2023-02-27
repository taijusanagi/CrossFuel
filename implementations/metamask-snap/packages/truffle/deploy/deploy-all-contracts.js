const { EntryPoint__factory } = require('@account-abstraction/contracts');
const { DeterministicDeployer } = require('@account-abstraction/sdk');
const { ethers } = require('ethers');
const HDWalletProvider = require('@truffle/hdwallet-provider');
const networks = require('../networks');
const SimpleAccountFactoryJson = require('../build/SimpleAccountFactory.json');

const fs = require('fs');
const path = require('path');

require('dotenv').config({});

const mnemonicPhrase = process.env.MNEMONIC_PHRASE;
const infuraProjectId = process.env.INFURA_PROJECT_ID;

// @dev
// This is a custom multichain deployer that utilizes a create2 factory.
// We have added custom logic to enable deployment to multiple chains simultaneously,
// while ensuring that the deployed address remains consistent across all chains.

const main = async () => {
  let entryPointAddress;
  let factoryAddress;

  try {
    for (const network of networks) {
      console.log(`Processing on ${network}`);
      let hdWalletProvider = new HDWalletProvider({
        mnemonic: {
          phrase: mnemonicPhrase,
        },
        providerOrUrl: `https://${network}.infura.io/v3/${infuraProjectId}`,
      });
      const providers = new ethers.providers.Web3Provider(hdWalletProvider);
      const dep = new DeterministicDeployer(providers);

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

      console.log('====== SimpleAccountFactory ======');
      const simpleAccountFactoryDeploymentArgument =
        ethers.utils.defaultAbiCoder.encode(['address'], [entryPointAddress]);
      const simpleAccountFactoryDeploymentCode = ethers.utils.solidityPack(
        ['bytes', 'bytes'],
        [
          SimpleAccountFactoryJson.bytecode,
          simpleAccountFactoryDeploymentArgument,
        ],
      );
      factoryAddress = await deployIfNeeded(simpleAccountFactoryDeploymentCode);
    }

    fs.writeFileSync(
      path.join(__dirname, `../deployments.json`),
      JSON.stringify({
        entryPointAddress,
        factoryAddress,
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
