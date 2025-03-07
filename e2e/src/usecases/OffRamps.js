import { DEFAULT_RECIPIENT_ADDRESS } from '../utils/consts'
import { reloadReactNative } from '../utils/retries'
import { enterPinUiIfNecessary, sleep, waitForElementId } from '../utils/utils'

export default offRamps = () => {
  beforeEach(async () => {
    await reloadReactNative()
    await waitForElementId('HomeActionsCarousel')
    await element(by.id('HomeActionsCarousel')).scrollTo('right')
    await waitForElementId('HomeAction-Withdraw')
    await element(by.id('HomeAction-Withdraw')).tap()
  })

  describe('When on Add & Withdraw', () => {
    it('Then should have support link', async () => {
      await element(by.id('FiatExchange/scrollView')).scrollTo('bottom')
      await expect(element(by.id('otherFundingOptions'))).toBeVisible()
    })

    it('Then should display total balance and navigate back', async () => {
      await waitForElementId('ViewBalances')
      await element(by.id('ViewBalances')).tap()
      await expect(element(by.id('AssetsTokenBalance'))).toBeVisible()
      await element(by.id('BackChevron')).tap()
      await expect(element(by.id('AssetsTokenBalance'))).not.toBeVisible()
      await waitForElementId('ViewBalances')
    })
  })

  describe('When Spend selected', () => {
    beforeEach(async () => {
      await waitForElementId('spend')
      await element(by.id('spend')).tap()
    })

    it('Then should be able to spend cUSD', async () => {
      await waitForElementId('radio/cUSD')
      await element(by.id('radio/cUSD')).tap()
      await element(by.id('GoToProviderButton')).tap()
      await waitForElementId('RNWebView')
      await expect(element(by.text('Bidali'))).toBeVisible()
    })

    it('Then should be able to spend cEUR', async () => {
      await waitForElementId('radio/cEUR')
      await element(by.id('radio/cEUR')).tap()
      await element(by.id('GoToProviderButton')).tap()
      await waitForElementId('RNWebView')
      await expect(element(by.text('Bidali'))).toBeVisible()
    })
  })

  describe('When Withdraw Selected', () => {
    beforeEach(async () => {
      await waitForElementId('cashOut')
      await element(by.id('cashOut')).tap()
    })

    it.each`
      token     | amount | exchanges
      ${'cUSD'} | ${'2'} | ${{ total: 5, minExpected: 1 }}
      ${'cEUR'} | ${'2'} | ${{ total: 2, minExpected: 1 }}
      ${'CELO'} | ${'2'} | ${{ total: 19, minExpected: 5 }}
    `(
      'Then should display $token provider(s) for $$amount',
      async ({ token, amount, exchanges }) => {
        await waitForElementId(`radio/${token}`)
        await element(by.id(`radio/${token}`)).tap()
        await element(by.text('Next')).tap()
        await waitForElementId('FiatExchangeInput')
        await element(by.id('FiatExchangeInput')).replaceText(`${amount}`)
        await element(by.id('FiatExchangeNextButton')).tap()
        await expect(element(by.text('Select Withdraw Method'))).toBeVisible()
        await waitForElementId('Exchanges')
        await element(by.id('Exchanges')).tap()
        // Exchanges start at index 0
        await waitForElementId(`provider-${exchanges.minExpected - 1}`)
      }
    )

    // Verify that some exchanges are displayed not the exact total as this could change
    // Maybe use total in the future
    it.each`
      token     | exchanges
      ${'cUSD'} | ${{ total: 5, minExpected: 1 }}
      ${'cEUR'} | ${{ total: 2, minExpected: 1 }}
      ${'CELO'} | ${{ total: 19, minExpected: 5 }}
    `(
      'Then should display at least $exchanges.minExpected $token exchange(s)',
      async ({ token, exchanges }) => {
        await waitForElementId(`radio/${token}`)
        await element(by.id(`radio/${token}`)).tap()
        await element(by.text('Next')).tap()
        await waitForElementId('FiatExchangeInput')
        await element(by.id('FiatExchangeInput')).replaceText('20')
        await element(by.id('FiatExchangeNextButton')).tap()
        await expect(element(by.text('Select Withdraw Method'))).toBeVisible()
        await waitForElementId('Exchanges')
        await element(by.id('Exchanges')).tap()
        await waitForElementId('SendBar')
        // Exchanges start at index 0
        await waitForElementId(`provider-${exchanges.minExpected - 1}`)
      }
    )

    it('Then Send To Address', async () => {
      const randomAmount = `${(Math.random() * 10 ** -1).toFixed(3)}`
      await waitForElementId('radio/CELO')
      await element(by.id('radio/CELO')).tap()
      await element(by.text('Next')).tap()
      await waitForElementId('FiatExchangeInput')
      await element(by.id('FiatExchangeInput')).replaceText(`${randomAmount}`)
      await element(by.id('FiatExchangeNextButton')).tap()
      await waitForElementId('Exchanges')
      await element(by.id('Exchanges')).tap()
      await element(by.id('SendBar')).tap()
      await waitFor(element(by.id('SendSearchInput')))
        .toBeVisible()
        .withTimeout(10 * 1000)
      // Send e2e test should cover the rest of this flow
    })
  })
}
