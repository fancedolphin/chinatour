import { X, Mail, Lock, User, Eye, EyeOff, Sparkles, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Separator } from './ui/separator';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useAuthContext } from '../presentation/context/AuthContext';
import { toast } from 'sonner@2.0.3';
import { useT } from '@/i18n/useT';

interface LoginPageProps {
  onClose: () => void;
  onLoginSuccess?: () => void;
}

export function LoginPage({ onClose, onLoginSuccess }: LoginPageProps) {
  const { t } = useT();
  const { login, register, loading } = useAuthContext();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });
  const loginHint = t('auth.testAccountHint');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      if (mode === 'login') {
        // 使用 Supabase Auth 邮箱登录
        console.log('[LoginPage] 尝试登录:', formData.email);
        const result = await login(formData.email, formData.password);
        
        if (result.success) {
          toast.success(t('auth.loginSuccess'));
          if (onLoginSuccess) onLoginSuccess();
          onClose();
        } else {
          setError(result.error || t('auth.loginFailedDetail'));
          toast.error(result.error || t('auth.loginFailed'));
        }
      } else {
        // 注册逻辑
        const username = formData.email.split('@')[0];
        const result = await register({
          username,
          email: formData.email,
          displayName: formData.name || username,
          password: formData.password,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.name || username)}&background=ef4444&color=fff`
        });
        
        if (result.success) {
          toast.success(t('auth.registerSuccess'));
          if (onLoginSuccess) onLoginSuccess();
          onClose();
        } else {
          const errorMsg = result.errors?.join(', ') || t('auth.registerFailed');
          setError(errorMsg);
          toast.error(errorMsg);
        }
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t('auth.operationFailed');
      setError(errorMsg);
      toast.error(errorMsg);
    }
  };

  const handleSocialLogin = async (provider: string) => {
    // Mock social login - 创建临时账户并注册
    const username = `${provider.toLowerCase()}_user_${Date.now()}`;
    const email = `${username}@${provider.toLowerCase()}.com`;
    
    const result = await register({
      username,
      email,
      displayName: `${provider} User`,
      password: 'social_' + Math.random().toString(36).slice(2),
      avatar: `https://ui-avatars.com/api/?name=${provider}+User&background=ef4444&color=fff`
    });
    
    if (result.success) {
      toast.success(t('auth.socialLoginSuccess', { provider }));
      if (onLoginSuccess) onLoginSuccess();
      onClose();
    } else {
      toast.error(t('auth.socialLoginFailed'));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl">
          <div>
            <h2 className="text-gray-900">{mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount')}</h2>
            <p className="text-xs text-gray-500 mt-1">{t('auth.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          {/* Hero Image */}
          <div className="relative rounded-2xl overflow-hidden mb-6 h-32">
            <ImageWithFallback
              src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=800"
              alt="Travel"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-4">
              <div className="flex items-center gap-2 text-white">
                <Sparkles className="w-5 h-5" />
                <span className="text-sm">{t('auth.smartTrip')}</span>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg flex items-start gap-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {/* Default Accounts Info */}
          <div className="bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>{mode === 'login' ? t('auth.loginNotice') : t('auth.testAccountLabel')}</strong><br/>
              {mode === 'login' ? t('auth.loginNoticeBody') : loginHint}
              <br />
              {loginHint}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <Label htmlFor="name" className="flex items-center gap-2 text-gray-700">
                  <User className="w-4 h-4" />
                  {t('auth.displayName')}
                </Label>
                <Input
                  id="name"
                  type="text"
                  placeholder={t('auth.displayNamePlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-2"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="flex items-center gap-2 text-gray-700">
                <Mail className="w-4 h-4" />
                {t('auth.email')}
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-2"
                required
              />
              {mode === 'login' && (
                <p className="mt-2 text-xs text-gray-500">
                  {t('auth.supabaseEmailNote')}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="flex items-center gap-2 text-gray-700">
                <Lock className="w-4 h-4" />
                {t('auth.password')}
              </Label>
              <div className="relative mt-2">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.passwordPlaceholder')}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span>{t('auth.rememberMe')}</span>
                </label>
                <button type="button" className="text-red-500 hover:text-red-600">
                  {t('auth.forgotPassword')}
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white"
              size="lg"
              disabled={loading}
            >
              {loading ? t('auth.processing') : (mode === 'login' ? t('auth.login') : t('auth.register'))}
            </Button>
          </form>

          {/* Toggle Mode */}
          <div className="mt-4 text-center text-sm text-gray-600">
            {mode === 'login' ? t('auth.noAccount') : t('auth.hasAccount')}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
              className="ml-2 text-red-500 hover:text-red-600"
            >
              {mode === 'login' ? t('auth.registerNow') : t('auth.loginNow')}
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-6">
            <Separator />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="bg-white px-4 text-xs text-gray-500">{t('auth.or')}</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="space-y-3">
            {/* Google */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 relative hover:bg-gray-50 transition-colors"
              onClick={() => handleSocialLogin('Google')}
            >
              <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="mx-auto">Continue with Google</span>
            </Button>

            {/* Apple */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 relative hover:bg-gray-50 transition-colors"
              onClick={() => handleSocialLogin('Apple')}
            >
              <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
              <span className="mx-auto">Continue with Apple</span>
            </Button>

            {/* Instagram */}
            <Button
              type="button"
              variant="outline"
              className="w-full h-11 relative hover:bg-gray-50 transition-colors"
              onClick={() => handleSocialLogin('Instagram')}
            >
              <svg className="w-5 h-5 absolute left-4" viewBox="0 0 24 24" fill="url(#instagram-gradient)">
                <defs>
                  <linearGradient id="instagram-gradient" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#FD5949"/>
                    <stop offset="50%" stopColor="#D6249F"/>
                    <stop offset="100%" stopColor="#285AEB"/>
                  </linearGradient>
                </defs>
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
              </svg>
              <span className="mx-auto">Continue with Instagram</span>
            </Button>
          </div>

          {/* Terms */}
          <p className="mt-6 text-xs text-center text-gray-500">
            {t('auth.termsPrefix')}
            <button type="button" className="text-red-500 hover:text-red-600 mx-1">
              {t('auth.termsLink')}
            </button>
            {t('auth.termsAnd')}
            <button type="button" className="text-red-500 hover:text-red-600 ml-1">
              {t('auth.privacyLink')}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
