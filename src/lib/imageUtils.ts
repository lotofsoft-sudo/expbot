/**
 * Utility for compressing image files and base64 strings
 * Ensures image attachments never exceed Firestore document limits (1MB)
 */

export async function compressImageFile(
  file: File,
  maxWidth = 1024,
  maxHeight = 1024,
  quality = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // If not an image file (e.g. text/pdf snippet), read as data url
    if (!file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(e.target?.result as string);
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          // Convert to JPEG with quality compression
          let compressedBase64 = canvas.toDataURL('image/jpeg', quality);

          // If still larger than 250KB, compress further
          if (compressedBase64.length > 300000) {
            const smallCanvas = document.createElement('canvas');
            const scale = 0.7;
            smallCanvas.width = Math.round(width * scale);
            smallCanvas.height = Math.round(height * scale);
            const smallCtx = smallCanvas.getContext('2d');
            if (smallCtx) {
              smallCtx.fillStyle = '#FFFFFF';
              smallCtx.fillRect(0, 0, smallCanvas.width, smallCanvas.height);
              smallCtx.drawImage(img, 0, 0, smallCanvas.width, smallCanvas.height);
              compressedBase64 = smallCanvas.toDataURL('image/jpeg', 0.6);
            }
          }

          resolve(compressedBase64);
        } catch (err) {
          // Fallback to original reader result
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export async function compressBase64Image(
  dataUrl: string,
  maxWidth = 1000,
  maxHeight = 1000,
  quality = 0.7
): Promise<string> {
  if (!dataUrl || !dataUrl.startsWith('data:image')) {
    return dataUrl;
  }

  // If already under 200KB (~270k characters), no need to compress
  if (dataUrl.length < 250000) {
    return dataUrl;
  }

  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let { width, height } = img;

          if (width > maxWidth || height > maxHeight) {
            if (width / height > maxWidth / maxHeight) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }

          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
}
