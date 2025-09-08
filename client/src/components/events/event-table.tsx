import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, RotateCcw, Copy, CheckCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Event } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

interface EventTableProps {
  events: Event[];
  loading: boolean;
  onViewEvent: (event: Event) => void;
  onReplayEvent: (event: Event) => void;
}

export default function EventTable({ events, loading, onViewEvent, onReplayEvent }: EventTableProps) {
  const { toast } = useToast();

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="h-3 w-3 mr-1" />;
      case 'processing':
        return <Loader2 className="h-3 w-3 mr-1 animate-spin" />;
      case 'failed':
        return <AlertTriangle className="h-3 w-3 mr-1" />;
      case 'queued':
        return <Clock className="h-3 w-3 mr-1" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100';
      case 'processing':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-100';
      case 'queued':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-100';
    }
  };

  const copyEventId = async (eventId: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(eventId);
      } else {
        // Fallback for older browsers or non-HTTPS
        const textArea = document.createElement('textarea');
        textArea.value = eventId;
        textArea.style.position = 'absolute';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      toast({
        title: "Copied!",
        description: `Event ID ${eventId} copied to clipboard`,
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Unable to copy event ID to clipboard",
        variant: "destructive",
      });
    }
  };

  const canReplay = (event: Event) => event.status === 'failed';

  if (loading) {
    return (
      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Event ID</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>User ID</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Retries</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/30">
            <TableRow>
              <TableHead className="px-6 py-3">Event ID</TableHead>
              <TableHead className="px-6 py-3">Type</TableHead>
              <TableHead className="px-6 py-3">User ID</TableHead>
              <TableHead className="px-6 py-3">Status</TableHead>
              <TableHead className="px-6 py-3">Created</TableHead>
              <TableHead className="px-6 py-3">Retries</TableHead>
              <TableHead className="px-6 py-3 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {events.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No events found
                </TableCell>
              </TableRow>
            ) : (
              events.map((event) => (
                <TableRow key={event.id} className="hover:bg-muted/20 transition-colors">
                  <TableCell className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                        {event.eventId}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyEventId(event.eventId)}
                        className="h-6 w-6 p-0"
                        data-testid={`button-copy-${event.eventId}`}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm">
                    {event.type}
                  </TableCell>
                  <TableCell className="px-6 py-4 text-sm">
                    {event.userId || '-'}
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge 
                      className={`inline-flex items-center ${getStatusColor(event.status)}`}
                      data-testid={`status-${event.eventId}`}
                    >
                      {getStatusIcon(event.status)}
                      {event.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <div className="text-sm">
                      {new Date(event.createdAt).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <span 
                      className={`text-sm ${event.retryCount >= 3 ? 'text-red-600' : 'text-muted-foreground'}`}
                    >
                      {event.retryCount}/3
                    </span>
                  </TableCell>
                  <TableCell className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onViewEvent(event)}
                        className="h-8 w-8 p-0"
                        data-testid={`button-view-${event.eventId}`}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onReplayEvent(event)}
                        disabled={!canReplay(event)}
                        className={`h-8 w-8 p-0 ${canReplay(event) ? 'text-primary hover:text-primary/80' : 'opacity-50 cursor-not-allowed'}`}
                        data-testid={`button-replay-${event.eventId}`}
                      >
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="bg-muted/30 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">1</span> to{' '}
          <span className="font-medium text-foreground">{Math.min(20, events.length)}</span> of{' '}
          <span className="font-medium text-foreground">{events.length}</span> events
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
            1
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
