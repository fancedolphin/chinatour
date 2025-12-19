import { useState, useEffect } from 'react';
import { TripPlannerBottomNav } from './components/TripPlannerBottomNav';
import { PlanInputPage } from './components/PlanInputPage';
import { MyTripsPage } from './components/MyTripsPage';
import { DestinationExplorePage } from './components/DestinationExplorePage';
import { ProfilePage } from './components/ProfilePage';
import { TravelTipsPage } from './presentation/pages/TravelTipsPage';
import { FeedItem } from './components/FeedCard';
import { LoginPage } from './components/LoginPage';
import { QuickLoginPanel } from './components/QuickLoginPanel';
import { Toaster } from 'sonner@2.0.3';
import { LogIn, User as UserIcon, Globe } from 'lucide-react';
import { Button } from './components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from './components/ui/avatar';

// DDD Architecture Imports
import { AuthProvider, useAuthContext } from './presentation/context/AuthContext';
import { LanguageProvider, useLanguage } from './presentation/context/LanguageContext';
import { ThemeProvider } from './presentation/context/ThemeContext';
import { RouteGuard } from './presentation/components/RouteGuard';

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

/**
 * 主应用组件（内部 - 使用Context）
 */
function AppContent() {
  const [currentTab, setCurrentTab] = useState('planner');
  const [showLogin, setShowLogin] = useState(false);
  
  // 使用新的DDD架构Context
  const { currentUser, isAuthenticated, logout } = useAuthContext();
  const { language, setLanguage, t } = useLanguage();

  // Mock data for profile (keeping some existing functionality)
  const userPosts: FeedItem[] = [];

  // 监听未授权事件，自动显示登录页
  useEffect(() => {
    const handleUnauthorized = () => {
      setCurrentTab('login');
      setShowLogin(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const handleLoginSuccess = () => {
    console.log('[App] 登录成功，准备跳转到首页');
    // 登录成功后关闭登录框，跳转到规划页（首页）
    setShowLogin(false);
    setCurrentTab('planner');
  };

  const handleLogout = () => {
    logout();
    setCurrentTab('login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  const renderPage = () => {
    // 如果是登录页，直接显示
    if (currentTab === 'login') {
      return (
        <LoginPage
          onClose={() => setCurrentTab('planner')}
          onLoginSuccess={() => {
            handleLoginSuccess();
          }}
        />
      );
    }

    // 其他页面
    switch (currentTab) {
      case 'planner':
        return <PlanInputPage />;
      case 'trips':
        return <MyTripsPage />;
      case 'tips':
        return <TravelTipsPage />;
      case 'discover':
        return <DestinationExplorePage />;
      case 'profile':
        return <ProfilePage userPosts={userPosts} />;
      default:
        return <PlanInputPage />;
    }
  };

  return (
    <RouteGuard currentPage={currentTab} onRedirect={setCurrentTab}>
      <div className="min-h-screen bg-gray-50">
        {/* Top Header with Login Button - 只在非登录页显示 */}
        {currentTab !== 'login' && (
          <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 z-50 shadow-sm">
            <div className="max-w-screen-xl mx-auto px-4 py-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-pink-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">✈️</span>
                </div>
                <span className="text-gray-900">{language === 'zh' ? '智能旅行' : 'Smart Travel'}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleLanguage}
                  className="gap-2"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-sm">{language === 'zh' ? '中文' : 'EN'}</span>
                </Button>

                {/* Login/User Button */}
                {isAuthenticated() && currentUser ? (
                  <div className="flex items-center gap-3">
                    <div className="hidden sm:flex flex-col items-end">
                      <span className="text-sm text-gray-900">{currentUser.displayName}</span>
                      <span className="text-xs text-gray-500">{currentUser.email}</span>
                    </div>
                    <div className="relative group">
                      <Avatar className="w-9 h-9 cursor-pointer ring-2 ring-transparent hover:ring-red-500 transition-all">
                        <AvatarImage src={currentUser.avatar} alt={currentUser.displayName} />
                        <AvatarFallback className="bg-red-500 text-white">
                          {currentUser.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      {/* Dropdown Menu */}
                      <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all">
                        <div className="p-3 border-b border-gray-100">
                          <p className="text-sm text-gray-900">{currentUser.displayName}</p>
                          <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                        </div>
                        <button
                          onClick={() => setCurrentTab('profile')}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <UserIcon className="w-4 h-4" />
                          {t('nav.profile')}
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-xl"
                        >
                          {t('auth.logout')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => setCurrentTab('login')}
                    className="bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white gap-2"
                    size="sm"
                  >
                    <LogIn className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('auth.login')}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Content with top padding */}
        <div className={currentTab !== 'login' ? 'pt-14' : ''}>
          {renderPage()}
        </div>

        {/* Bottom Nav - 只在非登录页显示 */}
        {currentTab !== 'login' && (
          <TripPlannerBottomNav currentTab={currentTab} onTabChange={setCurrentTab} />
        )}
        
        <Toaster position="top-center" richColors />

        {/* Quick Login Panel (仅开发环境) */}
        {!isAuthenticated() && currentTab !== 'login' && (
          <QuickLoginPanel onLoginSuccess={() => setCurrentTab('planner')} />
        )}

        {/* Login Modal */}
        {showLogin && (
          <LoginPage
            onClose={() => setShowLogin(false)}
            onLoginSuccess={() => {
              handleLoginSuccess();
            }}
          />
        )}
      </div>
    </RouteGuard>
  );
}

/**
 * 主应用组件（外部 - 提供Providers）
 */
export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}
