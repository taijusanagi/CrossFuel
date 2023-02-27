import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import { ethers } from "ethers";

import deployments from "../../metamask-snap/packages/truffle/deployments.json";
import PaymasterJson from "../../metamask-snap/packages/truffle/build/VerifyingPaymaster.json";

dotenv.config();

const port = process.env.PORT || "8001";
const mnemonicPhrase = process.env.MNEMONIC_PHRASE || "";
const infuraProjectId = process.env.INFURA_PROJECT_ID;

const app: Express = express();
app.use(cors());
app.use(express.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Hello");
});

app.post("/sign", async (req: Request, res: Response) => {
  const { userOp } = req.body;
  const provider = new ethers.providers.JsonRpcProvider(`https://goerli.infura.io/v3/${infuraProjectId}`);
  const { paymasterAddress } = deployments;
  const paymasterContract = new ethers.Contract(paymasterAddress, PaymasterJson.abi, provider);
  const blockNumber = await provider.getBlockNumber();
  const block = await provider.getBlock(blockNumber);
  const { timestamp } = block;
  const validAfter = timestamp;
  const validUntil = timestamp + 1800;
  const paymasterAndData = await paymasterContract
    .getHash({ signature: "0x", ...userOp }, validUntil, validAfter)
    .then(async (hash: string) => {
      const signer = ethers.Wallet.fromMnemonic(mnemonicPhrase).connect(provider);
      const signature = await signer.signMessage(hash);
      const paymasterAndData = ethers.utils.solidityPack(
        ["address", "uint48", "uint48", "bytes"],
        [paymasterAddress, validUntil, validAfter, signature]
      );
      return paymasterAndData;
    })
    .catch(() => {
      return "0x";
    });
  res.send({ paymasterAndData });
});

app.listen(port, () => {
  console.log(`⚡️[server]: Server is running at http://localhost:${port}`);
});
