const FIXED_ASSET_PARENT_CODE = "10000";
const ACCUMULATED_DEPRECIATION_MEMO = "Accumulated Depreciation";
const RETAINED_EARNINGS_CODE = "32100";

const LIABILITY_MEMO_ORDER = ["Accounts Payable", "Other Current Liability"];

function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

export function isZeroBalanceAmount(value) {
  return Math.abs(Number(value) || 0) < 0.009;
}

function sumBalances(lines) {
  return roundMoney(
    (lines ?? []).reduce((sum, line) => sum + Number(line.balance ?? 0), 0),
  );
}

function filterLines(lines, hideZeroBalances) {
  if (!hideZeroBalances) {
    return lines ?? [];
  }

  return (lines ?? []).filter((line) => !isZeroBalanceAmount(line.balance));
}

function sectionByLabel(report, label) {
  return report?.sections?.find((section) => section.label === label);
}

function assetLines(report) {
  return sectionByLabel(report, "Assets")?.lines ?? [];
}

function liabilityLines(report) {
  return sectionByLabel(report, "Liabilities")?.lines ?? [];
}

function equityLines(report) {
  return sectionByLabel(report, "Equity")?.lines ?? [];
}

function filterByMemo(lines, memo) {
  return (lines ?? []).filter(
    (line) => line.memo === memo && !line.is_computed,
  );
}

function groupLinesByMemo(lines, memoOrder) {
  const groups = new Map();

  for (const line of lines ?? []) {
    if (line.is_computed) {
      continue;
    }

    const memo = line.memo || "Other";
    if (!groups.has(memo)) {
      groups.set(memo, []);
    }
    groups.get(memo).push(line);
  }

  const sortedKeys = [
    ...memoOrder.filter((key) => groups.has(key)),
    ...Array.from(groups.keys())
      .filter((key) => !memoOrder.includes(key))
      .sort((a, b) => a.localeCompare(b)),
  ];

  return sortedKeys.map((memo) => {
    const groupLines = groups.get(memo) ?? [];
    return {
      memo,
      lines: groupLines,
      total: sumBalances(groupLines),
    };
  });
}

function buildSubsection(label, lines, hideZeroBalances, useAllLinesForTotal = false) {
  const visibleLines = filterLines(lines, hideZeroBalances);
  const total = useAllLinesForTotal ? sumBalances(lines) : sumBalances(visibleLines);

  return {
    label,
    lines: visibleLines,
    total,
    hidden: hideZeroBalances && isZeroBalanceAmount(total) && visibleLines.length === 0,
    expandable: (lines?.length ?? 0) > 0,
  };
}

function buildCurrentAssets(allAssetLines, hideZeroBalances) {
  const cashLines = filterByMemo(allAssetLines, "Bank");
  const arLines = filterByMemo(allAssetLines, "Accounts Receivable");
  const otherLines = filterByMemo(allAssetLines, "Other Current Asset");

  const cash = buildSubsection("Cash", cashLines, hideZeroBalances, true);
  const accountsReceivable = buildSubsection(
    "Accounts receivable",
    arLines,
    hideZeroBalances,
    true,
  );
  const otherCurrent = buildSubsection(
    "Other current assets",
    otherLines,
    hideZeroBalances,
    true,
  );

  const total = roundMoney(cash.total + accountsReceivable.total + otherCurrent.total);

  return {
    label: "Current assets",
    cash,
    accountsReceivable,
    otherCurrent,
    total,
    hidden: hideZeroBalances && isZeroBalanceAmount(total),
  };
}

function buildFixedAssets(allAssetLines, hideZeroBalances) {
  // Cost leaves use memo "Fixed Asset"; contra leaves use "Accumulated Depreciation".
  const costLines = (allAssetLines ?? []).filter(
    (line) =>
      line.memo === "Fixed Asset" &&
      !line.is_computed &&
      line.code !== FIXED_ASSET_PARENT_CODE,
  );
  const contraLines = (allAssetLines ?? []).filter(
    (line) =>
      line.memo === ACCUMULATED_DEPRECIATION_MEMO && !line.is_computed,
  );
  const ppeTotal = sumBalances(costLines);
  // Contra asset balances are credit-normal (negative on the BS API); show as positive "less".
  const accumDepTotal = roundMoney(
    contraLines.reduce(
      (sum, line) => sum + Math.abs(Number(line.balance ?? 0)),
      0,
    ),
  );
  const netFixedTotal = roundMoney(ppeTotal - accumDepTotal);

  const ppe = buildSubsection(
    "Property, plant and equipment",
    costLines,
    hideZeroBalances,
    true,
  );

  const accumDep = {
    label: "Less accumulated depreciation",
    lines: filterLines(contraLines, hideZeroBalances),
    total: accumDepTotal,
    isContra: true,
    hidden: hideZeroBalances && isZeroBalanceAmount(accumDepTotal),
    expandable: contraLines.length > 0,
  };

  const netFixed = {
    label: "Net fixed assets",
    lines: [],
    total: netFixedTotal,
    hidden: hideZeroBalances && isZeroBalanceAmount(netFixedTotal),
  };

  return {
    label: "Fixed assets",
    ppe,
    accumDep,
    netFixed,
    total: netFixedTotal,
    hidden:
      hideZeroBalances &&
      isZeroBalanceAmount(ppeTotal) &&
      isZeroBalanceAmount(accumDepTotal) &&
      isZeroBalanceAmount(netFixedTotal),
  };
}

function buildLiabilities(report, hideZeroBalances) {
  const lines = liabilityLines(report);
  const groups = groupLinesByMemo(lines, LIABILITY_MEMO_ORDER).map((group) => {
    const visibleLines = filterLines(group.lines, hideZeroBalances);
    return {
      memo: group.memo,
      label: group.memo,
      lines: visibleLines,
      total: group.total,
      hidden:
        hideZeroBalances &&
        isZeroBalanceAmount(group.total) &&
        visibleLines.length === 0,
      expandable: group.lines.length > 0,
    };
  });

  const visibleGroups = hideZeroBalances
    ? groups.filter((group) => !group.hidden)
    : groups;

  return {
    label: "Liabilities",
    groups: visibleGroups,
    total: sectionByLabel(report, "Liabilities")?.total ?? 0,
  };
}

function buildEquity(report, hideZeroBalances) {
  const lines = equityLines(report);
  const retainedEarningsLine = lines.find(
    (line) => line.code === RETAINED_EARNINGS_CODE && !line.is_computed,
  );
  const openingRetainedEarnings = roundMoney(retainedEarningsLine?.balance ?? 0);
  const netIncome = roundMoney(report?.totals?.net_income ?? 0);
  const totalRetainedEarnings = roundMoney(openingRetainedEarnings + netIncome);

  const equityAccountLines = lines.filter((line) => {
    if (line.is_computed) {
      return false;
    }

    if (line.code === RETAINED_EARNINGS_CODE) {
      return false;
    }

    return true;
  });

  const equityAccounts = buildSubsection(
    "Equity accounts",
    equityAccountLines,
    hideZeroBalances,
    true,
  );

  const retainedDetailLines = [];
  if (!(hideZeroBalances && isZeroBalanceAmount(openingRetainedEarnings))) {
    retainedDetailLines.push({
      account_id: retainedEarningsLine?.account_id ?? "opening-retained-earnings",
      code: RETAINED_EARNINGS_CODE,
      name: "Opening retained earnings",
      balance: openingRetainedEarnings,
    });
  }
  if (!(hideZeroBalances && isZeroBalanceAmount(netIncome))) {
    retainedDetailLines.push({
      account_id: "net-income",
      code: "",
      name: "Net income",
      balance: netIncome,
      is_computed: true,
      computed_kind: "net_income_total",
    });
  }

  const retainedEarnings = {
    label: "Retained earnings",
    lines: retainedDetailLines,
    total: totalRetainedEarnings,
    openingRetainedEarnings: {
      label: "Opening retained earnings",
      total: openingRetainedEarnings,
      hidden: hideZeroBalances && isZeroBalanceAmount(openingRetainedEarnings),
    },
    netIncome: {
      label: "Net income",
      total: netIncome,
      hidden: hideZeroBalances && isZeroBalanceAmount(netIncome),
    },
    hidden:
      hideZeroBalances &&
      isZeroBalanceAmount(openingRetainedEarnings) &&
      isZeroBalanceAmount(netIncome),
    expandable: retainedDetailLines.length > 0,
  };

  return {
    label: "Equity",
    equityAccounts,
    retainedEarnings,
    total: report?.totals?.equity ?? 0,
  };
}

/**
 * Transform flat balance-sheet API payload into classic presentation groups.
 */
export function buildBalanceSheetPresentation(report, hideZeroBalances = false) {
  const allAssetLines = assetLines(report);
  const currentAssets = buildCurrentAssets(allAssetLines, hideZeroBalances);
  const fixedAssets = buildFixedAssets(allAssetLines, hideZeroBalances);
  const liabilities = buildLiabilities(report, hideZeroBalances);
  const equity = buildEquity(report, hideZeroBalances);

  const totalAssets = roundMoney(report?.totals?.assets ?? 0);

  return {
    assets: {
      label: "Assets",
      currentAssets,
      fixedAssets,
      total: totalAssets,
    },
    liabilities,
    equity,
    totals: report?.totals ?? {},
  };
}

export function lineLineKey(line) {
  if (line?.is_computed) {
    return `computed-${line.computed_kind ?? "line"}-${line.account_id ?? line.name}`;
  }

  if (line?.account_id != null) {
    return line.account_id;
  }

  return line?.code ?? line?.label ?? "line";
}
