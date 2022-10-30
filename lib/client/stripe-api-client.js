const timers = require('timers/promises')
const crypto = require('crypto')
const logger = require('pino')()
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

const ConfigProvider = require('../common/config-provider')
const stripeConfig = ConfigProvider.stripeConfig

console.log(stripeConfig)

const baseUrl = stripeConfig['stripe']['base-url']
const username = stripeConfig['stripe']['username']

const client = {}

function getHeaders(){
    return {
        'Authorization':'Basic ' + Buffer.from(username+":").toString('base64')
    }
}

client.getPrices = async function () {
    const response = await fetch(`${baseUrl}/v1/prices`, {
        method: 'get',
        headers: getHeaders()
    })

    return await response.json()
}

module.exports = client
