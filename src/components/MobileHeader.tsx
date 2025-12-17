import { Menu } from "lucide-react";
import { Drawer, DrawerTrigger, DrawerContent, DrawerHeader } from "@/components/ui/drawer";
import MobileSidebar from "./MobileSidebar";
import { useState } from "react";

interface MobileHeaderProps {
    currentUserId: string;
    username?: string;
}

const MobileHeader = ({ currentUserId, username }: MobileHeaderProps) => {
    // Controlled open state isn't necessary with vaul DrawerTrigger, but keeping it simple
    const [open, setOpen] = useState(false);

    return (
        <div className="md:hidden flex items-center gap-3">
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>
                    <button aria-label="Open navigation" className="p-2 rounded-full hover:bg-muted/30">
                        <Menu className="h-6 w-6" />
                    </button>
                </DrawerTrigger>

                <DrawerContent>
                    <DrawerHeader>
                        <h3 className="text-lg font-bold">Navigation</h3>
                    </DrawerHeader>

                    <MobileSidebar currentUserId={currentUserId} username={username} />
                </DrawerContent>
            </Drawer>
        </div>
    );
};

export default MobileHeader;
