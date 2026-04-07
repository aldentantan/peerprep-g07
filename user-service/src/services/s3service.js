import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { v4 as uuidv4 } from "uuid";

const s3 = new S3Client({
  region: process.env.AWS_REGION || "ap-southeast-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
}); 

const BUCKET = process.env.S3_BUCKET_NAME || "peerprep-945484575935-ap-southeast-1-an";
const REGION = process.env.AWS_REGION || "ap-southeast-1";

export async function uploadImage(fileBuffer, originalFileName, mimeType) {
  const ext = originalFileName.split(".").pop();
  const key = `users/${uuidv4()}.${ext}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    })
  );
  return `https://${BUCKET}.s3.${REGION}.amazonaws.com/${key}`;
}

export async function deleteImage(imageUrl) {
  const key = imageUrl.split(".amazonaws.com/")[1];
  if (!key) throw new Error(`Could not extract S3 key from URL: ${imageUrl}`);

  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}
