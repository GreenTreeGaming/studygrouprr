const fs = require("fs");

const csv = fs.readFileSync(
  "./data/universities.csv",
  "utf8"
);

const lines = csv.trim().split("\n");

const universities = lines
  .slice(1)
  .map((line) => {
    const match = line.match(
      /^"?(.+?)"?\,(https?:\/\/.+)$/
    );

    if (!match) return null;

    return {
      name: match[1],
      url: match[2],
    };
  })
  .filter(Boolean);

fs.writeFileSync(
  "./data/universities.json",
  JSON.stringify(universities, null, 2)
);

console.log(
  `Converted ${universities.length} universities`
);