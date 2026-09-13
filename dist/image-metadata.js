(function () {
  'use strict';

  function readExif(buffer) {
    const view = new DataView(buffer);
    if (view.byteLength < 4 || view.getUint16(0, false) !== 0xffd8) return {};
    let offset = 2;
    while (offset + 4 <= view.byteLength) {
      if (view.getUint8(offset) !== 0xff) break;
      const marker = view.getUint8(offset + 1);
      if (marker === 0xda || marker === 0xd9) break;
      const length = view.getUint16(offset + 2, false);
      if (length < 2 || offset + 2 + length > view.byteLength) break;
      if (marker === 0xe1 && length >= 8 && view.getUint32(offset + 4, false) === 0x45786966 && view.getUint16(offset + 8, false) === 0) {
        return parseTiff(view, offset + 10, offset + 2 + length);
      }
      offset += length + 2;
    }
    return {};
  }

  function parseTiff(view, base, end) {
    if (base + 8 > end) return {};
    const byteOrder = view.getUint16(base, false);
    const little = byteOrder === 0x4949;
    if (!little && byteOrder !== 0x4d4d) return {};
    if (view.getUint16(base + 2, little) !== 42) return {};
    const result = {};
    const sizes = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 7: 1, 9: 4, 10: 8 };

    function inRange(position, size) { return position >= base && size >= 0 && position + size <= end; }
    function valueAt(entry, type, count) {
      const bytes = (sizes[type] || 0) * count;
      if (!bytes || bytes > 65536) return null;
      const position = bytes <= 4 ? entry + 8 : base + view.getUint32(entry + 8, little);
      if (!inRange(position, bytes)) return null;
      function number(index) {
        const at = position + index * (sizes[type] || 1);
        if (type === 1 || type === 7) return view.getUint8(at);
        if (type === 3) return view.getUint16(at, little);
        if (type === 4) return view.getUint32(at, little);
        if (type === 5) {
          const denominator = view.getUint32(at + 4, little);
          return denominator ? view.getUint32(at, little) / denominator : 0;
        }
        if (type === 9) return view.getInt32(at, little);
        if (type === 10) {
          const denominator = view.getInt32(at + 4, little);
          return denominator ? view.getInt32(at, little) / denominator : 0;
        }
        return 0;
      }
      if (type === 2) {
        let text = '';
        for (let index = 0; index < count && view.getUint8(position + index); index += 1) text += String.fromCharCode(view.getUint8(position + index));
        return text.trim();
      }
      if (count === 1) return number(0);
      const values = [];
      for (let index = 0; index < count; index += 1) values.push(number(index));
      return values;
    }

    function readIfd(relativeOffset) {
      const ifd = base + relativeOffset;
      if (!inRange(ifd, 2)) return {};
      const count = Math.min(view.getUint16(ifd, little), 256);
      const tags = {};
      for (let index = 0; index < count; index += 1) {
        const entry = ifd + 2 + index * 12;
        if (!inRange(entry, 12)) break;
        const tag = view.getUint16(entry, little);
        const type = view.getUint16(entry + 2, little);
        const itemCount = view.getUint32(entry + 4, little);
        const value = valueAt(entry, type, itemCount);
        if (value !== null) tags[tag] = value;
      }
      return tags;
    }

    const root = readIfd(view.getUint32(base + 4, little));
    const exif = root[0x8769] ? readIfd(root[0x8769]) : {};
    const gps = root[0x8825] ? readIfd(root[0x8825]) : {};
    result.make = root[0x010f] || '';
    result.model = root[0x0110] || '';
    result.orientation = root[0x0112] || 0;
    result.capturedAt = exif[0x9003] || exif[0x9004] || root[0x9003] || root[0x9004] || root[0x0132] || '';
    const exposure = exif[0x829a] || root[0x829a];
    if (exposure) result.exposureTime = exposure < 1 ? '1/' + Math.round(1 / exposure) + ' sec' : exposure.toFixed(2) + ' sec';
    result.fNumber = exif[0x829d] || root[0x829d] || 0;
    const iso = exif[0x8827] || root[0x8827];
    if (iso) result.iso = Array.isArray(iso) ? iso[0] : iso;
    result.focalLength = exif[0x920a] || root[0x920a] || 0;
    const latitude = coordinates(gps[2], gps[1]);
    const longitude = coordinates(gps[4], gps[3]);
    if (latitude !== null && longitude !== null) {
      result.gps = { latitude: latitude, longitude: longitude };
      if (typeof gps[6] === 'number') result.gps.altitude = gps[5] === 1 ? -gps[6] : gps[6];
    }
    return result;
  }

  function coordinates(values, reference) {
    if (!Array.isArray(values) || values.length < 3) return null;
    let decimal = Number(values[0]) + Number(values[1]) / 60 + Number(values[2]) / 3600;
    if (!Number.isFinite(decimal)) return null;
    if (reference === 'S' || reference === 'W') decimal *= -1;
    return Number(decimal.toFixed(6));
  }

  async function extract(file, image) {
    const metadata = {
      fileName: file.name || 'Shift image',
      mimeType: file.type || '',
      fileSize: file.size || 0,
      lastModified: file.lastModified || 0,
      width: image.naturalWidth || 0,
      height: image.naturalHeight || 0
    };
    if (file.type === 'image/jpeg' || /\.jpe?g$/i.test(file.name || '')) {
      try { Object.assign(metadata, readExif(await file.arrayBuffer())); } catch (_error) { /* Basic metadata is still useful. */ }
    }
    return metadata;
  }

  window.HourglassImageMetadata = { extract: extract };
})();
