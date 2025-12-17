import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import PostComposer from "@/components/PostComposer";
import PostCard from "@/components/PostCard";
import Sidebar from "@/components/Sidebar";
import MobileHeader from "@/components/MobileHeader";
import { Loader2 } from "lucide-react";

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

const Feed = () => {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        if (!session?.user) {
          navigate("/auth");
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    fetchPosts();

    const channel = supabase
      .channel("posts-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "posts",
        },
        () => {
          fetchPosts();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchPosts = async () => {
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
        .is("parent_post_id", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPosts(data || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentUser={user} />

      <main className="flex-1 border-x border-border max-w-2xl w-full mx-auto">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">Home</h1>
          <div>
            <MobileHeader currentUserId={user.id} username={user?.user_metadata?.username} />
          </div>
        </div>

        <PostComposer onPostCreated={fetchPosts} />

        <div>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No posts yet. Be the first to post!
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={user.id}
                onUpdate={fetchPosts}
              />
            ))
          )}
        </div>
      </main>

      <aside className="hidden lg:block w-80 p-4">
        <div className="sticky top-4 space-y-4">
          <div className="bg-muted/50 rounded-2xl p-4">
            <h2 className="font-bold text-xl mb-4">What's happening</h2>
            <p className="text-sm text-muted-foreground">
              Coming soon: Trending topics
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
};

export default Feed;
