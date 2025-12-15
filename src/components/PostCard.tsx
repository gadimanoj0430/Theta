import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Heart, MessageCircle, Repeat2, Share, Trash } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import PollDisplay from "./PollDisplay";

interface PostCardProps {
  post: {
    id: string;
    content: string;
    media_url: string | null;
    media_type: string | null;
    media_path?: string | null;
    created_at: string;
    user_id: string;
    like_count?: number;
    profiles: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    };
    post_reactions?: { id: string; user_id: string; reaction_type: string }[];
    retweets?: { id: string; user_id: string }[];
    replies_count?: number;
  };
  currentUserId: string;
  onUpdate: () => void;
}

const PostCard = ({ post, currentUserId, onUpdate }: PostCardProps) => {
  const [isLiking, setIsLiking] = useState(false);
  const [isRetweeting, setIsRetweeting] = useState(false);
  const [showReplyDialog, setShowReplyDialog] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [repliesCount, setRepliesCount] = useState(post.replies_count || 0);
  const { toast } = useToast();
  const navigate = useNavigate();

  const isLiked = post.post_reactions?.some(
    (r) => r.user_id === currentUserId && r.reaction_type === "like"
  ) || false;
  const likeCount = post.like_count || post.post_reactions?.filter(r => r.reaction_type === "like").length || 0;

  const isRetweeted = post.retweets?.some((rt) => rt.user_id === currentUserId) || false;
  const retweetCount = post.retweets?.length || 0;

  // Fetch replies count on mount
  useState(() => {
    const fetchRepliesCount = async () => {
      const { count } = await supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("parent_post_id", post.id);
      setRepliesCount(count || 0);
    };
    fetchRepliesCount();
  });

  const handleLike = async () => {
    setIsLiking(true);
    try {
      if (isLiked) {
        const reactionToRemove = post.post_reactions?.find(
          (r) => r.user_id === currentUserId && r.reaction_type === "like"
        );
        if (reactionToRemove) {
          const { error } = await supabase
            .from("post_reactions")
            .delete()
            .eq("id", reactionToRemove.id);
          if (error) throw error;
        }
      } else {
        const { error } = await supabase.from("post_reactions").insert({
          user_id: currentUserId,
          post_id: post.id,
          reaction_type: "like",
        });
        if (error) throw error;

        // Create notification for post owner (if not liking own post)
        if (post.user_id !== currentUserId) {
          await supabase.from("notifications").insert({
            user_id: post.user_id,
            actor_id: currentUserId,
            post_id: post.id,
            type: "like",
          });
        }
      }
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLiking(false);
    }
  };

  const handleRetweet = async () => {
    setIsRetweeting(true);
    try {
      if (isRetweeted) {
        const { error } = await supabase
          .from("retweets")
          .delete()
          .eq("user_id", currentUserId)
          .eq("post_id", post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("retweets").insert({
          user_id: currentUserId,
          post_id: post.id,
        });
        if (error) throw error;

        // Create notification for post owner
        if (post.user_id !== currentUserId) {
          await supabase.from("notifications").insert({
            user_id: post.user_id,
            actor_id: currentUserId,
            post_id: post.id,
            type: "retweet",
          });
        }
      }
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsRetweeting(false);
    }
  };

  const handleReply = async () => {
    if (!replyContent.trim()) return;

    setIsReplying(true);
    try {
      const { error } = await supabase.from("posts").insert({
        content: replyContent.trim(),
        user_id: currentUserId,
        parent_post_id: post.id,
      });

      if (error) throw error;

      // Create notification for post owner
      if (post.user_id !== currentUserId) {
        await supabase.from("notifications").insert({
          user_id: post.user_id,
          actor_id: currentUserId,
          post_id: post.id,
          type: "reply",
        });
      }

      toast({ title: "Reply posted!" });
      setReplyContent("");
      setShowReplyDialog(false);
      setRepliesCount((prev) => prev + 1);
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsReplying(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
    toast({ title: "Link copied to clipboard!" });
  };

  const handleDelete = async () => {
    if (post.user_id !== currentUserId) return;
    const ok = window.confirm("Delete this post?");
    if (!ok) return;
    setIsDeleting(true);

    try {
      const mediaPath =
        post.media_path || (post.media_url ? post.media_url.split('/post-media/')[1] : null);

      if (mediaPath) {
        const { error: storageError } = await supabase
          .storage
          .from('post-media')
          .remove([mediaPath]);
        if (storageError) throw storageError;
      }

      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);

      if (error) throw error;

      toast({ title: "Post deleted" });
      onUpdate();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <article className="border-b border-border p-4 hover:bg-muted/30 transition-colors">
        <div className="flex gap-3">
          <Avatar
            className="cursor-pointer"
            onClick={() => navigate(`/profile/${post.profiles.username}`)}
          >
            <AvatarImage src={post.profiles.avatar_url || undefined} />
            <AvatarFallback>
              {post.profiles.display_name?.[0] || post.profiles.username[0]}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span
                className="font-bold hover:underline cursor-pointer"
                onClick={() => navigate(`/profile/${post.profiles.username}`)}
              >
                {post.profiles.display_name || post.profiles.username}
              </span>
              <span
                className="text-muted-foreground text-sm hover:underline cursor-pointer"
                onClick={() => navigate(`/profile/${post.profiles.username}`)}
              >
                @{post.profiles.username}
              </span>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-muted-foreground text-sm">
                {formatDistanceToNow(new Date(post.created_at), {
                  addSuffix: true,
                })}
              </span>
            </div>

            <p className="mt-1 whitespace-pre-wrap">{post.content}</p>

            {post.media_url && post.media_type === 'image' && (
              <img
                src={post.media_url}
                alt="Post media"
                className="mt-3 rounded-2xl max-h-96 w-full object-cover border border-border"
              />
            )}

            {/* Poll Display */}
            <PollDisplay postId={post.id} currentUserId={currentUserId} />

            <div className="flex items-center gap-6 mt-3">
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-muted-foreground hover:text-primary"
                onClick={() => setShowReplyDialog(true)}
              >
                <MessageCircle className="h-4 w-4" />
                <span className="text-sm">{repliesCount}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleRetweet}
                disabled={isRetweeting}
                className={`gap-2 ${isRetweeted
                  ? "text-green-500 hover:text-green-500"
                  : "text-muted-foreground hover:text-green-500"
                  }`}
              >
                <Repeat2 className="h-4 w-4" />
                <span className="text-sm">{retweetCount}</span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                disabled={isLiking}
                className={`gap-2 ${isLiked
                  ? "text-pink-600 hover:text-pink-600"
                  : "text-muted-foreground hover:text-pink-600"
                  }`}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
                <span className="text-sm">{likeCount}</span>
              </Button>

              {post.user_id === currentUserId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="text-destructive hover:text-destructive/90 gap-2"
                >
                  <Trash className="h-4 w-4" />
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-primary"
                onClick={handleCopyLink}
              >
                <Share className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </article>

      {/* Reply Dialog */}
      <Dialog open={showReplyDialog} onOpenChange={setShowReplyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reply to @{post.profiles.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-l-2 border-border pl-4 py-2">
              <p className="text-sm text-muted-foreground line-clamp-3">
                {post.content}
              </p>
            </div>
            <Textarea
              placeholder="Post your reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              rows={4}
            />
            <div className="flex justify-end">
              <Button
                onClick={handleReply}
                disabled={!replyContent.trim() || isReplying}
              >
                {isReplying ? "Posting..." : "Reply"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PostCard;
