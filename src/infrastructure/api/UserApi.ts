import { httpClient, ApiResponse } from '../http/HttpClient';
import { API_ENDPOINTS } from '../config/api.config';

export interface UserInfo {
  id: string;
  nickname: string;
  email: string;
  phone: string;
  avatar?: string;
  bio?: string;
}

// 更新用户信息请求类型
export interface UserUpdateRequest {
  nickname?: string;
  avatar?: string;
  bio?: string;
}

// 修改密码请求类型
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// 解析JWT Token获取用户ID
function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(function (c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        })
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('[UserApi] JWT解析失败:', e);
    return null;
  }
}

// 获取当前用户ID
export function getCurrentUserId(): string | null {
  if (typeof window === "undefined") {
    return null; // 服务端渲染时返回null
  }
  
  // 优先从localStorage获取token并解析
  const token = localStorage.getItem("auth_token");
  if (token) {
    const payload = parseJwt(token);
    if (payload && payload.userId) {
      return payload.userId;
    }
    // 如果JWT中有其他字段表示用户ID
    if (payload && payload.sub) {
      return payload.sub;
    }
    if (payload && payload.id) {
      return payload.id;
    }
  }
  
  // 如果无法从token解析，返回null
  return null;
}

// 获取当前用户ID（异步版本，从API获取）
export async function getCurrentUserIdAsync(): Promise<string | null> {
  try {
    const response = await getUserInfo();
    if (response.code === 200 && response.data) {
      return response.data.id;
    }
    return null;
  } catch (error) {
    console.error('[UserApi] 获取用户ID失败:', error);
    return null;
  }
}

// 获取用户信息
export async function getUserInfo(): Promise<ApiResponse<UserInfo>> {
  try {
    console.log('[UserApi] 获取用户信息');
    const response = await httpClient.get<ApiResponse<UserInfo>>(API_ENDPOINTS.USERS.INFO);
    console.log('[UserApi] 用户信息响应:', response);
    return response;
  } catch (error) {
    console.error('[UserApi] 获取用户信息失败:', error);
    // 返回格式化的错误响应
    return {
      code: 500,
      message: error instanceof Error ? error.message : "未知错误",
      data: null as unknown as UserInfo,
      timestamp: Date.now(),
    };
  }
}

// 更新用户信息
export async function updateUserInfo(userData: UserUpdateRequest): Promise<ApiResponse<null>> {
  try {
    console.log('[UserApi] 更新用户信息:', userData);
    const response = await httpClient.post<ApiResponse<null>>(API_ENDPOINTS.USERS.UPDATE, userData);
    console.log('[UserApi] 更新响应:', response);
    return response;
  } catch (error) {
    console.error('[UserApi] 更新用户信息失败:', error);
    // 返回格式化的错误响应
    return {
      code: 500,
      message: error instanceof Error ? error.message : "未知错误",
      data: null,
      timestamp: Date.now(),
    };
  }
}

// 修改密码
export async function changePassword(passwordData: ChangePasswordRequest): Promise<ApiResponse<null>> {
  try {
    console.log('[UserApi] 修改密码');
    const response = await httpClient.put<ApiResponse<null>>(API_ENDPOINTS.USERS.PASSWORD, passwordData);
    console.log('[UserApi] 修改密码响应:', response);
    return response;
  } catch (error) {
    console.error('[UserApi] 修改密码失败:', error);
    // 返回格式化的错误响应
    return {
      code: 500,
      message: error instanceof Error ? error.message : "未知错误",
      data: null,
      timestamp: Date.now(),
    };
  }
}

// 上传头像
export async function uploadAvatar(file: File): Promise<ApiResponse<{ url: string }>> {
  try {
    console.log('[UserApi] 上传头像');
    const formData = new FormData();
    formData.append('avatar', file);
    
    const response = await httpClient.post<ApiResponse<{ url: string }>>(
      API_ENDPOINTS.USERS.AVATAR,
      formData
    );
    console.log('[UserApi] 上传头像响应:', response);
    return response;
  } catch (error) {
    console.error('[UserApi] 上传头像失败:', error);
    return {
      code: 500,
      message: error instanceof Error ? error.message : "未知错误",
      data: null as unknown as { url: string },
      timestamp: Date.now(),
    };
  }
}
