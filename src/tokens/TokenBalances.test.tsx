import { fireEvent, render } from '@testing-library/react-native'
import * as React from 'react'
import { Provider } from 'react-redux'
import { HomeEvents } from 'src/analytics/Events'
import ValoraAnalytics from 'src/analytics/ValoraAnalytics'
import { navigate } from 'src/navigator/NavigationService'
import { Screens } from 'src/navigator/Screens'
import { getFeatureGate } from 'src/statsig'
import TokenBalancesScreen from 'src/tokens/TokenBalances'
import { ONE_DAY_IN_MILLIS } from 'src/utils/time'
import networkConfig from 'src/web3/networkConfig'
import MockedNavigator from 'test/MockedNavigator'
import { createMockStore, getElementText, getMockStackScreenProps } from 'test/utils'
import {
  mockCeurAddress,
  mockCeurTokenId,
  mockCusdAddress,
  mockCusdTokenId,
  mockPositions,
  mockTestTokenAddress,
  mockTokenBalances,
  mockTestTokenTokenId,
  mockTokenBalancesWithHistoricalPrices,
} from 'test/values'
import { NetworkId } from 'src/transactions/types'

jest.mock('src/statsig', () => {
  return {
    getFeatureGate: jest.fn(),
    getDynamicConfigParams: jest.fn().mockReturnValue({
      showBalances: ['celo-alfajores'],
    }),
  }
})

const storeWithoutHistoricalPrices = {
  tokens: {
    tokenBalances: {
      ...mockTokenBalances,
      [mockTestTokenTokenId]: {
        address: mockTestTokenAddress,
        tokenId: mockTestTokenTokenId,
        networkId: NetworkId['celo-alfajores'],
        symbol: 'TT',
        balance: '50',
      },
    },
  },
  app: {
    showPriceChangeIndicatorInBalances: false,
  },
}

const storeWithHistoricalPrices = {
  tokens: {
    tokenBalances: {
      ...mockTokenBalancesWithHistoricalPrices,
      [mockTestTokenTokenId]: {
        address: mockTestTokenAddress,
        tokenId: mockTestTokenTokenId,
        networkId: NetworkId['celo-alfajores'],
        symbol: 'TT',
        balance: '50',
        priceUsd: '2',
        priceFetchedAt: Date.now(),
        historicalPricesUsd: {
          lastDay: {
            price: '1.3',
            at: Date.now() - ONE_DAY_IN_MILLIS,
          },
        },
      },
    },
  },
  app: {
    showPriceChangeIndicatorInBalances: true,
  },
}

const storeWithPositions = {
  tokens: {
    tokenBalances: {
      [mockCeurTokenId]: {
        priceUsd: '1.16',
        address: mockCeurAddress,
        tokenId: mockCeurTokenId,
        networkId: NetworkId['celo-alfajores'],
        symbol: 'cEUR',
        imageUrl:
          'https://raw.githubusercontent.com/ubeswap/default-token-list/master/assets/asset_cEUR.png',
        name: 'Celo Euro',
        decimals: 18,
        balance: '5',
        isCoreToken: true,
        priceFetchedAt: Date.now(),
      },
      [mockCusdTokenId]: {
        priceUsd: '1.001',
        address: mockCusdAddress,
        tokenId: mockCusdTokenId,
        networkId: NetworkId['celo-alfajores'],
        symbol: 'cUSD',
        imageUrl:
          'https://raw.githubusercontent.com/ubeswap/default-token-list/master/assets/asset_cUSD.png',
        name: 'Celo Dollar',
        decimals: 18,
        balance: '10',
        isCoreToken: true,
        priceFetchedAt: Date.now(),
      },
    },
  },
  positions: {
    positions: mockPositions, // Total value of positions is ~$7.91
  },
}

const mockScreenProps = getMockStackScreenProps(Screens.TokenBalances)
const mockWalletAddress = '0x123'

describe('TokenBalancesScreen', () => {
  it('renders correctly when showPriceChangeIndicator ff is off', async () => {
    const store = createMockStore(storeWithoutHistoricalPrices)

    const tree = render(
      <Provider store={store}>
        <TokenBalancesScreen {...mockScreenProps} />
      </Provider>
    )

    expect(getElementText(tree.getByTestId('tokenBalance:POOF'))).toBe('5.00')
    expect(getElementText(tree.getByTestId('tokenLocalBalance:POOF'))).toBe('₱0.67')

    expect(getElementText(tree.getByTestId('tokenBalance:TT'))).toBe('50.00')
    expect(tree.queryByTestId('tokenLocalBalance:TT')).toBeFalsy()

    expect(tree.queryByTestId('percentageIndicator:POOF')).toBeFalsy()
    expect(tree.queryByTestId('percentageIndicator:TT')).toBeFalsy()
  })

  it('renders correctly when showPriceChangeIndicator ff is on', async () => {
    const store = createMockStore(storeWithHistoricalPrices)

    const tree = render(
      <Provider store={store}>
        <TokenBalancesScreen {...mockScreenProps} />
      </Provider>
    )

    expect(getElementText(tree.getByTestId('tokenBalance:POOF'))).toBe('5.00')
    expect(getElementText(tree.getByTestId('tokenLocalBalance:POOF'))).toBe('₱0.67')

    expect(getElementText(tree.getByTestId('percentageIndicator:POOF'))).toBe('33.33%')
    expect(tree.queryByTestId('percentageIndicator:POOF:DownIndicator')).toBeTruthy()

    expect(getElementText(tree.getByTestId('percentageIndicator:TT'))).toBe('53.85%')
    expect(tree.queryByTestId('percentageIndicator:TT:UpIndicator')).toBeTruthy()
  })

  it('renders correctly when visualizeNFTsEnabledInHomeAssetsPage is true', () => {
    const store = createMockStore({
      app: { visualizeNFTsEnabledInHomeAssetsPage: true },
      web3: {
        account: mockWalletAddress,
      },
    })

    const tree = render(
      <Provider store={store}>
        <TokenBalancesScreen {...mockScreenProps} />
      </Provider>
    )
    expect(tree.queryByTestId('NftViewerBanner')).toBeTruthy()

    fireEvent.press(tree.getByTestId('NftViewerBanner'))
    expect(ValoraAnalytics.track).toHaveBeenCalledWith(HomeEvents.view_nft_home_assets)
    expect(navigate).toHaveBeenCalledWith(Screens.WebViewScreen, {
      uri: `${networkConfig.nftsValoraAppUrl}?address=${mockWalletAddress}&hide-header=true`,
    })
  })

  it('renders correctly when visualizeNFTsEnabledInHomeAssetsPage is false', () => {
    const store = createMockStore({ app: { visualizeNFTsEnabledInHomeAssetsPage: false } })

    const tree = render(
      <Provider store={store}>
        <TokenBalancesScreen {...mockScreenProps} />
      </Provider>
    )
    expect(tree.queryByTestId('NftViewerBanner')).toBeFalsy()
  })

  it('renders the correct components when there are positions', () => {
    jest.mocked(getFeatureGate).mockReturnValue(true)
    const store = createMockStore(storeWithPositions)

    const { getByTestId, getAllByTestId, queryAllByTestId, getByText } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenBalancesScreen} />
      </Provider>
    )

    expect(getByTestId('TokenBalances/SegmentedControl')).toBeTruthy()
    expect(getAllByTestId('TokenBalanceItem')).toHaveLength(2)
    expect(queryAllByTestId('PositionItem')).toHaveLength(0)

    fireEvent.press(getByText('assetsSegmentedControl.dappPositions'))

    expect(getAllByTestId('PositionItem')).toHaveLength(3)
    expect(queryAllByTestId('TokenBalanceItem')).toHaveLength(0)
  })

  it('renders the correct information in positions', () => {
    jest.mocked(getFeatureGate).mockReturnValue(true)
    const store = createMockStore(storeWithPositions)

    const { getAllByTestId, getByText } = render(
      <Provider store={store}>
        <MockedNavigator component={TokenBalancesScreen} />
      </Provider>
    )

    fireEvent.press(getByText('assetsSegmentedControl.dappPositions'))

    const firstPositionItem = getAllByTestId('PositionItem')[0]
    const lastPositionItem = getAllByTestId('PositionItem')[2]

    expect(firstPositionItem).toHaveTextContent('MOO / CELO')
    expect(firstPositionItem).toHaveTextContent('Pool')
    expect(firstPositionItem).toHaveTextContent('₱3.34')

    expect(lastPositionItem).toHaveTextContent('CELO / cUSD')
    expect(lastPositionItem).toHaveTextContent('Farm')
    expect(lastPositionItem).toHaveTextContent('₱1.76')
  })
})
