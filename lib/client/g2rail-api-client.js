const timers = require('timers/promises')
const crypto = require('crypto')
const logger = require('pino')()
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

const ConfigProvider = require('../common/config-provider')
const g2railConfig = ConfigProvider.g2railConfig

const baseUrl = g2railConfig['host']['base-url']
const apiKey = g2railConfig['client']['api-key']
const secret = g2railConfig['client']['secret']

const client = {}

function getObjectFirstLevelParams(obj) {
    const params = new Map()

    for (let key in obj) {
        if (typeof obj[key] === 'string'
            || typeof obj[key] === 'number'
            || typeof obj[key] === 'boolean'
            || typeof obj[key] === 'bigint') {
            params.set(key, obj[key])
        }
    }

    return params
}

function toQuery(params) {
    let query = ''
    params.forEach((value, key) => {
        if (typeof value !== 'undefined' && typeof value !== 'object') {
            query += `${key}=${value.toString()}&`
        }
    })
    query = query.substring(0, query.length - 1)

    return query
}

function getHeaders(apiKey, secret, params) {
    const now = new Date()

    params.set('t', Math.floor(now.getTime() / 1000).toString())
    params.set('api_key', apiKey)

    const sortedParams = new Map([...params]
        .filter(([key, value]) => typeof value !== 'undefined' && typeof value !== 'object')
        .sort())

    let authStr = ''
    sortedParams.forEach((value, key) => {
        authStr += `${key}=${value.toString()}`
    })
    authStr += secret

    const md5 = crypto.createHash('md5')
    const hashedAuthStr = md5.update(authStr).digest('hex')

    return {
        'From': apiKey,
        'Content-Type': 'application/json',
        'Authorization': hashedAuthStr,
        'Date': now.toUTCString(),
        'Api-Locale': 'zh-TW'
    }
}

async function getAsyncResults(asyncKey) {
    const params = new Map([
        ['async_key', asyncKey],
    ])

    const response = await fetch(`${baseUrl}/api/v2/async_results/${params.get('async_key')}`, {
        headers: getHeaders(apiKey, secret, params)
    })

    return await response.json()
}

async function pollAsyncResults(asyncKey) {
    logger.info(`wating for async result for asyncKey: ${asyncKey}`)

    let resData = await getAsyncResults(asyncKey)

    if (!!resData.code && resData.code === 'async_not_ready') {
        await timers.setTimeout(3000)
        return await pollAsyncResults(asyncKey)
    } else {
        return resData
    }
}

client.searchOnlineSolutions = async function (from, to, date, time, duration, adult, child) {
    const params = new Map([
        ['from', from],
        ['to', to],
        ['date', date],
        ['time', time],
        ['duration', duration],
        ['adult', adult],
        ['child', child],
    ])

    const response = await fetch(`${baseUrl}/api/v2/online_solutions/?${toQuery(params)}`, {
        headers: getHeaders(apiKey, secret, params)
    })

    const resData = await response.json()

    const asyncResultsResData = await pollAsyncResults(resData.async)

    return asyncResultsResData
}

client.bookOnlineOrder = async function (order) {
    const params = getObjectFirstLevelParams(order)

    const response = await fetch(`${baseUrl}/api/v2/online_orders`, {
        method: 'post',
        body: JSON.stringify(order),
        headers: getHeaders(apiKey, secret, params)
    })

    const resData = await response.json()

    const asyncResultsResData = await pollAsyncResults(resData.async)

    return asyncResultsResData
}

client.confirmOnlineOrder = async function (onlineOrderId) {
    const params = new Map([
        ['online_order_id', onlineOrderId],
    ])

    const response = await fetch(`${baseUrl}/api/v2/online_orders/${onlineOrderId}/online_confirmations`, {
        method: 'post',
        body: JSON.stringify({}),
        headers: getHeaders(apiKey, secret, params)
    })

    const resData = await response.json()

    const asyncResultsResData = await pollAsyncResults(resData.async)

    return asyncResultsResData
}

client.downloadOnlineOrderTickets = async function (onlineOrderId) {
    const params = new Map([
        ['online_order_id', onlineOrderId],
    ])

    const response = await fetch(`${baseUrl}/api/v2/online_orders/${onlineOrderId}/online_tickets`, {
        headers: getHeaders(apiKey, secret, params)
    })

    const resData = await response.json()

    return resData
}

client.refundOnlineOrder = async function (onlineOrderId) {
    const params = new Map([
        ['online_order_id', onlineOrderId],
    ])

    const response = await fetch(`${baseUrl}/api/v2/online_orders/${onlineOrderId}/online_refunds`, {
        method: 'post',
        body: JSON.stringify({}),
        headers: getHeaders(apiKey, secret, params)
    })

    const resData = await response.json()

    const asyncResultsResData = await pollAsyncResults(resData.async)

    return asyncResultsResData
}

module.exports = client
