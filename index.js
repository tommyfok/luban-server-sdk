const uuidv4 = require('uuid/v4')
const Redis = require('ioredis')
const hash = require('./modules/hash')
const wxLogin = require('./modules/wx-login')
const mpLogin = require('./modules/mp-login')
const qqLogin = require('./modules/qq-login')
const wxHandleUserInfo = require('./modules/wx-handle-user-info')
const qqHandleUserInfo = require('./modules/qq-handle-user-info')
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
      if (conn.name && !(conn.name in this.db)) {
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
      }
    })
    this.db.sys = KnexInstances[this.id]
    this.utils = require('./modules/utils')(this)
    let redisInst = RedisInstances[this.id]
    this.redis = redisInst
    this.cache = require('./modules/simple-cache')(redisInst)
  }

  async login(data, lubanAppId, platform = 'wx') {
    let luban = this
    switch (platform) {
      case 'wx':
        return await wxLogin({
          code: data,
          appid: lubanAppId,
          luban
        })

      case 'mp':
        return await mpLogin({
          code: data,
          appid: lubanAppId,
          luban
        })

      case 'qq':
        return await qqLogin({
          code: data,
          appid: lubanAppId,
          luban
        })

      default:
        return this.utils.resp({
          success: false
        }, 400)
    }
  }

  async handleUserInfo({
    encryptedData,
    iv,
    lubanAppId,
    lubanSessionKey,
    platform = 'wx'
  }) {
    switch (platform) {
      case 'wx':
        return await wxHandleUserInfo({
          luban: this,
          encryptedData,
          iv,
          lubanAppId,
          lubanSessionKey
        })
      case 'qq':
        return await qqHandleUserInfo({
          luban: this,
          encryptedData,
          iv,
          lubanAppId,
          lubanSessionKey
        })
      default:
        return this.utils.resp({
          success: false
        }, 400)
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
