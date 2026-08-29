"use client";

import { useState, useTransition } from "react";
import { Plus, Trash2, Edit2, Loader2, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from "@/app/(app)/housekeeping/actions";

export type TemplateSummary = {
  id: string;
  name: string;
  defaultForRoomTypeId: string | null;
  defaultForRoomTypeName?: string | null;
  itemCount: number;
  items?: Array<{ id: string; label: string; sortOrder: number }>;
};

export type RoomTypeOption = {
  id: string;
  name: string;
};

export function TemplateManager({
  templates,
  roomTypes,
  canManage,
}: {
  templates: TemplateSummary[];
  roomTypes: RoomTypeOption[];
  canManage: boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TemplateSummary | null>(null);
  const [name, setName] = useState("");
  const [roomTypeId, setRoomTypeId] = useState<string>("none");
  const [items, setItems] = useState<string[]>([""]);
  const [isPending, startTransition] = useTransition();

  function openCreateDialog() {
    setEditingTemplate(null);
    setName("");
    setRoomTypeId("none");
    setItems(["Clean bathroom", "Change bed sheets", "Dust surfaces", "Vacuum floor", "Restock amenities"]);
    setDialogOpen(true);
  }

  function openEditDialog(template: TemplateSummary) {
    setEditingTemplate(template);
    setName(template.name);
    setRoomTypeId(template.defaultForRoomTypeId ?? "none");
    setItems(template.items?.map((i) => i.label) ?? [""]);
    setDialogOpen(true);
  }

  function handleAddItem() {
    setItems([...items, ""]);
  }

  function handleRemoveItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  function handleItemChange(index: number, value: string) {
    const next = [...items];
    next[index] = value;
    setItems(next);
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Template name is required");
      return;
    }
    const cleanItems = items.map((i) => i.trim()).filter(Boolean);
    if (cleanItems.length === 0) {
      toast.error("Add at least one checklist item");
      return;
    }

    startTransition(async () => {
      const payload = {
        name: name.trim(),
        defaultForRoomTypeId: roomTypeId === "none" ? null : roomTypeId,
        items: cleanItems.map((label, sortOrder) => ({ label, sortOrder })),
      };

      if (editingTemplate) {
        const result = await updateTemplate({
          templateId: editingTemplate.id,
          ...payload,
        });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Template updated");
      } else {
        const result = await createTemplate(payload);
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        toast.success("Template created");
      }

      setDialogOpen(false);
    });
  }

  function handleDelete(templateId: string) {
    if (!confirm("Are you sure you want to delete this checklist template?")) return;
    startTransition(async () => {
      const result = await deleteTemplate({ templateId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Template deleted");
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base">Checklist Templates</CardTitle>
          <CardDescription>
            Reusable cleaning task checklists assigned automatically on checkout.
          </CardDescription>
        </div>
        {canManage && (
          <Button size="sm" onClick={openCreateDialog}>
            <Plus data-icon="inline-start" />
            New Template
          </Button>
        )}
      </CardHeader>

      <CardContent>
        {templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-sm text-muted-foreground">
            <Sparkles className="mb-2 size-8 text-muted-foreground/50" />
            <p>No checklist templates created yet.</p>
            {canManage && (
              <p className="text-xs">
                Create standard checklists for your room types.
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {templates.map((tpl) => (
              <div
                key={tpl.id}
                className="flex items-center justify-between py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm">{tpl.name}</p>
                    {tpl.defaultForRoomTypeName && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                        Default for {tpl.defaultForRoomTypeName}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {tpl.itemCount} checklist {tpl.itemCount === 1 ? "item" : "items"}
                  </p>
                </div>

                {canManage && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => openEditDialog(tpl)}
                      disabled={isPending}
                    >
                      <Edit2 className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => handleDelete(tpl.id)}
                      disabled={isPending}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? "Edit Checklist Template" : "New Checklist Template"}
            </DialogTitle>
            <DialogDescription>
              Define the sequence of cleaning tasks for this template.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Template Name</Label>
              <Input
                id="tpl-name"
                placeholder="e.g. Standard Turnover, Deep Clean"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-room-type">Default for Room Type (optional)</Label>
              <Select value={roomTypeId} onValueChange={setRoomTypeId}>
                <SelectTrigger id="tpl-room-type">
                  <SelectValue placeholder="None (generic template)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (generic template)</SelectItem>
                  {roomTypes.map((rt) => (
                    <SelectItem key={rt.id} value={rt.id}>
                      {rt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Checklist Items</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-7 text-xs"
                >
                  <Plus className="mr-1 size-3" /> Add item
                </Button>
              </div>

              <div className="space-y-1.5">
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <span className="w-5 text-right text-xs text-muted-foreground">
                      {idx + 1}.
                    </span>
                    <Input
                      placeholder={`Item #${idx + 1}`}
                      value={item}
                      onChange={(e) => handleItemChange(idx, e.target.value)}
                      className="h-8 text-sm"
                    />
                    {items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDialogOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isPending}>
              {isPending && <Loader2 className="animate-spin" data-icon="inline-start" />}
              {editingTemplate ? "Save Changes" : "Create Template"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
