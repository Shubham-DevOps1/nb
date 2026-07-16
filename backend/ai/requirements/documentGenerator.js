const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType
} = require('docx');

const CELL_MARGIN = { top: 80, bottom: 80, left: 100, right: 100 };

function headerCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    margins: CELL_MARGIN,
    shading: { fill: 'D9E2F3' },
    children: [new Paragraph({ children: [new TextRun({ text, bold: true })] })]
  });
}

function bodyCell(text, widthPct) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    margins: CELL_MARGIN,
    children: [new Paragraph({ children: [new TextRun({ text: String(text) })] })]
  });
}

/**
 * Builds a per-requirement summary table: role, skills, experience, domain,
 * requested vs. matched headcount, sufficiency.
 */
function buildSummaryTable(matches) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Role', 22),
      headerCell('Skills', 26),
      headerCell('Min. Exp.', 10),
      headerCell('Requested', 10),
      headerCell('Available', 10),
      headerCell('Status', 22)
    ]
  });

  const rows = matches.map(m => new TableRow({
    children: [
      bodyCell(m.role, 22),
      bodyCell(m.skills.join(', '), 26),
      bodyCell(`${m.minExperience}+ yrs`, 10),
      bodyCell(m.count, 10),
      bodyCell(m.matchedCount, 10),
      bodyCell(m.sufficientResources ? 'Sufficient' : 'Shortfall', 22)
    ]
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...rows]
  });
}

/**
 * Builds a detailed resource table for a single requirement, listing the
 * candidate resources matched against it.
 */
function buildResourceTable(resources) {
  const headerRow = new TableRow({
    tableHeader: true,
    children: [
      headerCell('Name', 20),
      headerCell('Designation', 18),
      headerCell('Experience', 10),
      headerCell('Matched Skills', 24),
      headerCell('Location', 16),
      headerCell('Availability', 12)
    ]
  });

  const rows = resources.map(r => new TableRow({
    children: [
      bodyCell(r.name, 20),
      bodyCell(r.designation, 18),
      bodyCell(`${r.experience} yrs`, 10),
      bodyCell(r.matchedSkills.join(', '), 24),
      bodyCell(r.location, 16),
      bodyCell(r.availability, 12)
    ]
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...rows]
  });
}

/**
 * Builds a .docx staffing proposal document (as a Buffer) from a requirement
 * analysis result (the same shape returned by /api/requirements/analyze).
 */
async function buildRequirementDocx({ sourceFile, requirementCount, matches }) {
  const children = [
    new Paragraph({
      text: 'Project Resource Requirement Proposal',
      heading: HeadingLevel.TITLE
    }),
    new Paragraph({
      children: [
        new TextRun({ text: `Source document: ${sourceFile}`, italics: true }),
        new TextRun({ text: `  |  Requirements identified: ${requirementCount}`, italics: true }),
        new TextRun({ text: `  |  Generated: ${new Date().toISOString().slice(0, 10)}`, italics: true })
      ]
    }),
    new Paragraph({ text: '', spacing: { after: 200 } }),
    new Paragraph({ text: 'Summary', heading: HeadingLevel.HEADING_1 }),
    buildSummaryTable(matches),
    new Paragraph({ text: '', spacing: { after: 200 } })
  ];

  matches.forEach((m, i) => {
    const heading = m.domain ? `${i + 1}. ${m.role} (Domain: ${m.domain})` : `${i + 1}. ${m.role}`;
    children.push(new Paragraph({ text: heading, heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({
      children: [new TextRun({ text: m.justification, italics: true })],
      spacing: { after: 120 }
    }));

    if (m.resources.length > 0) {
      children.push(buildResourceTable(m.resources));
    } else {
      children.push(new Paragraph({ text: 'No matching resources found for this requirement.' }));
    }
    children.push(new Paragraph({ text: '', spacing: { after: 200 } }));
  });

  const doc = new Document({
    sections: [{ properties: {}, children }]
  });

  return Packer.toBuffer(doc);
}

module.exports = {
  buildRequirementDocx
};
