import logoSvg from "@/assets/xtheta-logo.svg";

interface LogoProps {
  className?: string;
  showText?: boolean;
}

const Logo = ({ className = "h-10 w-10", showText = false }: LogoProps) => {
  return (
    <div className={`${className} relative flex items-center justify-center gap-2`}>
      <img 
        src={logoSvg} 
        alt="XTheta Logo" 
        className="w-full h-full object-contain"
      />
      {showText && (
        <span className="font-bold text-xl text-foreground">XTheta</span>
      )}
    </div>
  );
};

export default Logo;
