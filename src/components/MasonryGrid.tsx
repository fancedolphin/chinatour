import Masonry, { ResponsiveMasonry } from 'react-responsive-masonry';
import { FeedCard, FeedItem } from './FeedCard';

interface MasonryGridProps {
  items: FeedItem[];
}

export function MasonryGrid({ items }: MasonryGridProps) {
  return (
    <ResponsiveMasonry
      columnsCountBreakPoints={{ 350: 2, 750: 3, 900: 4 }}
    >
      <Masonry gutter="12px">
        {items.map((item) => (
          <FeedCard key={item.id} item={item} />
        ))}
      </Masonry>
    </ResponsiveMasonry>
  );
}
