// const Node = require('@counterfactual/node')
const Node = window.Node
const FirebaseServiceFactory = window.FirebaseServiceFactory
const ethers = window.ethers
const uuid = require('uuid')
const providerFromEngine = require('eth-json-rpc-middleware/providerFromEngine')

const ENV = 'dev'
// const ENV = 'staging'

const FIREBASE_OPTIONS =
  ENV === 'dev'
    ? {
      apiKey: '',
      authDomain: '',
      databaseURL: `ws://localhost:5555`,
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
    }
    : {
      apiKey: 'AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw',
      authDomain: 'foobar-91a31.firebaseapp.com',
      databaseURL: 'https://foobar-91a31.firebaseio.com',
      projectId: 'foobar-91a31',
      storageBucket: 'foobar-91a31.appspot.com',
      messagingSenderId: '432199632441',
    }

const BASE_URL =
  ENV === 'dev'
    ? 'http://localhost:9000'
    : 'https://server-playground-staging.counterfactual.com'

const store = {
  // This implements partial path look ups for localStorage
  async get (desiredKey) {
    const entries = {}
    const allKeys = Object.keys(window.localStorage)
    for (const key of allKeys) {
      if (key.includes(desiredKey)) {
        const val = JSON.parse(window.localStorage.getItem(key))
        if (key === desiredKey) {
          return val
        }
        entries[key] = val
      } else if (key === desiredKey) {
        return JSON.parse(window.localStorage.getItem(key))
      }
    }
    for (const key of Object.keys(entries)) {
      const leafKey = key.split('/')[key.split('/').length - 1]
      const value = entries[key]
      delete entries[key]
      entries[leafKey] = value
    }
    return Object.keys(entries).length > 0 ? entries : undefined
  },
  async set (pairs) {
    pairs.forEach(({ path, value }) => {
      window.localStorage.setItem(path, JSON.stringify(value))
    })
    return true
  },
}

const NODE_EVENTS = [
  'proposeInstallVirtual',
  'installVirtualEvent',
  'getAppInstanceDetails',
  'getState',
  'takeAction',
  'updateStateEvent',
  'uninstallEvent',
]

module.exports = class CounterfactualController {
  constructor() {
    this.nodeProviderConfig = {
      ports: {},
      eventHolder: {},
    }
  }

  async initialize ({ metamaskController } = {}) {
    if (this.isInitialized) {
      return
    }
    this.isInitialized = true

    const engine = metamaskController.setupProviderEngine('MetaMask')
    const cfProvider = providerFromEngine(engine)

    const serviceFactory = new FirebaseServiceFactory(FIREBASE_OPTIONS)

    this.provider = new ethers.providers.Web3Provider(cfProvider)
    const signer = await this.provider.getSigner()
    const address = await signer.getAddress()
    console.log(address)
    this.node = await this.createNode(serviceFactory)
    console.log('--- Node ---', this.node)
  }

  async createNode (serviceFactory) {
    const messService = serviceFactory.createMessagingService('messaging')
    const node = await Node.create(
      messService,
      store,
      {
        STORE_KEY_PREFIX: 'store',
      },
      this.provider,
      'kovan'
    )
    return node
  }

  async metamaskRequestDepositStartRPC () {
    const NodeEventNameDepositStarted = 'depositStartedEvent'

    return new Promise((resolve, _reject) => {
      this.node.once(NodeEventNameDepositStarted, data => {
        return resolve(data)
      })
    })
  }

  async metamaskRequestDepositConfirmedRPC () {
    const NodeEventNameDepositConfirmed = 'depositConfirmedEvent'

    return new Promise((resolve, _reject) => {
      this.node.once(NodeEventNameDepositConfirmed, () => {
        return resolve("200")
      })
    })
  }

  async metamaskRequestDepositRPC (amount, multisigAddress, tokenAddress) {
    try {
      const request = {
        id: uuid.v4(),
        methodName: "chan_deposit",
        parameters: {
          amount,
          tokenAddress,
          multisigAddress
        },
      }
      const result = await this.node.rpcRouter.dispatch(request)
      return result
    } catch (e) {
      console.error(e)
    }
  }

  async metamaskRequestWithdrawRPC (amount, multisigAddress, recipient, tokenAddress) {
    try {
      const result = await this.node.rpcRouter.dispatch({
        id: Date.now(),
        methodName: 'chan_withdraw',
        parameters: {
          amount,
          recipient,
          multisigAddress,
          tokenAddress
        },
      });
      return result
    } catch (e) {
      console.error(e)
    }
  }

  metamaskListenCreateChannelRPC () {
    const NodeEventNameCreateChannel = 'createChannelEvent'
    return new Promise((resolve, _reject) => {
      this.node.once(NodeEventNameCreateChannel, data => {
        return resolve(data)
      })
    })
  }

  async metamaskRequestBalancesRPC (multisigAddress, tokenAddress) {
    const params = { multisigAddress, tokenAddress }
    const request = {
      id: uuid.v4(),
      methodName: "chan_getFreeBalanceState",
      parameters: params,
    }
    const response = await this.node.rpcRouter.dispatch(request)
    return response.result.result
  }

  async metamaskRequestIndexedBalancesRPC (multisigAddress) {
    const request = {
      id: uuid.v4(),
      methodName: "chan_getTokenIndexedFreeBalanceStates",
      parameters: { multisigAddress },
    }
    const response = await this.node.rpcRouter.dispatch(request)
    return response.result.result
  }

  metamaskGetNodeAddressRPC () {
    return this.node.publicIdentifier
  }

  relayMessageToNodeRPC (message) {
    this.node.rpcRouter.dispatch(message)

    return new Promise((resolve, _reject) => {
      function relayMessageToDapp (event) {
        NODE_EVENTS.forEach(event => {
          this.node.off(event, relayMessageToDapp.bind(this))
        })
        return resolve(event)
      }
      NODE_EVENTS.forEach(event => {
        this.node.once(event, relayMessageToDapp.bind(this))
      })
    })
  }

  waitForNodeEvent (event) {
    return new Promise((resolve, _reject) => {
      function relayMessageToDapp (event) {
        this.node.off(event, relayMessageToDapp.bind(this))
        return resolve(event)
      }
      this.node.once(event, relayMessageToDapp.bind(this))
    })
  }

  async playgroundRequestMatchmakeRPC () {
    const userToken = this.getUserToken()
    const matchmakeData = {
      type: 'matchmakingRequest',
      attributes: { matchmakeWith: 'HighRollerBot' },
    }
    const response = await fetch(`${BASE_URL}/api/matchmaking-requests`, {
      method: 'POST',
      body: JSON.stringify({
        data: matchmakeData,
      }),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: 'Bearer ' + userToken,
      },
    })
    const data = await response.json()
    return data.data
  }

  async playgroundRequestUserRPC () {
    const userToken = this.getUserToken()
    if (!userToken) {
      return {};
    }
    const response = await fetch(`${BASE_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + userToken,
      },
    })
    const data = await response.json()
    const userData = data.data[0]
    const account = Object.assign({
      id: userData.id,
      token: userToken,
    }, userData.attributes)
    return account
  }

  getUserToken () {
    return window.localStorage.getItem(
      'playground:user:token'
    )
  }
}
