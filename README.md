# FamFi — 家庭财务管理系统

全面的家庭财务管理系统，实时追踪收入、资产与投资。

## 功能特性

- **用户认证** — InstantDB 魔法链接（Magic Link）登录，无需密码，邮件验证码一键登录
- **数据隔离** — 每位用户只能看到自己的家庭数据，完全私密
- **多类资产管理** — 存款（活期/定期）、贵金属（黄金/白银）、有价证券（基金/股票/加密货币）
- **实时行情** — 黄金、白银实时价格自动获取，多货币（CNY/USD/EUR/HKD 等）自动换算
- **家庭成员档案** — 为每位成员建立独立财务档案，支持资产筛选与汇总
- **周期收入** — 设置每月自动生成的周期收入记录（如工资）
- **财务总览仪表板** — 家庭资产饼图、趋势图、各类资产明细

## 技术栈

- **框架**: Next.js 16 + TypeScript + React 19（App Router）
- **数据库**: InstantDB（实时同步，含认证）
- **样式**: Tailwind CSS v4（Midnight Ledger 深色主题）
- **状态管理**: Zustand
- **图表**: Recharts
- **图标**: Lucide React

## 认证流程

1. 访问应用时展示落地页（含登录表单）
2. 用户输入邮箱 → 点击"发送验证码"
3. InstantDB 发送 6 位验证码至邮箱
4. 用户输入验证码 → 登录成功
5. 登出：点击侧边栏底部退出按钮

## 本地开发

```bash
pnpm install
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

## 项目结构

```
app/
  layout.tsx          # 根布局（含 AuthGate）
  page.tsx            # 仪表板
  members/page.tsx    # 家庭成员
  assets/page.tsx     # 资产管理
  income/page.tsx     # 收入管理
  api/
    rates/route.ts    # 汇率 API
    metals/route.ts   # 贵金属价格 API

components/
  auth-gate.tsx       # 认证守卫 + 落地页
  sidebar.tsx         # 导航侧边栏（含退出登录）
  dashboard.tsx       # 财务总览仪表板
  member-manager.tsx  # 家庭成员管理
  income-manager.tsx  # 收入管理
  asset-manager.tsx   # 资产管理（存款/贵金属/证券）
  providers.tsx       # 全局数据提供者（汇率/金属价格）

lib/
  instant.ts          # InstantDB 初始化 + Schema
  store.ts            # Zustand 全局状态
  types.ts            # TypeScript 类型定义
  utils.ts            # 工具函数
```
