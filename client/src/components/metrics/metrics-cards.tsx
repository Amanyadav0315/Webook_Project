import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowDown, Check, TriangleAlert, Clock, CircleAlert, TrendingUp, TrendingDown, Minus } from "lucide-react";
import type { Metrics } from "@shared/schema";

interface MetricsCardsProps {
  metrics?: Metrics;
  loading: boolean;
}

export default function MetricsCards({ metrics, loading }: MetricsCardsProps) {
  const metricCards = [
    {
      title: "Received",
      value: metrics?.received || 0,
      icon: ArrowDown,
      bgColor: "bg-blue-100 dark:bg-blue-900",
      iconColor: "text-blue-600 dark:text-blue-400",
      change: "+12%",
      changeType: "up" as const,
    },
    {
      title: "Processed",
      value: metrics?.sent || 0,
      icon: Check,
      bgColor: "bg-green-100 dark:bg-green-900",
      iconColor: "text-green-600 dark:text-green-400",
      change: "+8%",
      changeType: "up" as const,
    },
    {
      title: "Failed",
      value: metrics?.failed || 0,
      icon: TriangleAlert,
      bgColor: "bg-red-100 dark:bg-red-900",
      iconColor: "text-red-600 dark:text-red-400",
      change: "+3%",
      changeType: "up" as const,
    },
    {
      title: "Queue Size",
      value: metrics?.queueSize || 0,
      icon: Clock,
      bgColor: "bg-yellow-100 dark:bg-yellow-900",
      iconColor: "text-yellow-600 dark:text-yellow-400",
      change: "-15%",
      changeType: "down" as const,
    },
    {
      title: "DLQ",
      value: metrics?.dlq || 0,
      icon: CircleAlert,
      bgColor: "bg-purple-100 dark:bg-purple-900",
      iconColor: "text-purple-600 dark:text-purple-400",
      change: "No change",
      changeType: "neutral" as const,
    },
  ];

  const getChangeIcon = (type: "up" | "down" | "neutral") => {
    switch (type) {
      case "up":
        return <TrendingUp className="h-3 w-3 mr-1" />;
      case "down":
        return <TrendingDown className="h-3 w-3 mr-1" />;
      case "neutral":
        return <Minus className="h-3 w-3 mr-1" />;
    }
  };

  const getChangeColor = (type: "up" | "down" | "neutral", title: string) => {
    if (type === "neutral") return "text-muted-foreground";
    
    // For "Failed" metric, "up" is bad (red), "down" is good (green)
    if (title === "Failed") {
      return type === "up" ? "text-red-600" : "text-green-600";
    }
    
    // For other metrics, "up" is generally good (green), "down" is concerning (red)
    // Exception: Queue Size down is good
    if (title === "Queue Size") {
      return type === "down" ? "text-green-600" : "text-red-600";
    }
    
    return type === "up" ? "text-green-600" : "text-red-600";
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <Skeleton className="h-4 w-16 mb-2" />
                  <Skeleton className="h-8 w-12" />
                </div>
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <div className="mt-2">
                <Skeleton className="h-3 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      {metricCards.map((metric, index) => {
        const Icon = metric.icon;
        
        return (
          <Card key={metric.title} data-testid={`metric-${metric.title.toLowerCase()}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </p>
                  <p className="text-2xl font-bold">
                    {metric.value.toLocaleString()}
                  </p>
                </div>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${metric.bgColor}`}>
                  <Icon className={`h-4 w-4 ${metric.iconColor}`} />
                </div>
              </div>
              <div className={`mt-2 flex items-center text-xs ${getChangeColor(metric.changeType, metric.title)}`}>
                {getChangeIcon(metric.changeType)}
                {metric.change} from last hour
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
