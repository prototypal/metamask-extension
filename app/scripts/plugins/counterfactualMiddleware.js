const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')
const CounterFactual = require('./counterfactual')

module.exports = createCounterfactualMiddleware

function createCounterfactualMiddleware () {
  return createAsyncMiddleware(async function counterfactualMiddleware (req, res, next) {
    if (req.method.includes('counterfactual')) {
        switch (req.method) {
            case 'counterfactual:set:user':
              window.localStorage.setItem('playground:user:token', req.params[0])
              break
            case 'metamask:setup:initiate':
              res.result = await CounterFactual.metamaskSetupInit()
              break
            case 'metamask:get:nodeAddress':
              res.result = await CounterFactual.metamaskGetNodeAddress()
              break
            case 'metamask:request:balances':
              res.result = await CounterFactual.metamaskRequestBalances()
              break
            case 'metamask:listen:createChannel':
              res.result = await CounterFactual.metamaskListenCreateChannel()
              break
            case 'metamask:request:deposit':
              res.result = await CounterFactual.metamaskRequestDeposit()
              break
            case 'counterfactual:request:user':
              res.result = await CounterFactual.playgroundRequestUserRPC()
              break
            case 'counterfactual:request:matchmake':
              res.result = await CounterFactual.playgroundRequestMatchmakeRPC()
              break
            case 'cf-node-provider:init':
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
