import { useTheme } from "./ThemeProvider";
import { Sun, Moon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const ThemeToggle = () => {
    const { theme, setTheme } = useTheme();

    const next = () => {
        if (theme === "light") setTheme("dark");
        else if (theme === "dark") setTheme("glass");
        else if (theme === "glass") setTheme("system");
        else setTheme("light");
    };

    return (
        <Button onClick={next} variant="ghost" size="icon" className="rounded-full">
            {theme === "light" && <Sun className="h-4 w-4" />}
            {theme === "dark" && <Moon className="h-4 w-4" />}
            {theme === "glass" && <Sparkles className="h-4 w-4" />}
            {theme === "system" && <Sun className="h-4 w-4" />}
        </Button>
    );
};

export default ThemeToggle;