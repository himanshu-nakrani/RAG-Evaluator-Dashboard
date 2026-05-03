import { useState } from "react";
import {
  useListTemplates,
  useCreateTemplate,
  useDeleteTemplate,
  useListExperiments,
  useCreateSweep,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Zap, BookMarked, Copy, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

function TemplateCard({
  template,
  onUse,
  onDelete,
}: {
  template: any;
  onUse: (t: any) => void;
  onDelete?: (id: number) => void;
}) {
  return (
    <Card className="border-border bg-card flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {template.isPreset ? (
              <Zap className="w-4 h-4 text-primary shrink-0" />
            ) : (
              <BookMarked className="w-4 h-4 text-muted-foreground shrink-0" />
            )}
            {template.name}
          </CardTitle>
          {template.isPreset && (
            <Badge variant="secondary" className="text-[9px] shrink-0">
              Preset
            </Badge>
          )}
          {template.category && !template.isPreset && (
            <Badge variant="outline" className="text-[9px] shrink-0">
              {template.category}
            </Badge>
          )}
        </div>
        {template.description && (
          <p className="text-xs text-muted-foreground mt-1">{template.description}</p>
        )}
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-1 text-[10px] border border-border/50 rounded p-2 bg-muted/20">
          <div className="text-muted-foreground">Chunks</div>
          <div className="text-right">{template.chunkSizes.join(", ")}</div>
          <div className="text-muted-foreground">Models</div>
          <div className="text-right">{template.embeddingModels.length} selected</div>
          <div className="text-muted-foreground">Retrievers</div>
          <div className="text-right">{template.retrieverTypes.join(", ")}</div>
          <div className="text-muted-foreground">Top-K</div>
          <div className="text-right">{template.topK}</div>
          <div className="text-muted-foreground">Overlap</div>
          <div className="text-right">{template.chunkOverlap}</div>
        </div>
        <div className="text-[10px] text-muted-foreground">
          {template.chunkSizes.length * template.embeddingModels.length * template.retrieverTypes.length} experiment combinations
        </div>
        <div className="flex gap-2 mt-auto">
          <Button
            size="sm"
            className="flex-1 text-xs"
            variant="outline"
            onClick={() => onUse(template)}
          >
            <Copy className="w-3 h-3 mr-1" /> Use Template
          </Button>
          {!template.isPreset && onDelete && (
            <Button
              size="sm"
              variant="ghost"
              className="text-muted-foreground hover:text-destructive"
              onClick={() => onDelete(template.id)}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TemplatesLibrary() {
  const { data: templates, isLoading } = useListTemplates();
  const { data: experiments } = useListExperiments();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const createSweep = useCreateSweep();
  const queryClient = useQueryClient();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [createOpen, setCreateOpen] = useState(false);
  const [useOpen, setUseOpen] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<any>(null);
  const [selectedDoc, setSelectedDoc] = useState("");
  const [selectedQSet, setSelectedQSet] = useState("");

  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newChunkSizes, setNewChunkSizes] = useState("256, 512");
  const [newModels, setNewModels] = useState("text-embedding-3-small");
  const [newRetrievers, setNewRetrievers] = useState("similarity");
  const [newTopK, setNewTopK] = useState("5");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const chunkSizes = newChunkSizes
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n));
    const embeddingModels = newModels.split(",").map((s) => s.trim()).filter(Boolean);
    const retrieverTypes = newRetrievers.split(",").map((s) => s.trim()).filter(Boolean);

    if (!chunkSizes.length || !embeddingModels.length || !retrieverTypes.length) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    createTemplate.mutate(
      {
        data: {
          name: newName,
          description: newDesc || undefined,
          category: newCategory || undefined,
          chunkSizes,
          embeddingModels,
          retrieverTypes,
          topK: parseInt(newTopK) || 5,
          chunkOverlap: 50,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
          setCreateOpen(false);
          setNewName("");
          setNewDesc("");
          setNewCategory("");
          toast({ title: "Template created" });
        },
      }
    );
  };

  const handleDelete = (id: number) => {
    deleteTemplate.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/templates"] });
          toast({ title: "Template deleted" });
        },
      }
    );
  };

  const handleUseClick = (template: any) => {
    setActiveTemplate(template);
    setUseOpen(true);
  };

  const handleLaunchSweep = () => {
    if (!activeTemplate || !selectedDoc || !selectedQSet) {
      toast({ title: "Select a document and question set", variant: "destructive" });
      return;
    }
    createSweep.mutate(
      {
        data: {
          name: `${activeTemplate.name} Sweep`,
          documentId: Number(selectedDoc),
          questionSetId: Number(selectedQSet),
          chunkSizes: activeTemplate.chunkSizes,
          embeddingModels: activeTemplate.embeddingModels,
          retrieverTypes: activeTemplate.retrieverTypes,
          topK: activeTemplate.topK,
          chunkOverlap: activeTemplate.chunkOverlap,
          autoRun: true,
        },
      },
      {
        onSuccess: () => {
          toast({
            title: "Sweep launched",
            description: `${activeTemplate.chunkSizes.length * activeTemplate.embeddingModels.length * activeTemplate.retrieverTypes.length} experiments created`,
          });
          setUseOpen(false);
          navigate("/sweeps");
        },
      }
    );
  };

  const presets = (templates ?? []).filter((t: any) => t.isPreset);
  const custom = (templates ?? []).filter((t: any) => !t.isPreset);

  const uniqueDocs = experiments
    ? [...new Map(experiments.map((e: any) => [e.documentId, { id: e.documentId, name: e.documentId }])).values()]
    : [];

  const uniqueQSets = experiments
    ? [...new Map(experiments.map((e: any) => [e.questionSetId, { id: e.questionSetId, name: e.questionSetId }])).values()]
    : [];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground flex items-center gap-3">
            <BookMarked className="w-8 h-8 text-primary" />
            Template Library
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Pre-built and custom parameter sweep templates
          </p>
        </div>

        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" /> New Template
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[480px] border-border bg-card">
            <DialogHeader>
              <DialogTitle>Create Custom Template</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Name *</Label>
                <Input
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g., My RAG Config"
                  className="font-mono bg-background"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">Description</Label>
                <Textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="What makes this template special?"
                  className="bg-background text-sm min-h-[70px] resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">
                    Chunk Sizes (comma-sep)
                  </Label>
                  <Input
                    value={newChunkSizes}
                    onChange={(e) => setNewChunkSizes(e.target.value)}
                    placeholder="256, 512"
                    className="bg-background text-sm font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-muted-foreground">Top-K</Label>
                  <Input
                    type="number"
                    value={newTopK}
                    onChange={(e) => setNewTopK(e.target.value)}
                    min={1}
                    max={20}
                    className="bg-background text-sm font-mono"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Embedding Models (comma-sep)
                </Label>
                <Input
                  value={newModels}
                  onChange={(e) => setNewModels(e.target.value)}
                  placeholder="text-embedding-3-small"
                  className="bg-background text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground">
                  Retriever Types (comma-sep)
                </Label>
                <Input
                  value={newRetrievers}
                  onChange={(e) => setNewRetrievers(e.target.value)}
                  placeholder="similarity, mmr"
                  className="bg-background text-sm font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createTemplate.isPending}>
                  {createTemplate.isPending ? "Creating…" : "Create Template"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      ) : (
        <>
          {presets.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground pl-2 border-l-2 border-primary">
                Built-in Presets
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {presets.map((t: any, i: number) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <TemplateCard template={t} onUse={handleUseClick} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {custom.length > 0 && (
            <section className="space-y-4">
              <h3 className="font-mono text-xs uppercase tracking-widest text-muted-foreground pl-2 border-l-2 border-primary">
                Your Templates
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {custom.map((t: any, i: number) => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <TemplateCard template={t} onUse={handleUseClick} onDelete={handleDelete} />
                  </motion.div>
                ))}
              </div>
            </section>
          )}

          {!presets.length && !custom.length && (
            <Card className="border-dashed border-2 border-border bg-transparent p-12 text-center">
              <div className="text-muted-foreground font-mono">
                <BookMarked className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p className="text-sm">No templates yet. Create one to get started.</p>
              </div>
            </Card>
          )}
        </>
      )}

      <Dialog open={useOpen} onOpenChange={setUseOpen}>
        <DialogContent className="sm:max-w-[420px] border-border bg-card">
          <DialogHeader>
            <DialogTitle>
              Launch Sweep — {activeTemplate?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              This will create{" "}
              <strong>
                {activeTemplate
                  ? activeTemplate.chunkSizes.length *
                    activeTemplate.embeddingModels.length *
                    activeTemplate.retrieverTypes.length
                  : 0}
              </strong>{" "}
              experiments and run all evaluations automatically.
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">Document ID</Label>
              <Input
                type="number"
                value={selectedDoc}
                onChange={(e) => setSelectedDoc(e.target.value)}
                placeholder="Enter document ID"
                className="font-mono bg-background"
                min={1}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="font-mono text-xs uppercase text-muted-foreground">Question Set ID</Label>
              <Input
                type="number"
                value={selectedQSet}
                onChange={(e) => setSelectedQSet(e.target.value)}
                placeholder="Enter question set ID"
                className="font-mono bg-background"
                min={1}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button variant="ghost" onClick={() => setUseOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleLaunchSweep}
                disabled={!selectedDoc || !selectedQSet || createSweep.isPending}
              >
                {createSweep.isPending ? "Launching…" : "Launch Sweep"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
