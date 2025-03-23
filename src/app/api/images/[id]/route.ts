import { getCloudflareContext } from "@opennextjs/cloudflare"

export const runtime = "edge"

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const imageId = params.id

    if (!imageId) {
      return new Response("Image ID is required", { status: 400 })
    }

    const { env } = getCloudflareContext()
    const imagesKV = env.IMAGES_KV
    const r2Bucket = env.IMAGE_BUCKET

    if (!imagesKV || !r2Bucket) {
      return new Response("Storage not configured", { status: 500 })
    }

    // Get image metadata
    const imageMetadataStr = await imagesKV.get(`image:${imageId}`)

    if (!imageMetadataStr) {
      return new Response("Image not found", { status: 404 })
    }

    const imageMetadata = JSON.parse(imageMetadataStr)

    // Extract filename from URL or metadata
    const filename = imageMetadata.url.split("/").pop() || `${imageId}.jpg`

    // Delete from R2
    await r2Bucket.delete(filename)

    // Delete metadata from KV
    await imagesKV.delete(`image:${imageId}`)

    return new Response(null, { status: 204 })
  } catch (error) {
    console.error("Error deleting image:", error)
    return new Response(`Failed to delete image: ${error instanceof Error ? error.message : "Unknown error"}`, {
      status: 500,
    })
  }
}

