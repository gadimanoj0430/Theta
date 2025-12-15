import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Sidebar from "@/components/Sidebar";
import ConversationList from "@/components/ConversationList";
import ChatInterface from "@/components/ChatInterface";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Plus, Search, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedConversation, setSelectedConversation] = useState<{
    id: string;
    otherUser: any;
  } | null>(null);
  const [newChatOpen, setNewChatOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const { toast } = useToast();

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

  // Handle conversation from URL params
  useQuery({
    queryKey: ["conversation-from-url", searchParams.get("conversation")],
    queryFn: async () => {
      const convId = searchParams.get("conversation");
      if (!convId || !session) return null;

      // Get the other participant
      const { data: participants } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", convId)
        .neq("user_id", session.user.id);

      if (participants && participants.length > 0) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", participants[0].user_id)
          .single();

        if (profile) {
          setSelectedConversation({
            id: convId,
            otherUser: profile,
          });
        }
      }
      return null;
    },
    enabled: !!session && !!searchParams.get("conversation"),
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .neq("id", session?.user.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleStartChat = async (userId: string, user: any) => {
    if (!session) return;
    
    setStartingChat(true);
    try {
      // Check if conversation already exists
      const { data: existingConv } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", session.user.id);

      let conversationId: string | null = null;

      if (existingConv && existingConv.length > 0) {
        for (const conv of existingConv) {
          const { data } = await supabase
            .from("conversation_participants")
            .select("user_id")
            .eq("conversation_id", conv.conversation_id)
            .eq("user_id", userId)
            .maybeSingle();

          if (data) {
            conversationId = conv.conversation_id;
            break;
          }
        }
      }

      // If no existing conversation, create one
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({})
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;

        // Add both participants
        const { error: partError } = await supabase
          .from("conversation_participants")
          .insert([
            { conversation_id: conversationId, user_id: session.user.id },
            { conversation_id: conversationId, user_id: userId },
          ]);

        if (partError) throw partError;
      }

      setSelectedConversation({
        id: conversationId,
        otherUser: user,
      });
      setNewChatOpen(false);
      setSearchQuery("");
      setSearchResults([]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setStartingChat(false);
    }
  };

  if (!session) return null;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar currentUser={session.user} />
      
      <main className="flex-1 border-x border-border max-w-4xl flex">
        {/* Conversation List */}
        <div className={`w-full md:w-[350px] border-r border-border flex flex-col ${selectedConversation ? 'hidden md:flex' : 'flex'}`}>
          <div className="sticky top-0 z-10 bg-background border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl font-bold">Messages</h1>
              <Dialog open={newChatOpen} onOpenChange={setNewChatOpen}>
                <DialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="rounded-full">
                    <Plus className="h-5 w-5" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>New Message</DialogTitle>
                    <DialogDescription>Search for a user to start a conversation</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Search for a user..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                      />
                      <Button onClick={handleSearch} disabled={searching}>
                        {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                      </Button>
                    </div>
                    
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchResults.map((user) => (
                        <button
                          key={user.id}
                          onClick={() => handleStartChat(user.id, user)}
                          disabled={startingChat}
                          className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Avatar>
                            <AvatarImage src={user.avatar_url || undefined} />
                            <AvatarFallback>
                              {user.display_name?.[0] || user.username[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="font-medium">{user.display_name || user.username}</p>
                            <p className="text-sm text-muted-foreground">@{user.username}</p>
                          </div>
                        </button>
                      ))}
                      {searchQuery && searchResults.length === 0 && !searching && (
                        <p className="text-center text-muted-foreground py-4">
                          No users found
                        </p>
                      )}
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ConversationList
              currentUserId={session.user.id}
              onSelectConversation={(id, otherUser) =>
                setSelectedConversation({ id, otherUser })
              }
              selectedConversationId={selectedConversation?.id || null}
            />
          </div>
        </div>

        {/* Chat Area */}
        <div className={`flex-1 flex flex-col ${selectedConversation ? 'flex' : 'hidden md:flex'}`}>
          {selectedConversation ? (
            <>
              {/* Mobile back button */}
              <div className="md:hidden border-b border-border p-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedConversation(null)}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </Button>
              </div>
              <ChatInterface
                conversationId={selectedConversation.id}
                currentUserId={session.user.id}
                otherUser={selectedConversation.otherUser}
              />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <div className="w-24 h-24 rounded-full border-2 border-foreground flex items-center justify-center mb-4">
                <MessageSquare className="h-12 w-12" />
              </div>
              <h2 className="text-xl font-bold mb-1">Your Messages</h2>
              <p className="text-muted-foreground text-sm mb-4">
                Send private messages to a friend
              </p>
              <Button onClick={() => setNewChatOpen(true)} className="rounded-full">
                Send message
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Messages;
