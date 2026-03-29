-- =====================================================================
-- 评论系统：trip_comments + comment_likes 表
-- 包含：表结构、索引、触发器、RLS 策略
-- =====================================================================

-- =============================================================
-- 1. 表结构
-- =============================================================

-- 1.1 trip_comments（行程评论，支持嵌套回复）
CREATE TABLE IF NOT EXISTS public.trip_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shared_trip_id UUID NOT NULL REFERENCES public.shared_trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.trip_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  likes_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 comment_likes（评论点赞，唯一约束防重复）
CREATE TABLE IF NOT EXISTS public.comment_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comment_id UUID NOT NULL REFERENCES public.trip_comments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(comment_id, user_id)
);


-- =============================================================
-- 2. 索引
-- =============================================================

-- trip_comments
CREATE INDEX idx_comments_shared_trip_id ON public.trip_comments (shared_trip_id, created_at DESC);
CREATE INDEX idx_comments_parent_id ON public.trip_comments (parent_id) WHERE parent_id IS NOT NULL;
CREATE INDEX idx_comments_user_id ON public.trip_comments (user_id);

-- comment_likes
CREATE INDEX idx_comment_likes_comment_id ON public.comment_likes (comment_id);
CREATE INDEX idx_comment_likes_user_id ON public.comment_likes (user_id);


-- =============================================================
-- 3. 触发器函数
-- =============================================================

-- 评论数同步到 shared_trips.comments_count
CREATE OR REPLACE FUNCTION public.update_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.shared_trips
    SET comments_count = comments_count + 1
    WHERE id = NEW.shared_trip_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.shared_trips
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = OLD.shared_trip_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- 软删除时减少计数，恢复时增加
    IF NEW.is_deleted = true AND OLD.is_deleted = false THEN
      UPDATE public.shared_trips
      SET comments_count = GREATEST(comments_count - 1, 0)
      WHERE id = NEW.shared_trip_id;
    ELSIF NEW.is_deleted = false AND OLD.is_deleted = true THEN
      UPDATE public.shared_trips
      SET comments_count = comments_count + 1
      WHERE id = NEW.shared_trip_id;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- 评论点赞数同步到 trip_comments.likes_count
CREATE OR REPLACE FUNCTION public.update_comment_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.trip_comments
    SET likes_count = likes_count + 1
    WHERE id = NEW.comment_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.trip_comments
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = OLD.comment_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;


-- =============================================================
-- 4. 触发器
-- =============================================================

CREATE TRIGGER trg_trip_comments_updated_at
  BEFORE UPDATE ON public.trip_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER trg_update_comments_count
  AFTER INSERT OR DELETE OR UPDATE OF is_deleted ON public.trip_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comments_count();

CREATE TRIGGER trg_update_comment_likes_count
  AFTER INSERT OR DELETE ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_comment_likes_count();


-- =============================================================
-- 5. RLS 启用与策略
-- =============================================================

ALTER TABLE public.trip_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- trip_comments 策略
CREATE POLICY "Anyone can view comments on active shared trips"
  ON public.trip_comments FOR SELECT
  USING (
    is_deleted = false AND
    EXISTS (
      SELECT 1 FROM public.shared_trips
      WHERE shared_trips.id = trip_comments.shared_trip_id
        AND shared_trips.is_active = true
    )
  );

-- 评论创建：身份验证 + 防刷（同一用户 60 秒内最多 3 条）
CREATE POLICY "Authenticated users can create comments with rate limit"
  ON public.trip_comments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    (
      SELECT COUNT(*) FROM public.trip_comments tc
      WHERE tc.user_id = auth.uid()
        AND tc.created_at > NOW() - INTERVAL '60 seconds'
    ) < 3
  );

CREATE POLICY "Users can update own comments"
  ON public.trip_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON public.trip_comments FOR DELETE
  USING (auth.uid() = user_id);

-- comment_likes 策略
CREATE POLICY "Anyone can view comment likes"
  ON public.comment_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like comments"
  ON public.comment_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike own likes"
  ON public.comment_likes FOR DELETE
  USING (auth.uid() = user_id);
