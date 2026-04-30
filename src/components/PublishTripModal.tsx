import { useState } from 'react';
import { Loader2, Globe, X, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { sharedTripService } from '@/services/sharedTripService';
import { useT } from '@/i18n/useT';

const MAX_TAGS = 3;

type Status = 'idle' | 'loading' | 'success' | 'error';

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
  const { t } = useT();
  const PRESET_TAGS = t('publishTrip.presetTags', { returnObjects: true }) as string[];
  const [title, setTitle] = useState(tripDestination);
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      if (prev.includes(tag)) return prev.filter((t) => t !== tag);
      if (prev.length >= MAX_TAGS) return prev;
      return [...prev, tag];
    });
  };

  const handlePublish = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      await sharedTripService.publishTrip(tripId, userId, {
        title: title.trim() || undefined,
        description: description.trim() || undefined,
        coverImage: coverImage.trim() || undefined,
        tags: selectedTags.length > 0 ? selectedTags : undefined,
      });
      setSuccessMsg(t('publishTrip.publishSuccess'));
      setStatus('success');
      onPublished();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('publishTrip.publishFailed'));
      setStatus('error');
    }
  };

  const handleUnpublish = async () => {
    setStatus('loading');
    setErrorMsg('');
    try {
      await sharedTripService.unpublishTrip(tripId);
      setSuccessMsg(t('publishTrip.unpublishSuccess'));
      setStatus('success');
      onUnpublished?.();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : t('publishTrip.unpublishFailed'));
      setStatus('error');
    }
  };

  const isLoading = status === 'loading';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/50" onClick={status === 'loading' ? undefined : onClose} />

      <div className="relative bg-white rounded-t-2xl w-full flex flex-col" style={{ maxHeight: '80vh' }}>

        {/* 头部 */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-red-500" />
            <span className="text-base font-medium text-gray-900">
              {alreadyPublished ? t('publishTrip.manageTitle') : t('publishTrip.publishTitle')}
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 成功状态 */}
        {status === 'success' && (
          <div className="flex-1 flex flex-col items-center justify-center px-5 py-10 gap-4">
            <CheckCircle2 className="w-16 h-16 text-green-500" />
            <p className="text-lg font-medium text-gray-900">{successMsg}</p>
            <Button className="w-full bg-red-500 hover:bg-red-600 text-white mt-2" onClick={onClose}>
              {t('publishTrip.done')}
            </Button>
          </div>
        )}

        {/* 错误提示（内联，不依赖 toast） */}
        {status === 'error' && (
          <div className="mx-5 mb-3 flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex-shrink-0">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-600">{errorMsg}</p>
          </div>
        )}

        {/* 表单内容（success 时隐藏） */}
        {status !== 'success' && (
          <>
            <div className="flex-1 overflow-y-auto px-5">
              <p className="text-sm text-gray-500 mb-4">
                {t('publishTrip.intro', { destination: tripDestination })}
              </p>

              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-1">{t('publishTrip.titleLabel')}</label>
                <input
                  type="text"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  maxLength={50}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-1">{t('publishTrip.coverLabel')}</label>
                <input
                  type="url"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-red-400"
                  placeholder={t('publishTrip.coverPlaceholder')}
                  value={coverImage}
                  onChange={(e) => setCoverImage(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm text-gray-700 mb-1">{t('publishTrip.descLabel')}</label>
                <textarea
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none outline-none focus:border-red-400"
                  rows={3}
                  maxLength={200}
                  placeholder={t('publishTrip.descPlaceholder')}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-xs text-gray-400 text-right">{description.length}/200</p>
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-700">{t('publishTrip.tagsLabel', { max: MAX_TAGS })}</label>
                  <span className="text-xs text-gray-400">{selectedTags.length}/{MAX_TAGS}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TAGS.map((tag) => {
                    const selected = selectedTags.includes(tag);
                    const disabled = isLoading || (!selected && selectedTags.length >= MAX_TAGS);
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
            </div>

            {/* 底部按钮 — 所有按钮内容用 span 包裹，避免 element+文本节点混用导致 React DOM crash */}
            <div className="flex-shrink-0 flex gap-3 px-5 py-4 border-t border-gray-100">
              {alreadyPublished ? (
                <>
                  <Button
                    variant="outline"
                    className="flex-1 text-red-500 border-red-200 hover:bg-red-50"
                    onClick={handleUnpublish}
                    disabled={isLoading}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{isLoading ? t('publishTrip.processing') : t('publishTrip.unpublish')}</span>
                    </span>
                  </Button>
                  <Button
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    onClick={handlePublish}
                    disabled={isLoading}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{isLoading ? t('publishTrip.processing') : t('publishTrip.updatePublish')}</span>
                    </span>
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onClose}
                    disabled={isLoading}
                  >
                    {t('publishTrip.cancel')}
                  </Button>
                  <Button
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white"
                    onClick={handlePublish}
                    disabled={isLoading}
                  >
                    <span className="flex items-center justify-center gap-2">
                      {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <span>{isLoading ? t('publishTrip.processing') : t('publishTrip.publish')}</span>
                    </span>
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
