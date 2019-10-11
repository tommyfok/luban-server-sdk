module.exports = function (redisInst) {
  return {
    get(key) {
      return new Promise((resolve, reject) => {
        redisInst.get(key, (err, result) => {
          if (err) {
            console.log('asyncGet failed', key, err)
            reject(err)
          } else {
            let _result = result
            if (typeof result === 'string') {
              try {
                _result = JSON.parse(result)
              } catch (e) {}
            }
            resolve(_result)
          }
        })
      })
    },
    set(key, value) {
      let _value = typeof value === 'string' ? value : JSON.stringify(value)
      return new Promise((resolve, reject) => {
        redisInst.set(key, _value, (err, result) => {
          if (err) {
            console.log('set cache failed', key, value, err)
            reject(err)
          } else {
            resolve(result)
          }
        })
      })
    },
    setEx(key, value, timeout = 7190) {
      let _value = typeof value === 'string' ? value : JSON.stringify(value)
      return new Promise((resolve, reject) => {
        redisInst.set(key, _value, 'EX', timeout, (err, result) => {
          if (err) {
            console.log('setEx failed', key, value, err)
            reject(err)
          } else {
            resolve(result)
          }
        })
      })
    }
  }
}
