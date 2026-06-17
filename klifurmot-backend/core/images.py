from io import BytesIO

from PIL import Image as PilImage
from django.core.files.uploadedfile import InMemoryUploadedFile


def compress_image(uploaded_file, max_size, quality=82):
    img = PilImage.open(uploaded_file)

    if img.mode not in ("RGB", "RGBA", "L"):
        img = img.convert("RGBA")

    img.thumbnail(max_size, PilImage.Resampling.LANCZOS)

    output = BytesIO()
    img.save(output, format="WEBP", quality=quality, method=6)
    output.seek(0)

    base_name = uploaded_file.name.rsplit(".", 1)[0]

    return InMemoryUploadedFile(
        output,
        "ImageField",
        f"{base_name}.webp",
        "image/webp",
        output.getbuffer().nbytes,
        None,
    )
