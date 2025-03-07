import { NativeStackScreenProps } from '@react-navigation/native-stack'
import * as React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { SendEvents } from 'src/analytics/Events'
import ValoraAnalytics from 'src/analytics/ValoraAnalytics'
import CancelButton from 'src/components/CancelButton'
import ContactCircle from 'src/components/ContactCircle'
import TextButton from 'src/components/TextButton'
import { emptyHeader } from 'src/navigator/Headers'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { StackParamList } from 'src/navigator/types'
import { getDisplayName } from 'src/recipients/recipient'
import fontStyles from 'src/styles/fonts'

const AVATAR_SIZE = 64

type Props = NativeStackScreenProps<StackParamList, Screens.ValidateRecipientIntro>

export const validateRecipientIntroScreenNavOptions = () => ({
  ...emptyHeader,
  headerLeft: () => <CancelButton eventName={SendEvents.send_secure_cancel} buttonType="icon" />,
})

const ValidateRecipientIntro = ({ route }: Props) => {
  const { t } = useTranslation()
  const { addressValidationType, transactionData, requesterAddress, origin } = route.params
  const onPressScanCode = () => {
    navigate(Screens.QRNavigator, {
      screen: Screens.QRScanner,
      params: {
        transactionData,
        scanIsForSecureSend: true,
        requesterAddress,
      },
    })

    ValoraAnalytics.track(SendEvents.send_secure_start, { confirmByScan: true })
  }

  const onPressConfirmAccount = () => {
    navigate(Screens.ValidateRecipientAccount, {
      transactionData,
      addressValidationType,
      requesterAddress,
      origin,
    })

    ValoraAnalytics.track(SendEvents.send_secure_start, { confirmByScan: false })
  }

  const { recipient } = transactionData
  const displayName = getDisplayName(recipient, t)
  const e164PhoneNumber = recipient.e164PhoneNumber

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.iconContainer}>
          <ContactCircle size={AVATAR_SIZE} recipient={recipient} />
        </View>
        <Text style={styles.validationHeader}>
          {!recipient.name
            ? t('confirmAccount.headerNoDisplayName')
            : t('confirmAccount.header', { displayName })}
        </Text>
        <Text style={styles.body}>{t('secureSendExplanation.body1', { e164PhoneNumber })}</Text>
        <View style={styles.buttonContainer}>
          <TextButton style={styles.button} onPress={onPressScanCode} testID={'scanQRCode'}>
            {t('scanQRCode')}
          </TextButton>
          <TextButton
            style={styles.button}
            onPress={onPressConfirmAccount}
            testID={'confirmAccountButton'}
          >
            {t('confirmAccount.button')}
          </TextButton>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 30,
    justifyContent: 'flex-start',
  },
  iconContainer: {
    alignItems: 'center',
  },
  buttonContainer: {
    paddingBottom: 45,
    alignItems: 'center',
  },
  button: {
    paddingVertical: 16,
  },
  validationHeader: {
    ...fontStyles.h2,
    paddingVertical: 16,
    textAlign: 'center',
  },
  body: {
    ...fontStyles.small,
    textAlign: 'center',
    paddingBottom: 16,
  },
})

export default ValidateRecipientIntro
