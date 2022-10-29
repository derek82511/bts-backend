const yamlReader = require('./yaml-reader')

module.exports = {
    g2railConfig: yamlReader(__dirname + '/../../config/g2rail.yaml'),
    mailConfig: yamlReader(__dirname + '/../../config/mail.yaml')
}
