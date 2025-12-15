-- Add parent_post_id for threaded replies
ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_post_id UUID REFERENCES posts(id) ON DELETE CASCADE;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS quoted_post_id UUID REFERENCES posts(id) ON DELETE SET NULL;

-- Create retweets table
CREATE TABLE IF NOT EXISTS retweets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE retweets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Retweets are viewable by everyone"
  ON retweets FOR SELECT USING (true);

CREATE POLICY "Users can retweet posts"
  ON retweets FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their retweets"
  ON retweets FOR DELETE USING (auth.uid() = user_id);

-- Create bookmarks table
CREATE TABLE IF NOT EXISTS bookmarks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own bookmarks"
  ON bookmarks FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can bookmark posts"
  ON bookmarks FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their bookmarks"
  ON bookmarks FOR DELETE USING (auth.uid() = user_id);

-- Create hashtags table
CREATE TABLE IF NOT EXISTS hashtags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hashtags are viewable by everyone"
  ON hashtags FOR SELECT USING (true);

-- Create post_hashtags junction table
CREATE TABLE IF NOT EXISTS post_hashtags (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id UUID NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, hashtag_id)
);

ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Post hashtags are viewable by everyone"
  ON post_hashtags FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_posts_parent_post_id ON posts(parent_post_id);
CREATE INDEX IF NOT EXISTS idx_posts_quoted_post_id ON posts(quoted_post_id);
CREATE INDEX IF NOT EXISTS idx_retweets_post_id ON retweets(post_id);
CREATE INDEX IF NOT EXISTS idx_retweets_user_id ON retweets(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks(post_id);
CREATE INDEX IF NOT EXISTS idx_hashtags_name ON hashtags(name);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);

-- Function to extract and create hashtags
CREATE OR REPLACE FUNCTION extract_hashtags(content TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashtag TEXT;
  hashtag_id UUID;
BEGIN
  FOR hashtag IN
    SELECT DISTINCT lower(regexp_replace(match[1], '^#', ''))
    FROM regexp_matches(content, '#([A-Za-z0-9_]+)', 'g') AS match
  LOOP
    INSERT INTO hashtags (name)
    VALUES (hashtag)
    ON CONFLICT (name) DO NOTHING;
  END LOOP;
END;
$$;

-- Function to link post with hashtags
CREATE OR REPLACE FUNCTION link_post_hashtags(post_id UUID, content TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashtag TEXT;
  hashtag_id UUID;
BEGIN
  FOR hashtag IN
    SELECT DISTINCT lower(regexp_replace(match[1], '^#', ''))
    FROM regexp_matches(content, '#([A-Za-z0-9_]+)', 'g') AS match
  LOOP
    SELECT id INTO hashtag_id FROM hashtags WHERE name = hashtag;
    
    IF hashtag_id IS NOT NULL THEN
      INSERT INTO post_hashtags (post_id, hashtag_id)
      VALUES (post_id, hashtag_id)
      ON CONFLICT DO NOTHING;
      
      UPDATE hashtags SET post_count = post_count + 1 WHERE id = hashtag_id;
    END IF;
  END LOOP;
END;
$$;

-- Enable realtime for new tables
ALTER PUBLICATION supabase_realtime ADD TABLE retweets;
ALTER PUBLICATION supabase_realtime ADD TABLE bookmarks;