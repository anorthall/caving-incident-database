import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { updateIncident, type IncidentDetail, type IncidentUpdate } from "@/lib/api";

function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function EditIncidentSheet({ incident }: { incident: IncidentDetail }) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(incident.title);
  const [summary, setSummary] = useState(incident.summary);
  const [date, setDate] = useState(incident.date?.raw ?? "");
  const [tags, setTags] = useState(incident.tags.map((tag) => tag.name).join(", "));
  const [analysis, setAnalysis] = useState(incident.analysis);

  const mutation = useMutation({
    mutationFn: (update: IncidentUpdate) => updateIncident(incident.id, update),
    onSuccess: () => {
      toast.success("Incident updated");
      queryClient.invalidateQueries({ queryKey: ["incident", incident.id] });
      queryClient.invalidateQueries({ queryKey: ["incident-revisions", incident.id] });
      setOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setTitle(incident.title);
      setSummary(incident.summary);
      setDate(incident.date?.raw ?? "");
      setTags(incident.tags.map((tag) => tag.name).join(", "));
      setAnalysis(incident.analysis);
    }
    setOpen(next);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    mutation.mutate({ title, summary, date, tags: parseTags(tags), analysis });
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="cursor-pointer">
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <form onSubmit={handleSubmit} className="flex min-h-full flex-col">
          <SheetHeader>
            <SheetTitle>Edit incident</SheetTitle>
            <SheetDescription>Changes are recorded in the revision history.</SheetDescription>
          </SheetHeader>
          <div className="flex flex-1 flex-col gap-4 px-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={title}
                maxLength={100}
                required
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-date">Date</Label>
              <Input
                id="edit-date"
                value={date}
                placeholder="YYYY, YYYY-MM or YYYY-MM-DD"
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tags">Tags</Label>
              <Input
                id="edit-tags"
                value={tags}
                placeholder="Comma separated"
                onChange={(e) => setTags(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-summary">Summary</Label>
              <Textarea
                id="edit-summary"
                rows={4}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-analysis">Analysis</Label>
              <Textarea
                id="edit-analysis"
                rows={6}
                value={analysis}
                onChange={(e) => setAnalysis(e.target.value)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button type="submit" disabled={mutation.isPending} className="cursor-pointer">
              {mutation.isPending ? "Saving..." : "Save changes"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
