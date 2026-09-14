const ROBOTO_MONO_FAMILY = "RobotoMono";
const ROBOTO_MONO_REGULAR = "RobotoMono-Regular.ttf";
const ROBOTO_MONO_BOLD = "RobotoMono-Bold.ttf";
const ROBOTO_MONO_REGULAR_URL =
  "https://raw.githubusercontent.com/google/fonts/master/apache/robotomono/RobotoMono-Regular.ttf";
const ROBOTO_MONO_BOLD_URL =
  "https://raw.githubusercontent.com/google/fonts/master/apache/robotomono/RobotoMono-Bold.ttf";

const fontCache = new Map<string, Promise<string>>();

type PdfWithFonts = {
  addFileToVFS(fileName: string, fileData: string): void;
  addFont(fileName: string, fontName: string, fontStyle: string): void;
  setFont(fontName: string, fontStyle?: string): void;
};

function arrayBufferToBase64(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = "";

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function fetchFontBase64(url: string) {
  if (!fontCache.has(url)) {
    fontCache.set(
      url,
      fetch(url)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`No se pudo cargar la fuente: ${response.status}`);
          }
          return response.arrayBuffer();
        })
        .then(arrayBufferToBase64),
    );
  }

  return fontCache.get(url)!;
}

export async function registerRobotoMono(doc: PdfWithFonts) {
  try {
    const [regular, bold] = await Promise.all([
      fetchFontBase64(ROBOTO_MONO_REGULAR_URL),
      fetchFontBase64(ROBOTO_MONO_BOLD_URL),
    ]);

    doc.addFileToVFS(ROBOTO_MONO_REGULAR, regular);
    doc.addFont(ROBOTO_MONO_REGULAR, ROBOTO_MONO_FAMILY, "normal");
    doc.addFileToVFS(ROBOTO_MONO_BOLD, bold);
    doc.addFont(ROBOTO_MONO_BOLD, ROBOTO_MONO_FAMILY, "bold");
    doc.setFont(ROBOTO_MONO_FAMILY, "normal");

    return ROBOTO_MONO_FAMILY;
  } catch (error) {
    console.warn("No se pudo cargar Roboto Mono para el PDF.", error);
    doc.setFont("courier", "normal");
    return "courier";
  }
}
