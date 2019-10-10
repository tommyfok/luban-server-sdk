# luban-server-sdk

> 把鲁班云函数用到的方法封装成组件，方便调用

## use

### install

`npm i -S luban-server-sdk`

### require and use

```javascript
const Luban = require('luban-server-sdk')
const lb = new Luban(config)
```

## instance api

### utils

#### resp 返回数据给请求方

```javascript
return lb.utils.resp(data, statusCode, headers, isBase64Encoded)
```
|参数名|类型|默认值|说明|
|:-----|:-----|:-----|:-----|
|data|Any|null|返回给请求方的数据|
|statusCode|Number|200|状态码|
|headers|Object|{}|返回头|
|isBase64Encoded|Boolean|false|是否base64编码（例如要返回图片，data就是图片的base64编码字符串，isBase64Encoded要设置为true）|

#### getSessionInfo 获取session信息
#### getAccessToken 获取access_token（公众号、小程序）
#### getSignInfo 获取js签名信息（公众号）

```javascript
let sessionInfo = await lb.utils.getSessionInfo(event)
let accessToken = await lb.utils.getAccessToken(event)
let signInfo = await lb.utils.getSignInfo(event)
```
|参数名|类型|默认值|说明|
|:-----|:-----|:-----|:-----|
|event|Object|`arguments[0]`|把`main_handler`里面的第一个参数`event`传进来即可|
