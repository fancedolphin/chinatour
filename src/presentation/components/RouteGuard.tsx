import { useEffect, useState } from 'react';
import { useAuthContext } from '../context/AuthContext';

interface RouteGuardProps {
  children: React.ReactNode;
  currentPage: string;
  onRedirect: (page: string) => void;
}

// 不需要登录就可以访问的页面
const PUBLIC_PAGES = ['login'];

export function RouteGuard({ children, currentPage, onRedirect }: RouteGuardProps) {
  const [isChecking, setIsChecking] = useState(true);
  const { isAuthenticated, currentUser, loading } = useAuthContext();

  useEffect(() => {
    // 如果还在加载用户信息，等待
    if (loading) {
      console.log('[RouteGuard] 等待用户信息加载...');
      return;
    }

    const checkAuth = () => {
      const authenticated = isAuthenticated();
      const isPublicPage = PUBLIC_PAGES.includes(currentPage);

      console.log('[RouteGuard] 检查认证状态:', { 
        authenticated, 
        isPublicPage, 
        currentPage,
        hasUser: !!currentUser,
        loading
      });

      // 如果是登录页面且已登录，重定向到首页
      if (isPublicPage && authenticated) {
        console.log('[RouteGuard] 已登录用户访问登录页，重定向到首页');
        onRedirect('planner');
        setIsChecking(false);
        return;
      }

      // 如果是受保护页面且未登录，重定向到登录页
      if (!isPublicPage && !authenticated) {
        console.log('[RouteGuard] 未登录用户访问受保护页面，重定向到登录页');
        onRedirect('login');
        setIsChecking(false);
        return;
      }

      setIsChecking(false);
    };

    checkAuth();
  }, [currentPage, onRedirect, isAuthenticated, currentUser, loading]);

  // 监听401未授权事件
  useEffect(() => {
    const handleUnauthorized = () => {
      console.log('[RouteGuard] 收到未授权事件，重定向到登录页');
      onRedirect('login');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [onRedirect]);

  // 正在加载或检查认证状态时显示加载
  if (loading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#ff2442] border-r-transparent"></div>
          <p className="mt-4 text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
