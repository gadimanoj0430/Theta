-- Drop tables in correct order (dependents first)
DROP TABLE IF EXISTS public.bookmarks CASCADE;
DROP TABLE IF EXISTS public.blocked_users CASCADE;
DROP TABLE IF EXISTS public.comment_likes CASCADE;
DROP TABLE IF EXISTS public.comment_reactions CASCADE;
DROP TABLE IF EXISTS public.community_members CASCADE;
DROP TABLE IF EXISTS public.communities CASCADE;
DROP TABLE IF EXISTS public.conversation_participants CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.followers CASCADE;
DROP TABLE IF EXISTS public.group_members CASCADE;
DROP TABLE IF EXISTS public.groups CASCADE;
DROP TABLE IF EXISTS public.hashtags CASCADE;
DROP TABLE IF EXISTS public.post_hashtags CASCADE;
DROP TABLE IF EXISTS public.likes CASCADE;
DROP TABLE IF EXISTS public.message_thread_participants CASCADE;
DROP TABLE IF EXISTS public.message_threads CASCADE;

-- Drop the helper function if no longer needed
DROP FUNCTION IF EXISTS public.is_conversation_participant(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_group_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_group_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_community_member(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_community_admin(uuid, uuid);
DROP FUNCTION IF EXISTS public.update_group_member_count();
DROP FUNCTION IF EXISTS public.update_community_member_count();
DROP FUNCTION IF EXISTS public.update_follow_counts();
DROP FUNCTION IF EXISTS public.link_post_hashtags(uuid, text);
DROP FUNCTION IF EXISTS public.extract_hashtags(text);