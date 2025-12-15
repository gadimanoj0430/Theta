import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import PostCard from "@/components/PostCard";
import { useToast } from "@/hooks/use-toast";

const Explore = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState("posts");
  const { toast } = useToast();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: session } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        navigate("/auth");
        return null;
      }
      return data.session;
    },
  });

  const { data: suggestedUsers } = useQuery({
    queryKey: ["suggested-users", session?.user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .neq("id", session!.user.id)
        .limit(10);

      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Search results
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: ["search", debouncedQuery, activeTab],
    queryFn: async () => {
      if (!debouncedQuery.trim()) return null;

      if (activeTab === "people") {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .or(`username.ilike.%${debouncedQuery}%,display_name.ilike.%${debouncedQuery}%`)
          .limit(20);
        if (error) throw error;
        return { type: "people", data };
      } else {
        // Search posts
        const { data, error } = await supabase
          .from("posts")
          .select(`
            *,
            profiles!posts_user_id_fkey (username, display_name, avatar_url),
            retweets (id, user_id),
            post_reactions (id, user_id, reaction_type)
          `)
          .ilike("content", `%${debouncedQuery}%`)
          .order("created_at", { ascending: false })
          .limit(20);
        if (error) throw error;
        return { type: "posts", data };
      }
    },
    enabled: !!session && !!debouncedQuery.trim(),
  });

  if (!session) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentUser={session.user} />
      
      <main className="flex-1 border-x border-border max-w-2xl">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b border-border p-4">
          <h1 className="text-xl font-bold mb-4">Explore</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search posts and people..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Tabs defaultValue="posts" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start border-b rounded-none h-auto p-0">
            <TabsTrigger value="posts" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              Posts
            </TabsTrigger>
            <TabsTrigger value="people" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary">
              People
            </TabsTrigger>
          </TabsList>

          {/* Show search results if searching */}
          {debouncedQuery.trim() ? (
            <div className="p-0">
              {searchLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : searchResults?.type === "people" ? (
                <div className="divide-y divide-border">
                  {searchResults.data?.map((user: any) => (
                    <div
                      key={user.id}
                      className="p-4 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div 
                          className="flex items-center gap-3 cursor-pointer"
                          onClick={() => navigate(`/profile/${user.username}`)}
                        >
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>{user.display_name?.[0] || user.username[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-bold">{user.display_name}</p>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                            {user.bio && (
                              <p className="text-sm mt-1 line-clamp-2">{user.bio}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {searchResults.data?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No users found for "{debouncedQuery}"
                    </div>
                  )}
                </div>
              ) : searchResults?.type === "posts" ? (
                <div>
                  {searchResults.data?.map((post: any) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      currentUserId={session.user.id}
                      onUpdate={() => {}}
                    />
                  ))}
                  {searchResults.data?.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      No posts found for "{debouncedQuery}"
                    </div>
                  )}
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <TabsContent value="posts" className="p-0">
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Search className="h-16 w-16 text-muted-foreground mb-4" />
                  <h2 className="text-xl font-bold mb-2">Search for posts</h2>
                  <p className="text-muted-foreground">Type something to search for posts</p>
                </div>
              </TabsContent>

              <TabsContent value="people" className="p-0">
                {suggestedUsers && suggestedUsers.length > 0 ? (
                  <div className="divide-y divide-border">
                    {suggestedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div 
                            className="flex items-center gap-3 cursor-pointer"
                            onClick={() => navigate(`/profile/${user.username}`)}
                          >
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={user.avatar_url || undefined} />
                              <AvatarFallback>{user.display_name?.[0] || user.username[0]}</AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-bold">{user.display_name}</p>
                              <p className="text-sm text-muted-foreground">@{user.username}</p>
                              {user.bio && (
                                <p className="text-sm mt-1 line-clamp-2">{user.bio}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 text-center">
                    <Search className="h-16 w-16 text-muted-foreground mb-4" />
                    <h2 className="text-xl font-bold mb-2">No users yet</h2>
                    <p className="text-muted-foreground">Be the first to join!</p>
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

export default Explore;
