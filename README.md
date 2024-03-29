# luban-server-sdk

> 把鲁班云函数用到的方法封装成组件，方便调用

## use

### install

`npm i -S luban-server-sdk`

### require and use

```javascript
const Luban = require('luban-server-sdk')
const lb = new Luban({
  sysdb: {
    host: '',
    port: '',
    username: '',
    password: '',
    database: ''
  },
  conns: [{
    name: '',
    host: '',
    port: '',
    username: '',
    password: '',
    database: ''
  }],
  redis: {
    host: '',
    port: 6379,
    password: ''
  },
  lubanConfig: {
    // 公众号
    mpAppId: '',
    mpAppSecret: '',
    // 微信小程序
    wxAppId: '',
    wxAppSecret: '',
    // qq小程序
    qqAppId: '',
    qqAppSecret: ''
  },
  qcloud: {
    appId: '',
    secretId: '',
    secretKey: ''
  },
  cos: {}
})
```

## instance api

### utils

#### resp

> 构造腾讯云函数的返回体

```javascript
return lb.utils.resp(data, statusCode, headers, isBase64Encoded)
```

|参数名|类型|默认值|说明|
|:-----|:-----|:-----|:-----|
|data|Any|null|返回给请求方的数据|
|statusCode|Number|200|状态码|
|headers|Object|{}|返回头|
|isBase64Encoded|Boolean|false|是否base64编码（例如要返回图片，data就是图片的base64编码字符串，isBase64Encoded要设置为true）|

#### getSessionInfo

> 获取session信息

#### getAccessToken

> 获取access_token（公众号、小程序）

#### getSignInfo

> 获取js签名信息（公众号）

```javascript
let sessionInfo = await lb.utils.getSessionInfo(lubanAppId, lubanSessionKey)
let accessToken = await lb.utils.getAccessToken(lubanAppId, platform)
let signInfo = await lb.utils.getSignInfo(lubanAppId, weburl)
```

|参数名|类型|默认值|说明|
|:-----|:-----|:-----|:-----|
|lubanAppId|String||鲁班AppId|
|lubanSessionKey|String||鲁班SessionKey|
|platform|String|wx|wx=微信小程序，mp=微信公众号，qq=qq小程序|
|weburl|String||要获取签名的网页url|

### login

> 服务端统一登录接口

```javascript
let loginInfo = await lb.login(data, lubanAppId, platform)
```

|参数名|类型|默认值|说明|
|:-----|:-----|:-----|:-----|
|data|Object||登录所需的数据|
|lubanAppId|String||鲁班AppId|
|platform|String|wx|wx=微信小程序，mp=微信公众号，qq=qq小程序|

### handleUserInfo

> 服务端统一处理用户信息接口（小程序）

```javascript
let userInfo = await lb.handleUserInfo({
  encryptedData,
  iv,
  lubanAppId,
  lubanSessionKey,
  platform
})
```

|参数名|类型|默认值|说明|
|:-----|:-----|:-----|:-----|
|encryptedData|String||用户信息加密串|
|iv|String||加密向量|
|lubanAppId|String||鲁班AppId|
|lubanSessionKey|String||用户sessionkey|
|platform|String|wx|wx=微信小程序，qq=qq小程序|

### db

```javascript
// 1. 引用一个knex实例，其中aa是config中的连接名
let data = await lb.db.aa('table_name').select()

// 2. sys是一个固定连接名，用来获取系统db连接实例
// 例子：根据appid获取app信息
let app = (await lb.db.sys('app').where('appid', event.queryString.appid))[0]
```

### cache

#### get

> 通过一个key获取缓存数据

```javascript
let data = await lb.cache.get('KEY')
```

#### set

> 写入缓存

```javascript
await lb.cache.set('KEY', 'VALUE')
```

#### setEx

> 写入定时过期缓存

```javascript
await lb.cache.setEx('KEY', 'VALUE', 30) // 30秒自动过期
```

### cos

> 腾讯云对象存储操作

#### upload
