/**
 * Quick Login Panel Component
 * 快速登录面板组件（仅用于开发/演示）
 * 
 * 使用说明：
 * 1. 仅在开发环境显示
 * 2. 提供一键登录默认账户功能
 * 3. 生产环境应禁用此组件
 */

import { useState } from 'react';
import { LogIn, User, X } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { useAuthContext } from '../presentation/context/AuthContext';
import { toast } from 'sonner@2.0.3';

interface QuickLoginPanelProps {
  onLoginSuccess?: () => void;
}

const SUPABASE_TEST_LOGIN = {
  email: 'test@test123.com',
  password: 'Test123!',
  label: '测试账号',
};

export function QuickLoginPanel({ onLoginSuccess }: QuickLoginPanelProps) {
  const { login, loading } = useAuthContext();
  const [isVisible, setIsVisible] = useState(true);

  // 仅在开发环境显示
  const isDevelopment = import.meta.env.DEV;

  if (!isDevelopment || !isVisible) {
    return null;
  }

  const handleQuickLogin = async (email: string, password: string, accountType: string) => {
    try {
      const result = await login(email, password);
      
      if (result.success) {
        toast.success(`${accountType}登录成功！`);
        if (onLoginSuccess) {
          onLoginSuccess();
        }
      } else {
        toast.error(result.error || '登录失败');
      }
    } catch (error) {
      toast.error('登录过程出错');
      console.error('Quick login error:', error);
    }
  };

  return (
    <div className="fixed bottom-20 right-4 z-40 w-80">
      <Card className="bg-white shadow-xl border-2 border-blue-200">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <LogIn className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm text-gray-900">快速登录</h3>
                <p className="text-xs text-gray-500">开发模式</p>
              </div>
            </div>
            <button
              onClick={() => setIsVisible(false)}
              className="w-6 h-6 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Quick Login Buttons */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-gray-600">
                <User className="w-3 h-3" />
                <span>Supabase 测试账号</span>
              </div>
              <Button
                onClick={() => handleQuickLogin(
                  SUPABASE_TEST_LOGIN.email,
                  SUPABASE_TEST_LOGIN.password,
                  SUPABASE_TEST_LOGIN.label
                )}
                disabled={loading}
                className="w-full bg-blue-500 hover:bg-blue-600 text-white"
                size="sm"
              >
                <User className="w-4 h-4 mr-2" />
                登录为测试账号
              </Button>
              <div className="text-xs text-gray-500 pl-1">
                邮箱: {SUPABASE_TEST_LOGIN.email}<br/>
                密码: {SUPABASE_TEST_LOGIN.password}
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-xs text-yellow-800">
              当前认证基于 Supabase Auth，仅支持邮箱登录。旧的本地默认用户名账户不适用于这里。
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/**
 * 使用示例
 * 
 * 在App.tsx中添加：
 * 
 * import { QuickLoginPanel } from './components/QuickLoginPanel';
 * 
 * // 在render中添加（登录页面之外）
 * {!isAuthenticated() && <QuickLoginPanel onLoginSuccess={() => setCurrentTab('planner')} />}
 */
