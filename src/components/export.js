export function serializeSvg(svg) {
  const clone = svg.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  return '<?xml version="1.0" encoding="UTF-8"?>\n' + new XMLSerializer().serializeToString(clone);
}

export function svgBlob(svg) {
  return new Blob([serializeSvg(svg)], {type: "image/svg+xml;charset=utf-8"});
}

export function jpgDimensions(svg, scale) {
  const width = Math.round(Number(svg.getAttribute("width")) * scale);
  const height = Math.round(Number(svg.getAttribute("height")) * scale);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1 || width * height > 32_000_000) {
    throw new Error("This JPG is too large. Reduce the chart dimensions or export scale (maximum 32 megapixels).");
  }
  return {width, height};
}

export async function jpgBlob(svg, {scale = 2, quality = 0.95, background = "#ffffff"} = {}) {
  const {width, height} = jpgDimensions(svg, scale);
  const url = URL.createObjectURL(svgBlob(svg));
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("This browser cannot create a JPG canvas.");
    context.fillStyle = background;
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return await new Promise((resolve, reject) => canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("JPG export failed. Try a smaller export scale.")),
      "image/jpeg", quality
    ));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
