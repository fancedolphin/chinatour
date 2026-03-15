import { useState } from 'react';
import { Loader2, Globe, X } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { sharedTripService } from '@/services/sharedTripService';

const PRESET_TAGS = ['亲子游', '蜜月旅行', '自由行', '打卡美食', '穷游攻略', '周末短途'];
const MAX_TAGS = 3;

interface PublishTripModalProps {
  tripId: string;
  tripDestination: string;
  userId: string;
  alreadyPublished?: boolean;
  onClose: () => void;
  onPublished: () => void;
  onUnpublished?: () => void;
}

export function PublishTripModal({
  tripId,
  tripDestination,
  userId,
  alreadyPublished = false,
  onClose,
  onPublished,
  onUnpublished,
}: PublishTripModalProps) {
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  };

  const handlePublish = async () => {
    try {
      setLoading(true);
      await sharedTripService.publishTrip(tripId, userId, {
        description: description.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
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

  const handleUnpublish = async () => {
    try {
      setLoading(true);
      await sharedTripService.unpublishTrip(tripId);
      toast.success('已从广场撤下');
      onUnpublished?.();
      onClose();
    } catch (err) {
      toast.error('撤下失败：' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl p-6 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-red-500" />
            <h2 className="text-gray-900">
              {alreadyPublished ? '管理发布' : '发布到广场'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
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

        {/* Preset Tags */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm text-gray-700">标签（最多选 {MAX_TAGS} 个）</label>
            <span className="text-xs text-gray-400">{selectedTags.length}/{MAX_TAGS}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESET_TAGS.map((tag) => {
              const selected = selectedTags.includes(tag);
              const disabled = !selected && selectedTags.length >= MAX_TAGS;
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  disabled={disabled}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    selected
                      ? 'bg-red-500 text-white border-red-500'
                      : disabled
                      ? 'bg-gray-50 text-gray-300 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-500'
                  }`}
                >
                  {tag}
                </button>
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          {alreadyPublished ? (
            <>
              <Button
                variant="outline"
                className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                onClick={handleUnpublish}
                disabled={loading}
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                撤下广场
              </Button>
              <Button
                className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                onClick={handlePublish}
                disabled={loading}
              >
                更新发布
              </Button>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  );
}
