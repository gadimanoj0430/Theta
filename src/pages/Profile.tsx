import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import PostCard from "@/components/PostCard";
import ProfileEditDialog from "@/components/ProfileEditDialog";
import FollowButton from "@/components/FollowButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { Calendar, Link as LinkIcon, MapPin } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  location: string | null;
  website: string | null;
  created_at: string;
  followers_count: number | null;
  following_count: number | null;
}

interface Post {
  id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  user_id: string;
  like_count: number;
  profiles: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  retweets: { id: string; user_id: string }[];
  post_reactions: { id: string; user_id: string; reaction_type: string }[];
}

const Profile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCurrentUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (userId && currentUser) {
      fetchProfile();
    }
  }, [userId, currentUser]);

  useEffect(() => {
    if (profile && currentUser) {
      fetchUserPosts();
    }
  }, [profile, currentUser]);

  const fetchProfile = async () => {
    try {
      // Check if userId is a UUID or username
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || '');
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*, followers_count, following_count")
        .eq(isUUID ? "id" : "username", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast({
          title: "Profile not found",
          variant: "destructive",
        });
        navigate("/");
        return;
      }
      setProfile(data);
    } catch (error: any) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error loading profile",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchUserPosts = async () => {
    if (!profile) return;
    
    try {
      const { data, error } = await supabase
        .from("posts")
        .select(
          `
          *,
          profiles!posts_user_id_fkey (username, display_name, avatar_url),
          retweets (id, user_id),
          post_reactions (id, user_id, reaction_type)
        `
        )
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error: any) {
      console.error("Error fetching posts:", error);
    }
  };

  if (!currentUser || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentUser={currentUser} />

      <main className="flex-1 border-x border-border max-w-2xl">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4">
          <h1 className="text-xl font-bold">{profile.display_name || profile.username}</h1>
          <p className="text-sm text-muted-foreground">{posts.length} posts</p>
        </div>

        {/* Banner */}
        <div className="h-48 bg-muted relative overflow-hidden">
          {profile.banner_url && (
            <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
          )}
        </div>

        {/* Profile Info */}
        <div className="p-4">
          <div className="flex justify-between items-start -mt-16 mb-4">
            <Avatar className="h-32 w-32 border-4 border-background">
              <AvatarImage src={profile.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {profile.display_name?.[0] || profile.username[0]}
              </AvatarFallback>
            </Avatar>

            <div className="mt-16">
              {currentUser.id === profile.id ? (
                <ProfileEditDialog profile={profile} onUpdate={fetchProfile} />
              ) : (
                <FollowButton
                  currentUserId={currentUser.id}
                  targetUserId={profile.id}
                  onFollowChange={fetchProfile}
                />
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <h2 className="text-xl font-bold">
                {profile.display_name || profile.username}
              </h2>
              <p className="text-muted-foreground">@{profile.username}</p>
            </div>

            {profile.bio && <p>{profile.bio}</p>}

            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {profile.location}
                </div>
              )}
              {profile.website && (
                <div className="flex items-center gap-1">
                  <LinkIcon className="h-4 w-4" />
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {profile.website}
                  </a>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Joined {formatDistanceToNow(new Date(profile.created_at), { addSuffix: true })}
              </div>
            </div>

            <div className="flex gap-4 text-sm">
              <Link
                to={`/profile/${profile.username}/following`}
                className="hover:underline"
              >
                <span className="font-bold">{profile.following_count || 0}</span>{" "}
                <span className="text-muted-foreground">Following</span>
              </Link>
              <Link
                to={`/profile/${profile.username}/followers`}
                className="hover:underline"
              >
                <span className="font-bold">{profile.followers_count || 0}</span>{" "}
                <span className="text-muted-foreground">Followers</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <div className="flex">
            <button className="flex-1 py-4 font-semibold hover:bg-muted/30 border-b-4 border-primary">
              Posts
            </button>
            <button className="flex-1 py-4 text-muted-foreground hover:bg-muted/30">
              Replies
            </button>
          </div>
        </div>

        {/* Posts */}
        <div>
          {posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No posts yet
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentUser.id}
                onUpdate={fetchUserPosts}
              />
            ))
          )}
        </div>
      </main>

      <aside className="hidden lg:block w-80" />
    </div>
  );
};

export default Profile;
