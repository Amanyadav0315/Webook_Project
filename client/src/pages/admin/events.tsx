import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Sidebar from "@/components/layout/sidebar";
import EventTable from "@/components/events/event-table";
import EventDetailModal from "@/components/events/event-detail-modal";
import ReplayModal from "@/components/events/replay-modal";
import MetricsCards from "@/components/metrics/metrics-cards";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RefreshCw, Search, Download, ToggleLeft, ToggleRight } from "lucide-react";
import { apiRequest } from "@/lib/api";
import type { Event, Metrics } from "@shared/schema";

export default function EventsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [replayEvent, setReplayEvent] = useState<Event | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch events
  const { 
    data: events = [], 
    isLoading: eventsLoading,
    refetch: refetchEvents 
  } = useQuery<Event[]>({
    queryKey: ['/api/events', { search: searchQuery, status: statusFilter === "all" ? "" : statusFilter }],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  // Fetch metrics
  const { 
    data: metrics,
    isLoading: metricsLoading 
  } = useQuery<Metrics>({
    queryKey: ['/api/metrics'],
    refetchInterval: autoRefresh ? 30000 : false,
  });

  const handleRefresh = () => {
    refetchEvents();
  };

  const handleExport = async () => {
    try {
      const response = await apiRequest('GET', '/api/events?limit=1000');
      const data = await response.json();
      
      const csv = [
        ['Event ID', 'Type', 'User ID', 'Status', 'Created', 'Retries'].join(','),
        ...data.map((event: Event) => [
          event.eventId,
          event.type,
          event.userId || '',
          event.status,
          event.createdAt,
          `${event.retryCount}/3`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `events-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="flex h-screen">
      <Sidebar />
      
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-semibold" data-testid="page-title">Events Dashboard</h2>
              <p className="text-muted-foreground mt-1">Monitor and manage webhook events in your pipeline</p>
            </div>
            <div className="flex items-center space-x-4">
              <button 
                className="flex items-center space-x-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setAutoRefresh(!autoRefresh)}
                data-testid="toggle-auto-refresh"
              >
                {autoRefresh ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                <span>Auto-refresh: {autoRefresh ? 'ON' : 'OFF'}</span>
              </button>
              <div className="text-sm text-muted-foreground">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </header>

        {/* Metrics Overview */}
        <div className="px-6 py-4 bg-muted/30">
          <MetricsCards metrics={metrics} loading={metricsLoading} />
        </div>

        {/* Events Table */}
        <div className="flex-1 px-6 py-4 overflow-hidden">
          {/* Search and Filters */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by event ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-64"
                  data-testid="input-search"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48" data-testid="select-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="queued">Queued</SelectItem>
                  <SelectItem value="processing">Processing</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Button 
                variant="secondary" 
                onClick={handleExport}
                data-testid="button-export"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button 
                onClick={handleRefresh}
                data-testid="button-refresh"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>

          <EventTable
            events={events}
            loading={eventsLoading}
            onViewEvent={setSelectedEvent}
            onReplayEvent={setReplayEvent}
          />
        </div>
      </main>

      {/* Modals */}
      {selectedEvent && (
        <EventDetailModal
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onReplay={setReplayEvent}
        />
      )}
      
      {replayEvent && (
        <ReplayModal
          event={replayEvent}
          onClose={() => setReplayEvent(null)}
          onSuccess={() => {
            setReplayEvent(null);
            refetchEvents();
          }}
        />
      )}
    </div>
  );
}
