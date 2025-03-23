import { getCloudflareContext } from "@opennextjs/cloudflare"
import type { NextRequest } from "next/server"
import { v4 as uuidv4 } from "uuid"

export const runtime = "edge"

export async function POST(request: NextRequest) {
  try {
    // Get Cloudflare context to access R2 bucket
    const { env } = getCloudflareContext()
    const r2Bucket = env.IMAGE_BUCKET

    if (!r2Bucket) {
      return new Response("R2 bucket not configured", { status: 500 })
    }

    // Parse the multipart form data
    const formData = await request.formData()
    const imageFile = formData.get("image") as File | null

    if (!imageFile) {
      return new Response("No image file provided", { status: 400 })
    }

    // Validate file type
    if (!imageFile.type.startsWith("image/")) {
      return new Response("File must be an image", { status: 400 })
    }

    // Generate a unique ID for the image
    const imageId = uuidv4()

    // Create a safe filename
    const originalFilename = imageFile.name
    const fileExtension = originalFilename.split(".").pop() || "jpg"
    const safeFilename = `${imageId}.${fileExtension}`

    // Convert file to ArrayBuffer
    const arrayBuffer = await imageFile.arrayBuffer()

    // Upload to R2
    await r2Bucket.put(safeFilename, arrayBuffer, {
      httpMetadata: {
        contentType: imageFile.type,
      },
    })

    // Get the public URL for the image
    const imageUrl = `https://${env.R2_PUBLIC_URL}/${safeFilename}`

    // Store metadata in KV
    const imageMetadata = {
      id: imageId,
      filename: originalFilename,
      url: imageUrl,
      size: imageFile.size,
      type: imageFile.type,
      uploadedAt: new Date().toISOString(),
    }

    await env.IMAGES_KV.put(`image:${imageId}`, JSON.stringify(imageMetadata))

    // Return success response
    return Response.json({
      success: true,
      image: imageMetadata,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return new Response(`Failed to upload image: ${error instanceof Error ? error.message : "Unknown error"}`, {
      status: 500,
    })
  }
}

