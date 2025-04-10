// src/services/uploadService.js
export async function uploadArchivo(file) {
    const formData = new FormData();
    formData.append("archivo", file);
  
    const response = await fetch("http://localhost:5000/upload", {
      method: "POST",
      body: formData,
    });
  
    if (!response.ok) {
      throw new Error("Error al subir el archivo");
    }
  
    const data = await response.json();
    return data.filename;
  }
  