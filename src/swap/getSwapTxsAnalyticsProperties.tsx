import { TransactionRequestCIP42 } from 'node_modules/viem/_types/chains/celo/types'
import { SwapTxsProperties } from 'src/analytics/Properties'
import { getFeeCurrency } from 'src/swap/getFeeCurrency'
import { TokenBalancesWithAddress } from 'src/tokens/slice'
import { getMaxGasFee } from 'src/viem/prepareTransactions'

export function getSwapTxsAnalyticsProperties(
  preparedTransactions: TransactionRequestCIP42[] | undefined,
  tokensByAddress: TokenBalancesWithAddress,
  celoAddress: string | undefined
): SwapTxsProperties | null {
  if (!preparedTransactions) {
    return null
  }

  // undefined means the fee currency is the native currency
  const feeCurrency = getFeeCurrency(preparedTransactions)
  const feeCurrencyAddress = feeCurrency || celoAddress
  const feeCurrencyToken = feeCurrencyAddress ? tokensByAddress[feeCurrencyAddress] : undefined
  const maxGasFee = feeCurrencyToken
    ? getMaxGasFee(preparedTransactions).shiftedBy(-feeCurrencyToken.decimals)
    : undefined
  const maxGasFeeUsd =
    maxGasFee && feeCurrencyToken?.priceUsd ? maxGasFee.times(feeCurrencyToken.priceUsd) : undefined

  return {
    gas: Number(preparedTransactions.reduce((sum, tx) => sum + (tx.gas ?? BigInt(0)), BigInt(0))),
    maxGasFee: maxGasFee?.toNumber(),
    maxGasFeeUsd: maxGasFeeUsd?.toNumber(),
    feeCurrency,
    feeCurrencySymbol: feeCurrencyToken?.symbol,
    txCount: preparedTransactions.length,
  }
}
