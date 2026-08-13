export const FIXED_ASSET_PARENT_CODE = "10000";

export const FIXED_ASSET_COST_CODES = [
  "10001",
  "10002",
  "10003",
  "10004",
  "10005",
  "10006",
  "10007",
  "10008",
];

export const FIXED_ASSET_ACCUM_DEP_CODES = [
  "10051",
  "10052",
  "10053",
  "10054",
  "10055",
  "10056",
  "10057",
  "10058",
];

export const FIXED_ASSET_COST_TO_ACCUM = {
  "10001": "10051",
  "10002": "10052",
  "10003": "10053",
  "10004": "10054",
  "10005": "10055",
  "10006": "10056",
  "10007": "10057",
  "10008": "10058",
};

export function isFixedAssetRegisterManagedCode(code) {
  return (
    FIXED_ASSET_COST_CODES.includes(code) ||
    FIXED_ASSET_ACCUM_DEP_CODES.includes(code)
  );
}

export function isFixedAssetCostCode(code) {
  return FIXED_ASSET_COST_CODES.includes(code);
}

export function isFixedAssetAccumDepCode(code) {
  return FIXED_ASSET_ACCUM_DEP_CODES.includes(code);
}

export function defaultAccumDepCodeForCost(costCode) {
  return FIXED_ASSET_COST_TO_ACCUM[costCode] ?? "";
}
