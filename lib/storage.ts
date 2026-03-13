import { storage, BUCKET_ID, ID } from "./appwrite";

export async function uploadProductImage(dataUrl: string): Promise<string> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const file = new File([blob], `product-${Date.now()}.jpg`, { type: "image/jpeg" });

  const result = await storage.createFile({
    bucketId: BUCKET_ID,
    fileId: ID.unique(),
    file,
  });
  return result.$id;
}

export function getProductImageUrl(fileId: string): string {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  const projectId = process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID;
  return `${endpoint}/storage/buckets/${BUCKET_ID}/files/${fileId}/view?project=${projectId}`;
}
