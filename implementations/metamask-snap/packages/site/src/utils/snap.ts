import { ethers } from 'ethers';

import { defaultSnapOrigin } from '../config';
import { GetSnapsResponse, Snap } from '../types';

import deployments from '../../../truffle/deployments.json';
import MockSBTClaimJson from '../../../truffle/build/MockSBTClaim.json';

/**
 * Get the installed snaps in MetaMask.
 *
 * @returns The snaps installed in MetaMask.
 */
export const getSnaps = async (): Promise<GetSnapsResponse> => {
  return (await window.ethereum.request({
    method: 'wallet_getSnaps',
  })) as unknown as GetSnapsResponse;
};

/**
 * Connect a snap to MetaMask.
 *
 * @param snapId - The ID of the snap.
 * @param params - The params to pass with the snap to connect.
 */
export const connectSnap = async (
  snapId: string = defaultSnapOrigin,
  params: Record<'version' | string, unknown> = {},
) => {
  await window.ethereum.request({
    method: 'wallet_requestSnaps',
    params: {
      [snapId]: params,
    },
  });
};

/**
 * Get the snap from MetaMask.
 *
 * @param version - The version of the snap to install (optional).
 * @returns The snap object returned by the extension.
 */
export const getSnap = async (version?: string): Promise<Snap | undefined> => {
  try {
    const snaps = await getSnaps();

    return Object.values(snaps).find(
      (snap) =>
        snap.id === defaultSnapOrigin && (!version || snap.version === version),
    );
  } catch (e) {
    console.log('Failed to obtain installed snap', e);
    return undefined;
  }
};

/**
 * Invoke the "hello" method from the example snap.
 */

export const sendHello = async () => {
  await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: { snapId: defaultSnapOrigin, request: { method: 'hello' } },
  });
};

export const getExternalOwnedAccount = async () => {
  return (await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: { method: 'aa_getExternalOwnedAccount' },
    },
  })) as string;
};

export const getAbstractAccount = async () => {
  return (await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: { method: 'aa_getAbstractAccount' },
    },
  })) as string;
};

export const sendAccountAbstraction = async (
  gasPaymentChainId: string,
  gasPaymentToken: string,
) => {
  console.log('sendAccountAbstraction');
  console.log('gasPaymentChainId', gasPaymentChainId);
  console.log('gasPaymentToken', gasPaymentToken);

  const eoaAddress = await getExternalOwnedAccount();
  console.log('eoaAddress', eoaAddress);

  const aaAddress = await getAbstractAccount();
  console.log('aaAddress', aaAddress);

  if (gasPaymentToken === deployments.mockERC20Address) {
    console.log('call mock payment token faucet in Georli');
    const method = 'POST';
    const headers = {
      'Content-Type': 'application/json',
    };
    const { message } = await fetch('http://localhost:8001/faucet', {
      method,
      headers,
      body: JSON.stringify({
        to: aaAddress,
        chainId: gasPaymentChainId,
      }),
    }).then((res) => res.json());
    console.log(message);
  }

  const mockSBTClaim = new ethers.Contract(
    deployments.mockSBTClaim,
    MockSBTClaimJson.abi,
  );

  const claimSBTData = mockSBTClaim.interface.encodeFunctionData('claim', []);

  await window.ethereum.request({
    method: 'wallet_invokeSnap',
    params: {
      snapId: defaultSnapOrigin,
      request: {
        method: 'send_aa_sendTransactionWithCrossFuel',
        params: {
          target: deployments.mockSBTClaim,
          data: claimSBTData,
          gasPaymentChainId,
          gasPaymentToken,
        },
      },
    },
  });
};

export const isLocalSnap = (snapId: string) => snapId.startsWith('local:');
