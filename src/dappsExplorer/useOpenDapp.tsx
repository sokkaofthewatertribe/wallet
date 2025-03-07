import React, { useMemo, useRef, useState } from 'react'
import { Keyboard } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { DappExplorerEvents } from 'src/analytics/Events'
import { AnalyticsPropertiesList } from 'src/analytics/Properties'
import ValoraAnalytics from 'src/analytics/ValoraAnalytics'
import { activeScreenSelector } from 'src/app/selectors'
import { dappsMinimalDisclaimerEnabledSelector, recentDappsSelector } from 'src/dapps/selectors'
import { dappSelected } from 'src/dapps/slice'
import { ActiveDapp } from 'src/dapps/types'
import DAppsBottomSheet from 'src/dappsExplorer/DAppsBottomSheet'
import { Screens } from 'src/navigator/Screens'
import { isDeepLink } from 'src/utils/linking'
import Logger from 'src/utils/Logger'

const TAG = 'DApps'

type ExtraAnalyticsProperties = Partial<AnalyticsPropertiesList[DappExplorerEvents.dapp_open]>

// Open the dapp if deep linked, or require confirmation to open the dapp
const useOpenDapp = () => {
  const recentlyUsedDapps = useSelector(recentDappsSelector)
  const activeScreen = useSelector(activeScreenSelector)
  const dappsMinimalDisclaimerEnabled = useSelector(dappsMinimalDisclaimerEnabledSelector)
  const [showOpenDappConfirmation, setShowOpenDappConfirmation] = useState(false)
  const [selectedDapp, setSelectedDapp] = useState<ActiveDapp | null>(null)
  const dispatch = useDispatch()

  const extraAnalyticsPropertiesRef = useRef<ExtraAnalyticsProperties>({})

  const recentlyUsedDappsMode = activeScreen === Screens.WalletHome

  const getEventProperties = (dapp: ActiveDapp) => ({
    categories: dapp.categories,
    dappId: dapp.id,
    dappName: dapp.name,
    section: dapp.openedFrom,
    horizontalPosition: recentlyUsedDappsMode
      ? recentlyUsedDapps.findIndex((recentlyUsedDapp) => recentlyUsedDapp.id === dapp.id)
      : undefined,
  })

  const onCancelOpenDapp = () => {
    setShowOpenDappConfirmation(false)
    if (selectedDapp) {
      ValoraAnalytics.track(
        DappExplorerEvents.dapp_bottom_sheet_dismiss,
        getEventProperties(selectedDapp)
      )
    }
  }

  const openDapp = (dapp: ActiveDapp, extraAnalyticsProperties: ExtraAnalyticsProperties = {}) => {
    ValoraAnalytics.track(DappExplorerEvents.dapp_open, {
      ...getEventProperties(dapp),
      ...extraAnalyticsProperties,
    })
    dispatch(dappSelected({ dapp }))
    Keyboard.dismiss()
  }

  const onOpenDapp = () => {
    if (!selectedDapp) {
      // Should never happen
      Logger.error(TAG, 'Internal error. There was no dapp selected')
      return
    }

    openDapp(selectedDapp, extraAnalyticsPropertiesRef.current)
    setShowOpenDappConfirmation(false)
  }

  const onSelectDapp = (
    dapp: ActiveDapp,
    extraAnalyticsProperties: ExtraAnalyticsProperties = {}
  ) => {
    const dappEventProps = getEventProperties(dapp)
    ValoraAnalytics.track(DappExplorerEvents.dapp_select, dappEventProps)

    if (isDeepLink(dapp.dappUrl) || dappsMinimalDisclaimerEnabled) {
      openDapp(dapp, extraAnalyticsProperties)
    } else {
      setSelectedDapp(dapp)
      setShowOpenDappConfirmation(true)
      extraAnalyticsPropertiesRef.current = extraAnalyticsProperties
      ValoraAnalytics.track(DappExplorerEvents.dapp_bottom_sheet_open, dappEventProps)
    }
  }

  const ConfirmOpenDappBottomSheet = useMemo(
    () => (
      <DAppsBottomSheet
        onClose={onCancelOpenDapp}
        onConfirmOpenDapp={onOpenDapp}
        selectedDapp={selectedDapp}
        isVisible={showOpenDappConfirmation}
      />
    ),
    [selectedDapp, showOpenDappConfirmation]
  )

  return {
    onSelectDapp,
    ConfirmOpenDappBottomSheet,
  }
}

export default useOpenDapp
