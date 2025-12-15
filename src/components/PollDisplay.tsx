import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface PollOption {
  id: string;
  option_text: string;
  vote_count: number;
}

interface PollDisplayProps {
  postId: string;
  currentUserId: string;
}

const PollDisplay = ({ postId, currentUserId }: PollDisplayProps) => {
  const [poll, setPoll] = useState<any>(null);
  const [options, setOptions] = useState<PollOption[]>([]);
  const [userVote, setUserVote] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPoll();
  }, [postId]);

  const fetchPoll = async () => {
    try {
      const { data: pollData } = await supabase
        .from("polls")
        .select("*")
        .eq("post_id", postId)
        .maybeSingle();

      if (!pollData) {
        setLoading(false);
        return;
      }

      setPoll(pollData);

      const { data: optionsData } = await supabase
        .from("poll_options")
        .select("*")
        .eq("poll_id", pollData.id)
        .order("created_at", { ascending: true });

      setOptions(optionsData || []);

      // Check if user has voted
      const { data: voteData } = await supabase
        .from("poll_votes")
        .select("option_id")
        .eq("poll_id", pollData.id)
        .eq("user_id", currentUserId)
        .maybeSingle();

      if (voteData) {
        setUserVote(voteData.option_id);
      }
    } catch (error) {
      console.error("Error fetching poll:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (optionId: string) => {
    if (userVote || voting) return;

    setVoting(true);
    try {
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: poll.id,
        option_id: optionId,
        user_id: currentUserId,
      });

      if (error) throw error;

      setUserVote(optionId);
      setOptions((prev) =>
        prev.map((opt) =>
          opt.id === optionId ? { ...opt, vote_count: opt.vote_count + 1 } : opt
        )
      );

      toast({ title: "Vote recorded!" });
    } catch (error: any) {
      toast({
        title: "Error voting",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setVoting(false);
    }
  };

  if (loading || !poll) return null;

  const totalVotes = options.reduce((sum, opt) => sum + opt.vote_count, 0);

  return (
    <div className="border border-border rounded-xl p-4 mt-3 space-y-2">
      {options.map((option) => {
        const percentage = totalVotes > 0 ? (option.vote_count / totalVotes) * 100 : 0;
        const isSelected = userVote === option.id;

        return (
          <Button
            key={option.id}
            variant="outline"
            onClick={() => handleVote(option.id)}
            disabled={!!userVote || voting}
            className={`w-full justify-start relative overflow-hidden h-auto py-3 ${
              isSelected ? "border-primary" : ""
            }`}
          >
            {userVote && (
              <div
                className="absolute inset-0 bg-primary/20 transition-all"
                style={{ width: `${percentage}%` }}
              />
            )}
            <div className="relative flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                {isSelected && <Check className="h-4 w-4 text-primary" />}
                <span>{option.option_text}</span>
              </div>
              {userVote && (
                <span className="text-sm text-muted-foreground">
                  {percentage.toFixed(0)}%
                </span>
              )}
            </div>
          </Button>
        );
      })}
      <p className="text-xs text-muted-foreground text-center pt-1">
        {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
      </p>
    </div>
  );
};

export default PollDisplay;
