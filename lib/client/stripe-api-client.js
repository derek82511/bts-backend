const timers = require('timers/promises')
const crypto = require('crypto')
const logger = require('pino')()
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args))

const ConfigProvider = require('../common/config-provider')
const stripeConfig = ConfigProvider.stripeConfig

const baseUrl = stripeConfig['stripe']['base-url']
const username = stripeConfig['stripe']['username']

const client = {}

function getHeaders(){
    return {
        'Authorization':'Basic ' + Buffer.from(username+":").toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    }
}

function formBodyGenerate(obj){
    return formBody = Object.keys(obj).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(obj[key])).join('&');
}

client.getPrices = async function () {
    const response = await fetch(`${baseUrl}/v1/prices`, {
        method: 'get',
        headers: getHeaders()
    })
    return await response.json()
}

client.createPrice = async function (unitAmount, currency, productId) {
    const price = {
        'unit_amount': unitAmount,
        'currency': currency,
        'product': productId
    }
    const response = await fetch(`${baseUrl}/v1/prices`, {
        method: 'post',
        headers: getHeaders(),
        body: formBodyGenerate(price)
    })
    return await response.json()
}

client.getProducts = async function () {
    const response = await fetch(`${baseUrl}/v1/products`, {
        method: 'get',
        headers: getHeaders()
    })
    return await response.json()
}

client.createProduct = async function (product) {
    const body = {
        'name': product.productName,
        'images[0]': product.image,
        'description': product.description
    }
    const response = await fetch(`${baseUrl}/v1/products`, {
        method: 'post',
        headers: getHeaders(),
        body: formBodyGenerate(body)
    })
    return await response.json()
}

client.createPaymentLink = async function (priceId, quantity) {
    const paymentLink = {
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': quantity,
        'after_completion[type]': 'redirect',
        'after_completion[redirect][url]': 'https://bts4k.techpractice.online/newbird/api/order/commit?sessionId={CHECKOUT_SESSION_ID}'
    }

    const response = await fetch(`${baseUrl}/v1/payment_links`, {
        method: 'post',
        headers: getHeaders(),
        body: formBodyGenerate(paymentLink)
    })
    return await response.json()
}

client.createPaymentLinkByProduct = async function(product, price){
    const resProduct  = await client.createProduct(product)
    console.log(price)
    const resPrice = await client.createPrice(price * 100, 'usd', resProduct.id)
    const resPaymentLink = await client.createPaymentLink(resPrice.id, 1)
    return await resPaymentLink.url
}


module.exports = client
