import { connect } from 'react-redux'
import FirstTimeFlowSwitch from './first-time-flow-switch.component'

const mapStateToProps = ({ metamask }) => {
  const {
    completedOnboarding,
    isInitialized,
    isUnlocked,
    noActiveNotices,
    participateInMetaMetrics: optInMetaMetrics,
  } = metamask

  return {
    completedOnboarding,
    isInitialized,
    isUnlocked,
    noActiveNotices,
    optInMetaMetrics,
  }
}

export default connect(mapStateToProps)(FirstTimeFlowSwitch)
