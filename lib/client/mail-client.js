const nodemailer = require('nodemailer')

const ConfigProvider = require('../common/config-provider')
const mailConfig = ConfigProvider.mailConfig

const host = mailConfig['smtp']['host']
const port = mailConfig['smtp']['port']
const secure = false
const user = mailConfig['smtp']['user']
const pass = mailConfig['smtp']['pass']

const client = {}

const transporter = nodemailer.createTransport({
    host: host,
    port: port,
    secure: secure,
    auth: {
        user: user,
        pass: pass
    },
})

client.send = async function (from, to, subject, body) {
    const info = await transporter.sendMail({
        from: from,
        to: to,
        subject: subject,
        html: body,
    })

    return info.messageId
}

module.exports = client
