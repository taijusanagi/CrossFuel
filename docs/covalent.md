## Covalent

In our data retrieval process across multiple chains, Covalent plays a pivotal role. On the frontend, we gather supported tokens across various chains, while on the backend, we use Covalent to obtain balance data to ensure validation prior to conducting swaps and cross-chain bridge transfers.

The integration of Covalent allows for the retrieval of data across multiple chains, ensuring the validation of tokens and balances prior to conducting swaps and cross-chain bridge transfers.

### Process for Investigating Chains and APIs

https://github.com/taijusanagi/CrossFuel/issues/1

### Endpoint

We utilize the following endpoint for both the frontend and backend.
https://api.covalenthq.com/v1/${covalentKey}/address/${verifyingPaymasterSigner}/balances_v2/

We retrieve multichain and multitoken balances on the Account Abstraction wallet for the frontend, and paymaster signer token balances for bridge and swap on the backend.

### Challenge

The Covalent API response may include "dust" balances, which are very small amounts of tokens that are not worth tracking. Although we can remove these balances to improve efficiency, it's currently not feasible to do so for ETH on the Goerli network. Therefore, we will temporarily retain them in the response.

### Benefit

The Covalent API model significantly simplifies the process of querying each token balance on each chain, resulting in improved efficiency and ease of use.
