"use client";

import { useState, useRef } from "react";
import { Button } from "@heroui/button";
import { Progress } from "@nextui-org/react";
import { Input } from "@heroui/input";
import {
  Upload,
  X,
  FileUp,
  AlertTriangle,
  FolderPlus,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@nextui-org/react";
import axios from "axios";

interface FileUploadFormProps {
  userId: string;
  onUploadSuccess?: () => void;
  currentFolder?: string | null;
}

export default function FileUploadForm({
  userId,
  onUploadSuccess,
  currentFolder = null,
}: FileUploadFormProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [folderModalOpen, setFolderModalOpen] = useState(false);
  const [folderName, setFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      const validFiles = selectedFiles.filter((file) => file.size <= 5 * 1024 * 1024);

      if (validFiles.length !== selectedFiles.length) {
        setError("Some files exceed 5MB limit");
      } else {
        setError(null);
      }

      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles.filter((file) => file.size <= 5 * 1024 * 1024);

      if (validFiles.length !== droppedFiles.length) {
        setError("Some files exceed 5MB limit");
      } else {
        setError(null);
      }

      setFiles((prev) => [...prev, ...validFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const clearFile = (index?: number) => {
    if (index !== undefined) {
      setFiles((prev) => prev.filter((_, i) => i !== index));
    } else {
      setFiles([]);
    }
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    for (const file of files) {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("userId", userId);
      if (currentFolder) {
        formData.append("parentId", currentFolder);
      }

      try {
        await axios.post("/api/files/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setProgress(percentCompleted);
            }
          },
        });

        toast.success(`${file.name} uploaded successfully.`);
      } catch (err) {
        console.error("Upload failed", err);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    setFiles([]);
    setProgress(0);
    if (onUploadSuccess) onUploadSuccess();
  };

  const handleCreateFolder = async () => {
    if (!folderName.trim()) {
      toast.error("Please enter a valid folder name.");
      return;
    }

    setCreatingFolder(true);

    try {
      await axios.post("/api/folders/create", {
        name: folderName.trim(),
        userId: userId,
        parentId: currentFolder,
      });

      toast.success(`Folder "${folderName}" created successfully.`);
      setFolderName("");
      setFolderModalOpen(false);
      if (onUploadSuccess) onUploadSuccess();
    } catch (error) {
      console.error("Error creating folder:", error);
      toast.error("Folder creation failed.");
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-2">
        <Button
          color="primary"
          variant="flat"
          startContent={<FolderPlus className="h-4 w-4" />}
          onClick={() => setFolderModalOpen(true)}
          className="flex-1"
        >
          New Folder
        </Button>
        <Button
          color="primary"
          variant="flat"
          startContent={<FileUp className="h-4 w-4" />}
          onClick={() => fileInputRef.current?.click()}
          className="flex-1"
        >
          Add Image(s)
        </Button>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          error
            ? "border-danger/30 bg-danger/5"
            : files.length
            ? "border-primary/30 bg-primary/5"
            : "border-default-300 hover:border-primary/5"
        }`}
      >
        <input
          type="file"
          multiple
          accept="image/*"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {!files.length ? (
          <div className="space-y-3">
            <FileUp className="h-12 w-12 mx-auto text-primary/70" />
            <p className="text-default-600">
              Drag and drop images here, or{" "}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-primary underline"
              >
                browse
              </button>
            </p>
            <p className="text-xs text-default-500">Images up to 5MB</p>
          </div>
        ) : (
          <div className="space-y-3 text-left">
            <ul className="space-y-2">
              {files.map((file, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-2 border p-2 rounded"
                >
                  <div>
                    <p className="text-sm font-medium truncate max-w-[200px]">
                      {file.name}
                    </p>
                    <p className="text-xs text-default-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                  <Button
                    isIconOnly
                    variant="light"
                    size="sm"
                    onClick={() => clearFile(index)}
                    className="text-default-500"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>

            {error && (
              <div className="bg-danger-5 text-danger-700 p-3 rounded-lg flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {uploading && (
              <Progress
                value={progress}
                color="primary"
                size="sm"
                showValueLabel
              />
            )}

            <Button
              color="primary"
              onClick={handleUpload}
              isLoading={uploading}
              startContent={<Upload className="h-4 w-4" />}
              endContent={!uploading && <ArrowRight className="h-4 w-4" />}
              isDisabled={!!error || !files.length}
              className="w-full"
            >
              {uploading ? `Uploading... ${progress}%` : "Upload All"}
            </Button>
          </div>
        )}
      </div>

      <div className="bg-default-100/5 p-4 rounded-lg">
        <h4 className="text-sm font-medium mb-2">Tips</h4>
        <ul className="text-xs text-default-600 space-y-1">
          <li>• Images are private and only visible to you</li>
          <li>• Supported formats: JPG, PNG, GIF, WebP</li>
          <li>• Maximum file size: 5MB per image</li>
        </ul>
      </div>

      <Modal
        isOpen={folderModalOpen}
        onOpenChange={setFolderModalOpen}
        backdrop="blur"
        classNames={{
          base: "border border-default-200 bg-default-5",
          header: "border-b border-default-200",
          footer: "border-t border-default-200",
        }}
      >
        <ModalContent>
          <ModalHeader className="flex gap-2 items-center">
            <FolderPlus className="h-5 w-5 text-primary" />
            <span>New Folder</span>
          </ModalHeader>
          <ModalBody>
            <p className="text-sm text-default-600">
              Enter a name for your folder:
            </p>
            <Input
              type="text"
              placeholder="Folder Name"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
            />
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              color="default"
              onClick={() => setFolderModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onClick={handleCreateFolder}
              isLoading={creatingFolder}
              isDisabled={!folderName.trim()}
              endContent={<ArrowRight className="h-4 w-4" />}
            >
              Create
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}
