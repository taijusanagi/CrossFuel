## Scroll

We are planning to incorporate our Account Abstraction infrastructure onto Scroll. This is because Scroll is transitioning to zk EVM, which lacks native support for Account Abstraction. By deploying our infrastructure on Scroll, we can bridge this gap.

You can find all the contract information here:
https://github.com/taijusanagi/CrossFuel/tree/main/implementations/metamask-snap/packages/truffle/scroll.json

The challenge we face is that Scroll does not yet have a deployment proxy. Therefore, we must deploy it to the network to use our service. However, we have devised an alternative way to interact with the contract other than through the main app.

## Benefit

The L2 bridge can be challenging for inexperienced users. CrossFuel simplifies the process by enabling users to create transactions in Scroll using assets from different chains without the need for swapping or bridging.
