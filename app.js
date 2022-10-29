const logger = require('pino')()

const fastify = require('fastify')({
    logger: {
        level: 'info'
    }
})

const g2railAPIClient = require('./lib/client/g2rail-api-client')
const stripeWebhookHandler = require('./lib/stripe/webhook-handler')

fastify.get('/api/solutions', async (request, reply) => {
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

fastify.post('/api/order', async (request, reply) => {
    const resData = await g2railAPIClient.bookOnlineOrder(request.body)
    // logger.info(resData)

    reply.send(resData)
})

fastify.post('/api/order/confirm', async (request, reply) => {
    const orderId = request.body.orderId

    const resData = await g2railAPIClient.confirmOnlineOrder(orderId)
    // logger.info(resData)

    reply.send(resData)
})

fastify.get('/api/order/tickets', async (request, reply) => {
    const orderId = request.query['orderId']

    const resData = await g2railAPIClient.downloadOnlineOrderTickets(orderId)
    // logger.info(resData)

    reply.send(resData)
})

fastify.post('/api/order/refund', async (request, reply) => {
    const orderId = request.body.orderId

    const resData = await g2railAPIClient.refundOnlineOrder(orderId)
    // logger.info(resData)

    reply.send(resData)
})

fastify.post('/api/stripe/webhook', async (request, reply) => {    
    stripeWebhookHandler.handle(request.body)
    reply.send({})
})

const start = async () => {
    try {
        await fastify.listen({
            port: 3000,
            hostname: '0.0.0.0',
        })
    } catch (err) {
        fastify.log.error(err)
        process.exit(1)
    }
}

start()
