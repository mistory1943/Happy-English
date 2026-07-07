# 乐学英语 · 老年人日常英语学习网站

帮助中国老年人学习日常英语会话。全中文界面，费曼学习法四步走（学单词 → 自己讲一遍 → 学句子 → 单词测验），每日新任务，三天一测并自动把答错内容加入后续任务，跟读录音对比，完整学习记录。

用户名 + 密码注册登录，学习记录保存在服务器上，换手机、换设备进度不丢。

## 技术结构

```
happy-english/
├── server/            # 后端（Node.js + Express）
│   ├── index.js       # 注册/登录、会话、学习记录 API、托管前端
│   └── db.js          # 数据存储（JSON 文件，零依赖）
├── web/               # 前端（React + Vite）
│   └── src/App.jsx    # 学习应用主体
├── .env.example       # 配置模板
└── data.json          # 运行后自动生成的数据文件（请定期备份！）
```

## 本地运行（开发测试）

需要 Node.js 18 或更高版本（https://nodejs.org）。

```bash
# 1. 安装后端依赖
npm install

# 2. 编译前端
npm run build

# 3. 配置
cp .env.example .env
# 编辑 .env，把 SESSION_SECRET 改成一串随机字符

# 4. 启动
npm start
# 打开 http://localhost:3000
```

## 部署上线

任何能跑 Node.js 的服务器都可以（阿里云/腾讯云轻量服务器最低配即可，约 ¥50-100/月）。

1. **买服务器和域名**。服务器放在中国大陆需要做 ICP 备案（免费，约 1-2 周，云厂商有引导流程）；放在香港/海外则不用备案，但国内访问稍慢。
2. **上传代码**到服务器，执行上面「本地运行」的 4 步。
3. **用 pm2 保持服务常驻**：
   ```bash
   npm install -g pm2
   NODE_ENV=production pm2 start server/index.js --name happy-english
   pm2 save && pm2 startup
   ```
4. **配置 HTTPS（必须）**。跟读录音功能（麦克风）浏览器只在 https 下允许。用 nginx 反向代理 + 免费的 Let's Encrypt 证书：
   ```nginx
   server {
     listen 443 ssl;
     server_name 您的域名;
     ssl_certificate     /etc/letsencrypt/live/您的域名/fullchain.pem;
     ssl_certificate_key /etc/letsencrypt/live/您的域名/privkey.pem;
     location / { proxy_pass http://127.0.0.1:3000; proxy_set_header Host $host; }
   }
   ```
   证书申请：`sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx`
5. **定期备份 `data.json`**（所有用户和学习记录都在这个文件里），比如每天用 crontab 拷贝一份。

## 常见问题

- **跟读录音没反应？** 必须用 https 访问；iPhone Safari 上如果麦克风不可用，应用会自动切换到「跟读自评」模式。
- **用户多了怎么办？** JSON 文件存储适合几千用户以内。超过后把 `server/db.js` 里的几个函数改成 MySQL/PostgreSQL 实现即可，其他代码不用动。
- **忘记密码怎么办？** 当前版本没有找回密码功能（老年用户建议把密码写在本子上）。如需要，可以加：管理员重置、或绑定子女手机号找回。
- **想换回微信登录？** 需要企业主体在微信开放平台认证「网站应用」。代码架构已预留：加一条 OAuth 回调路由、users 表加 openid 字段即可。

## 安全说明

- 密码用 bcrypt 加密存储，服务器上看不到明文
- 登录会话 180 天有效（HttpOnly cookie，防脚本窃取），老人不用反复输密码
- 正式环境务必：改掉 `.env` 里的 SESSION_SECRET、设置 `NODE_ENV=production`、全站 https
