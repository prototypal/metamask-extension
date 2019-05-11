const Node = window.Node
const FirebaseServiceFactory = window.FirebaseServiceFactory
const ethers = window.ethers
const uuid = require('uuid')

// const ENV = "dev"
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

module.exports = class CounterFactual {
  constructor (platform) {
    this.nodeProviderConfig = {
      ports: {},
      node: null,
      eventHolder: {},
    }
    this.platform = platform
  }

  initialize () {
    const serviceFactory = new FirebaseServiceFactory(FIREBASE_OPTIONS)

    const nodeMnemonic =
      JSON.parse(window.localStorage.getItem(Node.MNEMONIC_PATH)) ||
      ethers.Wallet.createRandom().mnemonic

    store
      .set([{ key: Node.MNEMONIC_PATH, value: nodeMnemonic }])
      .then(async () => {
        const { node, provider } = await this.createNode(serviceFactory)
        this.nodeProviderConfig.node = node

        if (this.platform && this.platform.addMessageListener) {
          this.platform.addMessageListener(
            async ({ action = '', origin, data }, { tab }) => {
              if (tab && tab.id) {
                if (!this.nodeProviderConfig.ports[tab.id]) {
                  this.configureMessagePorts(tab.id)
                }
                if (action === 'plugin_message') {
                  const userToken = window.localStorage.getItem(
                    'playground:user:token'
                  )

                  await this.handlePluginMessage(
                    data,
                    provider,
                    tab,
                    this.nodeProviderConfig.node,
                    userToken
                  )
                }
              }
            }
          )
        }
      })
  }

  async createNode (serviceFactory) {
    const messService = serviceFactory.createMessagingService('messaging')
    const provider = ethers.getDefaultProvider('kovan')
    const node = await Node.create(
      messService,
      store,
      {
        STORE_KEY_PREFIX: 'store',
      },
      provider,
      'kovan'
    )
    return { node, provider }
  }

  async handlePluginMessage (data, provider, tab, node, userToken) {
    switch (data.message) {
      case 'playground:set:user':
        window.localStorage.setItem('playground:user:token', data.data)
        break
      case 'metamask:setup:initiate':
        this.metamaskSetupInit(provider, tab)
        break
      case 'metamask:get:nodeAddress':
        this.metamaskGetNodeAddress(node, tab)
        break
      case 'metamask:request:balances':
        await this.metamaskRequestBalances(data, node, tab)
        break
      case 'metamask:listen:createChannel':
        this.metamaskListenCreateChannel(node, tab)
        break
      case 'metamask:request:deposit':
        await this.metamaskRequestDeposit(node, tab, data)
        break
      case 'playground:request:user':
        this.playgroundRequestUser(userToken, tab)
        break
      case 'playground:request:matchmake':
        this.playgroundRequestMatchmake(userToken, tab)
        break
      case 'cf-node-provider:init':
        this.cfNodeProviderInit(tab)
        break
    }
  }

  cfNodeProviderInit (tab) {
    const nodeProviderInitResponse = {
      message: 'cf-node-provider:port',
    }
    this.platform.sendMessage(
      {
        action: 'plugin_message_response',
        data: nodeProviderInitResponse,
      },
      { id: tab.id }
    )
  }

  async metamaskRequestDeposit (node, tab, data) {
    const NodeEventNameDepositStarted = 'depositStartedEvent'
    node.once(NodeEventNameDepositStarted, args => {
      const depositStartedResponse = {
        message: 'metamask:response:deposit',
        data: {
          ethPendingDepositTxHash: args.txHash,
          ethPendingDepositAmountWei: args.value,
        },
      }
      this.platform.sendMessage(
        {
          action: 'plugin_message_response',
          data: depositStartedResponse,
        },
        { id: tab.id }
      )
    })
    try {
      const amount = ethers.utils.bigNumberify(data.valueInWei)
      const NodeMethodNameDEPOSIT = 'deposit'
      await node.call(NodeMethodNameDEPOSIT, {
        type: NodeMethodNameDEPOSIT,
        requestId: uuid.v4(),
        params: {
          amount,
          multisigAddress: data.multisigAddress,
          notifyCounterparty: true,
        },
      })
    } catch (e) {
      console.error(e)
    }
  }

  metamaskListenCreateChannel (node, tab) {
    const NodeEventNameCreateChannel = 'createChannelEvent'
    node.once(NodeEventNameCreateChannel, data => {
      const channelCreatedResponse = {
        message: 'metamask:emit:createChannel',
        data,
      }
      this.platform.sendMessage(
        {
          action: 'plugin_message_response',
          data: channelCreatedResponse,
        },
        { id: tab.id }
      )
    })
  }

  async metamaskRequestBalances (data, node, tab) {
    const query = {
      type: 'getFreeBalanceState',
      requestId: uuid.v4(),
      params: { multisigAddress: data.multisigAddress },
    }
    const response = await node.call(query.type, query)
    const balancesResponse = {
      message: 'metamask:response:balances',
      data: response.result.state,
    }
    this.platform.sendMessage(
      {
        action: 'plugin_message_response',
        data: balancesResponse,
      },
      { id: tab.id }
    )
  }

  metamaskGetNodeAddress (node, tab) {
    const nodeAddressResponse = {
      message: 'metamask:set:nodeAddress',
      data: node.publicIdentifier,
    }
    this.platform.sendMessage(
      {
        action: 'plugin_message_response',
        data: nodeAddressResponse,
      },
      { id: tab.id }
    )
  }

  metamaskSetupInit (provider, tab) {
    provider.getSigner = () => {
      const mockSigner = {}
      mockSigner.getAddress = () => {
        // Adding getSigner method to provider to "mock" web3 JSONRPC Provider
        return new Promise((resolve, reject) => {
          const getAddressCB = event => {
            if (
              event.data &&
              event.data.message === 'metamask:response:signer:address'
            ) {
              this.platform.removeMessageListener(getAddressCB)
              resolve(event.data.data)
            }
          }
          this.platform.addMessageListener(getAddressCB)
          const getSignerAddressMessage = {
            message: 'metamask:request:signer:address',
          }
          this.platform.sendMessage(
            {
              action: 'plugin_message_response',
              data: getSignerAddressMessage,
            },
            { id: tab.id }
          )
        })
      }
      mockSigner.sendTransaction = signedTransaction => {
        // Adding sendTransaction method to provider to "mock" web3 JSONRPC Provider
        return new Promise((resolve, reject) => {
          const sendTransactionCb = async event => {
            if (
              event.data &&
              event.data.message === 'metamask:response:signer:sendTransaction'
            ) {
              this.platform.removeMessageListener(sendTransactionCb)
              const transaction = event.data.data
              transaction.gasLimit = ethers.utils.bigNumberify(
                transaction.gasLimit._hex
              )
              transaction.gasPrice = ethers.utils.bigNumberify(
                transaction.gasPrice._hex
              )
              transaction.value = ethers.utils.bigNumberify(
                transaction.value._hex
              )
              resolve(transaction)
            }
          }
          this.platform.addMessageListener(sendTransactionCb)
          const getSendTransactionMessage = {
            message: 'metamask:request:signer:sendTransaction',
            data: {
              signedTransaction,
            },
          }
          this.platform.sendMessage(
            {
              action: 'plugin_message_response',
              data: getSendTransactionMessage,
            },
            { id: tab.id }
          )
        })
      }
      return mockSigner
    }
    const setupResponse = {
      message: 'metamask:setup:complete',
      data: {},
    }
    this.platform.sendMessage(
      {
        action: 'plugin_message_response',
        data: setupResponse,
      },
      { id: tab.id }
    )
  }

  configureMessagePorts (tabId) {
    this.nodeProviderConfig.eventHolder[tabId] = []
    function relayMessageToNode (event) {
      this.nodeProviderConfig.node.emit(event.data.type, event.data)
    }

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

    this.nodeProviderConfig.node.on(
      'proposeInstallVirtual',
      relayMessageToDapp.bind(this)
    )
    this.nodeProviderConfig.node.on(
      'installVirtualEvent',
      relayMessageToDapp.bind(this)
    )
    this.nodeProviderConfig.node.on(
      'getAppInstanceDetails',
      relayMessageToDapp.bind(this)
    )
    this.nodeProviderConfig.node.on('getState', relayMessageToDapp.bind(this))
    this.nodeProviderConfig.node.on('takeAction', relayMessageToDapp.bind(this))
    this.nodeProviderConfig.node.on(
      'updateStateEvent',
      relayMessageToDapp.bind(this)
    )
    this.nodeProviderConfig.node.on('uninstallEvent', relayMessageToDapp.bind(this))

    const backgroundPort = this.platform.tabsConnect(tabId, 'cfNodeProvider')
    this.nodeProviderConfig.ports[tabId] = backgroundPort
    backgroundPort.onMessage.addListener(relayMessageToNode.bind(this))
    backgroundPort.onDisconnect.addListener(() => {
      delete this.nodeProviderConfig.ports[tabId]
    })
  }

  playgroundRequestMatchmake (userToken, tab) {
    const matchmakeData = {
      type: 'matchmakingRequest',
      attributes: { matchmakeWith: 'HighRollerBot' },
    }
    // TODO Need to use ENV here to know where to send to
    fetch(`${BASE_URL}/api/matchmaking-requests`, {
      method: 'POST',
      body: JSON.stringify({
        data: matchmakeData,
      }),
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        Authorization: 'Bearer ' + userToken,
      },
    }).then(response => {
      response.json().then(data => {
        const oppData = data.data
        const responseData = {
          message: 'playground:response:matchmake',
          data: oppData,
        }
        this.platform.sendMessage(
          {
            action: 'plugin_message_response',
            data: responseData,
          },
          { id: tab.id }
        )
      })
    })
  }

  playgroundRequestUser (userToken, tab) {
    fetch(`${BASE_URL}/api/users/me`, {
      method: 'GET',
      headers: {
        Authorization: 'Bearer ' + userToken,
      },
    }).then(response => {
      response.json().then(data => {
        const userData = data.data[0]
        const account = {
          balance: '0.2',
          user: Object.assign({
            id: userData.id,
            token: userToken,
          }, userData.attributes),
        }
        const responseData = {
          message: 'playground:response:user',
          data: account,
        }
        this.platform.sendMessage(
          {
            action: 'plugin_message_response',
            data: responseData,
          },
          { id: tab.id }
        )
      })
    })
  }
}
