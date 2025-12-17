import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Image, Smile, X, BarChart3 } from "lucide-react";
import AIAssistant from "./AIAssistant";
import PollCreator from "./PollCreator";

interface PostComposerProps {
  onPostCreated: () => void;
}

const PostComposer = ({ onPostCreated }: PostComposerProps) => {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length + images.length > 4) {
      toast({
        title: "Too many images",
        description: "You can only upload up to 4 images",
        variant: "destructive",
      });
      return;
    }

    setImages((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (userId: string) => {
    const uploadedUrls: string[] = [];

    for (const image of images) {
      const fileExt = image.name.split('.').pop();
      const fileName = `${userId}/${Math.random()}.${fileExt}`;

      const { error: uploadError, data } = await supabase.storage
        .from('post-media')
        .upload(fileName, image);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('post-media')
        .getPublicUrl(fileName);

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  };

  const handlePost = async () => {
    if (!content.trim() || content.length > 280) return;

    // Validate poll options if poll is shown
    if (showPoll) {
      const validOptions = pollOptions.filter((opt) => opt.trim());
      if (validOptions.length < 2) {
        toast({
          title: "Invalid poll",
          description: "Please provide at least 2 poll options",
          variant: "destructive",
        });
        return;
      }
    }

    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let mediaUrls: string[] = [];
      if (images.length > 0) {
        mediaUrls = await uploadImages(user.id);
      }

      const { data: postData, error } = await supabase
        .from("posts")
        .insert({
          user_id: user.id,
          content: content.trim(),
          media_url: mediaUrls.length > 0 ? mediaUrls[0] : null,
          media_type: mediaUrls.length > 0 ? 'image' : null,
        })
        .select()
        .single();

      if (error) throw error;

      // Create poll if enabled
      if (showPoll && postData) {
        const validOptions = pollOptions.filter((opt) => opt.trim());

        const { data: pollData, error: pollError } = await supabase
          .from("polls")
          .insert({
            post_id: postData.id,
            question: content.trim(),
          })
          .select()
          .single();

        if (pollError) throw pollError;

        // Insert poll options
        const optionsToInsert = validOptions.map((opt) => ({
          poll_id: pollData.id,
          option_text: opt.trim(),
        }));

        const { error: optionsError } = await supabase
          .from("poll_options")
          .insert(optionsToInsert);

        if (optionsError) throw optionsError;
      }

      setContent("");
      setImages([]);
      setImagePreviews([]);
      setShowPoll(false);
      setPollOptions(["", ""]);
      onPostCreated();
      toast({
        title: "Post created!",
      });
    } catch (error: any) {
      toast({
        title: "Error creating post",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-border p-3 sm:p-4 glass-card">
      <Textarea
        placeholder="What's happening?"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[100px] sm:min-h-[120px] text-base sm:text-lg border-none focus-visible:ring-0 resize-none"
        maxLength={280}
      />

      {imagePreviews.length > 0 && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {imagePreviews.map((preview, index) => (
            <div key={index} className="relative rounded-2xl overflow-hidden">
              <img src={preview} alt={`Upload ${index + 1}`} className="w-full h-48 object-cover" />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-background/80 hover:bg-background"
                onClick={() => removeImage(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {showPoll && (
        <PollCreator
          options={pollOptions}
          onChange={setPollOptions}
          onRemove={() => {
            setShowPoll(false);
            setPollOptions(["", ""]);
          }}
        />
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            variant="ghost"
            size="icon"
            className="text-primary"
            onClick={() => fileInputRef.current?.click()}
            disabled={images.length >= 4 || showPoll}
          >
            <Image className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={`${showPoll ? 'text-primary' : ''}`}
            onClick={() => setShowPoll(!showPoll)}
            disabled={images.length > 0}
          >
            <BarChart3 className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-primary">
            <Smile className="h-5 w-5" />
          </Button>
          <AIAssistant
            onSuggestionSelect={(suggestion) => setContent(suggestion)}
            currentContent={content}
          />
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`text-sm ${content.length > 280 ? "text-destructive" : "text-muted-foreground"
              }`}
          >
            {content.length}/280
          </span>
          <Button
            onClick={handlePost}
            disabled={!content.trim() || content.length > 280 || loading}
            className="rounded-full bg-primary hover:bg-primary/90"
          >
            {loading ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PostComposer;
