const uuidv4 = require('uuid/v4')
const assert = require('assert')
const axios = require('axios')

module.exports = async function ({
  code,
  appid,
  luban
}) {
  assert.ok(code, 'code required')
  assert.ok(appid, 'appid required')
  let appInfo = await luban._getApp(appid)
  assert.ok(appInfo, 'cannot find app')
  let {
    wxAppId,
    wxAppSecret
  } = appInfo.config_data.lubanConfig
  assert.ok(wxAppId, 'wxAppId required')
  assert.ok(wxAppSecret, 'wxAppSecret required')
  let url = `https://api.weixin.qq.com/sns/jscode2session?appid=${wxAppId}&secret=${wxAppSecret}&js_code=${code}&grant_type=authorization_code`
  let {
    data
  } = await axios(url)
  if (data.errcode) {
    return luban.utils.resp({
      success: false,
      data
    }, 400)
  } else {
    let uuid = uuidv4()
    data.appid = appid
    data.wx_appid = wxAppId
    // 设置session缓存
    await luban.cache.setEx([appid, uuid].join('-'), JSON.stringify(data))
    let userKey = `${wxAppId}_luban_${data.openid}`
    try {
      // 首先从redis里面查用户信息
      data.user = JSON.parse(await asyncGet(userKey))
    } catch (e) {}
    if (!data.user) {
      // redis里面没有数据，从db里面查
      let user = (await luban.db.sys('luban_wx_user').where({
        wx_appid: wxAppId,
        openid: data.openid
      }))[0]
      try {
        data.user = JSON.parse((await luban.db.sys('luban_wx_user_detail').where('id', user.detail_id))[0]).detail
        data.user.id = user.id
      } catch (e) {}
      // 如果还是没有data.user，那就把用户存到db里面
      if (!data.user) {
        data.user = {
          openId: data.openid,
          unionId: data.unionid
        }
        // 创建用户详情
        let userDetailId = (await luban.db.sys('luban_wx_user_detail').insert({
          detail: JSON.stringify(data.user)
        }).returning('id'))[0]
        // 关联详情ID，写入user数据
        let newUserIdArr = await luban.db.sys('luban_wx_user').insert({
          appid,
          wx_appid: wxAppId,
          openid: data.openid,
          unionid: data.unionid,
          detail_id: userDetailId
        })
        data.user.id = newUserIdArr[0]
      }
      // 保存用户信息到redis，暂存一周
      await luban.cache.setEx(userKey, JSON.stringify(data.user), 7 * 24 * 3600)
    }

    // 删除session_key，用lubansessionkey替换后再输出
    delete data.session_key
    data.lubansessionkey = uuid
    return luban.utils.resp({
      success: true,
      data
    })
  }
}
