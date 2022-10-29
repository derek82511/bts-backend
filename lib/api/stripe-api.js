const logger = require('pino')()

const basePath = '/stripe'

module.exports = function (fastify) {
    fastify.post(`${basePath}/api/webhook`, async (request, reply) => {
        stripeWebhookHandler.handle(request.body)
        reply.send({})
    })
}
