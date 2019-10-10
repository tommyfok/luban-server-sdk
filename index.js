const uuidv4 = require('uuid/v4')
const Redis = require('ioredis')
const hash = require('./modules/hash')
const wxLogin = require('./modules/wx-login')
const mpLogin = require('./modules/mp-login')
const qqLogin = require('./modules/qq-login')

let RedisInstances = {}
let KnexInstances = {}
let Apps = {}

class Luban {
  constructor(config) {
    this.id = uuidv4()
    RedisInstances[this.id] = new Redis({
      host: config.redis.host,
      port: config.redis.port || 6379,
      password: config.redis.password
    })
    KnexInstances[this.id] = KnexInstances[this.id] || Knex({
      client: config.sysdb.client || 'mysql',
      connection: {
        database: config.sysdb.database,
        host: config.sysdb.host,
        port: config.sysdb.port,
        user: config.sysdb.username,
        password: config.sysdb.password,
        charset: config.sysdb.charset || 'utf8mb4'
      },
      pool: {
        min: config.sysdb.poolMin || 1,
        max: config.sysdb.poolMax || 20
      }
    })
    this.db = {}
    config.conns.forEach(conn => {
      let id = hash(JSON.stringify(conn))
      KnexInstances[id] = KnexInstances[id] || Knex({
        client: conn.client || 'mysql',
        connection: {
          database: conn.database,
          host: conn.host,
          port: conn.port,
          user: conn.username,
          password: conn.password,
          charset: conn.charset || 'utf8mb4'
        },
        pool: {
          min: conn.poolMin || 1,
          max: conn.poolMax || 20
        }
      })
      this.db[conn.name] = KnexInstances[id]
    })
    this.db.sys = KnexInstances[this.id]
    this.utils = require('./modules/utils')(this)
    let redisInst = RedisInstances[this.id]
    this.redis = redisInst
    this.cache = {
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

  async login(data, lubanAppId, platform = 'wx') {
    let luban = this
    switch (platform) {
      // 微信小程序
      case 'wx':
        return await wxLogin({
          code: data,
          appid: lubanAppId,
          luban
        })

      // 微信公众号
      case 'mp':
        return await mpLogin({
          code: data,
          appid: lubanAppId,
          luban
        })

      // QQ小程序
      case 'qq':
        return await qqLogin({
          code: data,
          appid: lubanAppId,
          luban
        })

      default:
        break
    }
  }

  async _getApp(appid) {
    let app = Apps[appid] || (await this.db.sys('app').where('appid', appid))[0]
    try {
      app.config_data = JSON.parse(app.config_data)
    } catch (e) {}
    try {
      app.config_data.lubanConfig = JSON.parse(app.config_data.lubanConfig)
    } catch (e) {}
    Apps[appid] = app
    return app
  }
}

module.exports = Luban
