/**
 * Client-Side Smart Image Compressor using HTML5 Canvas.
 * Automatically resizes high-resolution smartphone photos (48MP-108MP, 5-15MB)
 * down to crisp, telco-grade document resolution (max 1280px) and 80% JPEG quality.
 * Shrinks file size by 90-97% before uploading to server.
 */

export interface CompressionResult {
  file: File;
  previewUrl: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  reductionPct: number;
}

export async function compressImage(
  file: File,
  maxDimension = 1280,
  quality = 0.8
): Promise<CompressionResult> {
  const originalSizeKb = Math.round(file.size / 1024);

  // If already tiny (< 250KB) or not an image (e.g. PDF), skip compression
  if (!file.type.startsWith("image/") || file.size < 250 * 1024) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve({
          file,
          previewUrl: e.target?.result as string,
          originalSizeKb,
          compressedSizeKb: originalSizeKb,
          reductionPct: 0,
        });
      };
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file gambar"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Format gambar tidak didukung"));
      img.onload = () => {
        let { width, height } = img;

        // Maintain aspect ratio, scaling down if exceeds maxDimension
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          resolve({
            file,
            previewUrl: e.target?.result as string,
            originalSizeKb,
            compressedSizeKb: originalSizeKb,
            reductionPct: 0,
          });
          return;
        }

        // High quality bicubic image scaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve({
                file,
                previewUrl: e.target?.result as string,
                originalSizeKb,
                compressedSizeKb: originalSizeKb,
                reductionPct: 0,
              });
              return;
            }

            const cleanBase = file.name.replace(/\.[^/.]+$/, "");
            const compressedFile = new File([blob], `${cleanBase}.jpg`, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });

            const compressedSizeKb = Math.round(blob.size / 1024);
            const reductionPct = Math.max(
              0,
              Math.round(((file.size - blob.size) / file.size) * 100)
            );
            const previewUrl = canvas.toDataURL("image/jpeg", 0.75);

            resolve({
              file: compressedFile,
              previewUrl,
              originalSizeKb,
              compressedSizeKb,
              reductionPct,
            });
          },
          "image/jpeg",
          quality
        );
      };

      img.src = e.target?.result as string;
    };

    reader.readAsDataURL(file);
  });
}
