const crypto = require('crypto')

module.exports = (content, algo = 'md5', outputType = 'hex') => {
    if (typeof content !== 'string') {
        content = JSON.stringify(content)
    }
    let hash = crypto.createHash(algo)
    hash.update(content)
    return hash.digest(outputType)
}
