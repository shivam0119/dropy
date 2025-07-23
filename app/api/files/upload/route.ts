import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { files } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import ImageKit from "imagekit";
import { v4 as uuidv4 } from "uuid";

// Initialize ImageKit with your credentials
const imagekit = new ImageKit({
  publicKey: process.env.NEXT_PUBLIC_IMAGEKIT_PUBLIC_KEY || "",
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY || "",
  urlEndpoint: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || "",
});

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const filesList = formData.getAll("file") as File[];
    const formUserId = formData.get("userId") as string;
    const parentId = (formData.get("parentId") as string) || null;

    if (formUserId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (filesList.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (parentId) {
      const [parentFolder] = await db
        .select()
        .from(files)
        .where(
          and(
            eq(files.id, parentId),
            eq(files.userId, userId),
            eq(files.isFolder, true)
          )
        );

      if (!parentFolder) {
        return NextResponse.json(
          { error: "Parent folder not found" },
          { status: 404 }
        );
      }
    }

    const uploadedFiles = [];

    for (const file of filesList) {
      if (!file.type.startsWith("image/") && file.type !== "application/pdf") {
        continue; // skip unsupported files
      }

      const buffer = await file.arrayBuffer();
      const fileBuffer = Buffer.from(buffer);

      const originalFilename = file.name;
      const fileExtension = originalFilename.split(".").pop() || "";
      const uniqueFilename = `${uuidv4()}.${fileExtension}`;

      const folderPath = parentId
        ? `/droply/${userId}/folders/${parentId}`
        : `/droply/${userId}`;

      const uploadResponse = await imagekit.upload({
        file: fileBuffer,
        fileName: uniqueFilename,
        folder: folderPath,
        useUniqueFileName: false,
      });

      const fileData = {
        name: originalFilename,
        path: uploadResponse.filePath,
        size: file.size,
        type: file.type,
        fileUrl: uploadResponse.url,
        thumbnailUrl: uploadResponse.thumbnailUrl || null,
        userId: userId,
        parentId: parentId,
        isFolder: false,
        isStarred: false,
        isTrash: false,
      };

      const [newFile] = await db.insert(files).values(fileData).returning();
      uploadedFiles.push(newFile);
    }

    return NextResponse.json({ files: uploadedFiles });
  } catch (error) {
    console.error("Error uploading file:", error);
    return NextResponse.json(
      { error: "Failed to upload files" },
      { status: 500 }
    );
  }
}
