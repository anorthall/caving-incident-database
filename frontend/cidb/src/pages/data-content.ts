export const DATA_COLUMNS: { name: string; description: string }[] = [
  { name: "id", description: "Unique incident identifier." },
  { name: "title", description: "Incident title as recorded." },
  {
    name: "date",
    description: "Incident date at the precision known (year, month, day or season).",
  },
  { name: "year", description: "Four-digit year, empty when unknown." },
  { name: "cave", description: "Cave name." },
  { name: "country", description: "Country of the cave." },
  { name: "state", description: "State or province, empty when unknown." },
  { name: "region", description: "Region within the state, empty when unknown." },
  { name: "latitude", description: "Decimal degrees, empty when unknown." },
  { name: "longitude", description: "Decimal degrees, empty when unknown." },
  { name: "tags", description: "Semicolon-separated tags." },
  { name: "summary", description: "Short summary of the incident." },
  { name: "url", description: "Path of the incident page on this site." },
];

export const CITATION =
  "Caving Incident Database (CIDB). National Speleological Society. https://incidents.caves.org. Accessed [date].";
