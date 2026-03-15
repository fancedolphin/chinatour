import { useState } from 'react';
import { Loader2, Globe } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { sharedTripService } from '@/services/sharedTripService';

interface PublishTripModalProps {
  tripId: string;
  tripDestination: string;
  userId: string;
  onClose: () => void;
  onPublished: () => void;
}

export function PublishTripModal({
  tripId,
  tripDestination,
  userId,
  onClose,
  onPublished,
}: PublishTripModalProps) {
  const [description, setDescription] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    const tags = tagsInput
      .split(/[,，\s]+/)
      .map((t) => t.trim())
      .filter(Boolean);

    try {
      setLoading(true);
      await sharedTripService.publishTrip(tripId, userId, {
        description: description.trim() || undefined,
        tags: tags.length > 0 ? tags : undefined,
      });
      toast.success('行程已发布到广场！');
      onPublished();
      onClose();
    } catch (err) {
      toast.error('发布失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl">
        <div className="flex items-center gap-2 mb-6">
          <Globe className="w-5 h-5 text-red-500" />
          <h2 className="text-gray-900">发布到广场</h2>
        </div>

        <p className="text-sm text-gray-500 mb-5">
          将「{tripDestination}」分享给其他旅行者，他们可以收藏或导入你的行程。
        </p>

        {/* Description */}
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">行程简介（可选）</label>
          <textarea
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none outline-none focus:border-red-400"
            rows={3}
            maxLength={200}
            placeholder="分享一下这次旅行的亮点..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <p className="text-xs text-gray-400 text-right">{description.length}/200</p>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="block text-sm text-gray-700 mb-1">标签（可选，逗号分隔）</label>
          <input
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
            placeholder="如：美食, 历史, 亲子"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
          />
        </div>

        <div className="flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button
            className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            onClick={handlePublish}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            发布
          </Button>
        </div>
      </div>
    </div>
  );
}
