-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Authenticated users can create conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON conversation_participants;
DROP POLICY IF EXISTS "Authenticated users can add participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages to their conversations" ON messages;

-- Drop the old function if exists
DROP FUNCTION IF EXISTS public.is_conversation_participant(uuid, uuid);

-- Recreate simpler, safer RLS policies

-- Conversation Participants: SELECT
-- Users can only see conversations they belong to
CREATE POLICY participants_select
ON conversation_participants
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Conversation Participants: INSERT
-- Users can only add themselves
CREATE POLICY participants_insert
ON conversation_participants
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Conversations: SELECT
CREATE POLICY conversations_select
ON conversations
FOR SELECT TO authenticated
USING (
  id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);

-- Conversations: INSERT
-- Let any authenticated user create a conversation
CREATE POLICY conversations_insert
ON conversations
FOR INSERT TO authenticated
WITH CHECK (true);

-- Messages: SELECT
CREATE POLICY messages_select
ON messages
FOR SELECT TO authenticated
USING (
  conversation_id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);

-- Messages: INSERT
-- User must be a valid participant
CREATE POLICY messages_insert
ON messages
FOR INSERT TO authenticated
WITH CHECK (
  sender_id = auth.uid()
  AND conversation_id IN (
    SELECT conversation_id
    FROM conversation_participants
    WHERE user_id = auth.uid()
  )
);