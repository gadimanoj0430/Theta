-- Drop existing problematic policies
DROP POLICY IF EXISTS "Public groups are viewable by everyone" ON public.groups;
DROP POLICY IF EXISTS "Group owners and admins can update groups" ON public.groups;
DROP POLICY IF EXISTS "Group members are viewable by group members" ON public.group_members;
DROP POLICY IF EXISTS "Public communities are viewable by everyone" ON public.communities;
DROP POLICY IF EXISTS "Community owners and admins can update communities" ON public.communities;
DROP POLICY IF EXISTS "Community members are viewable by community members" ON public.community_members;

-- Create security definer functions to check membership without recursion
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.group_members
    WHERE user_id = _user_id
      AND group_id = _group_id
      AND role IN ('owner', 'admin')
  )
$$;

CREATE OR REPLACE FUNCTION public.is_community_member(_user_id UUID, _community_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE user_id = _user_id
      AND community_id = _community_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_community_admin(_user_id UUID, _community_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.community_members
    WHERE user_id = _user_id
      AND community_id = _community_id
      AND role IN ('owner', 'admin')
  )
$$;

-- Recreate groups policies using security definer functions
CREATE POLICY "Public groups are viewable by everyone"
  ON public.groups FOR SELECT
  USING (is_private = false OR public.is_group_member(auth.uid(), id));

CREATE POLICY "Group owners and admins can update groups"
  ON public.groups FOR UPDATE
  USING (public.is_group_admin(auth.uid(), id));

-- Recreate group_members policies
CREATE POLICY "Group members are viewable by group members"
  ON public.group_members FOR SELECT
  USING (public.is_group_member(auth.uid(), group_id));

-- Recreate communities policies using security definer functions
CREATE POLICY "Public communities are viewable by everyone"
  ON public.communities FOR SELECT
  USING (is_private = false OR public.is_community_member(auth.uid(), id));

CREATE POLICY "Community owners and admins can update communities"
  ON public.communities FOR UPDATE
  USING (public.is_community_admin(auth.uid(), id));

-- Recreate community_members policies
CREATE POLICY "Community members are viewable by community members"
  ON public.community_members FOR SELECT
  USING (public.is_community_member(auth.uid(), community_id));