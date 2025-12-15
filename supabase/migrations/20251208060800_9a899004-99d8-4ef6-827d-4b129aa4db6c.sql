-- Drop the existing policy that causes the chicken-and-egg problem
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;

-- Create a new policy that allows:
-- 1. Users to add themselves as a participant to any conversation they just created
-- 2. Users who are already participants to add others
CREATE POLICY "Users can add participants to conversations"
ON public.conversation_participants
FOR INSERT
WITH CHECK (
  -- User can add themselves to a conversation
  (auth.uid() = user_id)
  OR
  -- Or if user is already a participant, they can add others
  (is_conversation_participant(auth.uid(), conversation_id))
);