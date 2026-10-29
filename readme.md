####（一）用户端登录账号（工号 110-114）
工号	姓名	用户名	密码	部门	角色
110	周镇镇	110	zhou110	总经办	管理员
111	张三	111	zhangsan123	研发部	主管
112	李四	112	lisi123	研发部	成员
113	王五	113	wangwu123	市场部	主管
114	刘星	114	liulin123	销售部	成员
登录时用户名填工号（110-114），不是姓名。
####（二）企业管理后台（网页端 9889/admin）
用户名	密码	角色
admin@newbodor.local	admin123	超级管理员（周镇镇，唯一超管）
liqian	liqian123	部门管理员（李茜）
wanggong	wanggong123	部门管理员（王工）
zhaoming	zhaoming123	部门管理员（赵明）
qianjin	qianjin123	部门管理员（钱进）

####（三）其他（联调用）
demo 账号：nb_demo_21825 / pass123


####newbodor_work\private_backend.cjs（9888 用户端）+ NewBodor-Admin\server.js（9889 管理后台 SQLite 版）
管理后台后端代码介绍
NewBodor-Admin\
├── backend\          ← 管理后台后端（Node.js + node:sqlite）
│   ├── server.js     ← 入口（监听 127.0.0.1:9889）
│   ├── config.js
│   ├── data\         ← SQLite 数据库文件（newbodor.db，WAL 模式）
│   ├── middleware\   ← 鉴权/审计中间件
│   ├── routes\       ← REST API 路由
│   └── services\
├── frontend\         ← 管理后台前端页面（原生 HTML/CSS/JS，加载 /admin）
│   ├── index.html
│   ├── css\
│   └── js\
├── data\ / data-test\ / data-demo\   ← 数据
├── docs\             ← 文档
├── test\             ← 测试（43/43 通过）
├── package.json
└── README.md
