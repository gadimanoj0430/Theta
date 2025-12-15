import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import ChatInterface from "@/components/ChatInterface";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OtherUser {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

const Conversation = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [loading, setLoading] = useState(true);

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
    if (conversationId && currentUser) {
      fetchConversationDetails();
    }
  }, [conversationId, currentUser]);

  const fetchConversationDetails = async () => {
    if (!conversationId || !currentUser) return;

    try {
      // Get the other participant
      const { data: participants, error: partError } = await supabase
        .from("conversation_participants")
        .select("user_id")
        .eq("conversation_id", conversationId)
        .neq("user_id", currentUser.id);

      if (partError) throw partError;

      if (participants && participants.length > 0) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .eq("id", participants[0].user_id)
          .single();

        if (profileError) throw profileError;
        setOtherUser(profile);
      } else {
        navigate("/messages");
      }
    } catch (error) {
      console.error("Error fetching conversation:", error);
      navigate("/messages");
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) return null;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex">
        <Sidebar currentUser={currentUser} />
        <main className="flex-1 border-x border-border max-w-2xl flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  if (!otherUser || !conversationId) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentUser={currentUser} />

      <main className="flex-1 border-x border-border max-w-2xl flex flex-col">
        {/* Mobile back button */}
        <div className="md:hidden border-b border-border p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/messages")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Messages
          </Button>
        </div>

        <div className="flex-1 flex flex-col">
          <ChatInterface
            conversationId={conversationId}
            currentUserId={currentUser.id}
            otherUser={otherUser}
          />
        </div>
      </main>

      <aside className="hidden lg:block w-80" />
    </div>
  );
};

export default Conversation;
