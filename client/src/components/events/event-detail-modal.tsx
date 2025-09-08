import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { RotateCcw, CheckCircle, Clock, AlertTriangle, Loader2 } from "lucide-react";
import type { Event } from "@shared/schema";

interface EventDetailModalProps {
  event: Event;
  onClose: () => void;
  onReplay: (event: Event) => void;
}

export default function EventDetailModal({ event, onClose, onReplay }: EventDetailModalProps) {
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

  const canReplay = event.status === 'failed';

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Event Details</DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto space-y-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Event ID</Label>
            <div className="mt-1">
              <code className="px-2 py-1 bg-muted rounded text-sm font-mono">
                {event.eventId}
              </code>
            </div>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Payload</Label>
            <div className="mt-1">
              <pre className="bg-muted p-3 rounded text-sm font-mono overflow-x-auto">
                {JSON.stringify(event.payload, null, 2)}
              </pre>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Status</Label>
              <div className="mt-1">
                <Badge className={`inline-flex items-center ${getStatusColor(event.status)}`}>
                  {getStatusIcon(event.status)}
                  {event.status}
                </Badge>
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Retry Count</Label>
              <div className="mt-1 text-sm">
                {event.retryCount}/3
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Created At</Label>
              <div className="mt-1 text-sm">
                {new Date(event.createdAt).toLocaleString()}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Updated At</Label>
              <div className="mt-1 text-sm">
                {new Date(event.updatedAt).toLocaleString()}
              </div>
            </div>
          </div>

          {event.processedAt && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Processed At</Label>
              <div className="mt-1 text-sm">
                {new Date(event.processedAt).toLocaleString()}
              </div>
            </div>
          )}

          {event.failedAt && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Failed At</Label>
              <div className="mt-1 text-sm">
                {new Date(event.failedAt).toLocaleString()}
              </div>
            </div>
          )}

          {event.errorMessage && (
            <div>
              <Label className="text-sm font-medium text-muted-foreground">Error Message</Label>
              <div className="mt-1 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200">
                {event.errorMessage}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} data-testid="button-close-detail">
            Close
          </Button>
          <Button
            onClick={() => {
              onReplay(event);
              onClose();
            }}
            disabled={!canReplay}
            data-testid="button-replay-detail"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Replay Event
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
