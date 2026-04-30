import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera,
  Compass,
  Download,
  Facebook,
  FileText,
  Instagram,
  Link2,
  Mail,
  MessageCircle,
  Palette,
  Share2,
  Sparkles,
  Twitter,
  X,
} from 'lucide-react';
import html2canvas from 'html2canvas';
import QRCode from 'qrcode';
import { toast } from 'sonner@2.0.3';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { TripShareCardStyles } from './TripShareCardStyles';
import { downloadTripPDF } from '@/services/exportService';
import { tripService, type TripDetail } from '@/services/tripService';
import { buildTripShareUrl, extractTripHighlights, getTripDayCount } from '@/utils/tripShare';
import { supabase } from '@/utils/supabase/client';
import { useT } from '@/i18n/useT';

interface ShareTripModalProps {
  trip: {
    id: string;
    destination: string;
    startDate: string;
    endDate: string;
    budget?: string;
    image: string;
    highlights?: string[];
    days?: number;
  };
  onClose: () => void;
}

export function ShareTripModal({ trip, onClose }: ShareTripModalProps) {
  const { t } = useT();
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [cardStyle, setCardStyle] = useState<'modern' | 'minimal' | 'instagram' | 'story'>('modern');
  const [tripDetail, setTripDetail] = useState<TripDetail | null>(null);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null);
  const [sharedTripId, setSharedTripId] = useState<string | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const shareUrl = useMemo(() => (
    sharedTripId ? buildTripShareUrl(sharedTripId) : `${window.location.origin}/discover`
  ), [sharedTripId]);

  useEffect(() => {
    let cancelled = false;

    const loadTripDetail = async () => {
      try {
        const [detail, sharedRecord] = await Promise.all([
          tripService.getTripDetail(trip.id),
          supabase
            .from('shared_trips')
            .select('id')
            .eq('trip_id', trip.id)
            .eq('is_active', true)
            .maybeSingle(),
        ]);
        if (!cancelled) {
          setTripDetail(detail);
          setSharedTripId(sharedRecord.data?.id ?? null);
        }
      } catch (error) {
        console.error('[ShareTripModal] 加载行程详情失败:', error);
      }
    };

    loadTripDetail();
    return () => {
      cancelled = true;
    };
  }, [trip.id]);

  useEffect(() => {
    let cancelled = false;

    if (!sharedTripId) {
      setQrCodeDataUrl(null);
      return () => {
        cancelled = true;
      };
    }

    QRCode.toDataURL(shareUrl, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrCodeDataUrl(dataUrl);
        }
      })
      .catch((error) => {
        console.error('[ShareTripModal] 二维码生成失败:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [shareUrl, sharedTripId]);

  const enrichedTrip = useMemo(() => {
    const startDate = tripDetail?.start_date || trip.startDate;
    const endDate = tripDetail?.end_date || trip.endDate;
    const budget = tripDetail?.budget || trip.budget;
    const days = trip.days || getTripDayCount({
      duration: tripDetail?.duration,
      startDate,
      endDate,
      itinerariesCount: tripDetail?.trip_itineraries?.length,
    });
    const highlights = tripDetail ? extractTripHighlights(tripDetail, 3) : (trip.highlights ?? []);

    return {
      ...trip,
      startDate,
      endDate,
      budget,
      days,
      highlights,
      image: tripDetail?.image_url || trip.image,
      qrCodeDataUrl,
    };
  }, [qrCodeDataUrl, trip, tripDetail]);

  const shareText = `Check out my ${enrichedTrip.days || 1}-day trip to ${enrichedTrip.destination}!`;

  const generateImage = async () => {
    if (!cardRef.current) {
      return '';
    }

    setIsGeneratingImage(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
      });

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('[ShareTripModal] 图片生成失败:', error);
      toast.error(t('shareTrip.imageFailed'));
      return '';
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleDownloadImage = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) {
      return;
    }

    const link = document.createElement('a');
    link.download = `${enrichedTrip.destination.replace(/\s+/g, '-')}-trip.png`;
    link.href = dataUrl;
    link.click();
    toast.success(t('shareTrip.imageDownloaded'));
  };

  const handleDownloadPDF = async () => {
    try {
      setIsGeneratingPdf(true);
      let detail = tripDetail;
      if (!detail) {
        detail = await tripService.getTripDetail(trip.id);
        setTripDetail(detail);
      }

      await downloadTripPDF(detail);
      toast.success(t('shareTrip.pdfStarted'));
    } catch (error) {
      console.error('[ShareTripModal] PDF export failed:', error);
      toast.error(error instanceof Error ? error.message : t('shareTrip.pdfFailed'));
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success(t('shareTrip.linkCopied'));
    } catch (error) {
      console.error('[ShareTripModal] copy link failed:', error);
      toast.error(t('shareTrip.linkCopyFailed'));
    }
  };

  const handleInstagramShare = async () => {
    await generateImage();
    toast.success(t('shareTrip.instagramReady'));
  };

  const handleFacebookShare = () => {
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'width=600,height=400',
    );
  };

  const handleTwitterShare = () => {
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`,
      '_blank',
      'width=600,height=400',
    );
  };

  const handleWhatsAppShare = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText}\n${shareUrl}`)}`, '_blank');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`My trip to ${enrichedTrip.destination}`);
    const body = encodeURIComponent(`${shareText}\n\nView my full itinerary: ${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleShareToDiscover = () => {
    toast.success(t('shareTrip.shareToDiscoverToast'), {
      description: t('shareTrip.shareToDiscoverToastDesc'),
    });
  };

  const socialPlatforms = [
    {
      name: 'Instagram',
      icon: Instagram,
      color: 'from-purple-500 to-pink-500',
      onClick: handleInstagramShare,
      description: 'Share as Story or Post',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'from-blue-600 to-blue-500',
      onClick: handleFacebookShare,
      description: 'Share on Timeline',
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'from-sky-500 to-blue-400',
      onClick: handleTwitterShare,
      description: 'Tweet your trip',
    },
    {
      name: 'WhatsApp',
      icon: MessageCircle,
      color: 'from-green-500 to-green-400',
      onClick: handleWhatsAppShare,
      description: 'Send to contacts',
    },
    {
      name: 'Email',
      icon: Mail,
      color: 'from-gray-600 to-gray-500',
      onClick: handleEmailShare,
      description: 'Send via email',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[95vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between rounded-t-3xl border-b border-gray-200 bg-white px-6 py-4">
          <div>
            <h2 className="text-gray-900">{t('shareTrip.title')}</h2>
            <p className="mt-1 text-sm text-gray-500">{t('shareTrip.subtitle')}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <Tabs defaultValue="share" className="w-full">
            <TabsList className="mb-6 grid w-full grid-cols-4">
              <TabsTrigger value="share" className="gap-2">
                <Share2 className="h-4 w-4" />
                {t('shareTrip.tabShare')}
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Camera className="h-4 w-4" />
                {t('shareTrip.tabPreview')}
              </TabsTrigger>
              <TabsTrigger value="styles" className="gap-2">
                <Palette className="h-4 w-4" />
                {t('shareTrip.tabStyles')}
              </TabsTrigger>
              <TabsTrigger value="export" className="gap-2">
                <Download className="h-4 w-4" />
                {t('shareTrip.tabExport')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="share" className="space-y-6">
              <div className="rounded-2xl border-2 border-red-200 bg-gradient-to-br from-red-50 to-pink-50 p-4">
                <h3 className="mb-3 flex items-center gap-2 text-sm uppercase tracking-wide text-red-700">
                  <Sparkles className="h-4 w-4" />
                  {t('shareTrip.platformRecommend')}
                </h3>
                <button
                  onClick={handleShareToDiscover}
                  className="group flex w-full items-center gap-4 rounded-2xl border-2 border-transparent bg-white p-4 transition-all hover:border-red-300 hover:shadow-lg"
                >
                  <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-pink-500 transition-transform group-hover:scale-110">
                    <Compass className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-gray-900">{t('shareTrip.shareToDiscover')}</p>
                    <p className="text-xs text-gray-500">{t('shareTrip.shareToDiscoverDesc')}</p>
                  </div>
                  <div className="rounded-full bg-red-100 px-3 py-1 text-xs text-red-600">{t('shareTrip.shareToDiscoverBadge')}</div>
                </button>
              </div>

              <div className="rounded-2xl bg-gray-50 p-4">
                <h3 className="mb-3 text-sm uppercase tracking-wide text-gray-700">{t('shareTrip.quickActions')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={handleCopyLink} variant="outline" className="h-auto justify-start gap-3 py-3">
                    <Link2 className="h-5 w-5 text-blue-500" />
                    <div className="text-left">
                      <p className="text-sm text-gray-900">{t('shareTrip.copyLink')}</p>
                      <p className="text-xs text-gray-500">{t('shareTrip.copyLinkDesc')}</p>
                    </div>
                  </Button>
                  <Button
                    onClick={handleDownloadImage}
                    variant="outline"
                    className="h-auto justify-start gap-3 py-3"
                    disabled={isGeneratingImage}
                  >
                    <Download className="h-5 w-5 text-green-500" />
                    <div className="text-left">
                      <p className="text-sm text-gray-900">{isGeneratingImage ? t('shareTrip.generating') : t('shareTrip.download')}</p>
                      <p className="text-xs text-gray-500">{t('shareTrip.downloadDesc')}</p>
                    </div>
                  </Button>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-sm uppercase tracking-wide text-gray-700">{t('shareTrip.shareSocial')}</h3>
                <div className="grid grid-cols-2 gap-3">
                  {socialPlatforms.map((platform) => (
                    <button
                      key={platform.name}
                      onClick={platform.onClick}
                      disabled={isGeneratingImage}
                      className="group flex items-center gap-4 rounded-2xl border-2 border-gray-200 p-4 transition-all hover:border-gray-300 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${platform.color} transition-transform group-hover:scale-110`}>
                        <platform.icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-gray-900">{platform.name}</p>
                        <p className="text-xs text-gray-500">{platform.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-pink-50 p-4">
                <p className="mb-2 text-xs uppercase tracking-wide text-gray-600">{t('shareTrip.shareUrl')}</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 overflow-x-auto rounded-lg bg-white px-3 py-2 text-sm text-gray-900">
                    {shareUrl}
                  </code>
                  <Button onClick={handleCopyLink} size="sm" variant="ghost">
                    <Link2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="preview" className="flex justify-center py-6">
              <div className="space-y-3">
                <div ref={cardRef}>
                  <TripShareCardStyles trip={enrichedTrip} style={cardStyle} />
                </div>
                <p className="text-center text-xs text-gray-500">
                  {sharedTripId ? t('shareTrip.previewWithQR') : t('shareTrip.previewNoQR')}
                </p>
              </div>
            </TabsContent>

            <TabsContent value="styles" className="space-y-4">
              <div>
                <h3 className="mb-4 text-sm uppercase tracking-wide text-gray-700">{t('shareTrip.chooseStyle')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  {([
                    ['modern', 'Modern', 'from-red-500 to-pink-500'],
                    ['minimal', 'Minimal', 'from-gray-100 to-gray-200'],
                    ['instagram', 'Instagram', 'from-purple-500 to-pink-500'],
                    ['story', 'Story', 'from-blue-500 to-purple-500'],
                  ] as const).map(([value, label, gradient]) => (
                    <button
                      key={value}
                      onClick={() => setCardStyle(value)}
                      className={`relative overflow-hidden rounded-2xl border-2 transition-all ${
                        cardStyle === value ? 'border-red-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`flex aspect-[3/4] items-center justify-center bg-gradient-to-br ${gradient}`}>
                        <div className="text-center text-white">
                          <Sparkles className="mx-auto mb-2 h-8 w-8" />
                          <p className="text-sm">{label}</p>
                        </div>
                      </div>
                      {cardStyle === value && (
                        <div className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                          ✓
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="export" className="space-y-4">
              <div className="grid gap-4">
                <button
                  onClick={handleDownloadImage}
                  disabled={isGeneratingImage}
                  className="group flex items-center gap-4 rounded-2xl border-2 border-gray-200 p-6 transition-all hover:border-blue-500 hover:bg-blue-50"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600">
                    <Camera className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="mb-1 text-gray-900">{t('shareTrip.exportImageTitle')}</h3>
                    <p className="text-sm text-gray-600">{t('shareTrip.exportImageDesc')}</p>
                    <p className="mt-1 text-xs text-gray-500">{t('shareTrip.exportImageHint')}</p>
                  </div>
                  <span className="text-sm text-blue-600 group-hover:text-blue-700">
                    {isGeneratingImage ? t('shareTrip.generating') : t('shareTrip.downloadAction')}
                  </span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPdf}
                  className="group flex items-center gap-4 rounded-2xl border-2 border-gray-200 p-6 transition-all hover:border-red-500 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-pink-500">
                    <FileText className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="mb-1 text-gray-900">{t('shareTrip.exportPdfTitle')}</h3>
                    <p className="text-sm text-gray-600">{t('shareTrip.exportPdfDesc')}</p>
                    <p className="mt-1 text-xs text-gray-500">{t('shareTrip.exportPdfHint')}</p>
                  </div>
                  <span className="text-sm text-red-600 group-hover:text-red-700">
                    {isGeneratingPdf ? t('shareTrip.generating') : t('shareTrip.downloadAction')}
                  </span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="group flex items-center gap-4 rounded-2xl border-2 border-gray-200 p-6 transition-all hover:border-green-500 hover:bg-green-50"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-green-600">
                    <Link2 className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="mb-1 text-gray-900">{t('shareTrip.shareLinkTitle')}</h3>
                    <p className="text-sm text-gray-600">{t('shareTrip.shareLinkDesc')}</p>
                    <p className="mt-1 text-xs text-gray-500">{t('shareTrip.shareLinkHint')}</p>
                  </div>
                  <span className="text-sm text-green-600 group-hover:text-green-700">{t('shareTrip.copyAction')}</span>
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
