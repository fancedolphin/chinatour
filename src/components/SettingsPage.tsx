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
  Lock,
  Eye,
  EyeOff
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
import { useLanguage } from '../presentation/context/LanguageContext';
import { toast } from 'sonner@2.0.3';

interface SettingsPageProps {
  onBack: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps) {
  const { currentUser, logout, updateProfile, changePassword } = useAuthContext();
  const { theme, toggleTheme } = useTheme();
  const { t } = useLanguage();
  
  // 编辑模式
  const [isEditMode, setIsEditMode] = useState(false);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showChangePasswordDialog, setShowChangePasswordDialog] = useState(false);
  
  // 表单数据
  const [formData, setFormData] = useState({
    displayName: currentUser?.displayName || '',
    email: currentUser?.email || '',
    bio: currentUser?.bio || '',
    avatar: currentUser?.avatar || '',
  });
  
  // 密码表单数据
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  // 密码可见性
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  // 保存状态
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  /**
   * 处理表单提交
   */
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
        toast.success('个人信息已更新');
        setIsEditMode(false);
      } else {
        toast.error(result.error || '更新失败');
      }
    } catch (error) {
      toast.error('保存时发生错误');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * 取消编辑
   */
  const handleCancel = () => {
    setFormData({
      displayName: currentUser?.displayName || '',
      email: currentUser?.email || '',
      bio: currentUser?.bio || '',
      avatar: currentUser?.avatar || '',
    });
    setIsEditMode(false);
  };

  /**
   * 处理注销
   */
  const handleLogout = () => {
    logout();
    toast.success('已退出登录');
    onBack();
  };

  /**
   * 处理头像上传
   */
  const handleAvatarUpload = () => {
    toast.info('头像上传功能开发中');
    // 实际应用中这里会打开文件选择器
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
            <h1 className="text-gray-900 dark:text-white">设置</h1>
          </div>
          
          {isEditMode && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
              >
                <X className="w-4 h-4 mr-1" />
                取消
              </Button>
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600"
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className="w-4 h-4 mr-1" />
                {isSaving ? '保存中...' : '保存'}
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-4">
        {/* 账号信息卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-gray-900 dark:text-white">账号信息</h2>
            {!isEditMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditMode(true)}
              >
                <Edit2 className="w-4 h-4 mr-1" />
                编辑
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
              <Label className="text-sm text-gray-600 dark:text-gray-400 mb-2">用户名</Label>
              <div className="flex items-center gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-700 dark:text-gray-300">{currentUser?.username}</span>
              </div>
            </div>

            {/* 昵称 */}
            <div>
              <Label htmlFor="displayName" className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                昵称
              </Label>
              {isEditMode ? (
                <Input
                  id="displayName"
                  value={formData.displayName}
                  onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                  placeholder="输入你的昵称"
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
                邮箱
              </Label>
              {isEditMode ? (
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="输入邮箱地址"
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
                个人简介
              </Label>
              {isEditMode ? (
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="介绍一下自己吧"
                  rows={4}
                  className="resize-none"
                />
              ) : (
                <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-700 dark:text-gray-300 min-h-[100px]">
                  {formData.bio || '暂无简介'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 偏好设置卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <h2 className="text-gray-900 dark:text-white mb-4">偏好设置</h2>
          
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
                  <p className="text-gray-900 dark:text-white">深色模式</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {theme === 'dark' ? '当前为深色主题' : '当前为浅色主题'}
                  </p>
                </div>
              </div>
              <Switch
                checked={theme === 'dark'}
                onCheckedChange={toggleTheme}
              />
            </div>

            {/* 语言设置（暂时显示，不可编辑） */}
            <div className="flex items-center justify-between py-3 border-t border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center">
                  <span className="text-white">中</span>
                </div>
                <div>
                  <p className="text-gray-900 dark:text-white">语言</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">简体中文</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </div>
        </div>

        {/* 账号管理卡片 */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <h2 className="text-gray-900 dark:text-white mb-4">账号管理</h2>
          
          {/* 注销账号 */}
          <button
            onClick={() => setShowLogoutDialog(true)}
            className="w-full flex items-center justify-between py-4 px-4 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50 transition-colors">
                <LogOut className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-left">
                <p className="text-red-600 dark:text-red-400">退出登录</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">退出当前账号</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-red-400" />
          </button>
        </div>

        {/* 版本信息 */}
        <div className="text-center py-6">
          <p className="text-xs text-gray-400">智能旅行规划 v1.0.0</p>
          <p className="text-xs text-gray-400 mt-1">© 2025 Smart Travel Planner</p>
        </div>
      </div>

      {/* 注销确认对话框 */}
      <AlertDialog open={showLogoutDialog} onOpenChange={setShowLogoutDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认退出登录？</AlertDialogTitle>
            <AlertDialogDescription>
              退出登录后，您需要重新登录才能访问个人信息和行程数据。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600"
            >
              确认退出
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
