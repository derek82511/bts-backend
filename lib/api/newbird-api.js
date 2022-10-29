const logger = require('pino')()

const timers = require('timers/promises')
const moment = require('moment')
const uuid = require('uuid')

const datastoreClient = require('../client/datastore-client')
const mailClient = require('../client/mail-client')

const ConfigProvider = require('../common/config-provider')
const mailConfig = ConfigProvider.mailConfig

const supportEmail = mailConfig['sender']['support']

const basePath = '/newbird'

module.exports = function (fastify) {
    // newbird order
    // params:
    //   username: 使用者名稱
    //   email: 電子郵件
    //   dateTime: 購票日期 (yyyyMMDD)
    //   timePeriodOption: 時段 (0: 上午, 1: 下午)
    fastify.post(`${basePath}/api/order`, async (request, reply) => {
        const username = request.body.username
        const email = request.body.email
        const dateTime = request.body.dateTime
        const timePeriodOption = request.body.timePeriodOption

        let user = await datastoreClient.get('user', username)

        if (!user) {
            user = {
                username: username,
                email: email
            }
            await datastoreClient.set('user', user.username, user)
            logger.info(`[User created] ${user.username} ${user.email}`)
        }

        let order = {
            orderId: uuid.v4(),
            username: username,
            dateTime: dateTime,
            timePeriodOption: timePeriodOption,
            state: 0
        }
        await datastoreClient.set('order', order.orderId, order)
        logger.info(`[Order created] ${order.orderId} ${order.username} ${order.dateTime} ${order.timePeriodOption} ${order.state}`)

        reply.send({
            code: '0000',
            data: {
                orderId: order.orderId
            }
        })
    })

    // newbird order commit
    // params:
    //   username: 使用者名稱
    //   orderId: 訂單編號
    fastify.post(`${basePath}/api/order/commit`, async (request, reply) => {
        const username = request.body.username
        const orderId = request.body.orderId

        let user = await datastoreClient.get('user', username)

        if (!user) {
            return reply.send({
                code: '9999',
                message: 'User not exist'
            })
        }

        let order = await datastoreClient.get('order', orderId)

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
        if (order.username !== user.username) {
            return reply.send({
                code: '9999',
                message: 'Order User mismatch'
            })
        }

        let tryTime = 0
        while (true) {
            if (tryTime > 20) {
                return reply.send({
                    code: '9999',
                    message: 'Order not paid'
                })
            }

            if (order.state === 1 || order.state === 2) {
                break
            }

            await timers.setTimeout(3000)
            order = await datastoreClient.get('order', orderId)
            tryTime++
        }

        order.state = 2

        await datastoreClient.set('order', order.orderId, order)
        logger.info(`[Order updated] ${order.orderId} ${order.username} ${order.dateTime} ${order.timePeriodOption} ${order.state}`)

        // send mail
        sendOrderSuccessMail(order, user)

        reply.send({
            code: '0000',
            data: {}
        })
    })

    fastify.get(`${basePath}/api/order/commit`, async (request, reply) => {
        const sessionId = request.query.sessionId

        let session = await datastoreClient.get('session', sessionId)

        let trySessionTime = 0
        while (true) {
            if (trySessionTime > 20) {
                return reply.send({
                    code: '9999',
                    message: 'Session not sync'
                })
            }

            if (session) {
                break
            }

            await timers.setTimeout(3000)
            session = await datastoreClient.get('session', sessionId)
            trySessionTime++
        }

        let order = await datastoreClient.get('order', session.orderId)

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

        let tryTime = 0
        while (true) {
            if (tryTime > 20) {
                return reply.send({
                    code: '9999',
                    message: 'Order not paid'
                })
            }

            if (order.state === 1 || order.state === 2) {
                break
            }

            await timers.setTimeout(3000)
            order = await datastoreClient.get('order', orderId)
            tryTime++
        }

        order.state = 2

        await datastoreClient.set('order', order.orderId, order)
        logger.info(`[Order updated] ${order.orderId} ${order.username} ${order.dateTime} ${order.timePeriodOption} ${order.state}`)

        let user = await datastoreClient.get('user', order.username)

        // send mail
        sendOrderSuccessMail(order, user)

        reply.send(`親愛的 ${order.username} 您好，付款成功，請去您的信箱收取信件。`)
    })
}

async function sendOrderSuccessMail(order, user) {
    const subject = '新天鵝堡購票成功通知'
    const body =
        `<b>親愛的 ${order.username} 您好，</b><br/>` +
        `<b>您的入場時段為台灣時間 ${moment(order.dateTime).format('yyyy/MM/DD')} 的${order.timePeriodOption === 0 ? '上午' : '下午'}</b><br/>` +
        `<b>您的票號為 ${order.orderId}</b>`

    const messageId = await mailClient.send(supportEmail, user.email, subject, body)
    logger.info(`[Order email sent] ${order.orderId} ${order.username} ${user.email} ${messageId}`)
}
