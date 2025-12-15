-- Add missing columns to communities table
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS rules TEXT;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 1;
ALTER TABLE public.communities ADD COLUMN IF NOT EXISTS member_limit INTEGER;

-- Add member_count to groups table
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS member_count INTEGER DEFAULT 1;

-- Fix conversation_participants RLS policies to avoid recursion
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;

-- Create security definer function for conversation access
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id UUID, _conversation_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.conversation_participants
    WHERE user_id = _user_id
      AND conversation_id = _conversation_id
  )
$$;

-- Recreate policies without recursion
CREATE POLICY "Users can view conversation participants"
  ON public.conversation_participants FOR SELECT
  USING (public.is_conversation_participant(auth.uid(), conversation_id));

CREATE POLICY "Users can add participants to conversations"
  ON public.conversation_participants FOR INSERT
  WITH CHECK (public.is_conversation_participant(auth.uid(), conversation_id));

-- Allow users to create conversations
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  WITH CHECK (true);

-- Add trigger to update member counts
CREATE OR REPLACE FUNCTION public.update_group_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE groups SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE groups SET member_count = member_count - 1 WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_community_member_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE communities SET member_count = member_count + 1 WHERE id = NEW.community_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE communities SET member_count = member_count - 1 WHERE id = OLD.community_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_group_member_count_trigger
AFTER INSERT OR DELETE ON public.group_members
FOR EACH ROW EXECUTE FUNCTION public.update_group_member_count();

CREATE TRIGGER update_community_member_count_trigger
AFTER INSERT OR DELETE ON public.community_members
FOR EACH ROW EXECUTE FUNCTION public.update_community_member_count();