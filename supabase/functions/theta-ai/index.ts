import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, prompt, context } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    let systemPrompt = "";
    
    switch (type) {
      case "suggest_post":
        systemPrompt = "You are a creative social media assistant. Generate engaging post ideas based on the user's interests. Keep suggestions under 280 characters. Return 3 different post ideas, each on a new line.";
        break;
      case "smart_reply":
        systemPrompt = "You are a helpful assistant generating smart reply suggestions for social media. Generate 3 short, relevant replies (max 100 chars each) that are friendly and engaging. Return each reply on a new line.";
        break;
      case "analyze_sentiment":
        systemPrompt = "Analyze the sentiment of the following text. Return only one word: Positive, Negative, or Neutral.";
        break;
      case "suggest_hashtags":
        systemPrompt = "Suggest 3-5 relevant hashtags for the following post. Return only the hashtags separated by spaces, each starting with #.";
        break;
      case "improve_post":
        systemPrompt = "Improve the following social media post to make it more engaging while keeping the core message. Keep it under 280 characters.";
        break;
      default:
        systemPrompt = "You are a helpful AI assistant for XTheta social media platform.";
    }

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: context ? `${prompt}\n\nContext: ${context}` : prompt }
    ];

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages,
        stream: false,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to your workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const result = data.choices[0].message.content;

    console.log("AI response:", result);

    return new Response(
      JSON.stringify({ result }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in theta-ai function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
