/**
 * 创建测试用户脚本
 *
 * 使用方法：
 * 1. 确保已配置 .env.local 文件
 * 2. 运行：npm run create-test-user
 *
 * 或直接在浏览器控制台运行相关代码
 */

import { supabase } from '../src/utils/supabase/client';

interface TestUserConfig {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

const TEST_USER: TestUserConfig = {
  email: 'Test@123.com',
  password: 'Test123!',
  username: 'Test',
  displayName: 'Test User',
};

async function createTestUser() {
  console.log('🚀 开始创建测试用户...\n');
  console.log('用户信息：');
  console.log(`  邮箱: ${TEST_USER.email}`);
  console.log(`  用户名: ${TEST_USER.username}`);
  console.log(`  密码: ${TEST_USER.password}`);
  console.log('');

  try {
    // 1. 注册用户
    console.log('1️⃣ 正在注册用户...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password,
      options: {
        data: {
          username: TEST_USER.username,
          display_name: TEST_USER.displayName,
        },
        emailRedirectTo: undefined, // 跳过邮箱验证
      },
    });

    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('⚠️  用户已存在，尝试登录...\n');

        // 尝试登录
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: TEST_USER.email,
          password: TEST_USER.password,
        });

        if (signInError) {
          console.error('❌ 登录失败:', signInError.message);
          return false;
        }

        console.log('✅ 登录成功！');
        console.log(`   用户 ID: ${signInData.user?.id}`);
        console.log(`   邮箱: ${signInData.user?.email}`);
        return true;
      } else {
        console.error('❌ 注册失败:', signUpError.message);
        return false;
      }
    }

    console.log('✅ 用户注册成功！');
    console.log(`   用户 ID: ${signUpData.user?.id}`);
    console.log(`   邮箱: ${signUpData.user?.email}`);
    console.log('');

    // 2. 验证 public.users 表记录
    console.log('2️⃣ 验证用户数据...');
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', signUpData.user?.id)
      .single();

    if (userError) {
      console.error('⚠️  查询用户数据失败:', userError.message);
    } else {
      console.log('✅ 用户数据验证成功！');
      console.log('   Public 用户信息:');
      console.log(`     ID: ${userData.id}`);
      console.log(`     用户名: ${userData.username}`);
      console.log(`     显示名称: ${userData.display_name}`);
      console.log(`     创建时间: ${userData.created_at}`);
    }
    console.log('');

    // 3. 登出
    console.log('3️⃣ 清理会话...');
    await supabase.auth.signOut();
    console.log('✅ 已登出');
    console.log('');

    console.log('🎉 测试用户创建完成！\n');
    console.log('📝 登录凭证：');
    console.log(`   邮箱: ${TEST_USER.email}`);
    console.log(`   密码: ${TEST_USER.password}`);
    console.log('');

    return true;
  } catch (error: any) {
    console.error('❌ 发生错误:', error.message);
    return false;
  }
}

// 执行创建用户
createTestUser().then((success) => {
  if (success) {
    console.log('✅ 脚本执行成功');
  } else {
    console.log('❌ 脚本执行失败');
  }
  process.exit(success ? 0 : 1);
});

export { createTestUser };
