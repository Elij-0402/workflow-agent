import { readFileSync, writeFileSync } from "node:fs";

const map = [
  "dacad07", "dacad07", "5ce7233", "5ce7233", "454449c", "454449c", "454449c",
  "c038420", "c038420", "c038420", "a3e9701", "a3e9701", "a3e9701", "a3e9701",
  "a3e9701", "a3e9701", "a3e9701", "a3e9701", "a3e9701", "a3e9701", "a3e9701",
  "a3936a9", "a3936a9", "f6defba", "f6defba", "f6defba", "f6defba", "f6defba",
  "f6defba", "f6defba", "f6defba", "8634e01", "8634e01", "8634e01", "0fcffb0",
  "0fcffb0", "853ca16", "853ca16", "204e322", "204e322", "204e322", "204e322",
  "204e322", "204e322", "204e322", "204e322", "c5fc128", "c5fc128", "c5fc128",
  "c5fc128", "c5fc128", "c5fc128", "c5fc128", "c5fc128", "c5fc128", "6d74303",
  "6d74303", "6d74303", "6d74303", "6d74303", "6d74303", "6d74303", "6d74303",
  "9fac3cb", "9fac3cb", "bb58876", "bb58876", "cb7c0fe", "0c121a5", "0c121a5",
  "0c121a5", "0c121a5", "0c121a5", "0c121a5", "0c121a5", "0c121a5", "0c121a5",
  "b92f13a", "b92f13a", "b92f13a",
  // milestone summary table (18)
  "dacad07", "5ce7233", "454449c", "c038420", "a3e9701", "a3936a9", "f6defba",
  "8634e01", "0fcffb0", "853ca16", "204e322", "c5fc128", "6d74303", "9fac3cb",
  "bb58876", "cb7c0fe", "0c121a5", "b92f13a",
];

const path = "docs/GIT_HISTORY.md";
let content = readFileSync(path, "utf8");
let i = 0;
content = content.replace(/（待填）/g, () => {
  if (i >= map.length) throw new Error(`Ran out of SHAs at ${i}`);
  return map[i++];
});
if (i !== map.length) throw new Error(`Expected ${map.length} replacements, got ${i}`);
writeFileSync(path, content, "utf8");
console.log(`Filled ${i} placeholders`);
