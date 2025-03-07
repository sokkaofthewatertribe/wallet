import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, Text } from 'react-native'
import { useSelector } from 'react-redux'
import { HomeEvents } from 'src/analytics/Events'
import ValoraAnalytics from 'src/analytics/ValoraAnalytics'
import Card from 'src/components/Card'
import Touchable from 'src/components/Touchable'
import { FiatExchangeFlow } from 'src/fiatExchanges/utils'
import { HomeActionName } from 'src/home/types'
import QuickActionsAdd from 'src/icons/quick-actions/Add'
import QuickActionsReceive from 'src/icons/quick-actions/Receive'
import QuickActionsSend from 'src/icons/quick-actions/Send'
import QuickActionsSwap from 'src/icons/quick-actions/Swap'
import QuickActionsWithdraw from 'src/icons/quick-actions/Withdraw'
import { navigate, navigateToFiatCurrencySelection } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { isAppSwapsEnabledSelector } from 'src/navigator/selectors'
import { getFeatureGate } from 'src/statsig'
import { StatsigFeatureGates } from 'src/statsig/types'
import Colors from 'src/styles/colors'
import fontStyles from 'src/styles/fonts'

function ActionsCarousel() {
  const { t } = useTranslation()

  const shouldShowSwapAction = useSelector(isAppSwapsEnabledSelector)

  const actions = [
    {
      name: HomeActionName.Send,
      title: t('homeActions.send'),
      icon: <QuickActionsSend color={Colors.onboardingGreen} />,
      onPress: () => {
        const shouldShowSelectRecipient = getFeatureGate(
          StatsigFeatureGates.USE_NEW_RECIPIENT_SCREEN
        )
        const sendScreen = shouldShowSelectRecipient ? Screens.SendSelectRecipient : Screens.Send
        navigate(sendScreen)
      },
    },
    {
      name: HomeActionName.Receive,
      title: t('homeActions.receive'),
      icon: <QuickActionsReceive color={Colors.onboardingGreen} />,
      onPress: () => {
        navigate(Screens.QRNavigator, {
          screen: Screens.QRCode,
        })
      },
    },
    {
      name: HomeActionName.Add,
      title: t('homeActions.add'),
      icon: <QuickActionsAdd color={Colors.onboardingGreen} />,
      onPress: () => {
        navigateToFiatCurrencySelection(FiatExchangeFlow.CashIn)
      },
    },
    {
      name: HomeActionName.Swap,
      title: t('homeActions.swap'),
      icon: <QuickActionsSwap color={Colors.onboardingGreen} />,
      onPress: () => {
        navigate(Screens.SwapScreenWithBack)
      },
      hidden: !shouldShowSwapAction,
    },
    {
      name: HomeActionName.Withdraw,
      title: t('homeActions.withdraw'),
      icon: <QuickActionsWithdraw color={Colors.onboardingGreen} />,
      onPress: () => {
        navigate(Screens.WithdrawSpend)
      },
    },
  ]

  return (
    <ScrollView
      horizontal={true}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.carouselContainer}
      testID={'HomeActionsCarousel'}
    >
      {actions
        .filter(({ hidden }) => !hidden)
        .map(({ name, title, icon, onPress }) => (
          <Card style={styles.card} shadow={null} key={`HomeAction-${name}`}>
            <Touchable
              onPress={() => {
                ValoraAnalytics.track(HomeEvents.home_action_pressed, { action: name })
                onPress()
              }}
              style={styles.touchable}
              testID={`HomeAction-${name}`}
              borderRadius={8}
            >
              <>
                {icon}
                <Text style={styles.name} testID={`HomeAction/Title-${name}`}>
                  {title}
                </Text>
              </>
            </Touchable>
          </Card>
        ))}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  carouselContainer: {
    paddingHorizontal: 10,
    marginBottom: 8,
  },
  card: {
    width: 84,
    marginHorizontal: 6,
    padding: 0,
    backgroundColor: Colors.greenBackground,
    borderRadius: 10,
  },
  touchable: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  name: {
    ...fontStyles.small500,
    lineHeight: 17,
    paddingTop: 8,
    color: Colors.onboardingGreen,
  },
})

export default ActionsCarousel
