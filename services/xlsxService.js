const { Buffer } = require('buffer');

function crc32(buffer) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buffer.length; i += 1) {
    crc ^= buffer[i];
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xEDB88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function dosDateTime(date = new Date()) {
  const year = Math.max(1980, date.getFullYear());
  const dosTime = ((date.getHours() & 0x1f) << 11)
    | ((date.getMinutes() & 0x3f) << 5)
    | ((Math.floor(date.getSeconds() / 2)) & 0x1f);
  const dosDate = (((year - 1980) & 0x7f) << 9)
    | (((date.getMonth() + 1) & 0x0f) << 5)
    | (date.getDate() & 0x1f);
  return { dosDate, dosTime };
}

function createZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;
  const { dosDate, dosTime } = dosDateTime();

  entries.forEach(entry => {
    const name = Buffer.from(entry.name, 'utf8');
    const data = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, 'utf8');
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8); // Stored (sin compresión): simple y compatible.
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);

    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + data.length;
  });

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, end]);
}

function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function colLetter(index) {
  let value = index;
  let letters = '';
  while (value > 0) {
    value -= 1;
    letters = String.fromCharCode(65 + (value % 26)) + letters;
    value = Math.floor(value / 26);
  }
  return letters;
}

function safeSheetName(name, fallback) {
  const cleaned = String(name || fallback || 'Hoja')
    .replace(/[\\/*?:\[\]]/g, ' ')
    .trim()
    .slice(0, 31);
  return cleaned || fallback || 'Hoja';
}

function cellXml(ref, input, defaultStyle = 0) {
  const normalized = input && typeof input === 'object' && !Array.isArray(input) && Object.prototype.hasOwnProperty.call(input, 'value')
    ? input
    : { value: input };
  const value = normalized.value;
  const style = Number.isInteger(normalized.style) ? normalized.style : defaultStyle;
  const styleAttr = style ? ` s="${style}"` : '';

  if (value === null || value === undefined || value === '') {
    return `<c r="${ref}"${styleAttr}/>`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${styleAttr} t="n"><v>${value}</v></c>`;
  }
  if (typeof value === 'boolean') {
    return `<c r="${ref}"${styleAttr} t="b"><v>${value ? 1 : 0}</v></c>`;
  }
  return `<c r="${ref}"${styleAttr} t="inlineStr"><is><t xml:space="preserve">${xmlEscape(value)}</t></is></c>`;
}

function worksheetXml(sheet) {
  const columns = sheet.columns || [];
  const rows = sheet.rows || [];
  const meta = Array.isArray(sheet.meta) ? sheet.meta.filter(Boolean) : [];
  const titleRows = 1 + meta.length;
  const headerRow = titleRows + 2;
  const firstDataRow = headerRow + 1;
  const lastDataRow = Math.max(headerRow, headerRow + rows.length);
  const lastCol = colLetter(Math.max(1, columns.length));
  const sheetRows = [];

  const titleCells = [cellXml('A1', { value: sheet.title || sheet.name || 'Reporte', style: 1 })];
  sheetRows.push(`<row r="1" ht="26" customHeight="1">${titleCells.join('')}</row>`);

  meta.forEach((line, idx) => {
    const rowNumber = idx + 2;
    sheetRows.push(`<row r="${rowNumber}">${cellXml(`A${rowNumber}`, { value: line, style: 5 })}</row>`);
  });

  sheetRows.push(`<row r="${headerRow}" ht="24" customHeight="1">${columns.map((column, idx) => cellXml(`${colLetter(idx + 1)}${headerRow}`, { value: column.header, style: 2 })).join('')}</row>`);

  rows.forEach((row, rowIndex) => {
    const rowNumber = firstDataRow + rowIndex;
    const cells = columns.map((column, colIndex) => {
      const raw = Array.isArray(row) ? row[colIndex] : row[column.key];
      const defaultStyle = column.style || (column.type === 'number' ? 3 : column.type === 'percent' ? 4 : 0);
      return cellXml(`${colLetter(colIndex + 1)}${rowNumber}`, raw, defaultStyle);
    });
    sheetRows.push(`<row r="${rowNumber}">${cells.join('')}</row>`);
  });

  const colDefs = columns.map((column, idx) => {
    const width = Math.max(8, Math.min(48, Number(column.width) || 16));
    return `<col min="${idx + 1}" max="${idx + 1}" width="${width}" customWidth="1"/>`;
  }).join('');

  const merges = [`<mergeCell ref="A1:${lastCol}1"/>`, ...meta.map((_, idx) => `<mergeCell ref="A${idx + 2}:${lastCol}${idx + 2}"/>`)];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:${lastCol}${lastDataRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="${headerRow}" topLeftCell="A${firstDataRow}" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>${colDefs}</cols>
  <sheetData>${sheetRows.join('')}</sheetData>
  <autoFilter ref="A${headerRow}:${lastCol}${lastDataRow}"/>
  <mergeCells count="${merges.length}">${merges.join('')}</mergeCells>
</worksheet>`;
}

function stylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2"><numFmt numFmtId="164" formatCode="0.00"/><numFmt numFmtId="165" formatCode="0.00%"/></numFmts>
  <fonts count="4">
    <font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="16"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>
    <font><i/><sz val="10"/><color rgb="FF6F625A"/><name val="Calibri"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF861C2C"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFF4E7C0"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border><left style="thin"><color rgb="FFE8DED7"/></left><right style="thin"><color rgb="FFE8DED7"/></right><top style="thin"><color rgb="FFE8DED7"/></top><bottom style="thin"><color rgb="FFE8DED7"/></bottom><diagonal/></border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="top" wrapText="1"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFill="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment vertical="top"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="0" xfId="0" applyFill="1" applyFont="1" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
}

function createWorkbook({ sheets = [] }) {
  if (!sheets.length) throw new Error('Se requiere al menos una hoja para generar Excel.');
  const normalizedSheets = sheets.map((sheet, idx) => ({
    ...sheet,
    name: safeSheetName(sheet.name, `Hoja ${idx + 1}`)
  }));

  const workbookSheets = normalizedSheets.map((sheet, idx) => `<sheet name="${xmlEscape(sheet.name)}" sheetId="${idx + 1}" r:id="rId${idx + 1}"/>`).join('');
  const workbookRels = normalizedSheets.map((_, idx) => `<Relationship Id="rId${idx + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${idx + 1}.xml"/>`).join('');
  const styleRelId = normalizedSheets.length + 1;

  const entries = [
    {
      name: '[Content_Types].xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${normalizedSheets.map((_, idx) => `<Override PartName="/xl/worksheets/sheet${idx + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`
    },
    {
      name: '_rels/.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    },
    {
      name: 'xl/workbook.xml',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView/></bookViews><sheets>${workbookSheets}</sheets></workbook>`
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${workbookRels}<Relationship Id="rId${styleRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
    },
    { name: 'xl/styles.xml', data: stylesXml() }
  ];

  normalizedSheets.forEach((sheet, idx) => {
    entries.push({ name: `xl/worksheets/sheet${idx + 1}.xml`, data: worksheetXml(sheet) });
  });

  return createZip(entries);
}

module.exports = { createWorkbook, _test: { crc32, colLetter, worksheetXml } };
