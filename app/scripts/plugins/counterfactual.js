const Node = window.Node
const FirebaseServiceFactory = window.FirebaseServiceFactory
const ethers = window.ethers
const uuid = require('uuid')

// const ENV = 'dev'
const ENV = 'staging'

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
    pairs.forEach(({ key, value }) => {
      window.localStorage.setItem(key, JSON.stringify(value))
    })
    return true
  },
}

module.exports = class CounterfactualController {
  constructor ({provider}) {
    this.nodeProviderConfig = {
      ports: {},
      eventHolder: {},
    }
    const serviceFactory = new FirebaseServiceFactory(FIREBASE_OPTIONS)

    const nodeMnemonic =
      JSON.parse(window.localStorage.getItem(window.MNEMONIC_PATH)) ||
      ethers.Wallet.createRandom().mnemonic

    store
      .set([{ key: window.MNEMONIC_PATH, value: nodeMnemonic }])
      .then(async () => {
        this.provider = new ethers.providers.Web3Provider(provider)
        // const signer = await this.provider.getSigner()
        // const address = await signer.getAddress()
        // console.log(address)
        this.node = await this.createNode(serviceFactory)
      })
  }

  // initialize ({metamaskController} = {}) {
  //   if (this.isInitialized) {
  //     return
  //   }
  //   this.isInitialized = true
  //   const engine = metamaskController.setupProviderEngine('counterfactual.eth')
  //   const cfProvider = providerFromEngine(engine)


  // }

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

  async metamaskRequestDepositRPC (amount, multisigAddress) {
    try {
      const NodeMethodNameDEPOSIT = 'deposit'
      const result = await this.node.call(NodeMethodNameDEPOSIT, {
        type: NodeMethodNameDEPOSIT,
        requestId: uuid.v4(),
        params: {
          amount,
          multisigAddress: multisigAddress,
          notifyCounterparty: true,
        },
      })
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

  async metamaskRequestBalancesRPC (multisigAddress) {
    const query = {
      type: 'getFreeBalanceState',
      requestId: uuid.v4(),
      params: { multisigAddress },
    }
    const response = await this.node.call(query.type, query)
    return response.result
  }

  metamaskGetNodeAddressRPC () {
    return this.node.publicIdentifier
          }

  configureMessagePorts (tabId) {
    this.nodeProviderConfig.eventHolder[tabId] = []
    // function relayMessageToNode (event) {
    //   this.node.emit(event.data.type, event.data)
    // }

    function relayMessageToDapp (event) {
      try {
        if (!this.nodeProviderConfig.eventHolder[tabId].includes(event.type)) {
          // We only allow the same event type to be called in 20ms intervals to prevent multiple
          // messages being emitted for the same event
          this.nodeProviderConfig.eventHolder[tabId].push(event.type)
          this.nodeProviderConfig.ports[tabId].postMessage({
            name: 'cfNodeProvider',
            event,
          })
          window.setTimeout(() => {
            this.nodeProviderConfig.eventHolder[tabId].pop(event.type)
          }, 20)
        }
      } catch (error) {
        // There is sometimes a race condition where nodeProviderConfig.ports[tabId] is undefined
      }
    }

    this.node.on(
      'proposeInstallVirtual',
      relayMessageToDapp.bind(this)
    )
    this.node.on(
      'installVirtualEvent',
      relayMessageToDapp.bind(this)
    )
    this.node.on(
      'getAppInstanceDetails',
      relayMessageToDapp.bind(this)
    )
    this.node.on('getState', relayMessageToDapp.bind(this))
    this.node.on('takeAction', relayMessageToDapp.bind(this))
    this.node.on(
      'updateStateEvent',
      relayMessageToDapp.bind(this)
    )
    this.node.on('uninstallEvent', relayMessageToDapp.bind(this))

    // Need to relayMessageToNode
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
    const response = await fetch(`${BASE_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + userToken,
      },
    })
    const data = await response.json()
    const userData = data.data[0]
    const account = {
      balance: '0.2',
      user: Object.assign({
        id: userData.id,
        token: userToken,
      }, userData.attributes),
    }
    return account
  }

  getUserToken () {
    return window.localStorage.getItem(
      'playground:user:token'
    )
  }
}
