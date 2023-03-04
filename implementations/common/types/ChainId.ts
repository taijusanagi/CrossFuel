import networkJson from "../../metamask-snap/packages/truffle/networks.json";

export type ChainId = keyof typeof networkJson;

export const isChainId = (value: string): value is ChainId => {
  return Object.entries(networkJson)
    .filter(([, { enabled }]) => enabled)
    .map(([key]) => key)
    .includes(value);
};
