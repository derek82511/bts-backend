const logger = require('pino')()

const uuid = require('uuid')

const datastoreClient = require('../client/datastore-client')
const g2railAPIClient = require('../client/g2rail-api-client')

const basePath = '/trail'

module.exports = function (fastify) {
    fastify.get(`${basePath}/api/solutions`, async (request, reply) => {
        const from = request.query['from']
        const to = request.query['to']
        const date = request.query['date']
        const time = request.query['time']
        const duration = request.query['duration']
        const adult = request.query['adult']
        const child = request.query['child']

        const resData = await g2railAPIClient.searchOnlineSolutions(from, to, date, time, duration, adult, child)
        // const resData = await g2railAPIClient.searchOnlineSolutions('BERLIN', 'FRANKFURT', '2022-10-28', '10:00', 1, 0)
        // logger.info(resData)

        reply.send(resData)
    })

    fastify.post(`${basePath}/api/order`, async (request, reply) => {
        let trailOrder = {
            trailOrderId: uuid.v4(),
            bookOrder: request.body
        }
        await datastoreClient.insert('trail-order', trailOrder.trailOrderId, trailOrder)
        logger.info(`[TrailOrder created] ${trailOrder.trailOrderId}`)

        let bookOnlineOrderReqBody = request.body
        bookOnlineOrderReqBody.memo = trailOrder.trailOrderId

        const resData = await g2railAPIClient.bookOnlineOrder(bookOnlineOrderReqBody)
        // logger.info(resData)

        let bookOrderResult = resData

        trailOrder.bookOrderResult = bookOrderResult
        await datastoreClient.update('trail-order', trailOrder.trailOrderId, trailOrder)
        logger.info(`[TrailOrder updated] ${trailOrder.trailOrderId}`)

        bookOrderResult.trailOrderId = trailOrder.trailOrderId

        reply.send(bookOrderResult)
    })

    fastify.post(`${basePath}/api/order/confirm`, async (request, reply) => {
        const trailOrderId = request.body.trailOrderId

        let trailOrder = await datastoreClient.findOne('trail-order', trailOrderId)

        const resData = await g2railAPIClient.confirmOnlineOrder(trailOrder.bookOrderResult.id)
        // logger.info(resData)

        let confirmOrderResult = resData

        trailOrder.confirmOrderResult = confirmOrderResult
        await datastoreClient.update('trail-order', trailOrder.trailOrderId, trailOrder)
        logger.info(`[TrailOrder updated] ${trailOrder.trailOrderId}`)

        confirmOrderResult.trailOrderId = trailOrder.trailOrderId

        reply.send(confirmOrderResult)
    })

    fastify.get(`${basePath}/api/order/tickets`, async (request, reply) => {
        const trailOrderId = request.query['trailOrderId']

        let trailOrder = await datastoreClient.findOne('trail-order', trailOrderId)

        const resData = await g2railAPIClient.downloadOnlineOrderTickets(trailOrder.bookOrderResult.id)
        // logger.info(resData)

        let downloadOrderTicketsResult = resData

        trailOrder.downloadOrderTicketsResult = downloadOrderTicketsResult
        await datastoreClient.update('trail-order', trailOrder.trailOrderId, trailOrder)
        logger.info(`[TrailOrder updated] ${trailOrder.trailOrderId}`)

        reply.send({
            trailOrderId: trailOrder.trailOrderId,
            tickets: downloadOrderTicketsResult
        })
    })

    fastify.post(`${basePath}/api/order/refund`, async (request, reply) => {
        const trailOrderId = request.body.trailOrderId

        let trailOrder = await datastoreClient.findOne('trail-order', trailOrderId)

        const resData = await g2railAPIClient.refundOnlineOrder(trailOrder.bookOrderResult.id)
        // logger.info(resData)

        let refundOrderResult = resData

        trailOrder.refundOrderResult = refundOrderResult
        await datastoreClient.update('trail-order', trailOrder.trailOrderId, trailOrder)
        logger.info(`[TrailOrder updated] ${trailOrder.trailOrderId}`)

        refundOrderResult.trailOrderId = trailOrder.trailOrderId

        reply.send(refundOrderResult)
    })

    fastify.get(`${basePath}/api/order`, async (request, reply) => {
        const trailOrderId = request.query['trailOrderId']

        let trailOrder = await datastoreClient.findOne('trail-order', trailOrderId)

        reply.send(trailOrder)
    })
}