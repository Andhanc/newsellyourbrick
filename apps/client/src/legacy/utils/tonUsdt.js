/**
 * Утилиты для перевода USDT (Jetton) через TON Connect.
 * USDT в TON — Jetton, официальный контракт Tether.
 */

import { Address, beginCell } from '@ton/core'

// Официальный USDT Jetton Master в TON (Tether USD)
export const USDT_MASTER = 'EQA_fTd7v1HOV3UqVh2EIkT7-A28MoQbr0opM7ZeqcJi97N4'

// 0.01 USDT в минимальных единицах (6 десятичных)
const USDT_DECIMALS = 6
export const USDT_AMOUNT_001 = 10_000n // 0.01 * 10^6

// Газ для Jetton transfer (вернётся сдачей)
const JETTON_FORWARD_TON = '50000000' // 0.05 TON в нанотонах

/**
 * Получить адрес Jetton-кошелька пользователя для USDT.
 * Сначала пробует TonAPI (список jettons), затем бэкенд runGetMethod.
 * @param {string} ownerAddress — адрес владельца (user-friendly, например UQ...)
 * @param {string} [apiBaseUrl] — базовый URL API (для вызова /api/ton/jetton-wallet)
 * @returns {Promise<string|null>} — адрес Jetton-кошелька (user-friendly) или null
 */
export async function getUsdtJettonWalletAddress(ownerAddress, apiBaseUrl) {
  if (!ownerAddress) return null
  try {
    const ownerRaw = Address.parse(ownerAddress).toRawString()
    const tonApiUrl = `https://tonapi.io/v2/accounts/${encodeURIComponent(ownerRaw)}/jettons`
    const res = await fetch(tonApiUrl)
    if (!res.ok) throw new Error('TonAPI error')
    const data = await res.json()
    const balances = data.balances || []
    const usdtMasterNorm = Address.parse(USDT_MASTER).toString()
    for (const b of balances) {
      const jettonAddr = b.jetton?.address || b.jetton?.master?.address
      if (!jettonAddr) continue
      try {
        if (Address.parse(jettonAddr).toString() === usdtMasterNorm) {
          const w = b.wallet?.address
          const walletAddr = typeof w === 'string' ? w : (w?.address ?? null)
          if (walletAddr) return walletAddr
        }
      } catch (_) {}
    }
  } catch (_) {}

  if (apiBaseUrl) {
    try {
      const url = `${apiBaseUrl.replace(/\/$/, '')}/ton/jetton-wallet?owner=${encodeURIComponent(ownerAddress)}&master=${encodeURIComponent(USDT_MASTER)}`
      const r = await fetch(url)
      if (!r.ok) return null
      const j = await r.json()
      if (j.success && j.walletAddress) return j.walletAddress
    } catch (_) {}
  }
  return null
}

/**
 * Собрать транзакцию для перевода 0.01 USDT на указанный адрес.
 * @param {string} senderJettonWalletAddress — адрес Jetton-кошелька отправителя (user-friendly)
 * @param {string} recipientTonAddress — адрес получателя TON (user-friendly), получит USDT на свой Jetton-кошелёк
 * @param {string} senderTonAddress — адрес отправителя (для response_destination, сдача газа)
 * @returns {{ validUntil: number, messages: Array<{ address: string, amount: string, payload?: string }> } | null}
 */
export function buildUsdtTransferTransaction(senderJettonWalletAddress, recipientTonAddress, senderTonAddress) {
  try {
    const recipient = Address.parse(recipientTonAddress)
    const responseDest = Address.parse(senderTonAddress)
    const body = beginCell()
      .storeUint(0xf8a7ea5, 32)
      .storeUint(0, 64)
      .storeCoins(USDT_AMOUNT_001)
      .storeAddress(recipient)
      .storeAddress(responseDest)
      .storeUint(0, 1)
      .storeCoins(BigInt(JETTON_FORWARD_TON))
      .storeBit(1)
      .storeRef(beginCell().endCell())
      .endCell()
    const payloadBoc = body.toBoc()
    const arr = payloadBoc instanceof Uint8Array ? payloadBoc : new Uint8Array(payloadBoc)
    let binary = ''
    for (let i = 0; i < arr.length; i++) binary += String.fromCharCode(arr[i])
    const payloadBase64 = typeof Buffer !== 'undefined'
      ? Buffer.from(payloadBoc).toString('base64')
      : btoa(binary)

    return {
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [
        {
          address: senderJettonWalletAddress,
          amount: JETTON_FORWARD_TON,
          payload: payloadBase64
        }
      ]
    }
  } catch (e) {
    console.error('buildUsdtTransferTransaction error', e)
    return null
  }
}
