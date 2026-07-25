# Orbmare 专属入口（域名）

正式站点域名：**https://orbmare.com**

> 本机 `http://127.0.0.1:4242` 仅当前电脑可用。其它电脑、手机请用下面的域名链接。

## 对外专属链接

| 用途 | 专属链接 |
|------|----------|
| 平台首页 | https://orbmare.com/ |
| **卖家后台** | https://orbmare.com/seller/ |
| **买家账户** | https://orbmare.com/auth/ |
| 3D 打印馆 / 店铺 | https://orbmare.com/shop/ |
| 中国区 | https://orbmare.com/regions/china/ |

## 卖家演示账号（部署并开启数据库后可用）

- 邮箱：`seller@orbmare.local`
- 密码：`Seller-Demo-Pass-2026!`

生产环境建议：改掉演示密码，并设置 `SELLER_INVITE_CODE` 限制自行注册。

## 服务器 `.env` 必填

```env
PUBLIC_BASE_URL=https://orbmare.com
DATABASE_URL=postgresql://...生产库连接串...
```

没有 `DATABASE_URL` 时，卖家/买家登录无法工作（需要 PostgreSQL）。
