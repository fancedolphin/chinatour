import { Heart, Star, MessageCircle } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { useState } from 'react';

export interface FeedItem {
  id: string;
  image: string;
  title: string;
  author: string;
  avatar: string;
  likes: number;
  height: number;
}

interface FeedCardProps {
  item: FeedItem;
}

export function FeedCard({ item }: FeedCardProps) {
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 cursor-pointer group">
      <div className="relative overflow-hidden">
        <ImageWithFallback
          src={item.image}
          alt={item.title}
          className="w-full object-cover transition-transform duration-300 group-hover:scale-105"
          style={{ height: `${item.height}px` }}
        />
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSaved(!saved);
            }}
            className={`p-2 rounded-full backdrop-blur-md ${
              saved ? 'bg-yellow-500/90' : 'bg-black/30'
            }`}
          >
            <Star
              className={`w-4 h-4 ${
                saved ? 'text-white fill-white' : 'text-white'
              }`}
            />
          </button>
        </div>
      </div>
      
      <div className="p-3">
        <h3 className="text-sm mb-2 line-clamp-2 text-gray-900">
          {item.title}
        </h3>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageWithFallback
              src={item.avatar}
              alt={item.author}
              className="w-6 h-6 rounded-full object-cover"
            />
            <span className="text-xs text-gray-600">{item.author}</span>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              setLiked(!liked);
            }}
            className="flex items-center gap-1"
          >
            <Heart
              className={`w-4 h-4 ${
                liked ? 'text-red-500 fill-red-500' : 'text-gray-400'
              }`}
            />
            <span className="text-xs text-gray-600">
              {item.likes + (liked ? 1 : 0)}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
