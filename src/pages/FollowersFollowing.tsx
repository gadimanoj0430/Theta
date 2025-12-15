import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import FollowButton from "@/components/FollowButton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
}

const FollowersFollowing = () => {
  const { userId, tab } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [followers, setFollowers] = useState<Profile[]>([]);
  const [following, setFollowing] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(tab || "followers");

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setCurrentUser(session?.user ?? null);
        if (!session?.user) navigate("/auth");
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setCurrentUser(session?.user ?? null);
      if (!session?.user) navigate("/auth");
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    if (userId && currentUser) {
      fetchProfile();
    }
  }, [userId, currentUser]);

  useEffect(() => {
    if (profile) {
      fetchFollowers();
      fetchFollowing();
    }
  }, [profile]);

  useEffect(() => {
    if (tab) setActiveTab(tab);
  }, [tab]);

  const fetchProfile = async () => {
    try {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId || "");
      
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, bio, avatar_url")
        .eq(isUUID ? "id" : "username", userId)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        navigate("/");
        return;
      }
      setProfile(data);
    } catch (error) {
      console.error("Error fetching profile:", error);
      navigate("/");
    }
  };

  const fetchFollowers = async () => {
    if (!profile) return;
    
    try {
      const { data: followsData, error: followsError } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("following_id", profile.id);

      if (followsError) throw followsError;

      const followerIds = followsData?.map(f => f.follower_id) || [];
      
      if (followerIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, bio, avatar_url")
          .in("id", followerIds);

        if (profilesError) throw profilesError;
        setFollowers(profiles || []);
      } else {
        setFollowers([]);
      }
    } catch (error) {
      console.error("Error fetching followers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFollowing = async () => {
    if (!profile) return;
    
    try {
      const { data: followsData, error: followsError } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", profile.id);

      if (followsError) throw followsError;

      const followingIds = followsData?.map(f => f.following_id) || [];
      
      if (followingIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("id, username, display_name, bio, avatar_url")
          .in("id", followingIds);

        if (profilesError) throw profilesError;
        setFollowing(profiles || []);
      } else {
        setFollowing([]);
      }
    } catch (error) {
      console.error("Error fetching following:", error);
    }
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    navigate(`/profile/${userId}/${value}`, { replace: true });
  };

  const UserCard = ({ user }: { user: Profile }) => (
    <div className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
      <Link to={`/profile/${user.username}`} className="flex items-center gap-3 flex-1">
        <Avatar className="h-12 w-12">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback>{user.display_name?.[0] || user.username[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{user.display_name || user.username}</p>
          <p className="text-sm text-muted-foreground truncate">@{user.username}</p>
          {user.bio && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{user.bio}</p>
          )}
        </div>
      </Link>
      {currentUser && currentUser.id !== user.id && (
        <FollowButton
          currentUserId={currentUser.id}
          targetUserId={user.id}
          onFollowChange={() => {
            fetchFollowers();
            fetchFollowing();
          }}
        />
      )}
    </div>
  );

  if (!currentUser || !profile) return null;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentUser={currentUser} />

      <main className="flex-1 border-x border-border max-w-2xl">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => navigate(`/profile/${userId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">{profile.display_name || profile.username}</h1>
              <p className="text-sm text-muted-foreground">@{profile.username}</p>
            </div>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="w-full rounded-none border-b border-border bg-transparent h-auto p-0">
            <TabsTrigger
              value="followers"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-4"
            >
              Followers
            </TabsTrigger>
            <TabsTrigger
              value="following"
              className="flex-1 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent py-4"
            >
              Following
            </TabsTrigger>
          </TabsList>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="followers" className="m-0">
                {followers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No followers yet
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {followers.map((user) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="following" className="m-0">
                {following.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Not following anyone yet
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {following.map((user) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </main>

      <aside className="hidden lg:block w-80" />
    </div>
  );
};

export default FollowersFollowing;
