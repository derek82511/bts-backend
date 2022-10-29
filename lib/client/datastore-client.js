const redis = require('redis')

const ConfigProvider = require('../common/config-provider')
const redisConfig = ConfigProvider.redisConfig

const host = redisConfig['host']
const port = redisConfig['port']

const redisClient = redis.createClient({
    socket: {
        host: host,
        port: port
    }
})

redisClient.on('error', err => {
    console.log('Error ' + err)
})

const client = {}

client.connect = async function () {
    await redisClient.connect()
}

client.set = async function (collection, key, value) {
    let valueStr = JSON.stringify(value)
    await redisClient.set(`${collection}:${key}`, valueStr)
}

client.get = async function (collection, key) {
    let valueStr = await redisClient.get(`${collection}:${key}`)
    return JSON.parse(valueStr)
}

client.getAll = async function (collection) {
    let entries = {}

    let keys = await redisClient.keys(`${collection}:*`)

    for (let i = 0, len = keys.length; i < len; i++) {
        let valueStr = await redisClient.get(keys[i])
        entries[keys[i]] = JSON.parse(valueStr)
    }

    return entries
}

module.exports = client
