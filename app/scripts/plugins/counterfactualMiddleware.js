const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')

module.exports = createCounterfactualMiddleware

function createCounterfactualMiddleware (counterfactualController, metamaskController) {
  return createAsyncMiddleware(async function counterfactualMiddleware (req, res, next) {
    if (req.method.includes('counterfactual')) {
      await counterfactualController.initialize({metamaskController})
      switch (req.method) {
          case 'counterfactual:set:user':
            window.localStorage.setItem('playground:user:token', req.params[0])
            res.result = req.params[0]
            break
          case 'counterfactual:get:nodeAddress':
            res.result = await counterfactualController.metamaskGetNodeAddressRPC()
            break
          case 'counterfactual:request:balances':
            res.result = await counterfactualController.metamaskRequestBalancesRPC(req.params[0])
            break
          case 'counterfactual:listen:createChannel':
            res.result = await counterfactualController.metamaskListenCreateChannelRPC()
            break
          case 'counterfactual:request:deposit_start':
            res.result = await counterfactualController.metamaskRequestDepositStartRPC()
            break
          case 'counterfactual:request:deposit_confirmed':
            res.result = await counterfactualController.metamaskRequestDepositConfirmedRPC()
            break
          case 'counterfactual:request:deposit':
            res.result = await counterfactualController.metamaskRequestDepositRPC(req.params[0], req.params[1])
            break
          case 'counterfactual:request:withdraw':
            res.result = await counterfactualController.metamaskRequestWithdrawRPC(req.params[0], req.params[1], req.params[2])
            break    
          case 'counterfactual:request:user':
            res.result = await counterfactualController.playgroundRequestUserRPC()
            break
          case 'counterfactual:request:matchmake':
            res.result = await counterfactualController.playgroundRequestMatchmakeRPC()
            break
          case 'cf-node-provider:init':
            // Not implemented
            res.result = await counterfactualController.cfNodeProviderInit()
            break
          default:
            if (req.method.includes('nodeProvider:request')) {
              res.result = await counterfactualController.relayMessageToNodeRPC(req.params[0])
            } else if (req.method.includes('nodeProvider:event')) {
              res.result = await counterfactualController.waitForNodeEvent(req.params[0])
            } else {
              res.result = {name: 'hooray', does: 'thiswork'}
            }
            break
      }
    } else {
        return next()
    }
  })
}
