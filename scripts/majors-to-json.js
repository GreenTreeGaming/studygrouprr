const fs = require("fs");

const csv = fs.readFileSync(
  "./data/major-list.csv",
  "utf8"
);

const lines = csv
  .split("\n")
  .slice(1)
  .filter(Boolean);

const majors = lines
  .map((line) => {
    const parts = line.split(",");

    if (parts.length < 3) return null;

    return {
      major: parts[1]
        .trim()
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase()),

      category: parts[2].trim(),
    };
  })
  .filter(Boolean);

const uniqueMajors = Array.from(
  new Map(
    majors.map((m) => [m.major, m])
  ).values()
);

fs.writeFileSync(
  "./data/majors.json",
  JSON.stringify(uniqueMajors, null, 2)
);

console.log(
  `Converted ${uniqueMajors.length} majors`
);