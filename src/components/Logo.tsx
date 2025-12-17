interface LogoProps {
  className?: string;
  showText?: boolean;
  variant?: "default" | "sky";
}

// Use the logo placed in the public folder at /Untitled.svg
const Logo = ({ className = "h-10 w-10", showText = false }: LogoProps) => {
  const src = "/Untitled.svg";

  return (
    <div className={`${className} relative flex items-center justify-center gap-2`}>
      <img
        src={src}
        alt="App Logo"
        className="w-full h-full object-contain"
      />
      {showText && (
        <span className="font-bold text-xl text-foreground">Theta</span>
      )}
    </div>
  );
};

export default Logo;
