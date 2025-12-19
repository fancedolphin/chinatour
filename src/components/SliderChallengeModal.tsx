/**
 * Slider Challenge Modal Component
 * 滑块验证弹窗组件
 */

import { useState, useRef, useEffect } from 'react';
import { X, RefreshCw, ShieldCheck } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { SliderChallenge } from '../infrastructure/security/ChallengeService';

interface SliderChallengeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (token: string) => void;
}

export function SliderChallengeModal({ open, onClose, onSuccess }: SliderChallengeModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [sliderPosition, setSliderPosition] = useState(0);
  const [targetPosition] = useState(Math.random() * 200 + 50); // 50-250px
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'failed'>('idle');
  const sliderRef = useRef<HTMLDivElement>(null);
  const challengeRef = useRef(new SliderChallenge());
  const startXRef = useRef(0);

  useEffect(() => {
    if (open) {
      challengeRef.current.start();
      setSliderPosition(0);
      setStatus('idle');
    }
  }, [open]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    startXRef.current = e.clientX - sliderPosition;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;

    const container = sliderRef.current?.parentElement;
    if (!container) return;

    const maxWidth = container.clientWidth - 50;
    let newPosition = e.clientX - startXRef.current;
    newPosition = Math.max(0, Math.min(newPosition, maxWidth));

    setSliderPosition(newPosition);
    challengeRef.current.recordMove(newPosition, 0);
  };

  const handleMouseUp = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    // 验证
    setStatus('verifying');
    
    setTimeout(() => {
      const result = challengeRef.current.verify(targetPosition, sliderPosition, 10);
      
      if (result.success && result.token) {
        setStatus('success');
        setTimeout(() => {
          onSuccess(result.token!);
          onClose();
        }, 1000);
      } else {
        setStatus('failed');
        setTimeout(() => {
          handleReset();
        }, 1500);
      }
    }, 300);
  };

  const handleReset = () => {
    setSliderPosition(0);
    setStatus('idle');
    challengeRef.current = new SliderChallenge();
    challengeRef.current.start();
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => {
      if (isDragging) {
        handleMouseUp();
      }
    };

    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, [isDragging, sliderPosition]);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-red-500" />
            安全验证
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            请拖动滑块完成验证
          </p>

          {/* 拼图区域 */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden" style={{ height: '200px' }}>
            {/* 背景图 - 模拟拼图 */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-200 via-purple-200 to-pink-200" />
            
            {/* 缺口 */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-12 h-12 bg-white/50 backdrop-blur-sm border-2 border-white/80 rounded"
              style={{ left: `${targetPosition}px` }}
            />

            {/* 拼图块 */}
            <div
              className={`absolute top-1/2 -translate-y-1/2 w-12 h-12 bg-gradient-to-r from-blue-400 to-purple-400 border-2 border-white rounded shadow-lg transition-opacity ${
                status === 'success' ? 'opacity-100' : 'opacity-90'
              }`}
              style={{ left: `${sliderPosition}px` }}
            />
          </div>

          {/* 滑块 */}
          <div
            className="relative h-12 bg-gray-200 rounded-lg overflow-hidden"
            onMouseMove={handleMouseMove}
          >
            {/* 进度条 */}
            <div
              className={`absolute inset-y-0 left-0 transition-colors ${
                status === 'success' ? 'bg-green-400' : 
                status === 'failed' ? 'bg-red-400' : 
                'bg-red-500'
              }`}
              style={{ width: `${sliderPosition}px` }}
            />

            {/* 滑块按钮 */}
            <div
              ref={sliderRef}
              className={`absolute top-1/2 -translate-y-1/2 w-12 h-10 bg-white rounded shadow-lg flex items-center justify-center cursor-grab active:cursor-grabbing transition-transform ${
                isDragging ? 'scale-105' : 'scale-100'
              }`}
              style={{ left: `${sliderPosition}px` }}
              onMouseDown={handleMouseDown}
            >
              {status === 'success' ? (
                <ShieldCheck className="w-5 h-5 text-green-500" />
              ) : status === 'failed' ? (
                <X className="w-5 h-5 text-red-500" />
              ) : (
                <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>

            {/* 提示文字 */}
            {status === 'idle' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="text-sm text-gray-500">向右拖动滑块</span>
              </div>
            )}
          </div>

          {/* 状态提示 */}
          <div className="text-center text-sm">
            {status === 'verifying' && (
              <span className="text-blue-600">正在验证...</span>
            )}
            {status === 'success' && (
              <span className="text-green-600 flex items-center justify-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                验证成功！
              </span>
            )}
            {status === 'failed' && (
              <span className="text-red-600 flex items-center justify-center gap-1">
                <X className="w-4 h-4" />
                验证失败，请重试
              </span>
            )}
          </div>

          {/* 操作按钮 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={handleReset}
              disabled={status === 'verifying' || status === 'success'}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              重试
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={onClose}
              disabled={status === 'verifying' || status === 'success'}
            >
              取消
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
