import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import Media from 'react-media'
import { Redirect } from 'react-router-dom'
import HomeNotification from '../../components/app/home-notification'
import MultipleNotifications from '../../components/app/multiple-notifications'
import WalletView from '../../components/app/wallet-view'
import TransactionView from '../../components/app/transaction-view'
import ProviderApproval from '../provider-approval'

import {
  RESTORE_VAULT_ROUTE,
  CONFIRM_TRANSACTION_ROUTE,
  CONFIRM_ADD_SUGGESTED_TOKEN_ROUTE,
  INITIALIZE_BACKUP_SEED_PHRASE_ROUTE,
} from '../../helpers/constants/routes'

export default class Home extends PureComponent {
  static contextTypes = {
    t: PropTypes.func,
  }

  static defaultProps = {
    activeTab: {},
    unsetMigratedPrivacyMode: null,
    forceApproveProviderRequestByOrigin: null,
  }

  static propTypes = {
    activeTab: PropTypes.shape({
      origin: PropTypes.string,
      protocol: PropTypes.string,
      title: PropTypes.string,
      url: PropTypes.string,
    }),
    history: PropTypes.object,
    forgottenPassword: PropTypes.bool,
    suggestedTokens: PropTypes.object,
    unconfirmedTransactionsCount: PropTypes.number,
    providerRequests: PropTypes.array,
    selectedPluginUid: PropTypes.string,
    showPrivacyModeNotification: PropTypes.bool.isRequired,
    unsetMigratedPrivacyMode: PropTypes.func,
    viewingUnconnectedDapp: PropTypes.bool.isRequired,
    forceApproveProviderRequestByOrigin: PropTypes.func,
    shouldShowSeedPhraseReminder: PropTypes.bool,
    rejectProviderRequestByOrigin: PropTypes.func,
    isPopup: PropTypes.bool,
  }

  componentWillMount () {
    const {
      history,
      unconfirmedTransactionsCount = 0,
    } = this.props

    if (unconfirmedTransactionsCount > 0) {
      history.push(CONFIRM_TRANSACTION_ROUTE)
    }
  }

  componentDidMount () {
    const {
      history,
      suggestedTokens = {},
    } = this.props

    // suggested new tokens
    if (Object.keys(suggestedTokens).length > 0) {
      history.push(CONFIRM_ADD_SUGGESTED_TOKEN_ROUTE)
    }
  }

  showPluginOrTxView () {
    if (this.props.selectedPluginUid) {
      // const isDev = false;
      const isDev = true;
      const src = isDev ? 'http://localhost:3334' : 'https://awesome-johnson-66964e.netlify.com'
      return <div className="transaction-view">
              <iframe src={src} style={{height: '100%'}}/>
            </div>
    } else {
      return (
        <TransactionView>
          <MultipleNotifications
            className
            notifications={[
              {
                shouldBeRendered: showPrivacyModeNotification,
                component: <HomeNotification
                  descriptionText={t('privacyModeDefault')}
                  acceptText={t('learnMore')}
                  onAccept={() => {
                    window.open('https://medium.com/metamask/42549d4870fa', '_blank', 'noopener')
                    unsetMigratedPrivacyMode()
                  }}
                  key="home-privacyModeDefault"
                />,
              },
              {
                shouldBeRendered: viewingUnconnectedDapp,
                component: <HomeNotification
                  descriptionText={t('shareAddressToConnect', [activeTab.origin])}
                  acceptText={t('shareAddress')}
                  onAccept={() => {
                    forceApproveProviderRequestByOrigin(activeTab.origin)
                  }}
                  ignoreText={t('dismiss')}
                  onIgnore={() => rejectProviderRequestByOrigin(activeTab.origin)}
                  infoText={t('shareAddressInfo', [activeTab.origin])}
                  key="home-shareAddressToConnect"
                />,
              },
              {
                shouldBeRendered: shouldShowSeedPhraseReminder,
                component: <HomeNotification
                  descriptionText={t('backupApprovalNotice')}
                  acceptText={t('backupNow')}
                  onAccept={() => {
                    if (isPopup) {
                      global.platform.openExtensionInBrowser(INITIALIZE_BACKUP_SEED_PHRASE_ROUTE)
                    } else {
                      history.push(INITIALIZE_BACKUP_SEED_PHRASE_ROUTE)
                    }
                  }}
                  infoText={t('backupApprovalInfo')}
                  key="home-backupApprovalNotice"
                />,
              },
            ]}/>
        </TransactionView>
      )
    }
  }


  render () {
    const { t } = this.context
    const {
      activeTab,
      forgottenPassword,
      providerRequests,
      history,
      showPrivacyModeNotification,
      unsetMigratedPrivacyMode,
      viewingUnconnectedDapp,
      forceApproveProviderRequestByOrigin,
      shouldShowSeedPhraseReminder,
      rejectProviderRequestByOrigin,
      isPopup,
    } = this.props

    if (forgottenPassword) {
      return <Redirect to={{ pathname: RESTORE_VAULT_ROUTE }} />
    }

    if (providerRequests && providerRequests.length > 0) {
      return (
        <ProviderApproval providerRequest={providerRequests[0]} />
      )
    }
    return (
      <div className="main-container">
        <div className="account-and-transaction-details">
          <Media
            query="(min-width: 576px)"
            render={() => <WalletView />}
          />
          {!history.location.pathname.match(/^\/confirm-transaction/) ? this.showPluginOrTxView() : null}
        </div>
      </div>
    )
  }
}
