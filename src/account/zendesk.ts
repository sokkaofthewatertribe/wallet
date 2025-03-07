import { ZENDESK_API_KEY } from 'src/config'
import Logger from 'src/utils/Logger'
import { readFileChunked } from 'src/utils/readFile'

const ZENDESK_PROJECT_NAME = 'valoraapp'

export interface DeviceInfo {
  version: string
  systemVersion: string
  buildNumber: string
  apiLevel: number
  os: 'ios' | 'android' | 'windows' | 'macos' | 'web'
  country: string | null
  region: string | null
  deviceId: string
  deviceBrand: string
  deviceModel: string
  address: string | null
  sessionId: string
  numberVerifiedCentralized: boolean
  network: string
}

const TAG = 'account/zendesk'

// Send zendesk support request and upload attachments
export async function sendSupportRequest({
  message,
  deviceInfo,
  logFiles,
  userEmail,
  userName,
  subject,
}: {
  message: string
  deviceInfo: DeviceInfo
  logFiles: { path: string; type: string; name: string }[]
  userEmail: string
  userName: string
  subject: string
}) {
  Logger.info(TAG, 'Sending support request')
  const uploadTokens = await Promise.all(
    logFiles.map((fileInfo) => _uploadFile(fileInfo, userEmail))
  )
  const customFields = _generateCustomFields(deviceInfo)
  await _createRequest({
    message: `${message}
    
    ${JSON.stringify(deviceInfo)}
    `,
    userEmail,
    userName,
    uploadTokens,
    subject,
    customFields,
  })
}

// These custom fields auto-populate fields in zendesk
// Id's come from https://valoraapp.zendesk.com/admin/objects-rules/tickets/ticket-fields (only admins can view)
export function _generateCustomFields(deviceInfo: DeviceInfo) {
  return [
    {
      id: 11693576426253,
      value: deviceInfo.deviceBrand,
    },
    {
      id: 11693574091917,
      value: deviceInfo.deviceId,
    },
    {
      id: 11693603050381,
      value: deviceInfo.deviceModel,
    },
    {
      id: 5381831861005,
      value: deviceInfo.os === 'ios' ? 'iOS' : 'Android',
    },
    {
      id: 5381862498317,
      value: deviceInfo.apiLevel.toString(),
    },
    {
      id: 20129806706445,
      value: deviceInfo.systemVersion,
    },
    {
      id: 15494972694029,
      value: deviceInfo.version,
    },
    {
      id: 5341510571021,
      value: deviceInfo.address ?? '',
    },
    {
      id: 15314444792973,
      value: deviceInfo.country ?? '',
    },
  ]
}

async function _createRequest({
  message,
  userEmail,
  userName,
  uploadTokens,
  subject,
  customFields,
}: {
  message: string
  userEmail: string
  userName: string
  uploadTokens: string[]
  subject: string
  customFields: { id: number; value: string }[]
}) {
  const resp = await fetch(`https://${ZENDESK_PROJECT_NAME}.zendesk.com/api/v2/requests`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${userEmail}/token:${ZENDESK_API_KEY}`).toString(
        'base64'
      )}`,
    },
    body: JSON.stringify({
      request: {
        subject,
        custom_fields: customFields,
        comment: {
          body: message,
          uploads: uploadTokens,
        },
        requester: {
          email: userEmail,
          name: userName,
        },
      },
    }),
  })
  if (resp.status >= 400) {
    const jsonResponse = await resp.json()
    Logger.error(
      TAG,
      '_createRequest returned response greater than 400',
      new Error(JSON.stringify(jsonResponse))
    )
  }
}

async function _uploadFile(
  { path, name }: { path: string; type: string; name: string },
  userEmail: string
) {
  const blob = await readFileChunked(path)
  const uploadFileResponse = await fetch(
    `https://${ZENDESK_PROJECT_NAME}.zendesk.com/api/v2/uploads.json?filename=${name}&binary=false`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain',
        Authorization: `Basic ${Buffer.from(`${userEmail}/token:${ZENDESK_API_KEY}`).toString(
          'base64'
        )}`,
      },
      body: blob,
    }
  )
  const resp = await uploadFileResponse.json()
  if (uploadFileResponse.status >= 400) {
    Logger.error(
      TAG,
      '_uploadFile returned response greater than 400',
      new Error(JSON.stringify(resp))
    )
  }
  return resp.upload?.token
}
