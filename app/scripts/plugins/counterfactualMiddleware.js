const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')
const CounterFactual = require('./counterfactual')

module.exports = createCounterfactualMiddleware

function createCounterfactualMiddleware () {
  return createAsyncMiddleware(async function counterfactualMiddleware (req, res, next) {
    if (req.method.includes('counterfactual')) {
        switch (req.method) {
            case 'counterfactual:set:user':
              window.localStorage.setItem('playground:user:token', req.params[0])
              res.result = req.params[0]
              break
            case 'metamask:setup:initiate':
              // Not implemented
              res.result = await CounterFactual.metamaskSetupInit()
              break
            case 'counterfactual:get:nodeAddress':
              res.result = await CounterFactual.metamaskGetNodeAddressRPC()
              break
            case 'counterfactual:request:balances':
              res.result = await CounterFactual.metamaskRequestBalancesRPC(req.params[0])
              break
            case 'counterfactual:listen:createChannel':
              res.result = await CounterFactual.metamaskListenCreateChannelRPC()
              break
            case 'metamask:request:deposit':
              // Not implemented
              res.result = await CounterFactual.metamaskRequestDeposit()
              break
            case 'counterfactual:request:user':
              res.result = await CounterFactual.playgroundRequestUserRPC()
              break
            case 'counterfactual:request:matchmake':
              res.result = await CounterFactual.playgroundRequestMatchmakeRPC()
              break
            case 'cf-node-provider:init':
              // Not implemented
              res.result = await CounterFactual.cfNodeProviderInit()
              break
            default:
              res.result = {name: 'hooray', does: 'thiswork'}
              break
        }
    } else {
        return next()
    }
  })
}
