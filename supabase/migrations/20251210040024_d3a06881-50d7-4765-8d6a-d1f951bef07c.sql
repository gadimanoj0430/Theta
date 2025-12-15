-- Fix the conversation_participants RLS policy to allow initial participants when creating a conversation
DROP POLICY IF EXISTS "Users can add participants to conversations" ON public.conversation_participants;

-- Create a simpler policy that allows authenticated users to add participants
CREATE POLICY "Users can add participants to conversations" 
ON public.conversation_participants 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Also ensure the conversations table allows any authenticated user to create
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can create conversations" 
ON public.conversations 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);