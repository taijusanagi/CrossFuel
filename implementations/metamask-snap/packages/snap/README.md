# CrossFuel Snap

CrossFuel is a wallet that employs Account Abstraction to enable cross-chain gas payment with improved user experience.

### getConnectedChainId

This function retrieves the connected chain ID of the user's wallet. The function getConnectedChainId() is called to retrieve the chain ID, and the result is returned as a response.

### getSignerFromDerivedPrivateKey

This function retrieves the external owned account (EOA) of the user's wallet. The function getSignerFromDerivedPrivateKey() is called to retrieve the signer from the derived private key, and the EOA address is obtained by calling getAddress() on the signer. The EOA address is then returned as a response.

### getAbstractAccount

This function retrieves the abstract account of the user's wallet. The function getConnectedChainId() is called to retrieve the chain ID, and the abstract account for the connected chain ID is obtained by calling getAbstractAccount(chainId). The account address of the abstract account is then obtained by calling getAccountAddress(), and the account address is returned as a response.

### crossFuel_sendTransactionWithCrossFuel

This function processes both gas payment and actual transaction simultaneously, using a typical transaction object containing payment token information. For a demonstration, please refer to https://github.com/taijusanagi/CrossFuel
