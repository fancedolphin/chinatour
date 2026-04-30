/**
 * Settings Page Component
 * 用户设置页面 - 小红书风格
 */

import { useState } from 'react';
import {
  ChevronLeft,
  User,
  Mail,
  Edit2,
  Moon,
  Sun,
  LogOut,
  ChevronRight,
  Camera,
  Save,
  X,
} from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { useAuthContext } from '../presentation/context/AuthContext';
import { useTheme } from '../presentation/context/ThemeContext';
import { useT } from '@/i18n/useT';
import { toast } from 'sonner@2.0.3';

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { currentUser, logout, updateProfile } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useT();

  const [isEditMode, setIsEditMode] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

  const [formData, setFormData] = useState({
    displayName: currentUser?.displayName || '',
    email: currentUser?.email || '',
    bio: currentUser?.bio || '',
    avatar: currentUser?.avatar || '',
  });

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    try {
      const result = await updateProfile({
        displayName: formData.displayName,
        email: formData.email,
        bio: formData.bio,
        avatar: formData.avatar,
      });

      if (result.success) {
        toast.success(t('settings.profileUpdated'));
        setIsEditMode(false);
      } else {
        toast.error(result.error || t('settings.profileUpdateFailed'));
      }
    } catch {
      toast.error(t('settings.saveError'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      displayName: currentUser?.displayName || '',
      email: currentUser?.email || '',
      bio: currentUser?.bio || '',
      avatar: currentUser?.avatar || '',
    });
    setIsEditMode(false);
  };

  const handleLogout = () => {
    logout();
    toast.success(t('settings.logoutSuccess'));
    onBack();
  };

  const handleAvatarUpload = () => {
    toast.info(t('settings.avatarUploadInProgress'));
  };

  const toggleLocale = () => {
    setLocale(locale === 'en' ? 'zh' : 'en');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 z-10">
        <div className="max-w-screen-xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
            <h1 className="text-gray-900 dark:text-white">{t('settings.title')}</h1>
          </div>

          {isEditMode && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSaving}>
                <X className="w-4 h-4 mr-1" />
                {t('settings.cancel')}
              </Button>
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? t('settings.saving') : t('settings.save')}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-4">
        {/* 账号信息卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-gray-900 dark:text-white">{t('settings.accountSection')}</h2>
            {!isEditMode && (
              <Button variant="outline" size="sm" onClick={() => setIsEditMode(true)}>
                <Edit2 className="w-4 h-4 mr-1" />
                {t('settings.edit')}
              </Button>
            )}
          </div>

          {/* 头像 */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <ImageWithFallback
                src={formData.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'}
                alt="Avatar"
                className="w-24 h-24 rounded-full object-cover"
              />
              {isEditMode && (
                <button
                  onClick={handleAvatarUpload}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-red-600 transition-colors"
                >
                  <Camera className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* 用户名（只读） */}
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('settings.username')}
              </Label>
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{currentUser?.username}</span>
              </div>
            </div>

            {/* 昵称 */}
            <div>
              <Label htmlFor="displayName" className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('settings.displayName')}
              </Label>
              {isEditMode ? (
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder={t('settings.displayNamePlaceholder')}
                  className="h-12"
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300">
                  {formData.displayName}
                </div>
              )}
            </div>

            {/* 邮箱 */}
            <div>
              <Label htmlFor="email" className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('settings.email')}
              </Label>
              {isEditMode ? (
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder={t('settings.emailPlaceholder')}
                    className="pl-10 h-12"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700 dark:text-gray-300">{formData.email}</span>
                </div>
              )}
            </div>

            {/* 个人简介 */}
            <div>
              <Label htmlFor="bio" className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                {t('settings.bio')}
              </Label>
              {isEditMode ? (
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder={t('settings.bioPlaceholder')}
                  rows={4}
                  className="resize-none"
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 min-h-[100px]">
                  {formData.bio || t('settings.noBio')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 偏好设置卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <h2 className="text-gray-900 dark:text-white mb-4">{t('settings.preferenceSection')}</h2>

          <div className="space-y-4">
            {/* 主题切换 */}
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                  {theme === 'dark' ? (
                    <Moon className="w-5 h-5 text-white" />
                  ) : (
                    <Sun className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white">{t('settings.darkMode')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {theme === 'dark' ? t('settings.darkOn') : t('settings.darkOff')}
                  </p>
                </div>
              </div>
              <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
            </div>

            {/* 语言切换 — 点击切换 zh/en */}
            <button
              type="button"
              onClick={toggleLocale}
              className="w-full flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {locale === 'en' ? 'EN' : '中'}
                  </span>
                </div>
                <div className="text-left">
                  <p className="text-gray-900 dark:text-white">{t('settings.language')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {locale === 'en' ? t('settings.languageEn') : t('settings.languageZh')}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* 账号管理卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <h2 className="text-gray-900 dark:text-white mb-4">{t('settings.accountManageSection')}</h2>

          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center justify-between py-4 px-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-left">
                <p className="text-red-600 dark:text-red-400">{t('settings.logout')}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.logoutSubtitle')}</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400" />
          </button>
        </div>

        {/* 版本信息 */}
        <div className="text-center py-6">
          <p className="text-xs text-gray-400">{t('settings.version')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('settings.copyright')}</p>
        </div>
      </div>

      {/* 注销确认对话框 */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings.logoutConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('settings.logoutConfirmDesc')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('settings.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-red-500 hover:bg-red-600">
              {t('settings.logoutConfirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
