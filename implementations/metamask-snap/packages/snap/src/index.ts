/* eslint-disable no-case-declarations */
import { UserOperationStruct } from '@account-abstraction/contracts';
import { resolveProperties } from 'ethers/lib/utils';
import { OnRpcRequestHandler } from '@metamask/snaps-types';
import { panel, text } from '@metamask/snaps-ui';
import { ethers } from 'ethers';
import {
  HttpRpcClient,
  SimpleAccountAPI,
  PaymasterAPI,
} from '@account-abstraction/sdk';

import { getBIP44AddressKeyDeriver } from '@metamask/key-tree';
import deployments from '../../truffle/deployments.json';
import MockERC20Json from '../../truffle/build/MockERC20.json';
/**
 * Handle incoming JSON-RPC requests, sent through `wallet_invokeSnap`.
 *
 * @param args - The request handler args as object.
 * @param args.origin - The origin of the request, e.g., the website that
 * invoked the snap.
 * @param args.request - A validated JSON-RPC request object.
 * @returns The result of `snap_dialog`.
 * @throws If the request method is not valid for this snap.
 */

const entryPoint = '0x0576a174D229E3cFA37253523E645A78A0C91B57';
const bundlerUrls = {
  '5': 'http://localhost:3000/rpc',
  '80001': 'http://localhost:3001/rpc',
};
const chainName = {
  '5': 'goerli',
  '80001': 'polygon-mumbai',
};
type ChainId = keyof typeof bundlerUrls;
let currentChainId: ChainId | null;

const gasPaymentChainId = '5';

// TODO: replace with defender address
const verifyingPaymasterSigner = '0xa8dBa26608565e1F69d81Efae4cbB5cB8e87013d';
const infuraProjectId = 'eedaad734dce46a4b08816a7f6df0b9b';

const isChainId = (value: string): value is ChainId => {
  return Object.keys(bundlerUrls).includes(value);
};

const getConnectedProvider = () => {
  return new ethers.providers.Web3Provider(ethereum as any);
};

const getConnectedChainId = async (): Promise<ChainId> => {
  const provider = getConnectedProvider();
  const { chainId } = await provider.getNetwork();
  const chainIdString = chainId.toString();
  if (!isChainId(chainIdString)) {
    throw new Error(`Invalid chain ID: ${chainId}`);
  }
  return chainIdString;
};

const getJsonPRCProviderByChainId = (chainId: ChainId) => {
  return new ethers.providers.JsonRpcProvider(
    `https://${chainName[chainId]}.infura.io/v3/${infuraProjectId}`,
  );
};

const getSignerFromDerivedPrivateKey = async (chainId?: ChainId) => {
  // TODO: currently, only supports accounts[0] in metamask default account
  //       let's think about better private key creation way later
  const ethereumNode = await snap.request({
    method: 'snap_getBip44Entropy',
    params: {
      coinType: 60, // this is Ethereum type
    },
  });

  const derivedEthereumKeyDriver = await getBIP44AddressKeyDeriver(
    ethereumNode as any,
  );

  const { privateKey } = await derivedEthereumKeyDriver(0);

  if (!privateKey) {
    throw new Error('Private key is null or undefined');
  }

  const signer = new ethers.Wallet(privateKey);

  if (chainId) {
    const provider = getJsonPRCProviderByChainId(chainId);
    signer.connect(provider);
  }

  return signer;
};

class VerifyingPaymasterAPI extends PaymasterAPI {
  override async getPaymasterAndData(userOp: Partial<UserOperationStruct>) {
    console.log('VerifyingPaymasterAPI - getPaymasterAndData');
    console.log('currentChainId', currentChainId);
    const resolvedUserOp = await resolveProperties(userOp);
    const parsedUserOp = {
      ...resolvedUserOp,
    };
    const chainId = currentChainId;
    const method = 'POST';
    const headers = {
      'Content-Type': 'application/json',
    };
    const { paymasterAndData } = await fetch('http://localhost:8001/sign', {
      method,
      headers,
      body: JSON.stringify({
        userOp: parsedUserOp,
        chainId,
      }),
    }).then((res) => res.json());
    return paymasterAndData;
  }
}

const paymasterAPI = new VerifyingPaymasterAPI();

export const getAbstractAccount = async (
  chainId: ChainId,
): Promise<SimpleAccountAPI> => {
  console.log('getAbstractAccount');
  const { entryPointAddress, factoryAddress } = deployments;

  const provider = getJsonPRCProviderByChainId(chainId);
  const owner = await getSignerFromDerivedPrivateKey();

  const aa = new SimpleAccountAPI({
    provider,
    entryPointAddress,
    owner,
    factoryAddress,
    paymasterAPI,
  });
  return aa;
};

export const onRpcRequest: OnRpcRequestHandler = async ({
  origin,
  request,
}) => {
  console.log('onRpcRequest');
  switch (request.method) {
    case 'hello':
      return snap.request({
        method: 'snap_dialog',
        params: {
          type: 'Confirmation',
          content: panel([
            text(`Hello, **${origin}**!`),
            text('This custom confirmation is just for display purposes.'),
            text(
              'But you can edit the snap source code to make it do something, if you want to!',
            ),
          ]),
        },
      });
    case 'get_eoa_address': {
      const signer = await getSignerFromDerivedPrivateKey();
      return await signer.getAddress();
    }

    case 'get_aa_address': {
      const chainId = await getConnectedChainId();
      const connectedAbstractAccount = await getAbstractAccount(chainId);
      return await connectedAbstractAccount.getAccountAddress();
    }

    case 'send_aa_tx': {
      console.log('send_aa_tx');

      const { target, data } = request.params as {
        target: string;
        data: string;
      };

      console.log('snapConfirmResult');
      const snapConfirmResult = await snap.request({
        method: 'snap_confirm',
        params: [
          {
            prompt: 'Transfer',
            description: 'Transfer from your Abstraction Account',
            textAreaContent: `target: ${target}`,
          },
        ],
      });
      if (!snapConfirmResult) {
        return null;
      }

      const connectedChainId = await getConnectedChainId();
      console.log('connectedChainId', connectedChainId);

      console.log('init aa wallet');
      const gasPaymentAbstractAccount = await getAbstractAccount(
        gasPaymentChainId,
      );
      const executeAbstractAccount = await getAbstractAccount(connectedChainId);

      const aaAccount = await executeAbstractAccount.getAccountAddress();
      console.log('aaAccount', aaAccount);

      console.log('init aa bundlers');
      const gasPaymentChainBundler = new HttpRpcClient(
        bundlerUrls['5'],
        entryPoint,
        5,
      );

      const executeChainBundler = new HttpRpcClient(
        bundlerUrls[connectedChainId],
        entryPoint,
        parseInt(connectedChainId, 10),
      );

      console.log('process gas payment tx');
      currentChainId = gasPaymentChainId;
      const mockERO20 = new ethers.Contract(
        deployments.mockERC20,
        MockERC20Json.abi,
      );

      const gasPaymentData = mockERO20.interface.encodeFunctionData(
        'transferFrom',
        [aaAccount, verifyingPaymasterSigner, ethers.utils.parseEther('0.1')],
      );

      console.log('gasPaymentData', gasPaymentData);

      const gasPaymentOp1 = await gasPaymentAbstractAccount.createSignedUserOp({
        target: verifyingPaymasterSigner,
        data: gasPaymentData,
        maxFeePerGas: 0x6507a5d0,
        maxPriorityFeePerGas: 0x6507a5c0,
      });

      const resolveGasPaymentUserOp1 = await resolveProperties(gasPaymentOp1);
      // @dev: This is fix preVerificationGas too low bug
      // https://github.com/eth-infinitism/bundler/pull/7
      resolveGasPaymentUserOp1.preVerificationGas = 100000;

      // some chain call gas limit calculation is wrong
      resolveGasPaymentUserOp1.callGasLimit = 21828;

      resolveGasPaymentUserOp1.paymasterAndData =
        await paymasterAPI.getPaymasterAndData(resolveGasPaymentUserOp1);

      const gasPaymentOp2 = await gasPaymentAbstractAccount.signUserOp(
        resolveGasPaymentUserOp1,
      );
      const resolvedGasPaymentUserOp2 = await resolveProperties(gasPaymentOp2);

      console.log('process execute tx', target, data);
      currentChainId = connectedChainId;
      const executeOp1 = await executeAbstractAccount.createSignedUserOp({
        target,
        data,
        maxFeePerGas: 0x6507a5d0,
        maxPriorityFeePerGas: 0x6507a5c0,
      });

      const resolvedExecuteUserOp1 = await resolveProperties(executeOp1);
      // @dev: This is fix preVerificationGas too low bug
      // https://github.com/eth-infinitism/bundler/pull/7
      resolvedExecuteUserOp1.preVerificationGas = 100000;

      // some chain call gas limit calculation is wrong
      resolvedExecuteUserOp1.callGasLimit = 21828;

      resolvedExecuteUserOp1.paymasterAndData =
        await paymasterAPI.getPaymasterAndData(resolvedExecuteUserOp1);
      const executeOp2 = await executeAbstractAccount.signUserOp(
        resolvedExecuteUserOp1,
      );
      const resolvedExecuteUserOp2 = await resolveProperties(executeOp2);

      console.log('send to bundler');
      currentChainId = null;

      console.log('resolvedExecuteUserOp2', resolvedExecuteUserOp2);
      console.log('resolvedGasPaymentUserOp2', resolvedGasPaymentUserOp2);

      const sendGasPaymentUserOpToBundlerResult =
        await gasPaymentChainBundler.sendUserOpToBundler(
          resolvedGasPaymentUserOp2,
        );
      const sendExecuteUserOpToBundlerResult =
        await executeChainBundler.sendUserOpToBundler(resolvedExecuteUserOp2);

      console.log(
        'sendGasPaymentUserOpToBundlerResult',
        sendGasPaymentUserOpToBundlerResult,
      );

      console.log(
        'sendExecuteUserOpToBundlerResult',
        sendExecuteUserOpToBundlerResult,
      );

      return {
        sendGasPaymentUserOpToBundlerResult,
        sendExecuteUserOpToBundlerResult,
      };
    }
    default:
      throw new Error('Method not found.');
  }
};
