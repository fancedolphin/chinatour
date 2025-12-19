import { X, Download, Link2, Mail, Instagram, Facebook, Twitter, MessageCircle, Share2, Camera, FileText, Palette, Sparkles, Compass } from 'lucide-react';
import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { TripShareCard } from './TripShareCard';
import { TripShareCardStyles } from './TripShareCardStyles';
import { toast } from 'sonner@2.0.3';
import html2canvas from 'html2canvas';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardStyle, setCardStyle] = useState<'modern' | 'minimal' | 'instagram' | 'story'>('modern');
  const cardRef = useRef<HTMLDivElement>(null);

  const shareUrl = `https://smarttravel.ai/trip/${trip.id}`;
  const shareText = `Check out my ${trip.days || 5}-day trip to ${trip.destination}! ✈️🌍`;

  // Generate image from card
  const generateImage = async (): Promise<string> => {
    if (!cardRef.current) return '';
    
    setIsGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
      });
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error generating image:', error);
      toast.error('Failed to generate image');
      return '';
    } finally {
      setIsGenerating(false);
    }
  };

  // Download as image
  const handleDownloadImage = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;

    const link = document.createElement('a');
    link.download = `${trip.destination.replace(/\s+/g, '-')}-trip.png`;
    link.href = dataUrl;
    link.click();
    
    toast.success('Image downloaded successfully!');
  };

  // Copy link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  // Social media shares
  const handleInstagramShare = async () => {
    await generateImage();
    toast.success('Image ready! Save and share to Instagram', {
      description: 'Click "Download Image" then upload to Instagram',
      duration: 5000,
    });
  };

  const handleFacebookShare = () => {
    const url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleTwitterShare = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleWhatsAppShare = () => {
    const text = `${shareText}\n${shareUrl}`;
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const handlePinterestShare = async () => {
    const imageUrl = await generateImage();
    if (!imageUrl) return;
    
    const url = `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&media=${encodeURIComponent(imageUrl)}&description=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank', 'width=600,height=400');
  };

  const handleEmailShare = () => {
    const subject = encodeURIComponent(`My trip to ${trip.destination}`);
    const body = encodeURIComponent(`${shareText}\n\nView my full trip itinerary: ${shareUrl}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleDownloadPDF = () => {
    toast.success('PDF export coming soon!', {
      description: 'This feature is under development',
    });
  };

  const handleShareToDiscover = () => {
    // 分享到发现页面
    toast.success('已分享到发现页面！', {
      description: '您的行程已成功分享到发现页面，其他用户现在可以看到了',
      duration: 4000,
    });
    // 这里可以添加实际的分享逻辑，比如调用API
  };

  const socialPlatforms = [
    {
      name: '发现',
      icon: Compass,
      color: 'from-red-500 to-pink-500',
      onClick: handleShareToDiscover,
      description: '分享到发现页面',
      featured: true,
    },
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
      name: 'Pinterest',
      icon: Share2,
      color: 'from-red-600 to-red-500',
      onClick: handlePinterestShare,
      description: 'Pin to board',
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
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[95vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-3xl z-10">
          <div>
            <h2 className="text-gray-900">Share Your Trip</h2>
            <p className="text-sm text-gray-500 mt-1">Share your adventure with the world</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-gray-100 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6">
          <Tabs defaultValue="share" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="share" className="gap-2">
                <Share2 className="w-4 h-4" />
                Share
              </TabsTrigger>
              <TabsTrigger value="preview" className="gap-2">
                <Camera className="w-4 h-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="styles" className="gap-2">
                <Palette className="w-4 h-4" />
                Styles
              </TabsTrigger>
              <TabsTrigger value="export" className="gap-2">
                <Download className="w-4 h-4" />
                Export
              </TabsTrigger>
            </TabsList>

            {/* Share Tab */}
            <TabsContent value="share" className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <h3 className="text-sm text-gray-700 mb-3 uppercase tracking-wide">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleCopyLink}
                    variant="outline"
                    className="justify-start gap-3 h-auto py-3"
                  >
                    <Link2 className="w-5 h-5 text-blue-500" />
                    <div className="text-left">
                      <p className="text-sm text-gray-900">Copy Link</p>
                      <p className="text-xs text-gray-500">Share anywhere</p>
                    </div>
                  </Button>
                  <Button
                    onClick={handleDownloadImage}
                    variant="outline"
                    className="justify-start gap-3 h-auto py-3"
                    disabled={isGenerating}
                  >
                    <Download className="w-5 h-5 text-green-500" />
                    <div className="text-left">
                      <p className="text-sm text-gray-900">
                        {isGenerating ? 'Generating...' : 'Download'}
                      </p>
                      <p className="text-xs text-gray-500">Save as image</p>
                    </div>
                  </Button>
                </div>
              </div>

              {/* 分享到发现 - 特别突出显示 */}
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-4 border-2 border-red-200">
                <h3 className="text-sm text-red-700 mb-3 uppercase tracking-wide flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  平台推荐
                </h3>
                <button
                  onClick={handleShareToDiscover}
                  disabled={isGenerating}
                  className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl hover:shadow-lg transition-all group disabled:opacity-50 disabled:cursor-not-allowed border-2 border-transparent hover:border-red-300"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-500 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <Compass className="w-7 h-7 text-white" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="text-gray-900">分享到发现</p>
                    <p className="text-xs text-gray-500">让更多人看到你的精彩行程</p>
                  </div>
                  <div className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs">
                    推荐
                  </div>
                </button>
              </div>

              {/* Social Media Platforms */}
              <div>
                <h3 className="text-sm text-gray-700 mb-4 uppercase tracking-wide">Share to Social Media</h3>
                <div className="grid grid-cols-2 gap-3">
                  {socialPlatforms.filter(p => !p.featured).map((platform) => (
                    <button
                      key={platform.name}
                      onClick={platform.onClick}
                      disabled={isGenerating}
                      className="flex items-center gap-4 p-4 rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:shadow-md transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className={`w-12 h-12 bg-gradient-to-br ${platform.color} rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
                        <platform.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="text-left">
                        <p className="text-sm text-gray-900">{platform.name}</p>
                        <p className="text-xs text-gray-500">{platform.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Share Link Preview */}
              <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-4 border border-red-100">
                <p className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Share URL</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 text-sm text-gray-900 bg-white px-3 py-2 rounded-lg overflow-x-auto">
                    {shareUrl}
                  </code>
                  <Button
                    onClick={handleCopyLink}
                    size="sm"
                    variant="ghost"
                  >
                    <Link2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </TabsContent>

            {/* Preview Tab */}
            <TabsContent value="preview" className="flex justify-center py-6">
              <div ref={cardRef}>
                <TripShareCardStyles trip={trip} style={cardStyle} />
              </div>
            </TabsContent>

            {/* Styles Tab */}
            <TabsContent value="styles" className="space-y-4">
              <div>
                <h3 className="text-sm text-gray-700 mb-4 uppercase tracking-wide">Choose Your Style</h3>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setCardStyle('modern')}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                      cardStyle === 'modern' ? 'border-red-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="aspect-[3/4] bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center">
                      <div className="text-white text-center">
                        <Sparkles className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Modern</p>
                      </div>
                    </div>
                    {cardStyle === 'modern' && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setCardStyle('minimal')}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                      cardStyle === 'minimal' ? 'border-red-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="aspect-[3/4] bg-gray-100 flex items-center justify-center">
                      <div className="text-gray-700 text-center">
                        <FileText className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Minimal</p>
                      </div>
                    </div>
                    {cardStyle === 'minimal' && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setCardStyle('instagram')}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                      cardStyle === 'instagram' ? 'border-red-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="aspect-square bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <div className="text-white text-center">
                        <Instagram className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Instagram</p>
                        <p className="text-xs opacity-80">Post (1:1)</p>
                      </div>
                    </div>
                    {cardStyle === 'instagram' && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>

                  <button
                    onClick={() => setCardStyle('story')}
                    className={`relative rounded-2xl overflow-hidden border-2 transition-all ${
                      cardStyle === 'story' ? 'border-red-500 shadow-lg' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="aspect-[9/16] bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
                      <div className="text-white text-center">
                        <Camera className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Story</p>
                        <p className="text-xs opacity-80">Vertical (9:16)</p>
                      </div>
                    </div>
                    {cardStyle === 'story' && (
                      <div className="absolute top-2 right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-xs">✓</span>
                      </div>
                    )}
                  </button>
                </div>

                <div className="mt-6 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-4 border border-blue-200">
                  <h4 className="text-sm text-gray-900 mb-2">💡 Style Tips</h4>
                  <ul className="text-xs text-gray-600 space-y-1">
                    {cardStyle === 'modern' && (
                      <>
                        <li>• Perfect for general social media sharing</li>
                        <li>• Eye-catching gradient design</li>
                        <li>• Optimized for desktop and mobile</li>
                      </>
                    )}
                    {cardStyle === 'minimal' && (
                      <>
                        <li>• Clean and professional look</li>
                        <li>• Great for portfolio or blog</li>
                        <li>• Focus on content over design</li>
                      </>
                    )}
                    {cardStyle === 'instagram' && (
                      <>
                        <li>• Square format for Instagram posts</li>
                        <li>• Optimized for feed visibility</li>
                        <li>• Perfect aspect ratio (1:1)</li>
                      </>
                    )}
                    {cardStyle === 'story' && (
                      <>
                        <li>• Vertical format for Instagram Stories</li>
                        <li>• Full-screen mobile experience</li>
                        <li>• Aspect ratio: 9:16</li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
            </TabsContent>

            {/* Export Tab */}
            <TabsContent value="export" className="space-y-4">
              <div className="grid gap-4">
                <button
                  onClick={handleDownloadImage}
                  disabled={isGenerating}
                  className="flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                    <Camera className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-gray-900 mb-1">Export as Image (PNG)</h3>
                    <p className="text-sm text-gray-600">
                      High-quality image perfect for social media
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Recommended: 1200x1600px
                    </p>
                  </div>
                  <span className="text-sm text-blue-600 group-hover:text-blue-700">
                    {isGenerating ? 'Generating...' : 'Download →'}
                  </span>
                </button>

                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-200 hover:border-red-500 hover:bg-red-50 transition-all group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl flex items-center justify-center">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-gray-900 mb-1">Export as PDF</h3>
                    <p className="text-sm text-gray-600">
                      Complete itinerary with all details
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Coming soon
                    </p>
                  </div>
                  <span className="text-sm text-red-600 group-hover:text-red-700">
                    Download →
                  </span>
                </button>

                <button
                  onClick={handleCopyLink}
                  className="flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all group"
                >
                  <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl flex items-center justify-center">
                    <Link2 className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-gray-900 mb-1">Share Link</h3>
                    <p className="text-sm text-gray-600">
                      Copy shareable link to clipboard
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Anyone with the link can view
                    </p>
                  </div>
                  <span className="text-sm text-green-600 group-hover:text-green-700">
                    Copy →
                  </span>
                </button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
