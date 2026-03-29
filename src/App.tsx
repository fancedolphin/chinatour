import { useEffect, useState } from 'react';
import { TripPlannerBottomNav } from './components/TripPlannerBottomNav';
import { PlanInputPage } from './components/PlanInputPage';
import { MyTripsPage } from './components/MyTripsPage';
import { DestinationExplorePage } from './components/DestinationExplorePage';
import { SharedTripDetailPage } from './components/SharedTripDetailPage';
import { ProfilePage } from './components/ProfilePage';
import { TravelTipsPage } from './presentation/pages/TravelTipsPage';
import { LoginPage } from './components/LoginPage';
import { QuickLoginPanel } from './components/QuickLoginPanel';
import { Toaster } from 'sonner@2.0.3';
import { Globe, LogIn, User as UserIcon } from 'lucide-react';
import { Button } from './components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { AuthProvider, useAuthContext } from './presentation/context/AuthContext';
import { LanguageProvider, useLanguage } from './presentation/context/LanguageContext';
import { ThemeProvider } from './presentation/context/ThemeContext';
import { RouteGuard } from './presentation/components/RouteGuard';

type AppTab = 'planner' | 'trips' | 'tips' | 'discover' | 'profile' | 'login';

interface ParsedRoute {
  tab: AppTab;
  profileUserId: string | null;
  sharedTripDetailId: string | null;
}

interface ProfileReturnState {
  tab: AppTab;
  sharedTripDetailId: string | null;
}

function normalizePath(pathname: string) {
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname || '/';
}

function parseLocation(pathname: string): ParsedRoute {
  const normalizedPath = normalizePath(pathname);

  if (normalizedPath === '/profile') {
    return { tab: 'profile', profileUserId: null, sharedTripDetailId: null };
  }

  if (normalizedPath.startsWith('/profile/')) {
    return {
      tab: 'profile',
      profileUserId: decodeURIComponent(normalizedPath.replace('/profile/', '')) || null,
      sharedTripDetailId: null,
    };
  }

  if (normalizedPath.startsWith('/trip/')) {
    return {
      tab: 'discover',
      profileUserId: null,
      sharedTripDetailId: decodeURIComponent(normalizedPath.replace('/trip/', '')) || null,
    };
  }

  switch (normalizedPath) {
    case '/planner':
    case '/':
      return { tab: 'planner', profileUserId: null, sharedTripDetailId: null };
    case '/trips':
      return { tab: 'trips', profileUserId: null, sharedTripDetailId: null };
    case '/tips':
      return { tab: 'tips', profileUserId: null, sharedTripDetailId: null };
    case '/discover':
      return { tab: 'discover', profileUserId: null, sharedTripDetailId: null };
    case '/login':
      return { tab: 'login', profileUserId: null, sharedTripDetailId: null };
    default:
      return { tab: 'planner', profileUserId: null, sharedTripDetailId: null };
  }
}

function buildPath(
  tab: AppTab,
  profileUserId: string | null,
  currentUserId: string | null,
  sharedTripDetailId: string | null,
) {
  if (tab === 'profile') {
    if (profileUserId && profileUserId !== currentUserId) {
      return `/profile/${encodeURIComponent(profileUserId)}`;
    }
    return '/profile';
  }

  if (tab === 'discover' && sharedTripDetailId) {
    return `/trip/${encodeURIComponent(sharedTripDetailId)}`;
  }

  if (tab === 'planner') {
    return '/';
  }

  return `/${tab}`;
}

function AppContent() {
  const initialRoute = parseLocation(window.location.pathname);
  const [currentTab, setCurrentTab] = useState<AppTab>(initialRoute.tab);
  const [resumeTripId, setResumeTripId] = useState<string | null>(null);
  const [tripMapTripId, setTripMapTripId] = useState<string | null>(null);
  const [sharedTripDetailId, setSharedTripDetailId] = useState<string | null>(initialRoute.sharedTripDetailId);
  const [profileUserId, setProfileUserId] = useState<string | null>(initialRoute.profileUserId);
  const [profileReturn, setProfileReturn] = useState<ProfileReturnState | null>(null);

  const { currentUser, isAuthenticated, logout } = useAuthContext();
  const { language, setLanguage, t } = useLanguage();

  useEffect(() => {
    const handlePopState = () => {
      const route = parseLocation(window.location.pathname);
      setCurrentTab(route.tab);
      setProfileUserId(route.profileUserId);
      setSharedTripDetailId(route.sharedTripDetailId);
      setProfileReturn(null);
      if (route.tab !== 'discover' && !route.sharedTripDetailId) {
        setSharedTripDetailId(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    const nextPath = buildPath(currentTab, profileUserId, currentUser?.id ?? null, sharedTripDetailId);
    if (normalizePath(window.location.pathname) !== nextPath) {
      window.history.pushState({}, '', nextPath);
    }
  }, [currentTab, profileUserId, currentUser?.id, sharedTripDetailId]);

  useEffect(() => {
    const handleUnauthorized = () => {
      navigateToTab('login');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, []);

  const navigateToTab = (tab: AppTab) => {
    setCurrentTab(tab);
    if (tab !== 'profile') {
      setProfileUserId(null);
      setProfileReturn(null);
    }
    if (tab !== 'discover') {
      setSharedTripDetailId(null);
    }
  };

  const openProfile = (userId: string) => {
    setProfileReturn({
      tab: currentTab,
      sharedTripDetailId,
    });
    setProfileUserId(userId);
    setCurrentTab('profile');
  };

  const handleProfileBack = () => {
    if (!profileReturn) {
      navigateToTab(isAuthenticated() ? 'planner' : 'login');
      return;
    }

    const { tab, sharedTripDetailId: returnDetailId } = profileReturn;
    setProfileReturn(null);
    setProfileUserId(null);
    setCurrentTab(tab);
    if (tab === 'discover') {
      setSharedTripDetailId(returnDetailId);
    } else {
      setSharedTripDetailId(null);
    }
  };

  const handleLoginSuccess = () => {
    setProfileReturn(null);
    navigateToTab('planner');
  };

  const handleLogout = () => {
    logout();
    navigateToTab('login');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'zh' ? 'en' : 'zh');
  };

  const renderPage = () => {
    if (currentTab === 'login') {
      return (
        <LoginPage
          onClose={() => navigateToTab('planner')}
          onLoginSuccess={handleLoginSuccess}
        />
      );
    }

    switch (currentTab) {
      case 'planner':
        return (
          <PlanInputPage
            onNavigateToTrips={() => navigateToTab('trips')}
            resumeTripId={resumeTripId ?? undefined}
            onClearResume={() => setResumeTripId(null)}
            onOpenMap={(tripId) => {
              setTripMapTripId(tripId);
              navigateToTab('trips');
            }}
          />
        );
      case 'trips':
        return (
          <MyTripsPage
            onNavigateToPlanner={() => navigateToTab('planner')}
            onContinueChat={(tripId) => {
              setResumeTripId(tripId);
              navigateToTab('planner');
            }}
            openMapTripId={tripMapTripId ?? undefined}
            onOpenMapHandled={() => setTripMapTripId(null)}
          />
        );
      case 'tips':
        return <TravelTipsPage />;
      case 'discover':
        if (sharedTripDetailId) {
          return (
            <SharedTripDetailPage
              sharedTripId={sharedTripDetailId}
              onBack={() => setSharedTripDetailId(null)}
              onImportSuccess={() => {
                setSharedTripDetailId(null);
                navigateToTab('trips');
              }}
              onOpenProfile={openProfile}
            />
          );
        }
        return (
          <DestinationExplorePage
            onImportSuccess={() => navigateToTab('trips')}
            onOpenDetail={(id) => setSharedTripDetailId(id)}
            onOpenProfile={openProfile}
          />
        );
      case 'profile':
        return (
          <ProfilePage
            viewedUserId={profileUserId ?? currentUser?.id ?? null}
            onBack={profileReturn ? handleProfileBack : undefined}
            onOpenDetail={(id) => {
              setSharedTripDetailId(id);
              setCurrentTab('discover');
            }}
          />
        );
      default:
        return <PlanInputPage />;
    }
  };

  return (
    <RouteGuard currentPage={currentTab} onRedirect={(page) => navigateToTab(page as AppTab)}>
      <div className="min-h-screen bg-gray-50">
        {currentTab !== 'login' && (
          <div className="fixed left-0 right-0 top-0 z-50 border-b border-gray-200 bg-white shadow-sm">
            <div className="mx-auto flex max-w-screen-xl items-center justify-between px-4 py-2">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-red-500 to-pink-500">
                  <span className="text-sm text-white">✈️</span>
                </div>
                <span className="text-gray-900">{language === 'zh' ? '智能旅行' : 'Smart Travel'}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={toggleLanguage} className="gap-2">
                  <Globe className="h-4 w-4" />
                  <span className="text-sm">{language === 'zh' ? '中文' : 'EN'}</span>
                </Button>

                {isAuthenticated() && currentUser ? (
                  <div className="flex items-center gap-3">
                    <div className="hidden flex-col items-end sm:flex">
                      <span className="text-sm text-gray-900">{currentUser.displayName}</span>
                      <span className="text-xs text-gray-500">{currentUser.email}</span>
                    </div>
                    <div className="group relative">
                      <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-transparent transition-all hover:ring-red-500">
                        <AvatarImage src={currentUser.avatar} alt={currentUser.displayName} />
                        <AvatarFallback className="bg-red-500 text-white">
                          {currentUser.displayName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      <div className="invisible absolute right-0 top-full mt-2 w-48 rounded-xl border border-gray-200 bg-white opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                        <div className="border-b border-gray-100 p-3">
                          <p className="text-sm text-gray-900">{currentUser.displayName}</p>
                          <p className="truncate text-xs text-gray-500">{currentUser.email}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => openProfile(currentUser.id)}
                          className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <UserIcon className="h-4 w-4" />
                          {t('nav.profile')}
                        </button>
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full rounded-b-xl px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                        >
                          {t('auth.logout')}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => navigateToTab('login')}
                    className="gap-2 bg-gradient-to-r from-red-500 to-pink-500 text-white hover:from-red-600 hover:to-pink-600"
                    size="sm"
                  >
                    <LogIn className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('auth.login')}</span>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        <div className={currentTab !== 'login' ? 'pt-14' : ''}>
          {renderPage()}
        </div>

        {currentTab !== 'login' && (
          <TripPlannerBottomNav currentTab={currentTab} onTabChange={(tab) => navigateToTab(tab as AppTab)} />
        )}

        <Toaster position="top-center" richColors />

        {!isAuthenticated() && currentTab !== 'login' && (
          <QuickLoginPanel onLoginSuccess={() => navigateToTab('planner')} />
        )}
      </div>
    </RouteGuard>
  );
}

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
