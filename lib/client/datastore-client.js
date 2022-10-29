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
    // await redisClient.set(`${collection}:${key}`, valueStr)
    await redisClient.hSet(collection, key, valueStr)
}

client.get = async function (collection, key) {
    // let valueStr = await redisClient.get(`${collection}:${key}`)
    let valueStr = await redisClient.hGet(collection, key)
    return JSON.parse(valueStr)
}

client.getAll = async function (collection) {
    // return await redisClient.keys(`${collection}:*`)
    let entries = await redisClient.hGetAll(collection)

    let entryMap = new Map()

    for (let key in entries) {
        let value = JSON.parse(entries[key])
        entryMap.set(key, value)
    }

    return entryMap
}

module.exports = client
