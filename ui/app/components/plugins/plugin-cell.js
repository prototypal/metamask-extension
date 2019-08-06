const Component = require('react').Component
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const prefixForNetwork = require('../../../lib/etherscan-prefix-for-network')
const selectors = require('../../../app/selectors/selectors')
const actions = require('../../store/actions')

const pluginMenuDropdown = require('./plugin-menu-dropdown.js')

function mapStateToProps (state) {
  return {
    pluginsScripts: state.metamask.pluginsScripts,
    currentCurrency: state.metamask.currentCurrency,
    selectedPluginUid: state.metamask.selectedPluginUid,
    userAddress: selectors.getSelectedAddress(state),
    contractExchangeRates: state.metamask.contractExchangeRates,
    conversionRate: state.metamask.conversionRate,
    sidebarOpen: state.appState.sidebar.isOpen,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    setSelectedPluginUid: pluginUid =>
      dispatch(actions.setSelectedPluginUid(pluginUid)),
    hideSidebar: () => dispatch(actions.hideSidebar()),
  }
}

module.exports = connect(
  mapStateToProps,
  mapDispatchToProps
)(PluginCell)

inherits(PluginCell, Component)
function PluginCell () {
  Component.call(this)

  this.state = {
    pluginMenuOpen: false,
  }
}

PluginCell.prototype.render = function () {
  const { pluginMenuOpen } = this.state
  const props = this.props
//   console.log(props)
  const {
    // uid,
    name,
    scriptUrl,
    gatewayAddress,
    setSelectedPluginUid,
    conversionRate,
    image,
  } = props

  const uid = 'counterfactual'

  let balance
  let dollarBalance
  if (this.props.pluginsScripts && this.props.pluginsScripts[uid]) {
    balance = `${JSON.stringify(
      this.props.pluginsScripts[uid].mainBalance
    )} ETH`
    dollarBalance = `$${this.props.pluginsScripts[uid].mainBalance *
      conversionRate} USD`
  } else {
    balance = 'Counterfactual'
    dollarBalance = ''
  }

  return h(
    'div.flex-column.wallet-balance-wrapper.wallet-balance-wrapper--active',
    {},
    [
      h(
        'div.wallet-balance',
        {
          onClick: () => {
            setSelectedPluginUid(uid)
          },
        },
        [
          h('div.balance-container', {}, [
            h('img.w-50px.h-50px.border-radius-50', {
              src:
                image ||
                'https://playground-staging.counterfactual.com/assets/icon/logo.svg',
            }),
            h('div.flex-column.balance-display', {}, [
              h('div.currency-display-component.token-amount', balance),
              h('div.currency-display-component', dollarBalance),
            ]),
            // h('div.flex-column.flex-justify-center', {}, [
            //   h(
            //     'i.fa.fa-ellipsis-h.fa-lg.plugin-list-item__ellipsis.cursor-pointer',
            //     {
            //       onClick: e => {
            //         e.stopPropagation()
            //         this.setState({ pluginMenuOpen: true })
            //       },
            //     }
            //   ),
            //   pluginMenuOpen &&
            //     h(pluginMenuDropdown, {
            //       onClose: () => this.setState({ pluginMenuOpen: false }),
            //       plugin: { name, uid, scriptUrl, gatewayAddress },
            //     }),
            // ]),
          ]),
        ]
      ),
    ]
  )
}

PluginCell.prototype.view = function (address, userAddress, network, event) {
  const url = etherscanLinkFor(address, userAddress, network)
  if (url) {
    navigateTo(url)
  }
}

function navigateTo (url) {
  global.platform.openWindow({ url })
}

function etherscanLinkFor (pluginGatewayAddress, address, network) {
  const prefix = prefixForNetwork(network)
  return `https://${prefix}etherscan.io/token/${pluginGatewayAddress}?a=${pluginGatewayAddress}`
}
