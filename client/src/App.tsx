import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import MapPage from "@/pages/MapPage";
import { MapProvider } from "@/contexts/MapContext";

function Router() {
  return (
    <Switch>
      <Route path="/" component={MapPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <MapProvider>
        <Toaster />
        <Router />
      </MapProvider>
    </TooltipProvider>
  );
}

export default App;
