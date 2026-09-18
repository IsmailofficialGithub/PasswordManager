"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCredential, updateCredential, deleteCredential, decryptSecret } from "@/app/(vault)/actions";
import { PasswordReveal } from "@/components/vault/password-reveal";
import { DeleteConfirmationDialog } from "@/components/vault/delete-confirmation-dialog";
import { Plus, Trash2, Folder as FolderIcon, FileCode2, ChevronRight, ChevronDown } from "lucide-react";

import type { CredentialWithTags, CredentialFormData, Environment } from "@/lib/types";

interface EnvFormProps {
  // We pass all credentials for this project
  projectCredentials?: CredentialWithTags[];
}

type EnvData = {
  content: string;
  encrypted_secret?: string;
  credentialId?: string;
  isModified: boolean;
};

type FolderState = Record<Environment, EnvData>;

export function EnvForm({ projectCredentials = [] }: EnvFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<string | null>(null);

  const isEditing = projectCredentials.length > 0;
  
  // Base metadata for the project
  const firstCred = projectCredentials[0];
  const [formData, setFormData] = useState({
    title: firstCred?.title || "",
    website_url: firstCred?.website_url || "",
    notes: firstCred?.notes || "",
    favorite: firstCred?.favorite || false,
    tag_ids: firstCred?.tags?.map((t) => t.id) || [],
  });

  // State for folders and their environment contents
  // Map folderName -> { prod, staging, dev }
  const [folders, setFolders] = useState<Record<string, FolderState>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ "/": true });
  const [activeFile, setActiveFile] = useState<{ folder: string; env: Environment } | null>(null);
  
  // Initialize state from props
  useEffect(() => {
    const initialFolders: Record<string, FolderState> = {};
    
    if (projectCredentials.length > 0) {
      projectCredentials.forEach((cred) => {
        const folderName = cred.username || "/";
        const env = (cred.environment || "prod") as Environment;
        
        if (!initialFolders[folderName]) {
          initialFolders[folderName] = {
            prod: { content: "", isModified: false },
            staging: { content: "", isModified: false },
            dev: { content: "", isModified: false },
          };
        }
        
        initialFolders[folderName][env] = {
          content: "", // We don't load secret by default
          encrypted_secret: cred.encrypted_secret || undefined,
          credentialId: cred.id,
          isModified: false,
        };
      });
      
      const folderNames = Object.keys(initialFolders);
      if (folderNames.length > 0 && !activeFile) {
        // Expand all folders by default when editing
        const initialExpanded: Record<string, boolean> = {};
        folderNames.forEach(f => initialExpanded[f] = true);
        setExpandedFolders(initialExpanded);
        setActiveFile({ folder: folderNames[0], env: "prod" });
      }
    } else {
      // Default empty state
      initialFolders["/"] = {
        prod: { content: "", isModified: false },
        staging: { content: "", isModified: false },
        dev: { content: "", isModified: false },
      };
      if (!activeFile) {
        setActiveFile({ folder: "/", env: "prod" });
      }
    }
    
    setFolders(initialFolders);
  }, [projectCredentials]);

  const handleAddFolder = () => {
    const folderName = window.prompt("Enter folder path (e.g., /backend):", "/new-folder");
    if (!folderName) return;
    
    const formattedName = folderName.startsWith("/") ? folderName : `/${folderName}`;
    
    if (folders[formattedName]) {
      alert("Folder already exists!");
      return;
    }
    
    setFolders({
      ...folders,
      [formattedName]: {
        prod: { content: "", isModified: false },
        staging: { content: "", isModified: false },
        dev: { content: "", isModified: false },
      }
    });
    setExpandedFolders({ ...expandedFolders, [formattedName]: true });
    setActiveFile({ folder: formattedName, env: "prod" });
  };

  const confirmDeleteFolder = () => {
    if (!folderToDelete) return;
    
    // Check if it has saved credentials
    const folderData = folders[folderToDelete];
    const hasSavedIds = Object.values(folderData).some(env => env.credentialId);
    
    if (hasSavedIds) {
      // Perform actual deletion of records
      startTransition(async () => {
        const deletePromises = [];
        for (const env of Object.values(folderData)) {
          if (env.credentialId) {
            deletePromises.push(deleteCredential(env.credentialId));
          }
        }
        
        await Promise.all(deletePromises);
        
        // Remove from UI state
        const newFolders = { ...folders };
        delete newFolders[folderToDelete];
        
        if (Object.keys(newFolders).length === 0) {
           // Ensure at least one folder exists
           newFolders["/"] = {
            prod: { content: "", isModified: false },
            staging: { content: "", isModified: false },
            dev: { content: "", isModified: false },
          };
        }
        
        setFolders(newFolders);
        if (activeFile?.folder === folderToDelete) {
          setActiveFile({ folder: Object.keys(newFolders)[0], env: "prod" });
        }
        setFolderToDelete(null);
        setShowDeleteDialog(false);
        router.refresh();
      });
    } else {
      // Just remove from UI state
      const newFolders = { ...folders };
      delete newFolders[folderToDelete];
      if (Object.keys(newFolders).length === 0) {
        newFolders["/"] = {
         prod: { content: "", isModified: false },
         staging: { content: "", isModified: false },
         dev: { content: "", isModified: false },
       };
     }
      setFolders(newFolders);
      if (activeFile?.folder === folderToDelete) {
        setActiveFile({ folder: Object.keys(newFolders)[0], env: "prod" });
      }
      setFolderToDelete(null);
      setShowDeleteDialog(false);
    }
  };

  const updateEnvContent = (folder: string, env: Environment, content: string) => {
    setFolders(prev => ({
      ...prev,
      [folder]: {
        ...prev[folder],
        [env]: {
          ...prev[folder][env],
          content,
          isModified: true
        }
      }
    }));
  };

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

    startTransition(async () => {
      setError("");
      setSuccess(false);

      const promises = [];
      
      // Iterate through all folders and environments
      for (const [folderName, folderData] of Object.entries(folders)) {
        for (const [envName, envData] of Object.entries(folderData)) {
          const env = envName as Environment;
          
          const baseCredData: CredentialFormData = {
            ...formData,
            type: "env",
            username: folderName,
            environment: env,
            secret: envData.isModified ? envData.content : "", // Only send secret if modified
          };

          if (envData.credentialId) {
            // Update existing (only if we modified the content OR if base metadata changed)
            // For simplicity, we'll update all of them to ensure metadata stays in sync across the project
            promises.push(
              updateCredential(envData.credentialId, {
                ...baseCredData,
                secret: envData.isModified && envData.content.trim() !== "" ? envData.content : undefined
              })
            );
          } else if (envData.isModified && envData.content.trim() !== "") {
            // Create new (only if it has content)
            promises.push(
              createCredential(baseCredData)
            );
          }
        }
      }
      
      if (promises.length === 0 && !isEditing) {
        setError("Please provide .env content for at least one folder/environment.");
        return;
      }

      const results = await Promise.all(promises);
      const failed = results.find(r => !r.success);
      
      if (failed) {
        setError(failed.error || "Failed to save some env files");
      } else {
        setSuccess(true);
        setTimeout(() => {
          router.push("/env-manager");
          router.refresh();
        }, 1000);
      }
    });
  };

  const activeFolderData = activeFile ? folders[activeFile.folder] : null;
  const currentEnvData = activeFolderData && activeFile ? activeFolderData[activeFile.env] : null;

  const toggleFolder = (folder: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => ({ ...prev, [folder]: !prev[folder] }));
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {success && (
          <div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
            {isEditing ? "Project envs updated successfully!" : "Project envs created successfully!"}
          </div>
        )}
        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Project Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="title" className="text-sm font-medium">
                  Project Title *
                </label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                  disabled={isPending}
                  placeholder="e.g., My Startup"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="website_url" className="text-sm font-medium">
                  Project URL / GitHub Repo *
                </label>
                <Input
                  id="website_url"
                  type="url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  required
                  disabled={isPending}
                  placeholder="https://github.com/org/repo"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-4 gap-6">
          {/* Folders Sidebar */}
          <Card className="md:col-span-1 h-fit">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <CardTitle className="text-lg">Folders</CardTitle>
              <Button type="button" variant="ghost" size="icon" onClick={handleAddFolder} className="h-8 w-8">
                <Plus className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="flex flex-col p-2 gap-1">
                {Object.entries(folders).map(([folder, folderData]) => {
                  const isExpanded = expandedFolders[folder];
                  return (
                    <div key={folder} className="flex flex-col">
                      <div
                        className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm cursor-pointer hover:bg-muted transition-colors group"
                        onClick={(e) => toggleFolder(folder, e)}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                          )}
                          <FolderIcon className="h-4 w-4 shrink-0 text-blue-500/80" />
                          <span className="truncate font-medium">{folder}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderToDelete(folder);
                            setShowDeleteDialog(true);
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>

                      {isExpanded && (
                        <div className="flex flex-col ml-6 pl-2 border-l border-border/50 mt-1 space-y-1">
                          {(["prod", "staging", "dev"] as Environment[]).map((env) => {
                            const isSelected = activeFile?.folder === folder && activeFile?.env === env;
                            const hasSaved = !!folderData[env].credentialId;
                            const hasPending = folderData[env].isModified && folderData[env].content.trim() !== "";
                            const envLabel = env === "prod" ? "production" : env;

                            return (
                              <div
                                key={env}
                                className={`flex items-center justify-between rounded-md px-2 py-1.5 text-xs cursor-pointer transition-colors ${
                                  isSelected ? "bg-primary text-primary-foreground font-medium shadow-sm" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                }`}
                                onClick={() => setActiveFile({ folder, env })}
                              >
                                <div className="flex items-center gap-2 truncate">
                                  <FileCode2 className="h-3.5 w-3.5 shrink-0 opacity-80" />
                                  <span className="truncate">.env.{envLabel}</span>
                                </div>
                                <div className="flex gap-1.5 items-center">
                                  {hasSaved && !hasPending && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-primary-foreground/70" : "bg-blue-500/70"}`} title="Saved"></span>}
                                  {hasPending && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-green-300" : "bg-green-500"}`} title="Pending Changes"></span>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Environment Editor */}
          <Card className="md:col-span-3">
            <CardHeader className="pb-4 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileCode2 className="h-5 w-5 text-muted-foreground" />
                  {activeFile ? `${activeFile.folder === '/' ? '' : activeFile.folder}/.env.${activeFile.env === 'prod' ? 'production' : activeFile.env}` : "Select a file"}
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              {/* Current Env View/Edit */}
              {activeFile && currentEnvData ? (
                <div className="space-y-4">
                  {currentEnvData.credentialId && currentEnvData.encrypted_secret && !currentEnvData.isModified && (
                    <div className="space-y-2 border rounded-md p-4 bg-muted/30">
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-sm font-medium text-muted-foreground">
                          Current Saved Content
                        </label>
                        <Button 
                          type="button" 
                          variant="outline" 
                          size="sm"
                          onClick={() => updateEnvContent(activeFile.folder, activeFile.env, " ")} // Trigger modified state
                        >
                          Replace Content
                        </Button>
                      </div>
                      <PasswordReveal
                        key={`${currentEnvData.credentialId}-${activeFile.env}`}
                        encryptedSecret={currentEnvData.encrypted_secret}
                        credentialId={currentEnvData.credentialId}
                        onDecrypt={decryptSecret}
                        isMultiline={true}
                      />
                    </div>
                  )}

                  {(!currentEnvData.credentialId || currentEnvData.isModified) && (
                    <div className="space-y-2">
                       {currentEnvData.credentialId && currentEnvData.isModified && (
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-medium text-amber-500">Replacing existing content</span>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs"
                            onClick={() => {
                              // Revert modification
                              setFolders(prev => ({
                                ...prev,
                                [activeFile.folder]: {
                                  ...prev[activeFile.folder],
                                  [activeFile.env]: {
                                    ...prev[activeFile.folder][activeFile.env],
                                    content: "",
                                    isModified: false
                                  }
                                }
                              }));
                            }}
                          >
                            Cancel Replace
                          </Button>
                        </div>
                      )}
                      <textarea
                        id={`secret-${activeFile.folder}-${activeFile.env}`}
                        value={currentEnvData.content}
                        onChange={(e) => updateEnvContent(activeFile.folder, activeFile.env, e.target.value)}
                        rows={16}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        disabled={isPending}
                        placeholder={`Paste .env content for ${activeFile.folder}/.env.${activeFile.env === 'prod' ? 'production' : activeFile.env} here...`}
                      />
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <FileCode2 className="h-12 w-12 mb-4 opacity-20" />
                  <p>Select a file from the sidebar to view or edit its contents.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-2">
              <Button type="submit" disabled={isPending} className="flex-1 md:flex-none">
                {isPending ? "Saving..." : "Save Project"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isPending}
                className="flex-1 md:flex-none"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <DeleteConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={confirmDeleteFolder}
        itemName={`Folder ${folderToDelete}`}
      />
    </>
  );
}
