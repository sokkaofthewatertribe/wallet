import _ from 'lodash'
import { Actions, ActionTypes } from 'src/exchange/actions'
import { getRehydratePayload, REHYDRATE, RehydrateAction } from 'src/redux/persist-helper'
import { RootState } from 'src/redux/reducers'
import { Currency } from 'src/utils/currencies'

export const MAX_HISTORY_RETENTION = 30 * 24 * 3600 * 1000 // (ms) ~ 30 days
export const ADDRESS_LENGTH = 42

export interface ExchangeRate {
  exchangeRate: string
  timestamp: number
}

export type ExchangeRates = Record<Currency, Record<Currency, string>>

export interface State {
  history: {
    // TODO this should be remove once we have aggregation on
    // blockchain api side
    celoGoldExchangeRates: ExchangeRate[]
    aggregatedExchangeRates: ExchangeRate[]
    granularity: number
    range: number
    lastTimeUpdated: number
  }
}

export const initialState = {
  history: {
    celoGoldExchangeRates: [],
    aggregatedExchangeRates: [],
    granularity: 60,
    range: 30 * 24 * 60 * 60 * 1000, // 30 days
    lastTimeUpdated: 0,
  },
}

export const exchangeHistorySelector = (state: RootState) => state.exchange.history

function aggregateExchangeRates(
  celoGoldExchangeRates: ExchangeRate[],
  granularity: number,
  range: number
): ExchangeRate[] {
  if (!celoGoldExchangeRates.length) {
    return []
  }
  function calculateGroup(exchangeRate: ExchangeRate) {
    return Math.floor(exchangeRate.timestamp / (range / granularity))
  }
  const groupedExchangeHistory = _.groupBy(celoGoldExchangeRates, calculateGroup)
  const latestExchangeRate = celoGoldExchangeRates[celoGoldExchangeRates.length - 1]
  const latestGroup = calculateGroup(latestExchangeRate)

  return _.range(Math.min(granularity - 1, Object.keys(groupedExchangeHistory).length), 0, -1).map(
    (i) => {
      const group = groupedExchangeHistory[latestGroup - i + 1]
      return {
        exchangeRate: group ? _.meanBy(group, (er) => parseFloat(er.exchangeRate)).toString() : '0',
        timestamp: _.first(group)?.timestamp ?? 0,
      }
    }
  )
}

export const historyReducer = (
  state: State['history'] | undefined = initialState.history,
  action: ActionTypes
): State['history'] => {
  switch (action.type) {
    case Actions.UPDATE_CELO_GOLD_EXCHANGE_RATE_HISTORY:
      const celoGoldExchangeRates = [
        ...state.celoGoldExchangeRates,
        ...action.exchangeRates,
      ].filter((er) => er.timestamp > action.timestamp - MAX_HISTORY_RETENTION)
      return {
        ...state,
        celoGoldExchangeRates,
        aggregatedExchangeRates: aggregateExchangeRates(
          celoGoldExchangeRates,
          state.granularity,
          state.range
        ),
        lastTimeUpdated: action.timestamp,
      }
    default:
      return state
  }
}

export const reducer = (
  state: State | undefined = initialState,
  action: ActionTypes | RehydrateAction
): State => {
  switch (action.type) {
    case REHYDRATE: {
      // Ignore some persisted properties
      const persisted = getRehydratePayload(action, 'exchange')
      return {
        ...state,
        ...persisted,
        history: {
          ...initialState.history,
          ...persisted.history,
        },
      }
    }
    case Actions.UPDATE_CELO_GOLD_EXCHANGE_RATE_HISTORY:
      return {
        ...state,
        history: historyReducer(state.history, action),
      }
    default:
      return state
  }
}
