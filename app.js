const datastoreClient = require('./lib/client/datastore-client')

const fastify = require('fastify')({
    logger: {
        level: 'info'
    }
})

// init api
require('./lib/api/trail-api')(fastify)
require('./lib/api/newbird-api')(fastify)
require('./lib/api/stripe-api')(fastify)

fastify.get(`/health`, async (request, reply) => {
    reply.send({
        status: 'UP'
    })
})

const start = async () => {
    await datastoreClient.connect()

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
