const logger = require('pino')()

const moment = require('moment')
const uuid = require('uuid')

const datastoreClient = require('../client/datastore-client')
const mailClient = require('../client/mail-client')
const g2railAPIClient = require('../client/g2rail-api-client')
const stripeApiClient = require('../client/stripe-api-client');

const ConfigProvider = require('../common/config-provider')
const mailConfig = ConfigProvider.mailConfig

const supportEmail = mailConfig['sender']['support']
const bossEmail = mailConfig['sender']['boss']

const basePath = '/newbird'

module.exports = function (fastify) {
    fastify.get(`${basePath}/api/product`, async (request, reply) => {
        let products = await datastoreClient.findByCondition('product', { active: 1 })

        reply.send(products)
    })

    fastify.get(`${basePath}/api/station`, async (request, reply) => {
        const country = request.query.country
        const city = request.query.city

        let stations = await datastoreClient.findByCondition('station', { country: country, city: city })

        reply.send(stations)
    })

    fastify.post(`${basePath}/api/order`, async (request, reply) => {
        const username = request.body.username
        const email = request.body.email
        const dateTime = request.body.dateTime
        const timePeriodOption = request.body.timePeriodOption
        const quantity = request.body.quantity
        const isAddExtra = request.body.isAddExtra
        const productId = request.body.productId
        const bookingCode = request.body.bookingCode

        let user = await datastoreClient.findOne('user', username)

        if (!user) {
            user = {
                username: username,
                email: email
            }
            await datastoreClient.insert('user', user.username, user)
            logger.info(`[User created] ${user.username} ${user.email}`)
        }

        let trailOrder
        let bookOrderResult

        if (isAddExtra) {
            // train
            trailOrder = {
                trailOrderId: uuid.v4(),
                bookOrder: request.body
            }
            await datastoreClient.insert('trail-order', trailOrder.trailOrderId, trailOrder)
            logger.info(`[TrailOrder created] ${trailOrder.trailOrderId}`)

            let passenger = {
                "last_name": "Chang",
                "first_name": user.username,
                "birthdate": "1993-09-01",
                "passport": "A123456789",
                "email": user.email,
                "phone": "0928750026",
                "gender": "male"
            }

            let bookOnlineOrderReqBody = {
                passengers: [],
                "sections": [
                    bookingCode
                ],
                "seat_reserved": true
            }

            for (i = 0; i < quantity; i++) {
                bookOnlineOrderReqBody.passengers.push(passenger)
            }

            bookOnlineOrderReqBody.memo = trailOrder.trailOrderId

            bookOrderResult = await g2railAPIClient.bookOnlineOrder(bookOnlineOrderReqBody)

            trailOrder.bookOrderResult = bookOrderResult
            await datastoreClient.update('trail-order', trailOrder.trailOrderId, trailOrder)
            logger.info(`[TrailOrder updated] ${trailOrder.trailOrderId}`)

            bookOrderResult.trailOrderId = trailOrder.trailOrderId
            // train end
        }

        let product = await datastoreClient.findOne('product', productId)

        let totalPrice = 0

        totalPrice += product.price * quantity
        if (isAddExtra) totalPrice += bookOrderResult.payment_price.cents / 100

        let order = {
            orderId: uuid.v4(),
            username: username,
            dateTime: dateTime,
            timePeriodOption: timePeriodOption,
            quantity: quantity,
            isAddExtra: isAddExtra,
            state: 0,
            productId: product.productId,
            productName: product.productName,
            trailOrderId: isAddExtra ? trailOrder.trailOrderId : '',
            totalPrice: totalPrice
        }
        await datastoreClient.insert('order', order.orderId, order)
        logger.info(`[Order created] ${order.orderId} ${order.username} ${order.dateTime} ${order.timePeriodOption} ${order.state}`)

        let paymentLinkUrl = await stripeApiClient.createPaymentLinkByProduct(product, totalPrice)

        let data = {
            orderId: order.orderId,
            totalPrice: totalPrice,
            paymentLinkUrl: paymentLinkUrl
        }
        if (isAddExtra) data.bookOrderResult = bookOrderResult

        reply.send({
            code: '0000',
            data: data
        })
    })

    fastify.get(`${basePath}/api/order/commit`, async (request, reply) => {
        const sessionId = request.query.sessionId

        let session = await datastoreClient.findOne('session', sessionId)

        if (!session) {
            return reply.send({
                code: '9999',
                message: 'Session not sync'
            })
        }

        let order = await datastoreClient.findOne('order', session.orderId)

        if (!order) {
            return reply.send({
                code: '9999',
                message: 'Order not exist'
            })
        }
        if (order.state !== 1) {
            return reply.send({
                code: '9999',
                message: 'Order state invalid'
            })
        }
        if (order.state === 0) {
            return reply.send({
                code: '9999',
                message: 'Order not paid'
            })
        }

        //train
        const trailOrderId = order.trailOrderId

        let trailOrder = await datastoreClient.findOne('trail-order', trailOrderId)

        const confirmOrderResult = await g2railAPIClient.confirmOnlineOrder(trailOrder.bookOrderResult.id)
        // logger.info(resData)

        trailOrder.confirmOrderResult = confirmOrderResult
        await datastoreClient.update('trail-order', trailOrder.trailOrderId, trailOrder)
        logger.info(`[TrailOrder updated] ${trailOrder.trailOrderId}`)

        //train end
        //train
        const downloadOrderTicketsResult = await g2railAPIClient.downloadOnlineOrderTickets(trailOrder.bookOrderResult.id)
        // logger.info(resData)

        trailOrder.downloadOrderTicketsResult = downloadOrderTicketsResult
        await datastoreClient.update('trail-order', trailOrder.trailOrderId, trailOrder)
        logger.info(`[TrailOrder updated] ${trailOrder.trailOrderId}`)
        //train end

        order.state = 2

        await datastoreClient.update('order', order.orderId, order)
        logger.info(`[Order updated] ${order.orderId} ${order.username} ${order.dateTime} ${order.timePeriodOption} ${order.state}`)

        let user = await datastoreClient.findOne('user', order.username)

        // send mail
        sendOrderSuccessMail(order, user)

        // reply.send(`????????? ${order.username} ?????????????????????????????????????????????????????????`)
        reply.type('text/html').send(`<html>
            <head>
               <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
            </head>
            <body>
                <p>????????? ${order.username} ?????????????????????</p>
                <a href="btsk://order?orderId=${order.orderId}">?????????APP</a>
            </body></html>`)
    })

    fastify.get(`${basePath}/api/order`, async (request, reply) => {
        const username = request.query.username

        let orders = await datastoreClient.findByCondition('order', { username: username })

        reply.send({
            code: '0000',
            data: orders
        })
    })

    fastify.get(`${basePath}/api/test`, async (request, reply) => {
        //

        reply.send({})
    })

    fastify.post(`${basePath}/api/console/sendOrder`, async (request, reply) => {
        const orderId = request.body.orderId
        const filename = request.body.filename
        const content = request.body.content

        let order = await datastoreClient.findOne('order', orderId)
        let user = await datastoreClient.findOne('user', order.username)

        const subject = `${order.productName} ????????????????????????`
        const body =
            `<b>????????? ${order.username} ?????????</b><br/>` +
            `<b>????????????????????????????????? ${moment(order.dateTime).format('yyyy/MM/DD')} ???${order.timePeriodOption === 0 ? '??????' : '??????'}</b><br/>` +
            `<b>??????????????? ${order.orderId}</b>`

        const messageId = await mailClient.send(supportEmail, user.email, subject, body, {
            filename: filename,
            content: content
        })
        logger.info(`[Order email sent] ${order.orderId} ${order.username} ${user.email} ${messageId}`)

        reply.send({})
    })

    fastify.post(`${basePath}/api/console/sendTrainOrder`, async (request, reply) => {
        const subject = '???????????????????????????'
        const body =
            `<b>????????? Danny ?????????</b><br/>` +
            `<b>????????????????????????????????????</b><br/>` +
            `<b>??????????????? cnewodijeew</b>`

        const messageId = await mailClient.send(supportEmail, 'derek82511@gmail.com', subject, body)
        logger.info(`[Train Order email sent] ${order.orderId} ${order.username} ${user.email} ${messageId}`)

        reply.send({})
    })

    fastify.get(`${basePath}/api/console/getAll`, async (request, reply) => {
        const collection = request.query.collection

        let data = await datastoreClient.findAll(collection)

        reply.send({
            data: data
        })
    })
}

async function sendOrderSuccessMail(order, user) {
    const username = 'KenCorp'
    const subject = `${order.productName} ??????????????????`
    const body =
        `<b>[BTS4K ?????????] ??????????????????</b><br/>` +
        `<b>???????????????${username}</b><br/>` +
        `<b>??????????????????????????? ${moment(order.dateTime).format('yyyy/MM/DD')} ???${order.timePeriodOption === 0 ? '??????' : '??????'}</b><br/>` +
        `<b>???????????????${order.orderId}</b>`

    const messageId = await mailClient.send(supportEmail, bossEmail, subject, body)
    logger.info(`[Order email sent (to boss)] ${order.orderId} ${order.username} ${user.email} ${messageId}`)
}
