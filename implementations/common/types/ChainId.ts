import networkJson from "../../metamask-snap/packages/truffle/networks.json";

export type ChainId = keyof typeof networkJson;

export const isChainId = (value: string): value is ChainId => {
  return Object.keys(networkJson).includes(value);
};
