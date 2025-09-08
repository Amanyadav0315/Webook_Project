import { Link, useLocation } from "wouter";
import { BarChart3, Heart, List, Settings, Zap } from "lucide-react";

export default function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/admin/events", icon: List, label: "Events", active: true },
    { href: "/admin/metrics", icon: BarChart3, label: "Metrics" },
    { href: "/admin/health", icon: Heart, label: "Health" },
    { href: "/admin/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Zap className="text-primary-foreground h-4 w-4" />
          </div>
          <div>
            <h1 className="font-semibold text-lg">Event Pipeline</h1>
            <p className="text-muted-foreground text-xs">Admin Dashboard</p>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.href || (item.href === "/admin/events" && location === "/");
          
          return (
            <Link key={item.href} href={item.href}>
              <span 
                className={`flex items-center space-x-3 px-3 py-2 rounded-md font-medium transition-colors cursor-pointer ${
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
                data-testid={`nav-${item.label.toLowerCase()}`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span>System Healthy</span>
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          Last checked: 2 min ago
        </div>
      </div>
    </aside>
  );
}
