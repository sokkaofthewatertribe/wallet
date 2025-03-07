import { fireEvent, render, waitFor } from '@testing-library/react-native'
import React from 'react'
import { Provider } from 'react-redux'
import ValoraAnalytics from 'src/analytics/ValoraAnalytics'
import { CICOFlow } from 'src/fiatExchanges/utils'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import TokenDetailsScreen from 'src/tokens/TokenDetails'
import { NetworkId } from 'src/transactions/types'
import { ONE_DAY_IN_MILLIS } from 'src/utils/time'
import MockedNavigator from 'test/MockedNavigator'
import { createMockStore } from 'test/utils'
import {
  exchangePriceHistory,
  mockCeloTokenId,
  mockEthTokenId,
  mockPoofTokenId,
  mockTokenBalances,
} from 'test/values'

jest.mock('src/statsig', () => ({
  getDynamicConfigParams: jest.fn(() => {
    return {
      showCico: ['celo-alfajores', 'ethereum-sepolia'],
      showSend: ['celo-alfajores', 'ethereum-sepolia'],
      showSwap: ['celo-alfajores', 'ethereum-sepolia'],
    }
  }),
  getFeatureGate: jest.fn().mockReturnValue(true),
}))

describe('TokenDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })
  it('renders title, balance and token balance item', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: mockTokenBalances[mockPoofTokenId],
        },
      },
    })

    const { getByTestId, getByText, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/TitleImage')).toBeTruthy()
    expect(getByTestId('TokenDetails/Title')).toHaveTextContent('Poof Governance Token')
    expect(getByTestId('TokenDetails/AssetValue')).toHaveTextContent('₱0.13')
    expect(getByText('tokenDetails.yourBalance')).toBeTruthy()
    expect(getByTestId('TokenBalanceItem')).toBeTruthy()
    expect(queryByTestId('TokenDetails/LearnMore')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Chart')).toBeFalsy()
  })

  it('renders learn more if token has infoUrl', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: {
            ...mockTokenBalances[mockPoofTokenId],
            infoUrl: 'https://poofToken',
          },
        },
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/LearnMore')).toBeTruthy()
    fireEvent.press(getByTestId('TokenDetails/LearnMore'))
    expect(navigate).toHaveBeenCalledWith(Screens.WebViewScreen, { uri: 'https://poofToken' })
  })

  it('renders price unavailable if token price is not present', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: {
            ...mockTokenBalances[mockPoofTokenId],
            priceUsd: undefined,
          },
        },
      },
    })

    const { queryByTestId, getByText, getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(queryByTestId('TokenDetails/PriceDelta')).toBeFalsy()
    expect(getByText('tokenDetails.priceUnavailable')).toBeTruthy()
    expect(getByTestId('TokenDetails/AssetValue')).toHaveTextContent('₱ --')
  })

  it('renders no price info if historical price info is not available', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: mockTokenBalances[mockPoofTokenId],
        },
      },
    })

    const { queryByTestId, queryByText } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(queryByTestId('TokenDetails/PriceDelta')).toBeFalsy()
    expect(queryByText('tokenDetails.priceUnavailable')).toBeFalsy()
  })

  it('renders no price info if historical price info is out of date', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: {
            ...mockTokenBalances[mockPoofTokenId],
            historicalPricesUsd: {
              lastDay: {
                at: Date.now() - 2 * ONE_DAY_IN_MILLIS,
                price: 1,
              },
            },
          },
        },
      },
    })

    const { queryByTestId, queryByText } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(queryByTestId('TokenDetails/PriceDelta')).toBeFalsy()
    expect(queryByText('tokenDetails.priceUnavailable')).toBeFalsy()
  })

  it('renders price delta if historical price is available and one day old', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: {
            ...mockTokenBalances[mockPoofTokenId],
            historicalPricesUsd: {
              lastDay: {
                at: Date.now() - ONE_DAY_IN_MILLIS,
                price: 1,
              },
            },
          },
        },
      },
    })

    const { getByTestId, queryByText } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/PriceDelta')).toBeTruthy()
    expect(queryByText('tokenDetails.priceUnavailable')).toBeFalsy()
  })

  it('renders chart if token is native (celo)', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockCeloTokenId]: mockTokenBalances[mockCeloTokenId],
        },
      },
      exchange: {
        history: exchangePriceHistory,
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/Chart')).toBeTruthy()
  })

  it('renders send action only if token has balance, is not swappable and not a CICO token', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: mockTokenBalances[mockPoofTokenId],
        },
      },
      app: {
        showSwapMenuInDrawerMenu: true,
      },
    })

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/Action/Send')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Swap')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/Add')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/Withdraw')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/More')).toBeFalsy()
  })

  it('renders send and swap action only if token has balance, is swappable and not a CICO token', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockPoofTokenId]: { ...mockTokenBalances[mockPoofTokenId], isSwappable: true },
        },
      },
      app: {
        showSwapMenuInDrawerMenu: true,
      },
    })

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockPoofTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/Action/Send')).toBeTruthy()
    expect(getByTestId('TokenDetails/Action/Swap')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Add')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/Withdraw')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/More')).toBeFalsy()
  })

  it('renders send, swap and more if token has balance, is swappable and a CICO token', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockCeloTokenId]: {
            ...mockTokenBalances[mockCeloTokenId],
            balance: '10',
            isSwappable: true,
          },
        },
      },
      app: {
        showSwapMenuInDrawerMenu: true,
      },
    })

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/Action/Send')).toBeTruthy()
    expect(getByTestId('TokenDetails/Action/Swap')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Add')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/Withdraw')).toBeFalsy()
    expect(getByTestId('TokenDetails/Action/More')).toBeTruthy()
  })

  it('renders add only for CICO token with 0 balance', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockCeloTokenId]: {
            ...mockTokenBalances[mockCeloTokenId],
            isSwappable: true,
          },
        },
      },
      app: {
        showSwapMenuInDrawerMenu: true,
      },
    })

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )

    expect(queryByTestId('TokenDetails/Action/Send')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/Swap')).toBeFalsy()
    expect(getByTestId('TokenDetails/Action/Add')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Withdraw')).toBeFalsy()
    expect(queryByTestId('TokenDetails/Action/More')).toBeFalsy()
  })

  it('hides swap action and shows more action if token is swappable, has balance and CICO token but swapfeature gate is false', () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockCeloTokenId]: {
            ...mockTokenBalances[mockCeloTokenId],
            balance: '10',
            isSwappable: true,
          },
        },
      },
      app: {
        showSwapMenuInDrawerMenu: false,
      },
    })

    const { getByTestId, queryByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )

    expect(getByTestId('TokenDetails/Action/Send')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Swap')).toBeFalsy()
    expect(getByTestId('TokenDetails/Action/Add')).toBeTruthy()
    expect(getByTestId('TokenDetails/Action/More')).toBeTruthy()
    expect(queryByTestId('TokenDetails/Action/Withdraw')).toBeFalsy()
  })

  it('actions navigate to appropriate screens', async () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockCeloTokenId]: {
            ...mockTokenBalances[mockCeloTokenId],
            balance: '10',
            isSwappable: true,
          },
        },
      },
      app: {
        showSwapMenuInDrawerMenu: true,
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockCeloTokenId }} />
      </Provider>
    )

    fireEvent.press(getByTestId('TokenDetails/Action/Send'))
    expect(navigate).toHaveBeenCalledWith(Screens.Send, { defaultTokenIdOverride: mockCeloTokenId })
    fireEvent.press(getByTestId('TokenDetails/Action/Swap'))
    expect(navigate).toHaveBeenCalledWith(Screens.SwapScreenWithBack, {
      fromTokenId: mockCeloTokenId,
    })
    fireEvent.press(getByTestId('TokenDetails/Action/More'))
    await waitFor(() => expect(getByTestId('TokenDetailsMoreActions')).toBeTruthy())
    fireEvent.press(getByTestId('TokenDetailsMoreActions/Add'))
    expect(navigate).toHaveBeenCalledWith(Screens.FiatExchangeAmount, {
      tokenId: mockCeloTokenId,
      flow: CICOFlow.CashIn,
      tokenSymbol: 'CELO',
    })
    fireEvent.press(getByTestId('TokenDetailsMoreActions/Withdraw'))
    expect(navigate).toHaveBeenCalledWith(Screens.WithdrawSpend)
    expect(ValoraAnalytics.track).toHaveBeenCalledTimes(5) // 4 actions + 1 more action
  })

  // TODO(ACT-954): remove once we switch to passing just token ids, above test
  // should be sufficient
  it('add action sends appropriate network', async () => {
    const store = createMockStore({
      tokens: {
        tokenBalances: {
          [mockEthTokenId]: {
            symbol: 'ETH',
            balance: '0',
            showZeroBalance: true,
            isCashInEligible: true,
            tokenId: mockEthTokenId,
            networkId: NetworkId['ethereum-sepolia'],
          },
        },
      },
      app: {
        showSwapMenuInDrawerMenu: true,
      },
    })

    const { getByTestId } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenDetailsScreen} params={{ tokenId: mockEthTokenId }} />
      </Provider>
    )

    fireEvent.press(getByTestId('TokenDetails/Action/Add'))
    expect(navigate).toHaveBeenCalledWith(Screens.FiatExchangeAmount, {
      tokenId: mockEthTokenId,
      flow: CICOFlow.CashIn,
      tokenSymbol: 'ETH',
    })
    expect(ValoraAnalytics.track).toHaveBeenCalledTimes(1)
  })
})
