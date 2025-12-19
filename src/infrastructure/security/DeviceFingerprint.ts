/**
 * Infrastructure Layer - Enhanced Device Fingerprint
 * 增强型设备指纹生成器
 */

export interface FingerprintComponents {
  userAgent: string;
  language: string;
  platform: string;
  hardwareConcurrency: number;
  screenResolution: string;
  colorDepth: number;
  timezone: number;
  touchSupport: number;
  canvasFingerprint: string;
  webglFingerprint: string;
  audioFingerprint: string;
  fontsFingerprint: string;
  webrtcFingerprint: string;
}

/**
 * 增强型设备指纹生成器
 * 综合多种浏览器特征生成唯一标识
 */
export class DeviceFingerprint {
  private static instance: DeviceFingerprint;
  private fingerprint: string | null = null;
  private components: Partial<FingerprintComponents> = {};

  private constructor() {
    this.generateFingerprint();
  }

  static getInstance(): DeviceFingerprint {
    if (!DeviceFingerprint.instance) {
      DeviceFingerprint.instance = new DeviceFingerprint();
    }
    return DeviceFingerprint.instance;
  }

  /**
   * 生成完整指纹
   */
  private async generateFingerprint(): Promise<void> {
    this.components = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency || 0,
      screenResolution: `${screen.width}x${screen.height}x${screen.availWidth}x${screen.availHeight}`,
      colorDepth: screen.colorDepth,
      timezone: new Date().getTimezoneOffset(),
      touchSupport: navigator.maxTouchPoints || 0,
      canvasFingerprint: this.getCanvasFingerprint(),
      webglFingerprint: this.getWebGLFingerprint(),
      audioFingerprint: await this.getAudioFingerprint(),
      fontsFingerprint: this.getFontsFingerprint(),
      webrtcFingerprint: await this.getWebRTCFingerprint(),
    };

    this.fingerprint = this.hashComponents(this.components);
  }

  /**
   * Canvas指纹
   */
  private getCanvasFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return 'no-canvas';

      canvas.width = 200;
      canvas.height = 50;

      // 绘制复杂图形
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.font = '11pt Arial';
      ctx.fillText('SmartTravel 🌍', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.font = '18pt Times New Roman';
      ctx.fillText('AntiCrawler', 4, 45);

      // 添加emoji测试
      ctx.fillText('🎭🎨🎪', 100, 30);

      return canvas.toDataURL();
    } catch (e) {
      return 'canvas-error';
    }
  }

  /**
   * WebGL指纹
   */
  private getWebGLFingerprint(): string {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'no-webgl';

      const debugInfo = (gl as any).getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return 'no-debug-info';

      const vendor = (gl as any).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
      const renderer = (gl as any).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      const version = (gl as any).getParameter((gl as any).VERSION);
      const shadingLanguageVersion = (gl as any).getParameter((gl as any).SHADING_LANGUAGE_VERSION);

      return `${vendor}|${renderer}|${version}|${shadingLanguageVersion}`;
    } catch (e) {
      return 'webgl-error';
    }
  }

  /**
   * Audio指纹（AudioContext）
   */
  private async getAudioFingerprint(): Promise<string> {
    try {
      const AudioContext = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return 'no-audio';

      const context = new AudioContext();
      const oscillator = context.createOscillator();
      const analyser = context.createAnalyser();
      const gainNode = context.createGain();
      const scriptProcessor = context.createScriptProcessor(4096, 1, 1);

      gainNode.gain.value = 0; // 静音
      oscillator.type = 'triangle';
      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(context.destination);

      oscillator.start(0);

      return new Promise((resolve) => {
        scriptProcessor.onaudioprocess = (event) => {
          const output = event.outputBuffer.getChannelData(0);
          const hash = Array.from(output.slice(0, 30))
            .map(v => v.toFixed(6))
            .join('');
          oscillator.stop();
          scriptProcessor.disconnect();
          context.close();
          resolve(this.simpleHash(hash));
        };

        // 超时保护
        setTimeout(() => {
          oscillator.stop();
          context.close();
          resolve('audio-timeout');
        }, 1000);
      });
    } catch (e) {
      return 'audio-error';
    }
  }

  /**
   * 字体检测指纹
   */
  private getFontsFingerprint(): string {
    const baseFonts = ['monospace', 'sans-serif', 'serif'];
    const testFonts = [
      'Arial', 'Verdana', 'Times New Roman', 'Courier New',
      'Georgia', 'Palatino', 'Garamond', 'Bookman',
      'Comic Sans MS', 'Trebuchet MS', 'Impact',
      'Microsoft Sans Serif', 'Tahoma', 'Helvetica'
    ];

    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return 'no-canvas';

    const baselines: Record<string, number[]> = {};

    // 测量基准字体
    baseFonts.forEach(baseFont => {
      ctx.font = `${testSize} ${baseFont}`;
      baselines[baseFont] = [
        ctx.measureText(testString).width,
        (ctx as any).measureText(testString).actualBoundingBoxAscent || 0
      ];
    });

    // 检测可用字体
    const availableFonts: string[] = [];
    testFonts.forEach(font => {
      let detected = false;
      baseFonts.forEach(baseFont => {
        ctx.font = `${testSize} ${font}, ${baseFont}`;
        const measurement = [
          ctx.measureText(testString).width,
          (ctx as any).measureText(testString).actualBoundingBoxAscent || 0
        ];
        if (measurement[0] !== baselines[baseFont][0] || 
            measurement[1] !== baselines[baseFont][1]) {
          detected = true;
        }
      });
      if (detected) availableFonts.push(font);
    });

    return availableFonts.join(',') || 'no-fonts';
  }

  /**
   * WebRTC IP指纹
   */
  private async getWebRTCFingerprint(): Promise<string> {
    return new Promise((resolve) => {
      try {
        const RTCPeerConnection = (window as any).RTCPeerConnection ||
                                 (window as any).mozRTCPeerConnection ||
                                 (window as any).webkitRTCPeerConnection;

        if (!RTCPeerConnection) {
          resolve('no-webrtc');
          return;
        }

        const pc = new RTCPeerConnection({ iceServers: [] });
        const noop = () => {};

        pc.createDataChannel('');
        pc.createOffer()
          .then((offer: any) => pc.setLocalDescription(offer))
          .catch(noop);

        const ips: string[] = [];
        pc.onicecandidate = (ice: any) => {
          if (!ice || !ice.candidate || !ice.candidate.candidate) {
            pc.close();
            resolve(ips.join('|') || 'no-ice');
            return;
          }

          const parts = ice.candidate.candidate.split(' ');
          const ip = parts[4];
          if (ip && !ips.includes(ip)) {
            ips.push(ip);
          }
        };

        // 超时保护
        setTimeout(() => {
          pc.close();
          resolve(ips.join('|') || 'webrtc-timeout');
        }, 2000);
      } catch (e) {
        resolve('webrtc-error');
      }
    });
  }

  /**
   * 哈希组件生成指纹
   */
  private hashComponents(components: Partial<FingerprintComponents>): string {
    const str = JSON.stringify(components);
    return this.simpleHash(str);
  }

  /**
   * 简单哈希函数
   */
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * 获取指纹
   */
  getFingerprint(): string {
    return this.fingerprint || 'pending';
  }

  /**
   * 获取指纹组件
   */
  getComponents(): Partial<FingerprintComponents> {
    return { ...this.components };
  }

  /**
   * 检测是否为真实浏览器
   */
  isRealBrowser(): boolean {
    const checks = [
      // 检查navigator对象完整性
      typeof navigator !== 'undefined',
      typeof navigator.userAgent === 'string',
      typeof navigator.language === 'string',
      
      // 检查window对象
      typeof window !== 'undefined',
      typeof document !== 'undefined',
      
      // 检查是否有必要的API
      'localStorage' in window,
      'sessionStorage' in window,
      'indexedDB' in window,
      
      // 检查屏幕信息
      screen.width > 0 && screen.height > 0,
      
      // 检查插件
      navigator.plugins.length >= 0,
    ];

    return checks.filter(Boolean).length >= 8;
  }
}

/**
 * 导出单例
 */
export const deviceFingerprint = DeviceFingerprint.getInstance();
