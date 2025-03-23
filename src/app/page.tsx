import { UploadForm } from "@/components/upload-form"
import { ImageGallery } from "@/components/image-gallery"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Image Upload with Cloudflare R2</h1>
      <div className="max-w-3xl mx-auto">
        <UploadForm />
        <div className="mt-12">
          <h2 className="text-2xl font-semibold mb-4">Your Images</h2>
          <ImageGallery />
        </div>
      </div>
    </main>
  )
}

