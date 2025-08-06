import imageCompression from "browser-image-compression";

export async function compressCompetitionImage(file) {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
  };

  try {
    const blob = await imageCompression(file, options);

    const compressedFile = new File([blob], file.name, { type: file.type });

    return { file: compressedFile };
  } catch (error) {
    console.error("Error compressing image:", error);
    throw error;
  }
}
