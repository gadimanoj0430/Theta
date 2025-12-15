import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Heart, Phone, Video, Info } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
}

interface ChatInterfaceProps {
  conversationId: string;
  currentUserId: string;
  otherUser: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

const ChatInterface = ({
  conversationId,
  currentUserId,
  otherUser,
}: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchMessages();

    // Subscribe to new messages in real-time
    const messagesChannel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          console.log("New message received:", payload);
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: currentUserId,
        content: newMessage.trim(),
      });

      if (error) throw error;

      setNewMessage("");
    } catch (error: any) {
      toast({
        title: "Error sending message",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Group messages by date
  const groupedMessages = messages.reduce((groups: any, message) => {
    const date = new Date(message.created_at).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {});

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center justify-between">
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => navigate(`/profile/${otherUser.username}`)}
          >
            <Avatar className="h-10 w-10 ring-2 ring-primary/20">
              <AvatarImage src={otherUser.avatar_url || undefined} />
              <AvatarFallback>
                {otherUser.display_name?.[0] || otherUser.username[0]}
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="font-semibold text-sm">
                {otherUser.display_name || otherUser.username}
              </div>
              <div className="text-xs text-muted-foreground">
                @{otherUser.username}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Phone className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Video className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Info className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Avatar className="h-20 w-20 mb-4">
              <AvatarImage src={otherUser.avatar_url || undefined} />
              <AvatarFallback className="text-2xl">
                {otherUser.display_name?.[0] || otherUser.username[0]}
              </AvatarFallback>
            </Avatar>
            <p className="font-semibold">{otherUser.display_name || otherUser.username}</p>
            <p className="text-sm text-muted-foreground">@{otherUser.username}</p>
            <p className="text-sm text-muted-foreground mt-2">
              Start a conversation
            </p>
          </div>
        ) : (
          Object.entries(groupedMessages).map(([date, msgs]: [string, any]) => (
            <div key={date}>
              <div className="flex justify-center my-4">
                <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                  {date}
                </span>
              </div>
              {msgs.map((message: Message, index: number) => {
                const isOwn = message.sender_id === currentUserId;
                const showAvatar = !isOwn && (index === 0 || msgs[index - 1]?.sender_id !== message.sender_id);
                
                return (
                  <div
                    key={message.id}
                    className={`flex items-end gap-2 mb-1 ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    {!isOwn && (
                      <div className="w-7">
                        {showAvatar && (
                          <Avatar className="h-7 w-7">
                            <AvatarImage src={otherUser.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">
                              {otherUser.display_name?.[0] || otherUser.username[0]}
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-3xl px-4 py-2.5 ${
                        isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="break-words text-sm">{message.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3 bg-muted rounded-full px-4 py-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Message..."
            className="flex-1 border-none bg-transparent focus-visible:ring-0 px-0"
            disabled={loading}
          />
          {newMessage.trim() ? (
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || loading}
              variant="ghost"
              size="sm"
              className="text-primary font-semibold hover:text-primary/80 p-0"
            >
              Send
            </Button>
          ) : (
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <Heart className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
