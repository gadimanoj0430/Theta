-- Drop ALL existing policies on conversations
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;

-- Create ONLY these two policies

-- 1. Conversations INSERT (always allowed for authenticated users)
CREATE POLICY conversations_insert
ON conversations
FOR INSERT TO authenticated
WITH CHECK (true);

-- 2. Conversations SELECT (only for participants)
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