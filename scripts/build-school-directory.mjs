import { readFileSync, writeFileSync } from "node:fs";

const input = process.argv[2];
if (!input) throw new Error("Pass the downloaded NCAA memberList JSON path.");

const slug = (value) => value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const ncaa = JSON.parse(readFileSync(input, "utf8")).map((school) => ({
  id: `ncaa-${school.orgId}`,
  name: school.nameOfficial.trim(),
  city: "",
  region: school.memberOrgAddress?.state || "",
  country: "United States",
  pathway: "NCAA",
  division: `Division ${school.divisionRoman || school.division}`,
  conference: school.conferenceName?.trim() || "Independent",
  size: "Not listed",
  majors: [],
  teamCategory: "Check program",
  sourceUrl: `https://web3.ncaa.org/directory/orgDetail?id=${school.orgId}`,
  sourceLabel: "Official NCAA Membership Directory",
  reviewedAt: "2026-07-22"
}));

const usports = [
  ["Acadia University","Wolfville","NS","AUS"],["Cape Breton University","Sydney","NS","AUS"],["Dalhousie University","Halifax","NS","AUS"],["Memorial University of Newfoundland","St. John's","NL","AUS"],["Mount Allison University","Sackville","NB","AUS"],["Université de Moncton","Moncton","NB","AUS"],["University of New Brunswick","Fredericton","NB","AUS"],["University of Prince Edward Island","Charlottetown","PE","AUS"],["Saint Mary's University","Halifax","NS","AUS"],["St. Francis Xavier University","Antigonish","NS","AUS"],["St. Thomas University","Fredericton","NB","AUS"],
  ["University of British Columbia","Vancouver","BC","Canada West"],["Trinity Western University","Langley","BC","Canada West"],["University of Victoria","Victoria","BC","Canada West"],["University of the Fraser Valley","Abbotsford","BC","Canada West"],["University of Northern British Columbia","Prince George","BC","Canada West"],["Thompson Rivers University","Kamloops","BC","Canada West"],["University of British Columbia Okanagan","Kelowna","BC","Canada West"],["University of Alberta","Edmonton","AB","Canada West"],["University of Calgary","Calgary","AB","Canada West"],["MacEwan University","Edmonton","AB","Canada West"],["Mount Royal University","Calgary","AB","Canada West"],["University of Saskatchewan","Saskatoon","SK","Canada West"],["University of Lethbridge","Lethbridge","AB","Canada West"],["Brandon University","Brandon","MB","Canada West"],["University of Regina","Regina","SK","Canada West"],["University of Winnipeg","Winnipeg","MB","Canada West"],["University of Manitoba","Winnipeg","MB","Canada West"],
  ["Carleton University","Ottawa","ON","OUA"],["University of Ottawa","Ottawa","ON","OUA"],["University of Toronto","Toronto","ON","OUA"],["Toronto Metropolitan University","Toronto","ON","OUA"],["Queen's University","Kingston","ON","OUA"],["York University","Toronto","ON","OUA"],["Laurentian University","Sudbury","ON","OUA"],["Algoma University","Sault Ste. Marie","ON","OUA"],["Royal Military College of Canada","Kingston","ON","OUA"],["Trent University","Peterborough","ON","OUA"],["Nipissing University","North Bay","ON","OUA"],["Ontario Tech University","Oshawa","ON","OUA"],["Western University","London","ON","OUA"],["University of Windsor","Windsor","ON","OUA"],["McMaster University","Hamilton","ON","OUA"],["University of Guelph","Guelph","ON","OUA"],["University of Waterloo","Waterloo","ON","OUA"],["Wilfrid Laurier University","Waterloo","ON","OUA"],["Brock University","St. Catharines","ON","OUA"],["Lakehead University","Thunder Bay","ON","OUA"],
  ["Concordia University","Montreal","QC","RSEQ"],["Université Laval","Quebec City","QC","RSEQ"],["Université du Québec à Montréal","Montreal","QC","RSEQ"],["McGill University","Montreal","QC","RSEQ"],["Bishop's University","Lennoxville","QC","RSEQ"],["École de technologie supérieure","Montreal","QC","RSEQ"],["Université de Montréal","Montreal","QC","RSEQ"],["Université du Québec à Trois-Rivières","Trois-Rivières","QC","RSEQ"],["Université de Sherbrooke","Sherbrooke","QC","RSEQ"],["Université du Québec à Chicoutimi","Chicoutimi","QC","RSEQ"],
  ["Simon Fraser University","Burnaby","BC","U SPORTS"]
].map(([name,city,region,conference]) => ({
  id: `usports-${slug(name)}`, name, city, region, country: "Canada", pathway: "U Sports", division: "U Sports", conference,
  size: "Not listed", majors: [], teamCategory: "Check program", sourceUrl: "https://usports.ca/", sourceLabel: "U SPORTS member institution", reviewedAt: "2026-07-22"
}));

const directory = [...ncaa, ...usports].sort((a,b) => a.name.localeCompare(b.name));
writeFileSync(new URL("../data/schoolDirectory.json", import.meta.url), JSON.stringify(directory));
console.log(`Wrote ${ncaa.length} NCAA + ${usports.length} U SPORTS = ${directory.length} schools.`);
