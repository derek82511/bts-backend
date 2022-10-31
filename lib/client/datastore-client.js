var nedb = require('nedb')

const db = {}

db['user'] = new nedb(__dirname + '/../../../bts-backend-db/.datastore/user.db')
db['order'] = new nedb(__dirname + '/../../../bts-backend-db/.datastore/order.db')
db['session'] = new nedb(__dirname + '/../../../bts-backend-db/.datastore/session.db')
db['trail-order'] = new nedb(__dirname + '/../../../bts-backend-db/.datastore/trail-order.db')
db['product'] = new nedb(__dirname + '/../../../bts-backend-db/.datastore/product.db')
db['station'] = new nedb(__dirname + '/../../../bts-backend-db/.datastore/station.db')

const client = {}

client.connect = function () {
    db['user'].loadDatabase()
    db['order'].loadDatabase()
    db['session'].loadDatabase()
    db['trail-order'].loadDatabase()
    db['product'].loadDatabase()
    db['station'].loadDatabase()
}

client.insert = async function (collection, key, value) {
    value._id = key
    return new Promise((resolve, reject) => {
        db[collection].insert(value, function (err, newDoc) {
            if (err) {
                console.log(err)
                reject(err)
            } else {
                resolve(newDoc)
            }
        })
    })
}

client.update = async function (collection, key, value) {
    value._id = key
    return new Promise((resolve, reject) => {
        db[collection].update({ _id: key }, value, function (err, numReplaced) {
            if (err) {
                console.log(err)
                reject(err)
            } else {
                resolve()
            }
        })
    })
}

client.findOne = async function (collection, key) {
    return new Promise((resolve, reject) => {
        db[collection].findOne({ _id: key }, function (err, doc) {
            if (err) {
                console.log(err)
                reject(err)
            } else {
                resolve(doc)
            }
        })
    })
}

client.findByCondition = async function (collection, condition) {
    return new Promise((resolve, reject) => {
        db[collection].find(condition, function (err, docs) {
            if (err) {
                console.log(err)
                reject(err)
            } else {
                resolve(docs)
            }
        })
    })
}

client.findAll = async function (collection) {
    return new Promise((resolve, reject) => {
        db[collection].find({}, function (err, docs) {
            if (err) {
                console.log(err)
                reject(err)
            } else {
                resolve(docs)
            }
        })
    })
}

module.exports = client
