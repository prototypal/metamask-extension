const Component = require('react').Component
const PropTypes = require('prop-types')
const h = require('react-hyperscript')
const inherits = require('util').inherits
const connect = require('react-redux').connect
const actions = require('../../store/actions')
const genAccountLink = require('etherscan-link').createAccountLink
const { Menu, Item, CloseArea } = require('../../components/app/dropdowns/components/menu')

PluginMenuDropdown.contextTypes = {
  t: PropTypes.func,
}

module.exports = connect(mapStateToProps, mapDispatchToProps)(PluginMenuDropdown)

function mapStateToProps (state) {
  return {
    network: state.metamask.network,
  }
}

function mapDispatchToProps (dispatch) {
  return {
    removePlugin: (plugin) => {
      dispatch(actions.removePlugin(plugin))
    },
  }
}


inherits(PluginMenuDropdown, Component)
function PluginMenuDropdown () {
  Component.call(this)

  this.onClose = this.onClose.bind(this)
}

PluginMenuDropdown.prototype.onClose = function (e) {
  e.stopPropagation()
  this.props.onClose()
}

PluginMenuDropdown.prototype.render = function () {
  const { removePlugin } = this.props
  return h(Menu, { className: 'plugin-menu-dropdown', isShowing: true }, [
    h(CloseArea, {
      onClick: this.onClose,
    }),
    h(Item, {
      onClick: (e) => {
        e.stopPropagation()
        removePlugin(this.props.plugin.uid)
        this.props.onClose()
      },
      text: this.context.t('hidePlugin'),
    }),
    h(Item, {
      onClick: (e) => {
        e.stopPropagation()
        const url = genAccountLink(this.props.plugin.address, this.props.network)
        global.platform.openWindow({ url })
        this.props.onClose()
      },
      text: this.context.t('viewOnEtherscan'),
    }),
  ])
}
