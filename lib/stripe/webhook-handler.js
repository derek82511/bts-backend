
const mailgunAPIClient = require('../client/mailgun-client')
const handler = {}

handler.handle = async function(webhookObject){
    const webhookType = webhookObject.type
    if(webhookType == 'checkout.session.completed'){
        const username = webhookObject.data.object.customer_details.name
        const email = webhookObject.data.object.customer_details.email
        const id = webhookObject.data.object.id
        const objectType = webhookObject.data.object.object
        const status = webhookObject.data.object.status

        mailgunAPIClient.send(username, email)
    }
}

module.exports = handler