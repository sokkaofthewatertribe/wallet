import { AnyAction } from 'redux'
import { Actions, ActionTypes, AlertTypes } from 'src/alert/actions'
import { ErrorMessages } from 'src/app/ErrorMessages'
import { ActionTypes as ExchangeActionTypes } from 'src/exchange/actions'
import { RootState } from 'src/redux/reducers'

export enum ErrorDisplayType {
  'BANNER',
  'INLINE',
}

export interface Alert {
  type: AlertTypes
  displayMethod: ErrorDisplayType
  message: string
  dismissAfter?: number | null
  buttonMessage?: string | null
  action?: AnyAction | null
  title?: string | null
  underlyingError?: ErrorMessages | null
}

export type State = Alert | null

const initialState = null

export const reducer = (
  state: State = initialState,
  action: ActionTypes | ExchangeActionTypes
): State => {
  switch (action.type) {
    case Actions.SHOW:
      return {
        displayMethod: action.displayMethod,
        type: action.alertType,
        message: action.message,
        dismissAfter: action.dismissAfter,
        buttonMessage: action.buttonMessage,
        action: action.action,
        title: action.title,
        underlyingError: action.underlyingError,
      }
    case Actions.HIDE:
      return null
    default:
      if (state?.action === action) {
        // Hide alert when the alert action is dispatched
        return null
      }
      return state
  }
}

export const errorSelector = (state: RootState) => {
  return state.alert ? state.alert.underlyingError || null : null
}
