const logger = require('pino')()

const datastoreClient = require('../client/datastore-client')

const handler = {}

handler.handle = async function (webhookObject) {
    const webhookType = webhookObject.type

    if (webhookType === 'checkout.session.completed') {
        const username = webhookObject.data.object.customer_details.name
        const email = webhookObject.data.object.customer_details.email
        const id = webhookObject.data.object.id
        const objectType = webhookObject.data.object.object
        const status = webhookObject.data.object.status
        const clientReferenceId = webhookObject.data.object.client_reference_id

        let session = {
            sessionId: id,
            orderId: clientReferenceId,
            metadata: {
                username: username,
                email: email,
                id: id,
                objectType: objectType,
                status: status,
                clientReferenceId: clientReferenceId
            }
        }
        await datastoreClient.insert('session', session.sessionId, session)

        let order = await datastoreClient.findOne('order', clientReferenceId)

        order.state = 1
        await datastoreClient.update('order', order.orderId, order)
        logger.info(`[Order updated] ${order.orderId} ${order.username} ${order.dateTime} ${order.timePeriodOption} ${order.state}`)
    }
}

module.exports = handler