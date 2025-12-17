import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
    Home,
    Search,
    Bell,
    Mail,
    User as UserIcon,
    Settings as SettingsIcon,
    LogOut,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface MobileSidebarProps {
    currentUserId: string;
    username?: string;
}

const MobileSidebar = ({ currentUserId, username }: MobileSidebarProps) => {
    const { toast } = useToast();

    const handleSignOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            toast({ title: "Error signing out", description: error.message, variant: "destructive" });
        }
    };

    const navItems = [
        { icon: Home, label: "Home", path: "/" },
        { icon: Search, label: "Explore", path: "/explore" },
        { icon: Bell, label: "Notifications", path: "/notifications" },
        { icon: Mail, label: "Messages", path: "/messages" },
        { icon: UserIcon, label: "Profile", path: `/profile/${username || currentUserId}` },
        { icon: SettingsIcon, label: "Settings", path: "/settings" },
    ];

    return (
        <div className="p-4">
            <nav className="space-y-3">
                {navItems.map((item) => (
                    <Link key={item.path} to={item.path} className="block">
                        <Button variant="ghost" className="w-full justify-start gap-3">
                            <item.icon className="h-6 w-6" />
                            <span className="text-lg">{item.label}</span>
                        </Button>
                    </Link>
                ))}
            </nav>

            <div className="mt-4">
                <Button variant="outline" className="w-full" onClick={handleSignOut}>
                    <LogOut className="h-5 w-5 mr-2" /> Sign out
                </Button>
            </div>
        </div>
    );
};

export default MobileSidebar;
