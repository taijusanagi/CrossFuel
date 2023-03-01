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
type ChainId = keyof typeof bundlerUrls;

// TODO: replace with defender address
const verifyingPaymasterSigner = '0xa8dBa26608565e1F69d81Efae4cbB5cB8e87013d';

const isChainId = (value: string): value is ChainId => {
  return Object.keys(bundlerUrls).includes(value);
};

const getProvider = () => {
  return new ethers.providers.Web3Provider(ethereum as any);
};

const getChainId = async (): Promise<ChainId> => {
  const provider = getProvider();
  const { chainId } = await provider.getNetwork();
  const chainIdString = chainId.toString();
  if (!isChainId(chainIdString)) {
    throw new Error(`Invalid chain ID: ${chainId}`);
  }
  return chainIdString;
};

class VerifyingPaymasterAPI extends PaymasterAPI {
  override async getPaymasterAndData(userOp: Partial<UserOperationStruct>) {
    console.log('VerifyingPaymasterAPI - getPaymasterAndData');
    const resolvedUserOp = await resolveProperties(userOp);
    const parsedUserOp = {
      ...resolvedUserOp,
    };

    const chainId = await getChainId();

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

export const getAbstractAccount = async (): Promise<SimpleAccountAPI> => {
  console.log('getAbstractAccount');
  const { entryPointAddress, factoryAddress } = deployments;

  const provider = getProvider();
  const owner = provider.getSigner();

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
      const provider = new ethers.providers.Web3Provider(ethereum as any);
      const accounts = await provider.send('eth_requestAccounts', []);
      return accounts[0];
    }

    case 'get_aa_address': {
      const aa = await getAbstractAccount();
      const address = await aa.getAccountAddress();
      return address;
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

      const chainId = await getChainId();

      console.log('chainId', chainId);

      console.log('init aa wallet');
      const aa = await getAbstractAccount();
      const aaAccount = await aa.getAccountAddress();
      console.log(aaAccount);

      console.log('init aa bundlers');
      const gasPaymentChainBundler = new HttpRpcClient(
        bundlerUrls['5'],
        entryPoint,
        5,
      );

      const executeChainBundler = new HttpRpcClient(
        bundlerUrls[chainId],
        entryPoint,
        parseInt(chainId, 10),
      );

      console.log('process gas payment tx');
      const mockERO20 = new ethers.Contract(
        deployments.mockERC20,
        MockERC20Json.abi,
      );

      const gasPaymentData = mockERO20.interface.encodeFunctionData(
        'transferFrom',
        [aaAccount, verifyingPaymasterSigner, ethers.utils.parseEther('0.1')],
      );

      console.log('gasPaymentData', gasPaymentData);

      const gasPaymentOp1 = await aa.createSignedUserOp({
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

      const gasPaymentOp2 = await aa.signUserOp(resolveGasPaymentUserOp1);
      const resolvedGasPaymentUserOp2 = await resolveProperties(gasPaymentOp2);

      console.log('process execute tx', target, data);

      const executeOp1 = await aa.createSignedUserOp({
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
      const executeOp2 = await aa.signUserOp(resolvedExecuteUserOp1);
      const resolvedExecuteUserOp2 = await resolveProperties(executeOp2);

      console.log('send to bundler');

      console.log('resolvedExecuteUserOp2', resolvedExecuteUserOp2);
      console.log('resolvedGasPaymentUserOp2', resolvedGasPaymentUserOp2);

      gasPaymentChainBundler.sendUserOpToBundler(resolvedGasPaymentUserOp2);
      executeChainBundler.sendUserOpToBundler(resolvedExecuteUserOp2);

      return {
        // sendGasPaymentUserOpToBundlerResult,
        // sendExecuteUserOpToBundlerResult,
      };
    }
    default:
      throw new Error('Method not found.');
  }
};
