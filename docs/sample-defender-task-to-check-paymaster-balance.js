const { Relayer } = require("defender-relay-client");

exports.handler = async function (credentials, context) {
  const relayer = new Relayer(credentials);
  const { notificationClient } = context;

  const { result } = await relayer.call("eth_call", [
    { to: "0x78a5baab4684c0ffa719d07a0d3e036897f9b5ad", data: "0xc399ec88" }, // this is paymaster address and get deposit function
  ]);
  console.log(result); // balance
  // below script should be run when balance is under 1 ETH

  try {
    notificationClient.send({
      channelAlias: "admin-email",
      subject: "Paymaster Balance is getting low",
      message: "Please deposit Paymaster balance in Georli",
    });
  } catch (error) {
    console.error(error);
  }
};
