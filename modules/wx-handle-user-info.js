const DECRYPT = require('./decrypt')
const assert = require('assert')

module.exports = async function ({
  encryptedData,
  iv,
  lubanAppId,
  lubanSessionKey,
  luban
}) {
  assert.ok(lubanAppId, 'lubanAppId required')
  assert.ok(encryptedData, 'encryptedData required')
  assert.ok(iv, 'iv required')
  assert.ok(lubanSessionKey, 'lubanSessionKey required')
  assert.ok(luban, 'luban required')

  // 获取sessionkey进行解密
  let userSessionRedisKey = [lubanAppId, lubanSessionKey].join('-')
  let userWxSessKey, sessData, wxAppId
  sessData = await luban.cache.get(userSessionRedisKey)
  userWxSessKey = sessData.session_key
  wxAppId = sessData.wx_appid
  if (!userWxSessKey) {
    return luban.utils.resp({
      success: false,
      message: 'SESSIONKEY_REQUIRED'
    }, 401)
  }

  // 获取到sessionkey之后，就可以进行解密
  let pc = new DECRYPT(wxAppId, userWxSessKey)
  let dd = pc.decryptData(encryptedData, iv)
  if (typeof dd === 'string') {
    dd = JSON.parse(dd)
  }
  // 查一下user表里面有没有，有就更新下信息，没有就插入一下（虽然不太可能没有）
  let user = (await luban.db.sys('luban_wx_user').where({
    wx_appid: wxAppId,
    openid: sessData.openid
  }))[0]
  if (!user) {
    // 没有用户，那就创建一个userdetail先
    let userDetailId = (await luban.db.sys('luban_wx_user_detail').insert({
      detail: JSON.stringify(dd)
    }).returning('id'))[0]
    user = {
      openid: sessData.openid,
      unionid: sessData.unionid,
      appid: lubanAppId,
      gender: dd.gender,
      wx_appid: wxAppId,
      detail_id: userDetailId,
      nickname: dd.nickName,
      avatar: dd.avatarUrl,
      avatar_raw: dd.avatarUrl
    }
    let newUserIdArr = await luban.db.sys('luban_wx_user').insert(user)
    dd.id = newUserIdArr[0]
  } else {
    // 记得加上id字段
    dd.id = user.id
    // 如果有user，更新下user和user_detail
    await luban.db.sys('luban_wx_user').where('id', user.id).update({
      gender: dd.gender,
      wx_appid: wxAppId,
      nickname: dd.nickName,
      avatar: dd.avatarUrl,
      avatar_raw: dd.avatarUrl
    })
    await luban.db.sys('luban_wx_user_detail').where('id', user.detail_id).update({
      detail: JSON.stringify(dd)
    })
  }
  // 更新redis
  await luban.cache.setEx(`${wxAppId}_luban_${dd.openId}`, dd, 7 * 24 * 3600)
  return luban.utils.resp(dd)
}
