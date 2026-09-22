"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { createCredential, updateCredential, deleteCredential, decryptSecret } from "@/app/(vault)/actions";
import { PasswordReveal } from "@/components/vault/password-reveal";
import { DeleteConfirmationDialog } from "@/components/vault/delete-confirmation-dialog";
import { 
  Plus, 
  Trash2, 
  Folder as FolderIcon, 
  FolderPlus, 
  FilePlus, 
  FileCode2, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  ChevronsUpDown,
  Search,
  Copy,
  Check,
  RotateCcw,
  Edit3,
  ShieldCheck,
  Globe,
  FolderGit2,
  Sparkles,
  FileCheck,
  Upload,
  GripVertical
} from "lucide-react";

import type { CredentialWithTags, CredentialFormData, Environment } from "@/lib/types";

interface EnvFormProps {
  // Pass all credentials for this project
  projectCredentials?: CredentialWithTags[];
}

export interface FileNode {
  id: string;
  path: string;
  name: string;
  folderPath: string;
  content: string;
  encrypted_secret?: string;
  credentialId?: string;
  isModified: boolean;
  environment?: Environment | null;
}

export function EnvForm({ projectCredentials = [] }: EnvFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [copiedPath, setCopiedPath] = useState(false);
  
  // Base metadata for the project
  const firstCred = projectCredentials[0];
  const [formData, setFormData] = useState({
    title: firstCred?.title || "",
    website_url: firstCred?.website_url || "",
    notes: firstCred?.notes || "",
    favorite: firstCred?.favorite || false,
    tag_ids: firstCred?.tags?.map((t) => t.id) || [],
  });

  const isEditing = projectCredentials.length > 0;

  // State for files and folders
  const [files, setFiles] = useState<FileNode[]>([]);
  const [customFolders, setCustomFolders] = useState<string[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ "/": true });
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [deletedCredentialIds, setDeletedCredentialIds] = useState<string[]>([]);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{
    type: "file" | "folder";
    id?: string;
    path: string;
  } | null>(null);
  const [dragOverFolder, setDragOverFolder] = useState<string | null>(null);
  const [isExternalDragOver, setIsExternalDragOver] = useState(false);

  // Dialog state for item creation (File / Folder)
  const [createDialog, setCreateDialog] = useState<{
    open: boolean;
    type: "file" | "folder";
    targetFolder: string;
  }>({ open: false, type: "file", targetFolder: "/" });

  const [newItemName, setNewItemName] = useState("");
  const [createError, setCreateError] = useState("");

  // Dialog state for deletion confirmation
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    type: "file" | "folder";
    targetIdOrPath: string;
    label: string;
  }>({ open: false, type: "file", targetIdOrPath: "", label: "" });

  // Initialize file nodes from project credentials or default state
  useEffect(() => {
    if (projectCredentials.length > 0) {
      const parsedFiles: FileNode[] = projectCredentials.map((cred) => {
        let rawUsername = cred.username || "/.env.production";
        let path = rawUsername;

        // Ensure path starts with slash
        if (!path.startsWith("/")) {
          path = `/${path}`;
        }

        const env = (cred.environment || null) as Environment | null;
        const lastSlashIndex = path.lastIndexOf("/");
        const folderPath = lastSlashIndex <= 0 ? "/" : path.substring(0, lastSlashIndex);
        const name = path.substring(lastSlashIndex + 1) || ".env.production";

        return {
          id: cred.id,
          path,
          name,
          folderPath,
          content: "",
          encrypted_secret: cred.encrypted_secret || undefined,
          credentialId: cred.id,
          isModified: false,
          environment: env,
        };
      });

      setFiles(parsedFiles);
      if (parsedFiles.length > 0 && !activeFileId) {
        setActiveFileId(parsedFiles[0].id);
      }

      // Expand all parent folders up to root for each file
      const initialExpanded: Record<string, boolean> = { "/": true };
      parsedFiles.forEach((file) => {
        const parts = file.path.split("/").filter(Boolean);
        let current = "";
        for (let i = 0; i < parts.length - 1; i++) {
          current += `/${parts[i]}`;
          initialExpanded[current] = true;
        }
      });
      setExpandedFolders(initialExpanded);
    } else {
      // Default initial file for brand new project
      const defaultFile: FileNode = {
        id: "default_env_prod",
        path: "/.env.production",
        name: ".env.production",
        folderPath: "/",
        content: "",
        isModified: false,
        environment: "prod",
      };
      setFiles([defaultFile]);
      setActiveFileId(defaultFile.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectCredentials]);

  // Derive unique folder list
  const allFolderPaths = useMemo(() => {
    return Array.from(new Set(["/", ...customFolders, ...files.map((f) => f.folderPath)]));
  }, [customFolders, files]);

  const folderList = useMemo(() => {
    const completeFolderSet = new Set<string>(["/"]);
    allFolderPaths.forEach((fp) => {
      if (fp === "/") return;
      const parts = fp.split("/").filter(Boolean);
      let current = "";
      parts.forEach((part) => {
        current += `/${part}`;
        completeFolderSet.add(current);
      });
    });
    return Array.from(completeFolderSet).sort();
  }, [allFolderPaths]);

  // Filtered files when searching
  const filteredFiles = useMemo(() => {
    if (!searchFilter.trim()) return files;
    const query = searchFilter.toLowerCase();
    return files.filter((f) => f.name.toLowerCase().includes(query) || f.path.toLowerCase().includes(query));
  }, [files, searchFilter]);

  // Helper to open item creation dialog
  const openCreateDialog = (type: "file" | "folder", targetFolder: string) => {
    setCreateDialog({ open: true, type, targetFolder });
    setNewItemName("");
    setCreateError("");
    expandAllAncestors(targetFolder);
  };

  // Helper to expand all ancestor folders for a given path
  const expandAllAncestors = (path: string) => {
    const parts = path.split("/").filter(Boolean);
    const updates: Record<string, boolean> = { "/": true };
    let current = "";
    for (let i = 0; i < parts.length; i++) {
      current += `/${parts[i]}`;
      updates[current] = true;
    }
    setExpandedFolders((prev) => ({ ...prev, ...updates }));
  };

  // Helper to resolve normalized path regardless of user typing leading slash or folder prefix
  const resolveItemPath = (targetFolder: string, inputName: string): string => {
    let rawInput = inputName.trim().replace(/\\/g, "/");
    rawInput = rawInput.replace(/^\/+/, "").replace(/\/+$/, "");

    let cleanTarget = targetFolder === "/" ? "" : targetFolder.replace(/^\/+/, "").replace(/\/+$/, "");

    if (!rawInput) {
      return cleanTarget ? `/${cleanTarget}` : "/";
    }

    if (cleanTarget) {
      const targetParts = cleanTarget.toLowerCase().split("/");
      const inputParts = rawInput.split("/");

      let matchCount = 0;
      for (let k = targetParts.length; k > 0; k--) {
        const targetSuffix = targetParts.slice(targetParts.length - k).join("/");
        const inputPrefix = inputParts.slice(0, k).map((p) => p.toLowerCase()).join("/");
        if (targetSuffix === inputPrefix) {
          matchCount = k;
          break;
        }
      }

      if (matchCount > 0) {
        const remainingInput = inputParts.slice(matchCount).join("/");
        return remainingInput ? `/${cleanTarget}/${remainingInput}` : `/${cleanTarget}`;
      }

      return `/${cleanTarget}/${rawInput}`;
    }

    return `/${rawInput}`;
  };

  // Helper to move file or folder inside explorer tree
  const moveItemToFolder = (
    item: { type: "file" | "folder"; id?: string; path: string },
    targetFolder: string
  ) => {
    if (item.type === "file") {
      const fileName = item.path.split("/").pop() || "file";
      const newPath = targetFolder === "/" ? `/${fileName}` : `${targetFolder}/${fileName}`;

      if (newPath === item.path) return;

      if (files.some((f) => f.path === newPath && f.id !== item.id)) {
        setError(`A file named "${fileName}" already exists in ${targetFolder === "/" ? "root" : targetFolder}`);
        return;
      }

      setFiles((prev) =>
        prev.map((f) =>
          f.id === item.id || f.path === item.path
            ? {
                ...f,
                path: newPath,
                folderPath: targetFolder,
                isModified: true,
              }
            : f
        )
      );
      expandAllAncestors(newPath);
    } else {
      // Moving folder
      if (targetFolder === item.path || targetFolder.startsWith(item.path + "/")) {
        return; // Cannot drop folder into itself or child
      }

      const folderName = item.path.split("/").pop() || "folder";
      const newFolderPath = targetFolder === "/" ? `/${folderName}` : `${targetFolder}/${folderName}`;

      if (newFolderPath === item.path) return;

      // Update custom folders
      setCustomFolders((prev) =>
        prev.map((f) => {
          if (f === item.path) return newFolderPath;
          if (f.startsWith(item.path + "/")) {
            return newFolderPath + f.substring(item.path.length);
          }
          return f;
        })
      );

      // Update file paths
      setFiles((prev) =>
        prev.map((f) => {
          if (f.folderPath === item.path || f.folderPath.startsWith(item.path + "/")) {
            const updatedFolderPath = newFolderPath + f.folderPath.substring(item.path.length);
            const updatedPath = newFolderPath + f.path.substring(item.path.length);
            return {
              ...f,
              path: updatedPath,
              folderPath: updatedFolderPath,
              isModified: true,
            };
          }
          return f;
        })
      );

      expandAllAncestors(newFolderPath);
    }
  };

  // Helper to handle dropped external files from computer
  const handleExternalFilesDrop = async (
    fileList: FileList | File[],
    targetFolder: string = "/"
  ) => {
    const fileArray = Array.from(fileList);
    if (fileArray.length === 0) return;

    const newNodes: FileNode[] = [];
    let lastId: string | null = null;

    for (const file of fileArray) {
      try {
        const text = await file.text();
        const name = file.name;
        const path = targetFolder === "/" ? `/${name}` : `${targetFolder}/${name}`;

        let env: Environment | null = null;
        if (path.endsWith(".env.production") || path.endsWith(".env.prod")) {
          env = "prod";
        } else if (path.endsWith(".env.staging")) {
          env = "staging";
        } else if (path.endsWith(".env.dev")) {
          env = "dev";
        }

        const fileNode: FileNode = {
          id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          path,
          name,
          folderPath: targetFolder,
          content: text,
          isModified: true,
          environment: env,
        };

        newNodes.push(fileNode);
        lastId = fileNode.id;
      } catch {
        // Ignore unreadable binary files
      }
    }

    if (newNodes.length > 0) {
      setFiles((prev) => {
        const existingPaths = new Set(newNodes.map((n) => n.path));
        const filtered = prev.filter((f) => !existingPaths.has(f.path));
        return [...filtered, ...newNodes];
      });
      expandAllAncestors(targetFolder);
      if (lastId) setActiveFileId(lastId);
    }
  };

  // Execute creation of file or folder
  const handleConfirmCreate = () => {
    setCreateError("");
    const trimmed = newItemName.trim();
    if (!trimmed) {
      setCreateError(`${createDialog.type === "file" ? "File" : "Folder"} name is required.`);
      return;
    }

    const normalizedPath = resolveItemPath(createDialog.targetFolder, trimmed);

    if (normalizedPath === "/" || normalizedPath === createDialog.targetFolder) {
      setCreateError(`Please enter a valid filename to create inside ${createDialog.targetFolder === "/" ? "root" : createDialog.targetFolder}.`);
      return;
    }

    // Clear search filter so newly created item is immediately visible
    setSearchFilter("");

    if (createDialog.type === "folder") {
      if (folderList.includes(normalizedPath)) {
        setCreateError("Folder already exists.");
        return;
      }
      setCustomFolders((prev) => Array.from(new Set([...prev, normalizedPath])));
      expandAllAncestors(normalizedPath);
      setCreateDialog({ open: false, type: "file", targetFolder: "/" });
    } else {
      // Create File
      if (files.some((f) => f.path === normalizedPath)) {
        setCreateError("File with this path already exists.");
        return;
      }

      const lastSlash = normalizedPath.lastIndexOf("/");
      const folderPath = lastSlash <= 0 ? "/" : normalizedPath.substring(0, lastSlash);
      const name = normalizedPath.substring(lastSlash + 1);

      if (folderPath !== "/") {
        setCustomFolders((prev) => Array.from(new Set([...prev, folderPath])));
      }

      let env: Environment | null = null;
      if (normalizedPath.endsWith(".env.production") || normalizedPath.endsWith(".env.prod")) {
        env = "prod";
      } else if (normalizedPath.endsWith(".env.staging")) {
        env = "staging";
      } else if (normalizedPath.endsWith(".env.dev")) {
        env = "dev";
      }

      const newFileNode: FileNode = {
        id: `file_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        path: normalizedPath,
        name,
        folderPath,
        content: "",
        isModified: true,
        environment: env,
      };

      setFiles((prev) => [...prev, newFileNode]);
      expandAllAncestors(normalizedPath);
      setActiveFileId(newFileNode.id);
      setCreateDialog({ open: false, type: "file", targetFolder: "/" });
    }
  };

  // Trigger delete dialog
  const triggerDelete = (type: "file" | "folder", targetIdOrPath: string, label: string) => {
    setDeleteConfirm({
      open: true,
      type,
      targetIdOrPath,
      label,
    });
  };

  // Confirm delete handler
  const handleConfirmDelete = () => {
    if (deleteConfirm.type === "file") {
      const fileToDelete = files.find((f) => f.id === deleteConfirm.targetIdOrPath);
      if (fileToDelete) {
        if (fileToDelete.credentialId) {
          setDeletedCredentialIds((prev) => [...prev, fileToDelete.credentialId!]);
        }
        setFiles((prev) => prev.filter((f) => f.id !== fileToDelete.id));
        if (activeFileId === fileToDelete.id) {
          const remaining = files.filter((f) => f.id !== fileToDelete.id);
          setActiveFileId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    } else {
      // Delete folder and contained files
      const targetFolder = deleteConfirm.targetIdOrPath;
      const filesToDelete = files.filter(
        (f) => f.folderPath === targetFolder || f.folderPath.startsWith(targetFolder + "/")
      );

      const credIdsToRemove = filesToDelete
        .map((f) => f.credentialId)
        .filter((id): id is string => Boolean(id));

      if (credIdsToRemove.length > 0) {
        setDeletedCredentialIds((prev) => [...prev, ...credIdsToRemove]);
      }

      setFiles((prev) =>
        prev.filter(
          (f) => !(f.folderPath === targetFolder || f.folderPath.startsWith(targetFolder + "/"))
        )
      );
      setCustomFolders((prev) =>
        prev.filter((f) => !(f === targetFolder || f.startsWith(targetFolder + "/")))
      );

      if (activeFileId) {
        const currentActive = files.find((f) => f.id === activeFileId);
        if (
          currentActive &&
          (currentActive.folderPath === targetFolder ||
            currentActive.folderPath.startsWith(targetFolder + "/"))
        ) {
          const remaining = files.filter(
            (f) => !(f.folderPath === targetFolder || f.folderPath.startsWith(targetFolder + "/"))
          );
          setActiveFileId(remaining.length > 0 ? remaining[0].id : null);
        }
      }
    }

    setDeleteConfirm({ open: false, type: "file", targetIdOrPath: "", label: "" });
  };

  // Update content of active file
  const updateActiveFileContent = (content: string) => {
    if (!activeFileId) return;
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content, isModified: true } : f))
    );
  };

  // Revert modifications for active file
  const revertActiveFile = () => {
    if (!activeFileId) return;
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: "", isModified: false } : f))
    );
  };

  // Toggle expand all
  const toggleExpandAll = () => {
    const allExpanded = folderList.every((f) => expandedFolders[f] !== false);
    const nextState: Record<string, boolean> = {};
    folderList.forEach((f) => {
      nextState[f] = !allExpanded;
    });
    setExpandedFolders(nextState);
  };

  // Copy active path
  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title) {
      setError("Project Title is required");
      return;
    }

    if (!formData.website_url) {
      setError("Project URL is required");
      return;
    }

    if (files.length === 0) {
      setError("Project must contain at least one file");
      return;
    }

    startTransition(async () => {
      setError("");
      setSuccess(false);

      const promises = [];

      for (const credId of deletedCredentialIds) {
        promises.push(deleteCredential(credId));
      }

      for (const file of files) {
        const baseCredData: CredentialFormData = {
          ...formData,
          type: "env",
          username: file.path,
          environment: file.environment || undefined,
          secret: file.isModified ? file.content : "",
        };

        if (file.credentialId) {
          promises.push(
            updateCredential(file.credentialId, {
              ...baseCredData,
              secret: file.isModified && file.content.trim() !== "" ? file.content : undefined,
            })
          );
        } else if (file.isModified || file.content.trim() !== "") {
          promises.push(createCredential(baseCredData));
        }
      }

      const results = await Promise.all(promises);
      const failed = results.find((r) => !r.success);

      if (failed) {
        setError(failed.error || "Failed to save project files");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/env-manager");
          router.refresh();
        }, 1000);
      }
    });
  };

  const activeFileNode = files.find((f) => f.id === activeFileId) || null;

  // File type icon renderer with rich colors
  const renderFileIcon = (fileName: string) => {
    if (fileName.startsWith(".env")) {
      return <FileCode2 className="h-4 w-4 text-emerald-400 shrink-0 drop-shadow-xs" />;
    }
    if (/\.(js|jsx|ts|tsx)$/.test(fileName)) {
      return <FileCode2 className="h-4 w-4 text-sky-400 shrink-0 drop-shadow-xs" />;
    }
    if (/\.(json|yaml|yml|toml)$/.test(fileName)) {
      return <FileCode2 className="h-4 w-4 text-amber-400 shrink-0 drop-shadow-xs" />;
    }
    return <FileText className="h-4 w-4 text-slate-400 shrink-0" />;
  };

  // Line numbers calculation for active file editor
  const lineNumbers = useMemo(() => {
    if (!activeFileNode) return [];
    const count = (activeFileNode.content.match(/\n/g) || []).length + 1;
    return Array.from({ length: Math.max(count, 16) }, (_, i) => i + 1);
  }, [activeFileNode]);

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {success && (
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-2 shadow-sm animate-in fade-in slide-in-from-top-2">
            <Sparkles className="h-5 w-5 shrink-0 text-emerald-500" />
            {isEditing ? "Project vault files updated successfully!" : "Project environment vault created successfully!"}
          </div>
        )}
        {error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive flex items-center gap-2 shadow-sm">
            <Trash2 className="h-5 w-5 shrink-0" />
            {error}
          </div>
        )}

        {/* Project Details Card */}
        <Card className="border-border/60 bg-gradient-to-br from-card via-card to-muted/20 shadow-sm rounded-xl overflow-hidden">
          <CardHeader className="border-b border-border/40 bg-muted/20 py-4 px-6">
            <CardTitle className="text-base font-semibold flex items-center gap-2 text-foreground">
              <FolderGit2 className="h-5 w-5 text-primary" />
              Project Settings & Metadata
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="title" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FolderGit2 className="h-3.5 w-3.5" /> Project Name *
                </label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  disabled={isPending}
                  placeholder="e.g., Core Auth Microservice"
                  className="bg-background/80 border-border/80 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="website_url" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Globe className="h-3.5 w-3.5" /> Repository / Website URL *
                </label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  required
                  disabled={isPending}
                  placeholder="https://github.com/organization/repository"
                  className="bg-background/80 border-border/80 focus:ring-2 focus:ring-primary/20 transition-all font-medium"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Explorer & Code Editor Section */}
        <div 
          className="grid md:grid-cols-4 gap-6 min-h-[580px] relative"
          onDragOver={(e) => {
            e.preventDefault();
            setIsExternalDragOver(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) {
              setIsExternalDragOver(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsExternalDragOver(false);
            setDragOverFolder(null);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
              handleExternalFilesDrop(e.dataTransfer.files, "/");
            } else if (draggedItem) {
              moveItemToFolder(draggedItem, "/");
              setDraggedItem(null);
            }
          }}
        >
          {/* External Drag & Drop Overlay Indicator */}
          {isExternalDragOver && (
            <div className="absolute inset-0 z-50 bg-primary/10 backdrop-blur-xs border-2 border-dashed border-primary rounded-xl flex flex-col items-center justify-center text-primary font-medium p-6 pointer-events-none animate-in fade-in duration-150">
              <Upload className="h-12 w-12 mb-2 animate-bounce" />
              <p className="text-base font-semibold">Drop files here to import into Vault</p>
              <p className="text-xs text-muted-foreground mt-1">Files will be added directly into your project explorer</p>
            </div>
          )}

          {/* File Explorer Sidebar */}
          <Card className="md:col-span-1 h-full flex flex-col border-border/60 shadow-sm rounded-xl overflow-hidden bg-card">
            <CardHeader className="flex flex-col gap-2 p-3 border-b border-border/40 bg-muted/30">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FolderIcon className="h-4 w-4 text-blue-500" />
                  Explorer
                </CardTitle>
                <div className="flex items-center gap-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => openCreateDialog("file", "/")}
                    title="New File in Root"
                  >
                    <FilePlus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={() => openCreateDialog("folder", "/")}
                    title="New Folder in Root"
                  >
                    <FolderPlus className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted"
                    onClick={toggleExpandAll}
                    title="Toggle Expand All"
                  >
                    <ChevronsUpDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {/* Quick Search Filter Input */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  placeholder="Filter files..."
                  className="h-8 pl-8 text-xs bg-background/60 border-border/60 focus:ring-1 focus:ring-primary/20"
                />
              </div>
            </CardHeader>
            
            <CardContent className="p-2 flex-1 overflow-y-auto font-mono text-xs select-none">
              <div className="flex flex-col gap-0.5">
                {folderList.map((folder) => {
                  const parts = folder === "/" ? [] : folder.split("/").filter(Boolean);
                  const depth = parts.length;
                  const name = depth === 0 ? "root (/)" : parts[parts.length - 1];
                  const isExpanded = expandedFolders[folder] !== false;
                  const isTargetHovered = dragOverFolder === folder;

                  // Parent expand condition
                  if (folder !== "/") {
                    let parentPath = "";
                    for (let i = 0; i < parts.length - 1; i++) {
                      parentPath += `/${parts[i]}`;
                      if (expandedFolders[parentPath] === false) {
                        return null;
                      }
                    }
                  }

                  const directFiles = filteredFiles.filter((f) => f.folderPath === folder);
                  const indentPx = depth * 12 + 6;

                  return (
                    <div key={folder} className="flex flex-col">
                      {/* Folder Row */}
                      <div
                        draggable={folder !== "/"}
                        onDragStart={(e) => {
                          e.stopPropagation();
                          e.dataTransfer.setData("text/plain", folder);
                          setDraggedItem({ type: "folder", path: folder });
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverFolder(folder);
                        }}
                        onDragLeave={(e) => {
                          e.stopPropagation();
                          if (dragOverFolder === folder) setDragOverFolder(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverFolder(null);
                          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                            handleExternalFilesDrop(e.dataTransfer.files, folder);
                          } else if (draggedItem) {
                            moveItemToFolder(draggedItem, folder);
                            setDraggedItem(null);
                          }
                        }}
                        className={`flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/70 cursor-pointer group transition-all ${
                          isTargetHovered ? "bg-primary/20 ring-2 ring-primary/40" : ""
                        }`}
                        style={{ paddingLeft: `${indentPx}px` }}
                        onClick={() =>
                          setExpandedFolders((prev) => ({
                            ...prev,
                            [folder]: !isExpanded,
                          }))
                        }
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isExpanded ? (
                            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <FolderIcon className="h-3.5 w-3.5 text-blue-500 fill-blue-500/20 shrink-0" />
                          <span className="font-medium text-foreground truncate">{name}</span>
                          <span className="text-[10px] text-muted-foreground/70 font-sans ml-1">
                            ({directFiles.length})
                          </span>
                        </div>

                        {/* Folder Actions */}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCreateDialog("file", folder);
                            }}
                            title={`New File in ${name}`}
                          >
                            <FilePlus className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-muted-foreground hover:text-foreground"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCreateDialog("folder", folder);
                            }}
                            title={`New Folder in ${name}`}
                          >
                            <FolderPlus className="h-3 w-3" />
                          </Button>
                          {folder !== "/" && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-5 w-5 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerDelete("folder", folder, folder);
                              }}
                              title={`Delete Folder ${name}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Files under folder */}
                      {isExpanded && (
                        <div className="flex flex-col border-l border-border/30 ml-3.5 my-0.5 pl-1 space-y-0.5">
                          {directFiles.length === 0 ? (
                            <div className="py-1 px-3 text-[10px] text-muted-foreground/60 italic select-none">
                              Empty folder (click + to add files)
                            </div>
                          ) : (
                            directFiles.map((file) => {
                              const isSelected = file.id === activeFileId;
                              const fileIndentPx = depth * 12 + 10;

                              return (
                                <div
                                  key={file.id}
                                  draggable={true}
                                  onDragStart={(e) => {
                                    e.stopPropagation();
                                    e.dataTransfer.setData("text/plain", file.path);
                                    setDraggedItem({ type: "file", id: file.id, path: file.path });
                                  }}
                                  className={`flex items-center justify-between py-1.5 px-2 rounded-md cursor-grab active:cursor-grabbing group transition-all ${
                                    isSelected
                                      ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                      : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                                  }`}
                                  style={{ paddingLeft: `${fileIndentPx}px` }}
                                  onClick={() => setActiveFileId(file.id)}
                                >
                                  <div className="flex items-center gap-2 truncate">
                                    {renderFileIcon(file.name)}
                                    <span className="truncate">{file.name}</span>
                                  </div>

                                  <div className="flex items-center gap-1.5">
                                    {file.credentialId && !file.isModified && (
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          isSelected ? "bg-primary-foreground" : "bg-sky-500"
                                        }`}
                                        title="Saved in Vault"
                                      />
                                    )}
                                    {file.isModified && (
                                      <span
                                        className={`w-2 h-2 rounded-full ${
                                          isSelected ? "bg-emerald-300" : "bg-emerald-500"
                                        }`}
                                        title="Unsaved changes"
                                      />
                                    )}
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className={`h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity ${
                                        isSelected
                                          ? "text-primary-foreground/90 hover:text-primary-foreground"
                                          : "text-muted-foreground hover:text-destructive"
                                      }`}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerDelete("file", file.id, file.path);
                                      }}
                                      title={`Delete ${file.name}`}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* VS Code Styled Editor Area */}
          <Card className="md:col-span-3 flex flex-col border-border/60 shadow-sm rounded-xl overflow-hidden bg-slate-950 text-slate-100 dark:bg-slate-950">
            {/* Editor Tab & Header */}
            <div className="py-2.5 px-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              {activeFileNode ? (
                <div className="flex items-center gap-2 min-w-0">
                  <div className="flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-md border border-slate-800 shadow-xs">
                    {renderFileIcon(activeFileNode.name)}
                    <span className="font-mono text-xs font-semibold text-slate-200 truncate">
                      {activeFileNode.path}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 text-slate-400 hover:text-slate-100"
                      onClick={() => handleCopyPath(activeFileNode.path)}
                      title="Copy file path"
                    >
                      {copiedPath ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>

                  {activeFileNode.isModified ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Unsaved Edits
                    </span>
                  ) : activeFileNode.credentialId ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center gap-1">
                      <ShieldCheck className="h-3 w-3" /> Vault Secured
                    </span>
                  ) : null}
                </div>
              ) : (
                <span className="text-xs text-slate-400">No file selected</span>
              )}

              {activeFileNode && activeFileNode.credentialId && activeFileNode.isModified && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={revertActiveFile}
                  className="h-7 px-2.5 text-xs text-slate-400 hover:text-slate-100 hover:bg-slate-800 flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Revert Edits
                </Button>
              )}
            </div>

            {/* Editor Body */}
            <CardContent className="p-0 flex-1 flex flex-col">
              {activeFileNode ? (
                <div className="flex-1 flex flex-col">
                  {/* Saved Content Decryption Lock or Code Textarea */}
                  {activeFileNode.credentialId &&
                  activeFileNode.encrypted_secret &&
                  !activeFileNode.isModified ? (
                    <div className="m-4 border border-slate-800 rounded-xl p-5 bg-slate-900/50 space-y-4 text-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-sky-400" />
                          <span className="text-xs font-semibold text-slate-300">
                            AES-256 Encrypted Vault Secret
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-slate-700 bg-slate-800 text-emerald-400 hover:bg-slate-700 hover:text-emerald-300 flex items-center gap-1.5"
                            onClick={() =>
                              setFiles((prev) =>
                                prev.map((f) => (f.id === activeFileId ? { ...f, isModified: true } : f))
                              )
                            }
                          >
                            <Edit3 className="h-3 w-3" />
                            Edit Content
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs border-slate-700 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white flex items-center gap-1.5"
                            onClick={() => updateActiveFileContent(" ")}
                          >
                            Replace Content
                          </Button>
                        </div>
                      </div>
                      <PasswordReveal
                        key={`${activeFileNode.credentialId}-${activeFileNode.id}`}
                        encryptedSecret={activeFileNode.encrypted_secret}
                        credentialId={activeFileNode.credentialId}
                        onDecrypt={decryptSecret}
                        onSecretDecrypted={(decryptedText) => updateActiveFileContent(decryptedText)}
                        isMultiline={true}
                      />
                    </div>
                  ) : (
                    <div className="flex-1 flex relative font-mono text-xs bg-slate-950">
                      {/* Line Numbers Column */}
                      <div className="py-3 px-2 text-right select-none text-slate-600 bg-slate-900/50 border-r border-slate-900 min-w-[3rem] font-mono leading-relaxed">
                        {lineNumbers.map((num) => (
                          <div key={num}>{num}</div>
                        ))}
                      </div>

                      {/* Code Textarea */}
                      <textarea
                        id={`editor-${activeFileNode.id}`}
                        value={activeFileNode.content}
                        onChange={(e) => updateActiveFileContent(e.target.value)}
                        className="w-full flex-1 min-h-[380px] bg-transparent p-3 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none resize-y selection:bg-blue-500/30"
                        disabled={isPending}
                        placeholder={`Write or paste content for ${activeFileNode.path}...`}
                        spellCheck={false}
                      />
                    </div>
                  )}

                  {/* Status Bar */}
                  <div className="py-1.5 px-4 bg-slate-900 border-t border-slate-800 text-[11px] font-mono text-slate-400 flex items-center justify-between select-none">
                    <div className="flex items-center gap-4">
                      <span>Lines: {lineNumbers.length}</span>
                      <span>Length: {activeFileNode.content.length} chars</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="uppercase text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                        {activeFileNode.name.split(".").pop() || "txt"}
                      </span>
                      <span>UTF-8</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-80 text-slate-500 space-y-3">
                  <FileCode2 className="h-12 w-12 opacity-20 text-slate-400" />
                  <p className="text-sm font-medium">Select a file from the Explorer to edit content</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Action Controls */}
        <Card className="border-border/60 bg-gradient-to-r from-card to-card/80 shadow-sm rounded-xl">
          <CardContent className="py-4 px-6">
            <div className="flex flex-col sm:flex-row gap-3 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isPending}
                className="px-6 border-border/80"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending} 
                className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm transition-all"
              >
                {isPending ? "Saving Vault..." : isEditing ? "Save Changes" : "Create Project Vault"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      {/* Item Creation Modal */}
      <Dialog
        open={createDialog.open}
        onOpenChange={(open) => {
          if (!open) setCreateDialog({ open: false, type: "file", targetFolder: "/" });
        }}
      >
        <DialogContent className="sm:max-w-[440px] rounded-xl border-border/80">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              {createDialog.type === "file" ? <FilePlus className="h-4 w-4 text-primary" /> : <FolderPlus className="h-4 w-4 text-blue-500" />}
              Create New {createDialog.type === "file" ? "File" : "Folder"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label htmlFor="targetFolderSelect" className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                <FolderIcon className="h-3.5 w-3.5 text-blue-500" /> Target Directory
              </label>
              <select
                id="targetFolderSelect"
                value={createDialog.targetFolder}
                onChange={(e) => setCreateDialog((prev) => ({ ...prev, targetFolder: e.target.value }))}
                className="w-full h-9 rounded-md border border-input bg-background px-3 py-1.5 text-xs font-mono text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {folderList.map((f) => (
                  <option key={f} value={f}>
                    {f === "/" ? "/ (root)" : f}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="newItemInput" className="text-xs text-muted-foreground font-mono flex items-center gap-1">
                {createDialog.type === "file" ? <FileText className="h-3.5 w-3.5 text-emerald-500" /> : <FolderIcon className="h-3.5 w-3.5 text-blue-500" />} {createDialog.type === "file" ? "File" : "Folder"} Name *
              </label>
              <Input
                id="newItemInput"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={
                  createDialog.type === "file" ? "e.g., app.js or .env.local" : "e.g., backend"
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleConfirmCreate();
                  }
                }}
                autoFocus
                className="font-mono text-sm"
              />
              {createError && <p className="text-xs text-destructive mt-1 font-medium">{createError}</p>}
            </div>

            {/* Quick Presets for Files */}
            {createDialog.type === "file" && (
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Quick Presets</span>
                <div className="flex flex-wrap gap-1.5">
                  {[".env.production", ".env.staging", ".env.local", "app.js", "server.ts"].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setNewItemName(preset.trim())}
                      className="px-2 py-1 rounded bg-muted/60 hover:bg-muted text-[11px] font-mono transition-colors border border-border/40"
                    >
                      {preset.trim()}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateDialog({ open: false, type: "file", targetFolder: "/" })}
            >
              Cancel
            </Button>
            <Button type="button" onClick={handleConfirmCreate}>
              Create {createDialog.type === "file" ? "File" : "Folder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteConfirm.open}
        onOpenChange={(open) => setDeleteConfirm((prev) => ({ ...prev, open }))}
        onConfirm={handleConfirmDelete}
        itemName={`${deleteConfirm.type === "file" ? "File" : "Folder"} ${deleteConfirm.label}`}
      />
    </>
  );
}


