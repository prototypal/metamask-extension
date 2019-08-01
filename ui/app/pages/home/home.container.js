import Home from './home.component'
import { compose } from 'recompose'
import { connect } from 'react-redux'
import { withRouter } from 'react-router-dom'
import { unconfirmedTransactionsCountSelector } from '../../selectors/confirm-transaction'
import { getSelectedPluginUid } from '../../selectors/selectors'

const mapStateToProps = state => {
  const { metamask, appState } = state
  const {
    lostAccounts,
    suggestedTokens,
    providerRequests,
  } = metamask
  const { forgottenPassword } = appState

  return {
    lostAccounts,
    forgottenPassword,
    suggestedTokens,
    unconfirmedTransactionsCount: unconfirmedTransactionsCountSelector(state),
    providerRequests,
    selectedPluginUid: getSelectedPluginUid(state),
  }
}

export default compose(
  withRouter,
  connect(mapStateToProps)
)(Home)
