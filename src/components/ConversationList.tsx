import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

interface Conversation {
  id: string;
  updated_at: string;
  other_user: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  last_message: {
    content: string;
    created_at: string;
  } | null;
}

interface ConversationListProps {
  currentUserId: string;
  onSelectConversation: (conversationId: string, otherUser: any) => void;
  selectedConversationId: string | null;
}

const ConversationList = ({
  currentUserId,
  onSelectConversation,
  selectedConversationId,
}: ConversationListProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
    
    // Subscribe to new messages for real-time updates
    const channel = supabase
      .channel("conversations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          fetchConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  const fetchConversations = async () => {
    try {
      // Get all conversations the user is part of
      const { data: participations, error: partError } = await supabase
        .from("conversation_participants")
        .select("conversation_id")
        .eq("user_id", currentUserId);

      if (partError) throw partError;

      const conversationIds = participations?.map((p) => p.conversation_id) || [];

      if (conversationIds.length === 0) {
        setConversations([]);
        setLoading(false);
        return;
      }

      // Get other participants and their profiles
      const { data: otherParticipants, error: otherError } = await supabase
        .from("conversation_participants")
        .select("conversation_id, user_id")
        .in("conversation_id", conversationIds)
        .neq("user_id", currentUserId);

      if (otherError) throw otherError;

      // Get profiles for other participants
      const otherUserIds = otherParticipants?.map(p => p.user_id) || [];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url")
        .in("id", otherUserIds);

      // Get last messages for each conversation
      const { data: lastMessages, error: msgError } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: false });

      if (msgError) throw msgError;

      const conversationsData: Conversation[] = conversationIds.map((convId) => {
        const otherPart = otherParticipants?.find((p) => p.conversation_id === convId);
        const profile = profiles?.find(p => p.id === otherPart?.user_id);
        const lastMsg = lastMessages?.find((m) => m.conversation_id === convId);

        return {
          id: convId,
          updated_at: lastMsg?.created_at || new Date().toISOString(),
          other_user: {
            id: profile?.id || "",
            username: profile?.username || "Unknown",
            display_name: profile?.display_name || null,
            avatar_url: profile?.avatar_url || null,
          },
          last_message: lastMsg ? {
            content: lastMsg.content,
            created_at: lastMsg.created_at,
          } : null,
        };
      });

      conversationsData.sort((a, b) => 
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );

      setConversations(conversationsData);
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No conversations yet
      </div>
    );
  }

  return (
    <div className="divide-y divide-border">
      {conversations.map((conv) => (
        <button
          key={conv.id}
          onClick={() => onSelectConversation(conv.id, conv.other_user)}
          className={`w-full p-4 hover:bg-muted/30 transition-colors text-left ${
            selectedConversationId === conv.id ? "bg-muted/50" : ""
          }`}
        >
          <div className="flex gap-3">
            <Avatar>
              <AvatarImage src={conv.other_user.avatar_url || undefined} />
              <AvatarFallback>
                {conv.other_user.display_name?.[0] || conv.other_user.username[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start">
                <div className="font-semibold truncate">
                  {conv.other_user.display_name || conv.other_user.username}
                </div>
                {conv.last_message && (
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.last_message.created_at), {
                      addSuffix: true,
                    })}
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                @{conv.other_user.username}
              </p>
              {conv.last_message && (
                <p className="text-sm text-muted-foreground truncate mt-1">
                  {conv.last_message.content}
                </p>
              )}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

export default ConversationList;
