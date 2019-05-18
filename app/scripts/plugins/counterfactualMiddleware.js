const createAsyncMiddleware = require('json-rpc-engine/src/createAsyncMiddleware')
const CounterFactual = require('./counterfactual')

module.exports = createCounterfactualMiddleware

function createCounterfactualMiddleware (origin) {
  return createAsyncMiddleware(async function counterfactualMiddleware (req, res, next) {
    if (req.method.includes('counterfactual')) {
        console.log(`Alon (${origin}):`, req, '->', res)
        if (req.method === 'counterfactual:request:user') {
            res.result = await CounterFactual.playgroundRequestUserRPC()
        } else {
            res.result = {name: 'hooray', does: 'thiswork'}
        }
    } else {
        return next()
    }
  })
}
