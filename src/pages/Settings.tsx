import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
import Sidebar from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { Moon, Sparkles, Sun } from "lucide-react";

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) navigate("/auth");
      setLoading(false);
    });
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth");
    } catch (error: any) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading || !user) return null;

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar currentUser={user} />

      <main className="flex-1 border-x border-border max-w-2xl">
        <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border p-4">
          <h1 className="text-xl font-bold">Settings</h1>
        </div>

        <div className="p-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Account</CardTitle>
              <CardDescription>Manage your account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button variant="destructive" onClick={handleSignOut}>
                  Sign Out
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy & Safety</CardTitle>
              <CardDescription>Control who can see your content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="private-account">Private Account</Label>
                <Switch id="private-account" />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="show-activity">Show Activity Status</Label>
                <Switch id="show-activity" defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Manage your notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="like-notifications">Likes</Label>
                <Switch id="like-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="comment-notifications">Comments</Label>
                <Switch id="comment-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="follow-notifications">New Followers</Label>
                <Switch id="follow-notifications" defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="message-notifications">Messages</Label>
                <Switch id="message-notifications" defaultChecked />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Display</CardTitle>
              <CardDescription>Customize how the app looks</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <Label>Light</Label>
                  </div>
                  <button onClick={() => setTheme("light")} className={`px-3 py-1 rounded-lg ${theme === "light" ? "bg-muted/60" : "bg-muted"}`}>Select</button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <Label>Dark</Label>
                  </div>
                  <button onClick={() => setTheme("dark")} className={`px-3 py-1 rounded-lg ${theme === "dark" ? "bg-muted/60" : "bg-muted"}`}>Select</button>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <Label>Glass</Label>
                  </div>
                  <button onClick={() => setTheme("glass")} className={`px-3 py-1 rounded-lg ${theme === "glass" ? "bg-muted/60" : "bg-muted"}`}>Select</button>
                </div>

                <p className="text-sm text-muted-foreground">
                  Currently using {theme} mode
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <aside className="hidden lg:block w-80" />
    </div>
  );
};

export default Settings;
