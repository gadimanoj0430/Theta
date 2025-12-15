import animatedLogo from "@/assets/xtheta-logo-animated.mp4";

const Index = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <video
          src={animatedLogo}
          autoPlay
          loop
          muted
          playsInline
          className="mx-auto h-32 w-32 rounded-full bg-black"
        />
        <h1 className="mt-6 mb-4 text-4xl font-bold">Welcome to XTheta</h1>
        <p className="text-xl text-muted-foreground">Your social platform awaits</p>
      </div>
    </div>
  );
};

export default Index;
