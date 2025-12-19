/**
 * Infrastructure Layer - Request Encryption
 * 请求加密模块 - 防止请求参数被轻易篡改
 */

/**
 * 加密工具类
 */
export class RequestEncryption {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_SIZE = 256;

  /**
   * 生成加密密钥
   */
  private static async generateKey(password: string): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      encoder.encode(password),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode('SmartTravel2024'),
        iterations: 100000,
        hash: 'SHA-256',
      },
      keyMaterial,
      { name: this.ALGORITHM, length: this.KEY_SIZE },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * 加密数据
   */
  static async encrypt(data: any, password: string): Promise<string> {
    try {
      const key = await this.generateKey(password);
      const encoder = new TextEncoder();
      const dataStr = JSON.stringify(data);
      const iv = crypto.getRandomValues(new Uint8Array(12));

      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        encoder.encode(dataStr)
      );

      // 组合IV和加密数据
      const combined = new Uint8Array(iv.length + encryptedData.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encryptedData), iv.length);

      // 转换为Base64
      return btoa(String.fromCharCode(...combined));
    } catch (error) {
      console.error('Encryption failed:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * 解密数据
   */
  static async decrypt(encryptedData: string, password: string): Promise<any> {
    try {
      const key = await this.generateKey(password);
      const combined = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
      
      // 分离IV和加密数据
      const iv = combined.slice(0, 12);
      const data = combined.slice(12);

      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
        },
        key,
        data
      );

      const decoder = new TextDecoder();
      const decryptedStr = decoder.decode(decryptedData);
      return JSON.parse(decryptedStr);
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * 生成请求签名
   */
  static generateSignature(
    method: string,
    url: string,
    timestamp: number,
    nonce: string,
    body?: any
  ): string {
    const parts = [
      method.toUpperCase(),
      url,
      timestamp.toString(),
      nonce,
      body ? JSON.stringify(body) : '',
    ];

    const message = parts.join('|');
    return this.simpleHash(message);
  }

  /**
   * 简单哈希函数（用于签名）
   */
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 生成随机Nonce
   */
  static generateNonce(): string {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * 混淆敏感参数
   */
  static obfuscateParams(params: Record<string, any>): Record<string, any> {
    const obfuscated: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      // 对敏感字段进行Base64编码
      if (this.isSensitiveField(key)) {
        obfuscated[`_${key}`] = btoa(JSON.stringify(value));
      } else {
        obfuscated[key] = value;
      }
    }

    return obfuscated;
  }

  /**
   * 反混淆参数
   */
  static deobfuscateParams(params: Record<string, any>): Record<string, any> {
    const deobfuscated: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(params)) {
      if (key.startsWith('_')) {
        const originalKey = key.substring(1);
        try {
          deobfuscated[originalKey] = JSON.parse(atob(value as string));
        } catch {
          deobfuscated[originalKey] = value;
        }
      } else {
        deobfuscated[key] = value;
      }
    }

    return deobfuscated;
  }

  /**
   * 检查是否为敏感字段
   */
  private static isSensitiveField(fieldName: string): boolean {
    const sensitiveFields = [
      'password',
      'token',
      'secret',
      'apiKey',
      'authorization',
      'creditCard',
      'ssn',
      'email',
      'phone'
    ];

    return sensitiveFields.some(field => 
      fieldName.toLowerCase().includes(field.toLowerCase())
    );
  }
}

/**
 * 请求加密中间件
 */
export class EncryptedRequestBuilder {
  private readonly secretKey: string;

  constructor(secretKey: string = 'SmartTravelSecretKey2024') {
    this.secretKey = secretKey;
  }

  /**
   * 构建加密请求
   */
  async buildEncryptedRequest(
    method: string,
    url: string,
    body?: any
  ): Promise<{
    headers: Record<string, string>;
    body?: string;
  }> {
    const timestamp = Date.now();
    const nonce = RequestEncryption.generateNonce();

    // 生成签名
    const signature = RequestEncryption.generateSignature(
      method,
      url,
      timestamp,
      nonce,
      body
    );

    // 加密body（如果存在）
    let encryptedBody: string | undefined;
    if (body) {
      encryptedBody = await RequestEncryption.encrypt(body, this.secretKey);
    }

    return {
      headers: {
        'X-Request-Time': timestamp.toString(),
        'X-Request-Nonce': nonce,
        'X-Request-Signature': signature,
        'Content-Type': encryptedBody ? 'application/encrypted' : 'application/json',
      },
      body: encryptedBody,
    };
  }

  /**
   * 解密响应
   */
  async decryptResponse(encryptedResponse: string): Promise<any> {
    return RequestEncryption.decrypt(encryptedResponse, this.secretKey);
  }
}
