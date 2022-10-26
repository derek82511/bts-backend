const fs = require('fs'),
    YAML = require('yamljs')

module.exports = file => {
    return YAML.parse(fs.readFileSync(file).toString())
}
