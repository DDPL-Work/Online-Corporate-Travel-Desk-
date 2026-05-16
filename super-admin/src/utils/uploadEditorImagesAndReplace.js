export async function uploadEditorImagesAndReplace(contentHtml) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(contentHtml, "text/html");

  const imgTags = doc.querySelectorAll("img");
  for (const img of imgTags) {
    if (img.src.startsWith("blob:")) {
      // Convert blob to File
      const blob = await fetch(img.src).then((r) => r.blob());
      const file = new File([blob], "editor-image.png", { type: blob.type });

      const formData = new FormData();
      formData.append("image", file);

      // Upload to backend route
      const res = await fetch(`${import.meta.env.VITE_API_URL}/api/v1/blogs/upload-editor-image`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${sessionStorage.getItem("token")}`
        },
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.url) {
        img.src = data.url; 
      }
    }
  }

  return doc.body.innerHTML; // updated HTML
}