import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import Logo from "@/components/Logo";
import {
  Home,
  Search,
  Bell,
  Mail,
  User as UserIcon,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";
import ThemeToggle from "./ThemeToggle";

interface SidebarProps {
  currentUser: User;
}

const Sidebar = ({ currentUser }: SidebarProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState<string>("");

  useEffect(() => {
    const fetchUsername = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", currentUser.id)
        .single();

      if (data) setUsername(data.username);
    };

    fetchUsername();
  }, [currentUser.id]);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Error signing out",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate("/auth");
    }
  };

  const navItems = [
    { icon: Home, label: "Home", path: "/" },
    { icon: Search, label: "Explore", path: "/explore" },
    { icon: Bell, label: "Notifications", path: "/notifications" },
    { icon: Mail, label: "Messages", path: "/messages" },
    { icon: UserIcon, label: "Profile", path: `/profile/${username || currentUser.id}` },
    { icon: SettingsIcon, label: "Settings", path: "/settings" },
  ];

  return (
    <aside className="hidden md:flex md:w-20 xl:w-64 h-screen sticky top-0 flex-col p-4">
      <div className="flex flex-col h-full">
        <div className="mb-4 flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <span className="hidden xl:inline-block text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[hsl(var(--glass-accent-1))] to-[hsl(var(--glass-accent-2))]">
            Theta
          </span>
          <div className="ml-auto hidden md:block">
            <ThemeToggle />
          </div>
        </div>

        <nav className="flex-1 space-y-2">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant="ghost"
                className="w-full justify-center md:justify-center xl:justify-start hover:bg-muted/50 rounded-full"
              >
                <item.icon className="h-6 w-6" />
                <span className="hidden xl:inline-block ml-4 text-xl">
                  {item.label}
                </span>
              </Button>
            </Link>
          ))}
        </nav>

        <Button
          variant="ghost"
          onClick={handleSignOut}
          className="w-full justify-start hover:bg-muted/50 rounded-full mt-4"
        >
          <LogOut className="h-6 w-6" />
          <span className="hidden xl:inline-block ml-4 text-xl">Sign out</span>
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
