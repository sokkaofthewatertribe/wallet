import { sleep } from '@celo/utils/lib/async'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as Sentry from '@sentry/react-native'
import locales from 'locales'
import React, { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useDispatch, useSelector } from 'react-redux'
import {
  clearStoredAccount,
  devModeTriggerClicked,
  setPincodeSuccess,
  toggleBackupState,
} from 'src/account/actions'
import { PincodeType } from 'src/account/reducer'
import {
  cloudBackupCompletedSelector,
  devModeSelector,
  pincodeTypeSelector,
} from 'src/account/selectors'
import { SettingsEvents } from 'src/analytics/Events'
import ValoraAnalytics from 'src/analytics/ValoraAnalytics'
import {
  hapticFeedbackSet,
  resetAppOpenedState,
  setAnalyticsEnabled,
  setNumberVerified,
  setRequirePinOnAppOpen,
  setSessionId,
} from 'src/app/actions'
import {
  analyticsEnabledSelector,
  getRequirePinOnAppOpen,
  hapticFeedbackEnabledSelector,
  phoneNumberVerifiedSelector,
  sessionIdSelector,
  supportedBiometryTypeSelector,
  walletConnectEnabledSelector,
} from 'src/app/selectors'
import { BottomSheetRefType } from 'src/components/BottomSheet'
import Dialog from 'src/components/Dialog'
import SectionHead from 'src/components/SectionHead'
import SessionId from 'src/components/SessionId'
import {
  SettingsExpandedItem,
  SettingsItemCta,
  SettingsItemSwitch,
  SettingsItemTextValue,
} from 'src/components/SettingsItem'
import { PRIVACY_LINK, TOS_LINK } from 'src/config'
import { currentLanguageSelector } from 'src/i18n/selectors'
import { getLocalCurrencyCode } from 'src/localCurrency/selectors'
import DrawerTopBar from 'src/navigator/DrawerTopBar'
import { ensurePincode, navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { removeStoredPin, setPincodeWithBiometry } from 'src/pincode/authentication'
import RevokePhoneNumber from 'src/RevokePhoneNumber'
import { getFeatureGate } from 'src/statsig/index'
import { StatsigFeatureGates } from 'src/statsig/types'
import colors from 'src/styles/colors'
import fontStyles from 'src/styles/fonts'
import { navigateToURI } from 'src/utils/linking'
import Logger from 'src/utils/Logger'
import { selectSessions } from 'src/walletConnect/selectors'
import { walletAddressSelector } from 'src/web3/selectors'

type Props = NativeStackScreenProps<StackParamList, Screens.Settings>

export const Account = ({ navigation, route }: Props) => {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const promptConfirmRemovalModal = route.params?.promptConfirmRemovalModal

  const revokeBottomSheetRef = useRef<BottomSheetRefType>(null)

  const [showAccountKeyModal, setShowAccountKeyModal] = useState(false)

  const sessionId = useSelector(sessionIdSelector)
  const account = useSelector(walletAddressSelector)
  const devModeActive = useSelector(devModeSelector)
  const analyticsEnabled = useSelector(analyticsEnabledSelector)
  const numberVerified = useSelector(phoneNumberVerifiedSelector)
  const pincodeType = useSelector(pincodeTypeSelector)
  const requirePinOnAppOpen = useSelector(getRequirePinOnAppOpen)
  const preferredCurrencyCode = useSelector(getLocalCurrencyCode)
  const { sessions } = useSelector(selectSessions)
  const { v2 } = useSelector(walletConnectEnabledSelector)
  const supportedBiometryType = useSelector(supportedBiometryTypeSelector)
  const hapticFeedbackEnabled = useSelector(hapticFeedbackEnabledSelector)
  const currentLanguage = useSelector(currentLanguageSelector)
  const cloudBackupCompleted = useSelector(cloudBackupCompletedSelector)

  const walletConnectEnabled = v2
  const connectedApplications = sessions.length

  useEffect(() => {
    if (ValoraAnalytics.getSessionId() !== sessionId) {
      dispatch(setSessionId(sessionId))
    }
  }, [])

  const goToProfile = () => {
    ValoraAnalytics.track(SettingsEvents.settings_profile_edit)
    navigate(Screens.Profile)
  }

  const goToConfirmNumber = () => {
    ValoraAnalytics.track(SettingsEvents.settings_verify_number)
    navigate(Screens.VerificationStartScreen, {
      hideOnboardingStep: true,
    })
  }

  const goToLanguageSetting = () => {
    navigate(Screens.Language, { nextScreen: route.name })
  }

  const goToLocalCurrencySetting = () => {
    navigate(Screens.SelectLocalCurrency)
  }

  const goToConnectedApplications = () => {
    navigate(Screens.WalletConnectSessions)
  }

  const goToLicenses = () => {
    ValoraAnalytics.track(SettingsEvents.licenses_view)
    navigate(Screens.Licenses)
  }

  const handleResetAppOpenedState = () => {
    Logger.showMessage('App onboarding state reset.')
    dispatch(resetAppOpenedState())
  }

  const toggleNumberVerified = () => {
    dispatch(setNumberVerified(numberVerified))
  }

  const handleToggleBackupState = () => {
    dispatch(toggleBackupState())
  }

  const showDebugScreen = () => {
    navigate(Screens.Debug)
  }

  const onDevSettingsTriggerPress = () => {
    dispatch(devModeTriggerClicked())
  }

  const getDevSettingsComp = () => {
    if (!devModeActive) {
      return null
    } else {
      return (
        <View style={styles.devSettings}>
          <View style={styles.devSettingsItem}>
            <Text style={fontStyles.label}>Session ID</Text>
            <SessionId sessionId={sessionId || ''} />
          </View>
          <View style={styles.devSettingsItem}>
            <TouchableOpacity onPress={toggleNumberVerified}>
              <Text>Toggle verification done</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.devSettingsItem}>
            <TouchableOpacity onPress={handleResetAppOpenedState}>
              <Text>Reset app opened state</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.devSettingsItem}>
            <TouchableOpacity onPress={handleToggleBackupState}>
              <Text>Toggle backup state</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.devSettingsItem}>
            <TouchableOpacity onPress={showDebugScreen}>
              <Text>Show Debug Screen</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.devSettingsItem}>
            <TouchableOpacity onPress={Sentry.nativeCrash}>
              <Text>Trigger a crash</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.devSettingsItem}>
            <TouchableOpacity onPress={wipeReduxStore}>
              <Text>Wipe Redux Store</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.devSettingsItem}>
            <TouchableOpacity onPress={confirmAccountRemoval}>
              <Text>Valora Quick Reset</Text>
            </TouchableOpacity>
          </View>
        </View>
      )
    }
  }

  const handleUseBiometryToggle = async (turnBiometryOn: boolean) => {
    try {
      if (turnBiometryOn) {
        ValoraAnalytics.track(SettingsEvents.settings_biometry_opt_in_enable)
        await setPincodeWithBiometry()
        dispatch(setPincodeSuccess(PincodeType.PhoneAuth))
        ValoraAnalytics.track(SettingsEvents.settings_biometry_opt_in_complete)
      } else {
        ValoraAnalytics.track(SettingsEvents.settings_biometry_opt_in_disable)
        await removeStoredPin()
        dispatch(setPincodeSuccess(PincodeType.CustomPin))
      }
    } catch (error) {
      Logger.error('SettingsItem@onPress', 'Toggle use biometry error', error)
      ValoraAnalytics.track(SettingsEvents.settings_biometry_opt_in_error)
    }
  }

  const handleRequirePinToggle = (value: boolean) => {
    dispatch(setRequirePinOnAppOpen(value))
    ValoraAnalytics.track(SettingsEvents.pin_require_on_load, {
      enabled: value,
    })
  }

  const handleHapticFeedbackToggle = (value: boolean) => {
    dispatch(hapticFeedbackSet(value))
    ValoraAnalytics.track(SettingsEvents.settings_haptic_feedback, {
      enabled: value,
    })
  }

  const handleToggleAnalytics = (value: boolean) => {
    dispatch(setAnalyticsEnabled(value))
    ValoraAnalytics.track(SettingsEvents.settings_analytics, {
      enabled: value,
    })
  }

  const onTermsPress = () => {
    navigateToURI(TOS_LINK)
    ValoraAnalytics.track(SettingsEvents.tos_view)
  }

  const onPrivacyPolicyPress = () => {
    navigateToURI(PRIVACY_LINK)
  }

  const onRemoveAccountPress = () => {
    setShowAccountKeyModal(true)
  }

  const hideRemoveAccountModal = () => {
    setShowAccountKeyModal(false)
  }

  const onPressContinueWithAccountRemoval = async () => {
    try {
      setShowAccountKeyModal(false)
      // Ugly hack to wait for the modal to close,
      // otherwise the native modal PIN entry will not show up
      // TODO: stop using ReactNative modals and switch to react-navigation modals
      if (Platform.OS === 'ios') {
        await sleep(500)
      }
      const pinIsCorrect = await ensurePincode()
      if (pinIsCorrect) {
        ValoraAnalytics.track(SettingsEvents.start_account_removal)
        navigate(Screens.BackupPhrase, { navigatedFromSettings: true })
      }
    } catch (error) {
      Logger.error('SettingsItem@onPress', 'PIN ensure error', error)
    }
  }

  const hideConfirmRemovalModal = () => {
    navigation.setParams({ promptConfirmRemovalModal: false })
  }

  const onPressSetUpKeylessBackup = async () => {
    try {
      const pinIsCorrect = await ensurePincode()
      if (pinIsCorrect) {
        ValoraAnalytics.track(SettingsEvents.settings_set_up_keyless_backup)
        navigate(Screens.WalletSecurityPrimer)
      }
    } catch (error) {
      Logger.error('SettingsItem@onPress', 'PIN ensure error - onPressSetUpKeylessBackup', error)
    }
  }

  const onPressDeleteKeylessBackup = () => {
    ValoraAnalytics.track(SettingsEvents.settings_delete_keyless_backup)
    // TODO(ACT-766): invoke API to delete and update status
  }

  const wipeReduxStore = () => {
    dispatch(clearStoredAccount(account ?? '', true))
  }

  const confirmAccountRemoval = () => {
    ValoraAnalytics.track(SettingsEvents.completed_account_removal)
    dispatch(clearStoredAccount(account ?? ''))
  }

  const handleShowConfirmRevoke = () => {
    ValoraAnalytics.track(SettingsEvents.settings_revoke_phone_number)
    revokeBottomSheetRef.current?.snapToIndex(0)
  }

  const goToChangePin = async () => {
    try {
      ValoraAnalytics.track(SettingsEvents.change_pin_start)
      const pinIsCorrect = await ensurePincode()
      if (pinIsCorrect) {
        ValoraAnalytics.track(SettingsEvents.change_pin_current_pin_entered)
        navigate(Screens.PincodeSet, {
          changePin: true,
        })
      }
    } catch (error) {
      ValoraAnalytics.track(SettingsEvents.change_pin_current_pin_error)
      Logger.error('NavigationService@onPress', 'PIN ensure error', error)
    }
  }

  const goToRecoveryPhrase = async () => {
    try {
      const pinIsCorrect = await ensurePincode()
      if (pinIsCorrect) {
        ValoraAnalytics.track(SettingsEvents.settings_recovery_phrase)
        navigate(Screens.BackupIntroduction)
      }
    } catch (error) {
      Logger.error('SettingsItem@onPress', 'PIN ensure error', error)
    }
  }

  const showKeylessBackup = getFeatureGate(StatsigFeatureGates.SHOW_CLOUD_ACCOUNT_BACKUP_SETUP)

  return (
    <SafeAreaView style={styles.container}>
      <DrawerTopBar />
      <ScrollView testID="SettingsScrollView">
        <TouchableWithoutFeedback onPress={onDevSettingsTriggerPress}>
          <Text style={styles.title} testID={'SettingsTitle'}>
            {t('settings')}
          </Text>
        </TouchableWithoutFeedback>
        <View style={styles.containerList}>
          <SettingsItemTextValue
            testID="EditProfile"
            title={t('editProfile')}
            onPress={goToProfile}
          />
          {!numberVerified && (
            <SettingsItemTextValue title={t('confirmNumber')} onPress={goToConfirmNumber} />
          )}
          <SettingsItemTextValue
            title={t('languageSettings')}
            testID="ChangeLanguage"
            value={locales[currentLanguage ?? '']?.name ?? t('unknown')}
            onPress={goToLanguageSetting}
          />
          <SettingsItemTextValue
            title={t('localCurrencySetting')}
            testID="ChangeCurrency"
            value={preferredCurrencyCode}
            onPress={goToLocalCurrencySetting}
          />
          {walletConnectEnabled && (
            <SettingsItemTextValue
              title={t('connectedApplications')}
              value={connectedApplications.toString()}
              onPress={goToConnectedApplications}
              testID="ConnectedApplications"
            />
          )}
          <SectionHead text={t('security')} style={styles.sectionTitle} />
          <SettingsItemTextValue
            title={t('accountKey')}
            onPress={goToRecoveryPhrase}
            testID="RecoveryPhrase"
          />
          {showKeylessBackup && (
            <SettingsItemCta
              title={t('keylessBackupSettingsTitle')}
              onPress={
                cloudBackupCompleted ? onPressDeleteKeylessBackup : onPressSetUpKeylessBackup
              }
              testID="KeylessBackup"
              ctaText={cloudBackupCompleted ? t('delete') : t('setup')}
              ctaColor={cloudBackupCompleted ? colors.error : colors.primary}
              showChevron={!cloudBackupCompleted}
            />
          )}
          <SettingsItemTextValue
            title={t('changePin')}
            onPress={goToChangePin}
            testID="ChangePIN"
          />
          {supportedBiometryType && (
            <SettingsItemSwitch
              title={t('useBiometryType', {
                biometryType: t(`biometryType.${supportedBiometryType}`),
              })}
              value={pincodeType === PincodeType.PhoneAuth}
              onValueChange={handleUseBiometryToggle}
              testID="useBiometryToggle"
            />
          )}
          <SettingsItemSwitch
            title={t('requirePinOnAppOpen')}
            value={requirePinOnAppOpen}
            onValueChange={handleRequirePinToggle}
            testID="requirePinOnAppOpenToggle"
          />
          <SectionHead text={t('appPreferences')} style={styles.sectionTitle} />
          <SettingsItemSwitch
            title={t('hapticFeedback')}
            value={hapticFeedbackEnabled}
            onValueChange={handleHapticFeedbackToggle}
          />
          <SectionHead text={t('data')} style={styles.sectionTitle} />
          <SettingsItemSwitch
            title={t('shareAnalytics')}
            value={analyticsEnabled}
            onValueChange={handleToggleAnalytics}
            details={t('shareAnalytics_detail')}
          />
          <SectionHead text={t('legal')} style={styles.sectionTitle} />
          <SettingsItemTextValue title={t('licenses')} onPress={goToLicenses} />
          <SettingsItemTextValue title={t('termsOfServiceLink')} onPress={onTermsPress} />
          <SettingsItemTextValue title={t('privacyPolicy')} onPress={onPrivacyPolicyPress} />

          <View style={styles.spacer} />
          {numberVerified && (
            <SettingsExpandedItem
              title={t('revokePhoneNumber.title')}
              details={t('revokePhoneNumber.description')}
              onPress={handleShowConfirmRevoke}
              testID="RevokePhoneNumber"
            />
          )}
          <SettingsExpandedItem
            title={t('removeAccountTitle')}
            details={t('removeAccountDetails')}
            onPress={onRemoveAccountPress}
            testID="ResetAccount"
          />
        </View>
        {getDevSettingsComp()}
        <Dialog
          isVisible={showAccountKeyModal}
          title={t('accountKeyModal.header')}
          actionText={t('continue')}
          actionPress={onPressContinueWithAccountRemoval}
          secondaryActionText={t('cancel')}
          secondaryActionPress={hideRemoveAccountModal}
          testID="RemoveAccountModal"
        >
          {t('accountKeyModal.body1')}
          {'\n\n'}
          {t('accountKeyModal.body2')}
        </Dialog>
        <Dialog
          isVisible={!!promptConfirmRemovalModal}
          title={t('promptConfirmRemovalModal.header')}
          actionText={t('promptConfirmRemovalModal.resetNow')}
          actionPress={confirmAccountRemoval}
          secondaryActionText={t('cancel')}
          secondaryActionPress={hideConfirmRemovalModal}
          testID="ConfirmAccountRemovalModal"
        >
          {t('promptConfirmRemovalModal.body')}
        </Dialog>
      </ScrollView>

      <RevokePhoneNumber forwardedRef={revokeBottomSheetRef} />
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  title: {
    ...fontStyles.h1,
    margin: 16,
  },
  containerList: {
    flex: 1,
  },
  devSettings: {
    alignItems: 'flex-start',
    padding: 15,
    marginHorizontal: 10,
  },
  devSettingsItem: {
    alignSelf: 'stretch',
    margin: 4,
  },
  sectionTitle: {
    marginTop: 44,
    marginLeft: 16,
    paddingLeft: 0,
    borderBottomColor: colors.gray2,
    borderBottomWidth: 1,
  },
  spacer: {
    height: 80,
  },
})

export default Account
