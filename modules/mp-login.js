const uuidv4 = require('uuid/v4')
const assert = require('assert')

module.exports = async ({
  code,
  appid,
  luban
}) => {
  assert.ok(code, 'code required')
  assert.ok(appid, 'appid required')
  let appInfo = await luban._getApp(appid)
  let lubanConfig = appInfo.config_data.lubanConfig
  assert.ok(appInfo, 'cannot find app')
  let wxAppId = lubanConfig.mpAppId
  let wxAppSecret = lubanConfig.mpAppSecret
  assert.ok(wxAppId, 'mpAppId required')
  assert.ok(wxAppSecret, 'mpAppSecret required')

  // 获取登录用的access_token（网页授权access_token，不同普通access_token）
  let url = `https://api.weixin.qq.com/sns/oauth2/access_token?appid=${wxAppId}&secret=${wxAppSecret}&code=${code}&grant_type=authorization_code`
  let sessionData = (await axios(url)).data
  if (sessionData.errcode) {
    return luban.utils.resp({
      success: false,
      data: sessionData
    }, 400)
  }

  // 获取用户信息
  let userinfoUrl = `https://api.weixin.qq.com/sns/userinfo?access_token=${sessionData.access_token}&openid=${sessionData.openid}&lang=zh_CN`
  sessionData.user = (await axios(userinfoUrl)).data
  if (sessionData.user.errcode) {
    return luban.utils.resp({
      success: false,
      data: sessionData.user
    }, 400)
  }

  let userCacheKey = `${wxAppId}_luban_${sessionData.user.openid}`
  let sessionUser, dbUser

  // 看看缓存里面有没有用户信息，有的话就不读db了
  try {
    sessionUser = await luban.cache.get(userCacheKey)
    if (typeof sessionUser === 'string') {
      sessionUser = JSON.parse(sessionUser)
    }
  } catch (e) {}

  if (sessionUser) {
    // 缓存里面有USER信息
    // TODO:如果用户信息有变，则更新
    sessionData.user = sessionUser
  } else {
    // 缓存里面没有
    // 看看db里面有没有user，没有的话插入一下
    dbUser = (await luban.db.sys('luban_wx_user').where({
      wx_appid: wxAppId,
      openid: sessionData.user.openid
    }))[0]
    if (dbUser) {
      // 有用户，设置下session的userID就好了
      sessionData.user.id = dbUser.id
    } else {
      // 没有，则创建用户
      // 创建用户详情
      let userDetailId = (await luban.db.sys('luban_wx_user_detail').insert({
        detail: JSON.stringify(sessionData.user)
      }).returning('id'))[0]
      // 关联详情ID，写入user数据
      let newUserIdArr = await luban.db.sys('luban_wx_user').insert({
        appid,
        wx_appid: wxAppId,
        openid: sessionData.user.openid,
        unionid: sessionData.user.unionid,
        avatar: sessionData.user.headimgurl,
        avatar_raw: sessionData.user.headimgurl,
        nickname: sessionData.user.nickname,
        gender: sessionData.user.sex > 1 ? 0 : sessionData.user.sex,
        detail_id: userDetailId
      })
      sessionData.user.id = newUserIdArr[0]
    }
    // 存一下用户信息到缓存，保存一周(暂定，看压力情况)
    await luban.cache.setEx(userCacheKey, JSON.stringify(sessionData.user), 7 * 24 * 3600)
  }

  // 设置session缓存
  let uuid = uuidv4()
  sessionData.appid = appid
  sessionData.wx_appid = wxAppId
  await luban.cache.setEx([appid, uuid].join('-'), JSON.stringify(sessionData))

  // 删除敏感数据，输出session信息
  delete sessionData.access_token
  delete sessionData.refresh_token
  sessionData.lubansessionkey = uuid
  return luban.utils.resp({
    success: true,
    data: sessionData
  })
}
