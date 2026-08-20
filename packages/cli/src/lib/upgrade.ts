import open from 'open'

import { apiClient } from './api-client'
import { getErrorMessage } from './http-errors'

export async function openUpgradeCheckout(): Promise<void> {
  const response = await apiClient.billing.checkout.$post()

  if (!response.ok) throw new Error(await getErrorMessage(response))

  const { url } = await response.json()

  await open(url)
}

export async function openBillingPortal(): Promise<void> {
  const response = await apiClient.billing.portal.$post()

  if (!response.ok) throw new Error(await getErrorMessage(response))

  const { url } = await response.json()

  await open(url)
}
