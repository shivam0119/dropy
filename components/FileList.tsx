"use client";

import { useEffect, useMemo, useState } from "react";
import {  Trash, X } from "lucide-react";
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
} from "@heroui/table";
import { Divider } from "@heroui/divider";

import { Card } from "@heroui/card";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import type { File as FileType } from "@/lib/db/schema";
import axios from "axios";
import ConfirmationModal from "@/components/ui/ConfirmationModal";
import FileEmptyState from "@/components/FileEmptyState";
import FileIcon from "@/components/FileIcon";
import FileActions from "@/components/FileActions";
import FileLoadingState from "@/components/FileLoadingState";
import FileTabs from "@/components/FileTabs";
import FolderNavigation from "@/components/FolderNavigation";
import FileActionButtons from "@/components/FileActionButtons";

interface FileListProps {
  userId: string;
  refreshTrigger?: number;
  onFolderChange?: (folderId: string | null) => void;
}

export default function FileList({
  userId,
  refreshTrigger = 0,
  onFolderChange,
}: FileListProps) {
  const [files, setFiles] = useState<FileType[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<{ id: string; name: string }[]>(
    []
  );
  const [selectedFile, setSelectedFile] = useState<FileType | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [emptyTrashModalOpen, setEmptyTrashModalOpen] = useState(false);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      let url = `/api/files?userId=${userId}`;
      if (currentFolder) url += `&parentId=${currentFolder}`;
      const res = await axios.get(url);
      setFiles(res.data);
    } catch {
      toast.error("We couldn't load your files. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [userId, refreshTrigger, currentFolder]);

  useEffect(() => {
    setSelectedFileIds([]);
  }, [files, activeTab]);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      if (activeTab === "starred") return file.isStarred && !file.isTrash;
      if (activeTab === "trash") return file.isTrash;
      return !file.isTrash;
    });
  }, [files, activeTab]);

  const trashCount = useMemo(() => files.filter((f) => f.isTrash).length, [files]);
  const starredCount = useMemo(() => files.filter((f) => f.isStarred && !f.isTrash).length, [files]);

  const handleStar = async (id: string) => {
    try {
      await axios.patch(`/api/files/${id}/star`);
      setFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, isStarred: !f.isStarred } : f))
      );
    } catch {
      toast.error("Couldn't update starred status.");
    }
  };

  const handleTrash = async (id: string) => {
    try {
      const res = await axios.patch(`/api/files/${id}/trash`);
      setFiles((prev) =>
        prev.map((f) =>
          f.id === id ? { ...f, isTrash: res.data.isTrash } : f
        )
      );
    } catch {
      toast.error("Couldn't move file to trash.");
    }
  };

  // Soft delete multiple files: Move to trash instead of permanent delete
  const handleTrashBulk = async () => {
    try {
      await Promise.all(
        selectedFileIds.map(async (id) => {
          const res = await axios.patch(`/api/files/${id}/trash`);
          setFiles((prev) =>
            prev.map((f) => (f.id === id ? { ...f, isTrash: res.data.isTrash } : f))
          );
        })
      );
      toast.success(`Moved ${selectedFileIds.length} file(s) to trash.`);
      setSelectedFileIds([]);
      fetchFiles();
    } catch {
      toast.error("Failed to move some files to trash.");
    }
  };

  // Permanently delete a single file
  const handleDelete = async (id: string) => {
    try {
      await axios.delete(`/api/files/${id}/delete`);
      setFiles((prev) => prev.filter((f) => f.id !== id));
      toast.success("File deleted.");
    } catch {
      toast.error("Couldn't delete file.");
    }
  };

  // Permanently delete multiple files
  const handleDeleteBulk = async () => {
    try {
      await Promise.all(
        selectedFileIds.map(async (id) => {
          await axios.delete(`/api/files/${id}/delete`);
          setFiles((prev) => prev.filter((f) => f.id !== id));
        })
      );
      toast.success(`Deleted ${selectedFileIds.length} file(s) permanently.`);
      setSelectedFileIds([]);
      fetchFiles();
    } catch {
      toast.error("Failed to delete some files.");
    }
  };

  const handleDownload = async (file: FileType) => {
    try {
      toast.success("Preparing download...");
      const res = await fetch(file.fileUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name;
      document.body.append(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Download started.");
    } catch {
      toast.error("Download failed.");
    }
  };

  const handleDownloadBulk = async () => {
    for (const file of files.filter((f) => selectedFileIds.includes(f.id))) {
      await handleDownload(file);
    }
    setSelectedFileIds([]);
  };

  const openFolder = (id: string, name: string) => {
    setCurrentFolder(id);
    setFolderPath((prev) => [...prev, { id, name }]);
    onFolderChange?.(id);
  };

  const goUp = () => {
    const prev = [...folderPath];
    prev.pop();
    const newId = prev.length ? prev[prev.length - 1].id : null;
    setFolderPath(prev);
    setCurrentFolder(newId);
    onFolderChange?.(newId);
  };

  if (loading) return <FileLoadingState />;

  return (
    <div className="space-y-6">
      <FileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        files={files}
        starredCount={starredCount}
        trashCount={trashCount}
      />

      {activeTab === "all" && (
        <FolderNavigation
          folderPath={folderPath}
          navigateUp={goUp}
          navigateToPathFolder={(i) => {
            const newPath = folderPath.slice(0, i + 1);
            setFolderPath(newPath);
            const newId = newPath.length ? newPath[newPath.length - 1].id : null;
            setCurrentFolder(newId);
            onFolderChange?.(newId);
          }}
        />
      )}

      <FileActionButtons
        activeTab={activeTab}
        trashCount={trashCount}
        folderPath={folderPath}
        onRefresh={fetchFiles}
        onEmptyTrash={() => setEmptyTrashModalOpen(true)}
      />

      {selectedFileIds.length > 0 && (
        <div className="flex items-center justify-between mb-4">
          <p>{selectedFileIds.length} selected</p>
          <div className="flex gap-2">
            <button
              onClick={handleDownloadBulk}
              className="text-default-500 mt-2 max-w-md mx-auto"
              type="button"
            >
              Download
            </button>
            {activeTab === "trash" ? (
              <button
               color="danger"
           
         
                onClick={() => setDeleteModalOpen(true)}
                className="text-default-500 mt-2 max-w-md mx-auto"
                type="button"
              >
                Delete
              </button>
            ) : (
              <button
               color="danger"
         
          
                onClick={() => setDeleteModalOpen(true)}
                className="text-default-500 mt-2 max-w-md mx-auto"
                type="button"
              >
                Move to Trash
              </button>
            )}
          </div>
        </div>
      )}

      <Divider />

      {filteredFiles.length === 0 ? (
        <FileEmptyState activeTab={activeTab} />
      ) : (
        <Card shadow="sm" className="overflow-x-auto border">
          <Table isStriped>
            <TableHeader>
              <TableColumn>
                <input
                  type="checkbox"
                  checked={
                    filteredFiles.length > 0 &&
                    selectedFileIds.length === filteredFiles.length
                  }
                  onChange={(e) => {
                    if (e.target.checked)
                      setSelectedFileIds(filteredFiles.map((f) => f.id));
                    else setSelectedFileIds([]);
                  }}
                />
              </TableColumn>
              <TableColumn>Name</TableColumn>
              <TableColumn className="hidden sm:table-cell">Type</TableColumn>
              <TableColumn className="hidden md:table-cell">Size</TableColumn>
              <TableColumn className="hidden sm:table-cell">Added</TableColumn>
              <TableColumn width={240}>Actions</TableColumn>
            </TableHeader>
            <TableBody>
              {filteredFiles.map((file) => (
                <TableRow
                  key={file.id}
                  onClick={() => file.isFolder && openFolder(file.id, file.name)}
                  className="cursor-pointer"
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedFileIds.includes(file.id)}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSelectedFileIds((prev) =>
                          checked
                            ? [...prev, file.id]
                            : prev.filter((id) => id !== file.id)
                        );
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileIcon file={file} />
                      <span className="truncate max-w-[200px]">{file.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {file.isFolder ? "Folder" : file.type}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {file.isFolder ? "-" : formatFileSize(file.size)}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {formatDistanceToNow(new Date(file.createdAt), {
                      addSuffix: true,
                    })}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <FileActions
                      file={file}
                      onDownload={() => handleDownload(file)}
                      onStar={() => handleStar(file.id)}
                      onTrash={() => handleTrash(file.id)}
                      onDelete={() => {
                        setSelectedFile(file);
                        setDeleteModalOpen(true);
                      }}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Delete / Trash confirmation modal */}
      <ConfirmationModal
        isOpen={deleteModalOpen}
        onOpenChange={setDeleteModalOpen}
        title={
          activeTab === "trash"
            ? "Confirm Permanent Deletion"
            : "Confirm Move to Trash"
        }
        description={
          activeTab === "trash"
            ? `Are you sure you want to permanently delete ${
                selectedFileIds.length > 1
                  ? `${selectedFileIds.length} files`
                  : `"${selectedFile?.name}"`
              }? This action cannot be undone.`
            : `Are you sure you want to move ${
                selectedFileIds.length > 1
                  ? `${selectedFileIds.length} files`
                  : `"${selectedFile?.name}"`
              } to trash?`
        }
        icon={X}
        iconColor="text-danger"
        confirmText={activeTab === "trash" ? "Delete Permanently" : "Move to Trash"}
        confirmColor="danger"
        onConfirm={async () => {
          if (selectedFileIds.length > 0) {
            if (activeTab === "trash") {
              await handleDeleteBulk();
            } else {
              await handleTrashBulk();
            }
          } else if (selectedFile) {
            if (activeTab === "trash") {
              await handleDelete(selectedFile.id);
            } else {
              await handleTrash(selectedFile.id);
            }
          }
          setSelectedFileIds([]);
          setDeleteModalOpen(false);
          fetchFiles();
        }}
        isDangerous
        warningMessage={
          activeTab === "trash"
            ? "This action cannot be undone."
            : undefined
        }
      />

      {/* Empty trash confirmation modal */}
      <ConfirmationModal
        isOpen={emptyTrashModalOpen}
        onOpenChange={setEmptyTrashModalOpen}
        title="Empty Trash"
        description={`Are you sure you want to permanently delete all ${trashCount} items in the trash?`}
        icon={Trash}
        iconColor="text-danger"
        confirmText="Empty Trash"
        confirmColor="danger"
        onConfirm={async () => {
          try {
            // Permanently delete all trashed files
            const trashedFileIds = files.filter((f) => f.isTrash).map((f) => f.id);
            await Promise.all(
              trashedFileIds.map(async (id) => {
                await axios.delete(`/api/files/${id}/delete`);
              })
            );
            toast.success("Trash emptied.");
            setEmptyTrashModalOpen(false);
            fetchFiles();
          } catch {
            toast.error("Failed to empty trash.");
          }
        }}
        isDangerous
        warningMessage="This action cannot be undone."
      />
    </div>
  );
}

// Utility to format file sizes
function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
