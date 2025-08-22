import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/auth-context";
import Navigation from "@/components/layout/navigation";
import Home from "@/pages/home";
import Chat from "@/pages/chat";
import Market from "@/pages/market";
import News from "@/pages/news";
import History from "@/pages/history";
import Auth from "@/pages/auth";
import AuthCallback from "@/pages/auth-callback";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen bg-navy text-off-white">
      <Navigation />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/auth" component={Auth} />
        <Route path="/auth/callback" component={AuthCallback} />
        <Route path="/chat" component={Chat} />
        <Route path="/market" component={Market} />
        <Route path="/news" component={News} />
        <Route path="/history" component={History} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
