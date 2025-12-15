import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Sparkles, Loader2, ThumbsUp, Hash, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AIAssistantProps {
  onSuggestionSelect?: (suggestion: string) => void;
  currentContent?: string;
}

const AIAssistant = ({ onSuggestionSelect, currentContent }: AIAssistantProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [prompt, setPrompt] = useState("");
  const { toast } = useToast();

  const callAI = async (type: string, userPrompt: string, context?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("theta-ai", {
        body: { type, prompt: userPrompt, context },
      });

      if (error) throw error;

      if (data.error) {
        toast({
          title: "AI Error",
          description: data.error,
          variant: "destructive",
        });
        return null;
      }

      return data.result;
    } catch (error) {
      console.error("AI error:", error);
      toast({
        title: "Error",
        description: "Failed to get AI suggestions",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestPost = async () => {
    const result = await callAI("suggest_post", prompt || "Generate creative post ideas");
    if (result) {
      const ideas = result.split("\n").filter((line: string) => line.trim());
      setSuggestions(ideas);
    }
  };

  const handleImprovePost = async () => {
    if (!currentContent) {
      toast({
        title: "No content",
        description: "Please write something first",
        variant: "destructive",
      });
      return;
    }
    
    const result = await callAI("improve_post", currentContent);
    if (result) {
      setSuggestions([result]);
    }
  };

  const handleSuggestHashtags = async () => {
    if (!currentContent) {
      toast({
        title: "No content",
        description: "Please write something first",
        variant: "destructive",
      });
      return;
    }
    
    const result = await callAI("suggest_hashtags", currentContent);
    if (result) {
      setSuggestions([result]);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    if (onSuggestionSelect) {
      onSuggestionSelect(suggestion);
      setIsOpen(false);
      setSuggestions([]);
      setPrompt("");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Sparkles className="h-4 w-4" />
          AI Assistant
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Theta AI Assistant
          </DialogTitle>
          <DialogDescription>
            Get AI-powered suggestions for your posts
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="suggest" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="suggest">Suggest Posts</TabsTrigger>
            <TabsTrigger value="improve">Improve Post</TabsTrigger>
            <TabsTrigger value="hashtags">Hashtags</TabsTrigger>
          </TabsList>

          <TabsContent value="suggest" className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                What would you like to post about?
              </label>
              <Textarea
                placeholder="E.g., technology trends, fitness tips, travel experiences..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="mb-4"
              />
              <Button
                onClick={handleSuggestPost}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Get Suggestions
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="improve" className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                {currentContent ? "Your current post:" : "No post content to improve"}
              </p>
              {currentContent && (
                <div className="bg-muted p-3 rounded-lg mb-4 text-sm">
                  {currentContent}
                </div>
              )}
              <Button
                onClick={handleImprovePost}
                disabled={loading || !currentContent}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Improving...
                  </>
                ) : (
                  <>
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Improve Post
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="hashtags" className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                {currentContent ? "Your current post:" : "No post content for hashtags"}
              </p>
              {currentContent && (
                <div className="bg-muted p-3 rounded-lg mb-4 text-sm">
                  {currentContent}
                </div>
              )}
              <Button
                onClick={handleSuggestHashtags}
                disabled={loading || !currentContent}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Hash className="h-4 w-4 mr-2" />
                    Suggest Hashtags
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {suggestions.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium">AI Suggestions:</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => handleSelectSuggestion(suggestion)}
                  className="p-3 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors"
                >
                  <p className="text-sm">{suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AIAssistant;
