const uuidv4 = require('uuid/v4')
const Redis = require('ioredis')
const hash = require('./modules/hash')

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
