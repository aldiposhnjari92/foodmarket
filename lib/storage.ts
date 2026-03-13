import { storage, BUCKET_ID, ID } from "./appwrite";

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] ?? "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export async function uploadProductImage(dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl);
  const file = new File([blob], `product-${Date.now()}.jpg`, { type: "image/jpeg" });

  const result = await storage.createFile({
    bucketId: BUCKET_ID,
    fileId: ID.unique(),
    file,
  });
  return result.$id;
}

export function getProductImageUrl(fileId: string): string {
  return storage.getFileView({ bucketId: BUCKET_ID, fileId }).toString();
}

export async function deleteProductImage(fileId: string): Promise<void> {
  await storage.deleteFile({ bucketId: BUCKET_ID, fileId });
}
