import { httpClient, ApiResponse } from '../http/HttpClient';
import { API_ENDPOINTS } from '../config/api.config';

// 登录请求
export interface LoginRequest {
  email: string;
  password: string;
}

// 登录响应
export interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
    nickname: string;
    avatar?: string;
  };
}

// 注册请求
export interface RegisterRequest {
  email: string;
  password: string;
  nickname: string;
}

// 注册响应
export interface RegisterResponse {
  token: string;
  user: {
    id: string;
    email: string;
    nickname: string;
  };
}

// SSO回调参数
export interface SSOCallbackParams {
  code: string;
  state?: string;
}

// 登录
export async function login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
  try {
    console.log('[AuthApi] 登录请求');
    const response = await httpClient.post<ApiResponse<LoginResponse>>(
      API_ENDPOINTS.AUTH.LOGIN,
      credentials
    );
    
    // 如果登录成功，保存token
    if (response.code === 200 && response.data?.token) {
      const token = response.data.token;
      localStorage.setItem('auth_token', token);
      // 同时设置到cookie（可选）
      document.cookie = `token=${token}; path=/; max-age=86400`; // 24小时过期
      console.log('[AuthApi] Token已保存');
    }
    
    return response;
  } catch (error) {
    console.error('[AuthApi] 登录失败:', error);
    return {
      code: 500,
      message: error instanceof Error ? error.message : '登录失败',
      data: null as unknown as LoginResponse,
      timestamp: Date.now(),
    };
  }
}

// 注册
export async function register(userData: RegisterRequest): Promise<ApiResponse<RegisterResponse>> {
  try {
    console.log('[AuthApi] 注册请求');
    const response = await httpClient.post<ApiResponse<RegisterResponse>>(
      API_ENDPOINTS.AUTH.REGISTER,
      userData
    );
    
    // 如果注册成功，保存token
    if (response.code === 200 && response.data?.token) {
      const token = response.data.token;
      localStorage.setItem('auth_token', token);
      document.cookie = `token=${token}; path=/; max-age=86400`;
      console.log('[AuthApi] 注册成功，Token已保存');
    }
    
    return response;
  } catch (error) {
    console.error('[AuthApi] 注册失败:', error);
    return {
      code: 500,
      message: error instanceof Error ? error.message : '注册失败',
      data: null as unknown as RegisterResponse,
      timestamp: Date.now(),
    };
  }
}

// 登出
export async function logout(): Promise<ApiResponse<null>> {
  try {
    console.log('[AuthApi] 登出请求');
    const response = await httpClient.post<ApiResponse<null>>(API_ENDPOINTS.AUTH.LOGOUT);
    
    // 清除本地token
    localStorage.removeItem('auth_token');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    console.log('[AuthApi] Token已清除');
    
    return response;
  } catch (error) {
    console.error('[AuthApi] 登出失败:', error);
    // 即使请求失败也清除本地token
    localStorage.removeItem('auth_token');
    document.cookie = 'token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
    
    return {
      code: 500,
      message: error instanceof Error ? error.message : '登出失败',
      data: null,
      timestamp: Date.now(),
    };
  }
}

// 刷新Token
export async function refreshToken(): Promise<ApiResponse<{ token: string }>> {
  try {
    console.log('[AuthApi] 刷新Token');
    const response = await httpClient.post<ApiResponse<{ token: string }>>(
      API_ENDPOINTS.AUTH.REFRESH_TOKEN
    );
    
    // 如果刷新成功，更新token
    if (response.code === 200 && response.data?.token) {
      const token = response.data.token;
      localStorage.setItem('auth_token', token);
      document.cookie = `token=${token}; path=/; max-age=86400`;
      console.log('[AuthApi] Token已刷新');
    }
    
    return response;
  } catch (error) {
    console.error('[AuthApi] 刷新Token失败:', error);
    return {
      code: 500,
      message: error instanceof Error ? error.message : '刷新Token失败',
      data: null as unknown as { token: string },
      timestamp: Date.now(),
    };
  }
}

// SSO回调处理
export async function handleSSOCallback(params: SSOCallbackParams): Promise<ApiResponse<LoginResponse>> {
  try {
    console.log('[AuthApi] SSO回调处理');
    const response = await httpClient.post<ApiResponse<LoginResponse>>(
      API_ENDPOINTS.AUTH.SSO_CALLBACK,
      params
    );
    
    // 如果SSO登录成功，保存token
    if (response.code === 200 && response.data?.token) {
      const token = response.data.token;
      localStorage.setItem('auth_token', token);
      document.cookie = `token=${token}; path=/; max-age=86400`;
      console.log('[AuthApi] SSO登录成功，Token已保存');
    }
    
    return response;
  } catch (error) {
    console.error('[AuthApi] SSO回调失败:', error);
    return {
      code: 500,
      message: error instanceof Error ? error.message : 'SSO登录失败',
      data: null as unknown as LoginResponse,
      timestamp: Date.now(),
    };
  }
}
