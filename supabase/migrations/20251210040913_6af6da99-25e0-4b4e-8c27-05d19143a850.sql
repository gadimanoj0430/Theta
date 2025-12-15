-- Drop the problematic policies
DROP POLICY IF EXISTS "Users can view conversation participants" ON public.conversation_participants;

-- Create a security definer function to check if user is participant
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_user_id uuid, _conversation_id uuid)
RETURNS boolean
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

-- Recreate the policy using the function
CREATE POLICY "Users can view conversation participants" 
ON public.conversation_participants 
FOR SELECT 
TO authenticated
USING (public.is_conversation_participant(auth.uid(), conversation_id));