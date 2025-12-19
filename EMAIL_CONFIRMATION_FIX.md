# 邮箱验证问题修复指南

## 🐛 问题分析

**错误信息**: `Email not confirmed`

**原因**: Supabase Auth 默认启用了邮箱验证功能，新注册的用户必须点击验证邮件中的链接才能登录。

## ✅ 解决方案（二选一）

### 方案 1：关闭邮箱验证（开发环境推荐）⭐

**步骤**：

1. **访问 Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/ogodnvjaiwelqmjqkvda
   ```

2. **导航到认证设置**
   - 左侧菜单: Authentication → Settings
   - 或直接访问: https://supabase.com/dashboard/project/ogodnvjaiwelqmjqkvda/settings/auth

3. **关闭邮箱确认**
   - 找到 "Email Auth" 部分
   - 找到 "Enable email confirmations" 选项
   - **取消勾选**（设置为 disabled）
   - 点击 "Save" 保存

4. **重新测试登录**
   - 邮箱: test@test123.com
   - 密码: Test123!
   - 现在应该可以直接登录

**优点**：
- ✅ 简单快速
- ✅ 适合开发和测试环境
- ✅ 无需修改代码

**缺点**：
- ⚠️ 生产环境不推荐（安全性降低）

---

### 方案 2：手动确认测试用户邮箱

通过 Supabase MCP 工具直接更新数据库：

```sql
-- 确认测试用户的邮箱
UPDATE auth.users
SET email_confirmed_at = NOW(),
    confirmation_token = NULL
WHERE email = 'test@test123.com';
```

**优点**：
- ✅ 保持邮箱验证功能启用
- ✅ 仅确认特定测试用户

**缺点**：
- ⚠️ 需要每个测试用户单独确认
- ⚠️ 需要数据库访问权限

---

## 🚀 快速修复（使用方案2）

我将通过 Supabase MCP 工具帮你确认测试用户的邮箱。

