/**
 * Supabase Connection Test
 *
 * 用于测试 Supabase 客户端配置是否正确
 * 运行此文件来验证数据库连接
 */

import { supabase } from './client';

/**
 * 测试数据库连接
 */
export async function testConnection() {
  console.log('🔍 Testing Supabase connection...\n');

  try {
    // 1. 测试基本连接
    console.log('1️⃣ Testing basic connection...');
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }
    console.log('✅ Connection successful!\n');

    // 2. 测试表访问
    console.log('2️⃣ Testing table access...');
    const tables = [
      'users',
      'trips',
      'trip_itineraries',
      'activities',
      'shared_trips',
      'user_interactions',
      'destinations',
      'attractions',
      'restaurants',
      'transportation',
      'travel_tips',
      'trip_examples',
      'user_preferences',
    ];

    for (const table of tables) {
      const { error } = await supabase.from(table).select('count').limit(1);
      if (error) {
        console.log(`   ❌ ${table}: ${error.message}`);
      } else {
        console.log(`   ✅ ${table}`);
      }
    }
    console.log('');

    // 3. 测试向量搜索函数
    console.log('3️⃣ Testing vector search functions...');
    const functions = [
      'match_attractions',
      'match_restaurants',
      'match_trip_examples',
      'match_travel_tips',
    ];

    // 创建一个示例向量 (768维，全为0)
    const testEmbedding = Array(768).fill(0).toString();

    for (const func of functions) {
      try {
        const { error } = await supabase.rpc(func, {
          query_embedding: testEmbedding,
          match_count: 1,
        });
        if (error) {
          console.log(`   ⚠️  ${func}: ${error.message}`);
        } else {
          console.log(`   ✅ ${func}`);
        }
      } catch (e: any) {
        console.log(`   ⚠️  ${func}: ${e.message}`);
      }
    }
    console.log('');

    // 4. 测试认证状态
    console.log('4️⃣ Testing authentication...');
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log(`   ✅ User logged in: ${session.user.email}`);
    } else {
      console.log('   ℹ️  No user logged in (this is normal)');
    }
    console.log('');

    console.log('🎉 All tests completed!\n');
    return true;
  } catch (error: any) {
    console.error('❌ Unexpected error:', error.message);
    return false;
  }
}

// 如果直接运行此文件，执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  testConnection().then((success) => {
    process.exit(success ? 0 : 1);
  });
}
