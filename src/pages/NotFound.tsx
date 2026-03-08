import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import Layout from "@/components/Layout";

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <Layout>
      <div className="flex items-center justify-center py-32">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-6">
            <SearchX className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="font-display text-6xl font-extrabold text-foreground mb-2">404</h1>
          <p className="text-lg text-muted-foreground mb-8">Oops! The page you're looking for doesn't exist.</p>
          <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90 rounded-xl" asChild>
            <Link to="/"><Home className="h-4 w-4 mr-2" /> Return to Home</Link>
          </Button>
        </div>
      </div>
    </Layout>
  );
}
