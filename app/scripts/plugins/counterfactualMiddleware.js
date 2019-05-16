module.exports = createCounterfactualMiddleware

function createCounterfactualMiddleware (origin) {
    const counterfactual = window.cfInstance;
  return function counterfactualMiddleware (req, res, next, end) {
    if(req.method.includes("counterfactual")) {
        console.log(`Alon (${origin}):`, req, '->', res)
        if(req.method === "counterfactual:request:user") {
            counterfactual.playgroundRequestUserRPC(res, end);
        }
        else {
            res.result = {name: "hooray", does: "thiswork"}
            end();
        }
    } else {
        next();
    }
  }
}
