const axios = require('axios')
const hash = require('./hash')

module.exports = function (lb) {
  async function getSessionInfo(lubanAppId, lubanSessionKey) {
    let data = await lb.cache.get(`${lubanAppId}-${lubanSessionKey}`)
    try {
      data = JSON.parse(data)
    } catch (e) {}
    return data
  }

  async function getAccessToken(lubanAppId, platform = 'wx') {
    let app = await lb._getApp(lubanAppId)
    let appId, appSecret, apiUrl
    switch (platform) {
      case 'wx':
        appId = app.config_data.lubanConfig.wxAppId
        appSecret = app.config_data.lubanConfig.wxAppSecret
        apiUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
        break
      case 'mp':
        appId = app.config_data.lubanConfig.mpAppId
        appSecret = app.config_data.lubanConfig.mpAppSecret
        apiUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
        break
      case 'qq':
        appId = app.config_data.lubanConfig.qqAppId
        appSecret = app.config_data.lubanConfig.qqAppSecret
        apiUrl = `https://api.q.qq.com/api/getToken?grant_type=client_credential&appid=${appId}&secret=${appSecret}`
        break
      default:
        throw 'platform error'
    }
    let atKey = `${appId}_access_token`
    let at = await lb.cache.get(atKey)
    if (!at) {
      let res = await axios(apiUrl)
      at = res.data.access_token
      if (at) {
        await lb.cache.setEx(atKey, at, res.data.expires_in - 10)
      } else {
        throw 'get access token failed'
      }
    }
    return at
  }

  async function getSignInfo(lubanAppId, weburl) {
    let app = await lb._getApp(lubanAppId)
    // 默认是公众号平台
    let appId = app.config_data.lubanConfig.mpAppId
    let ticketKey = `${appId}_js_ticket`
    let jsTicket = await lb.cache.get(ticketKey)
    if (!jsTicket) {
      let at = await getAccessToken(lubanAppId, 'mp')
      let url = `https://api.weixin.qq.com/cgi-bin/ticket/getticket?access_token=${at}&type=jsapi`
      let wxResponse = (await axios(url)).data
      if (wxResponse.ticket) {
        await lb.cache.setEx(ticketKey, wxResponse.ticket, wxResponse.expires_in - 10)
        jsTicket = wxResponse.ticket
      } else {
        throw 'get ticket failed'
      }
    }
    let noncestr = Math.random().toString(36).substr(2, 15)
    let timestamp = parseInt(Date.now() / 1000)
    let rawStr = `jsapi_ticket=${jsTicket}&noncestr=${noncestr}&timestamp=${timestamp}&url=${weburl}`
    return {
      nonceStr: noncestr,
      timestamp,
      signature: hash(rawStr, 'sha1')
    }
  }

  return {
    resp,
    getSessionInfo,
    getAccessToken,
    getSignInfo
  }
}

function resp(body, statusCode = 200, headers = {}, isBase64Encoded = false) {
  if (body instanceof Buffer) {
    isBase64Encoded = true
    body = body.toString('base64')
  } else if (typeof body !== 'string') {
    if (!headers['content-type']) {
      headers['content-type'] = 'text/json'
    }
    body = JSON.stringify(body)
  }
  headers['Access-Control-Allow-Origin'] = '*'
  headers['Access-Control-Allow-Methods'] = 'put,post,delete,get,update'
  headers['Access-Control-Allow-Headers'] = 'lubansessionkey,lubanappid,content-type'
  headers['Access-Control-Allow-Credentials'] = true
  return {
    body,
    isBase64Encoded,
    headers,
    statusCode
  }
}
