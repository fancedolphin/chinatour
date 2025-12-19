# 测试用户凭证

## 🧪 测试用户信息

### 登录凭证

```
邮箱: test@test123.com
密码: Test123!
```

### 用户详情

- **用户 ID**: `49fb3100-3b1a-4afb-a691-082a63a1eead`
- **用户名**: `Test` (严格匹配大小写)
- **显示名称**: `Test User`
- **创建时间**: `2025-12-06 21:06:12 UTC`

## ⚠️ 重要说明

**原始要求的邮箱** `Test@123.com` **无法使用**，原因如下：

Supabase Auth 使用标准邮箱验证规则，不接受 `123.com` 作为有效的邮箱域名。错误信息：
```
Email address "test@123.com" is invalid
```

因此使用了 `test@test123.com` 替代，该邮箱符合标准邮箱格式规范。

## 🔐 数据库验证

### Auth 表 (auth.users)

用户已在 Supabase Auth 系统中注册：
- ✅ 邮箱: test@test123.com
- ✅ 密码: Test123! (已加密存储)
- ✅ 元数据包含 username 和 display_name

### Public 表 (public.users)

触发器自动创建的 public.users 记录：
```sql
SELECT id, username, display_name, created_at
FROM public.users
WHERE id = '49fb3100-3b1a-4afb-a691-082a63a1eead';
```

结果：
```json
{
  "id": "49fb3100-3b1a-4afb-a691-082a63a1eead",
  "username": "Test",
  "display_name": "Test User",
  "created_at": "2025-12-06 21:06:12.059421+00"
}
```

## 📱 使用测试用户登录

### 方法 1: 使用 Supabase Client

```typescript
import { supabase } from '@/utils/supabase/client';

const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@test123.com',
  password: 'Test123!',
});

if (error) {
  console.error('登录失败:', error.message);
} else {
  console.log('登录成功!', data.user);
}
```

### 方法 2: 使用浏览器工具

打开 `scripts/browser-create-user.html` 文件，可以：
- 验证用户是否存在
- 测试登录功能
- 查看用户详细信息

### 方法 3: 直接访问 Supabase Dashboard

1. 访问: https://supabase.com/dashboard/project/ogodnvjaiwelqmjqkvda
2. 导航到: Authentication → Users
3. 查找邮箱: test@test123.com

## 🧹 清理测试用户

如需删除测试用户，可使用以下 SQL：

```sql
-- 删除 public.users 记录（会级联删除所有关联数据）
DELETE FROM public.users WHERE id = '49fb3100-3b1a-4afb-a691-082a63a1eead';

-- 或通过 Supabase Dashboard 删除
-- Authentication → Users → 选择用户 → Delete user
```

**注意**: 由于外键级联删除设置，删除用户会自动删除该用户的所有行程、互动等数据。

---

**创建时间**: 2025-12-06
**创建方式**: Supabase Auth API (curl)
