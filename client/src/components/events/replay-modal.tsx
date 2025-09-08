import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";
import type { Event } from "@shared/schema";

interface ReplayModalProps {
  event: Event;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ReplayModal({ event, onClose, onSuccess }: ReplayModalProps) {
  const { toast } = useToast();

  const replayMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/events/${event.id}/replay`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Event Replayed",
        description: `Event ${event.eventId} has been successfully replayed.`,
      });
      onSuccess();
    },
    onError: (error: any) => {
      toast({
        title: "Replay Failed",
        description: error.message || "Failed to replay event. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleReplay = () => {
    replayMutation.mutate();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Replay Event</DialogTitle>
        </DialogHeader>
        
        <div>
          <p className="text-muted-foreground mb-4">
            Are you sure you want to replay this event? This will requeue the event for processing.
          </p>
          
          <div className="bg-muted p-3 rounded text-sm">
            <div className="font-medium">
              Event ID: <code>{event.eventId}</code>
            </div>
            <div className="text-muted-foreground mt-1">
              Type: <span>{event.type}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="secondary" 
            onClick={onClose}
            disabled={replayMutation.isPending}
            data-testid="button-cancel-replay"
          >
            Cancel
          </Button>
          <Button
            onClick={handleReplay}
            disabled={replayMutation.isPending}
            data-testid="button-confirm-replay"
          >
            {replayMutation.isPending ? (
              <>
                <RotateCcw className="h-4 w-4 mr-2 animate-spin" />
                Replaying...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4 mr-2" />
                Replay Event
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
