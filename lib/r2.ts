import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'

const r2Client = new S3Client({
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  region: 'auto',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

/**
 * Upload a buffer to R2 and return the full public URL.
 * Key format: Date.now() + "-" + original filename (caller is responsible for constructing the key).
 */
export async function uploadToR2(buffer: Buffer, key: string, contentType: string): Promise<string> {
  await r2Client.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
    Body: buffer,
    ContentType: contentType,
  }))
  return `${process.env.R2_PUBLIC_URL}/${key}`
}

/**
 * Delete an object from R2 by its full public URL.
 * Extracts the key by stripping the R2_PUBLIC_URL prefix.
 */
export async function deleteFromR2(url: string): Promise<void> {
  const base = process.env.R2_PUBLIC_URL!
  const key = url.startsWith(base + '/') ? url.slice(base.length + 1) : url
  await r2Client.send(new DeleteObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: key,
  }))
}
