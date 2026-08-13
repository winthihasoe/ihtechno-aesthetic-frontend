/** Bilingual accounting guide copy for finance hub + contextual panels. */

export const FINANCE_GUIDE_LANG_KEY = "dermafairy_finance_guide_lang";

export function financeGuideDismissKey(pageId) {
  return `dermafairy_finance_guide_dismiss_${pageId}`;
}

export function readFinanceGuideLang() {
  try {
    const v = localStorage.getItem(FINANCE_GUIDE_LANG_KEY);
    if (v === "en" || v === "my") return v;
  } catch {
    /* ignore */
  }
  return "my";
}

export function readFinanceGuideDismissed(pageId) {
  try {
    return localStorage.getItem(financeGuideDismissKey(pageId)) === "1";
  } catch {
    return false;
  }
}

/** @typedef {{ event: string, stock: string, gl: string, who: string }} PostingMatrixRow */

export const FINANCE_GUIDE_I18N = {
  en: {
    ui: {
      toggleEn: "English",
      toggleMy: "မြန်မာ",
      dontShowAgain: "Don't show again",
      close: "Close",
      fullGuide: "Full accounting guide",
      readMore: "Read more in the guide",
      jumpNav: "On this page",
      postingMatrixCaption:
        "Stock updates immediately for inventory events. General Ledger updates when the journal is posted (auto or from Transactions).",
    },
    hub: {
      title: "Accounting guide",
      subtitle:
        "How DermaFairy posts to the General Ledger, Profit & Loss, and Balance Sheet. Amounts are in Myanmar Kyats (K). Account codes follow the clinic chart of accounts.",
      sections: [
        {
          id: "overview",
          title: "Overview",
          paragraphs: [
            "DermaFairy uses double-entry accounting. Every posted journal balances debits and credits.",
            "The clinic runs perpetual inventory: stock is capitalized as an asset (12000 Inventory Asset and category subs 12001–12007) when purchases are posted, then expensed as COGS (500xx) when used in treatment or sold, or as write-off accounts when lost or expired.",
          ],
          bullets: [
            "12000 · Inventory Asset : balance sheet; rises on purchase post, falls on consumption or write-off",
            "500xx · Cost of Goods Sold : P&L; treatment use and retail/prescription sales",
            "63001 · Inventory Loss : P&L; damage, theft, spillage, count shrinkage",
            "50007 · Damage Cost (Expired) : P&L; expired stock disposed",
            "63002 · Office Use : P&L; internal or sample use",
            "45500 · Other Income : P&L; found stock (manual stock-in)",
            "20000 · Accounts Payable : balance sheet; credit purchases and consignment usage",
          ],
        },
        {
          id: "posting",
          title: "When does the ledger update?",
          paragraphs: [
            "Operational stock (batches and movements) often updates before finance. If stock on hand changed but the Balance Sheet inventory balance did not, a purchase may still be pending on Transactions.",
          ],
          matrixHeaders: ["Event", "Stock", "General Ledger", "Who posts"],
          matrixRows: [
            {
              event: "Purchase receive (cash or credit)",
              stock: "Immediate",
              gl: "Pending on Transactions",
              who: "Accountant",
            },
            {
              event: "Consignment receive",
              stock: "Immediate",
              gl: "No inventory journal at receive",
              who: ":",
            },
            {
              event: "Treatment completed (products used)",
              stock: "Immediate",
              gl: "Auto : Dr 500xx COGS / Cr 120xx",
              who: "System",
            },
            {
              event: "Retail / prescription invoice paid",
              stock: "Immediate",
              gl: "Auto : Dr 500xx COGS / Cr 120xx (consignment: Cr 20000 AP)",
              who: "System",
            },
            {
              event: "Stock out / count-down adjustment",
              stock: "Immediate",
              gl: "Auto : Dr 50007 / 63001 / 63002 / Cr 120xx",
              who: "System",
            },
            {
              event: "Open-vial wastage",
              stock: "Immediate",
              gl: "Auto : Dr 50007 or 63001 / Cr 120xx",
              who: "System",
            },
            {
              event: "Expense saved",
              stock: ":",
              gl: "Pending on Transactions",
              who: "Accountant",
            },
            {
              event: "Invoice issued / payment collected",
              stock: ":",
              gl: "Pending on Transactions (revenue, AR, cash)",
              who: "Accountant",
            },
            {
              event: "Manual stock-in (found stock)",
              stock: "Immediate",
              gl: "Auto : Dr 12000 / Cr 45500",
              who: "System",
            },
            {
              event: "Payroll month accrual (HR complete payout)",
              stock: ":",
              gl: "Pending on Transactions : Dr 620xx / Cr 20130 Salaries Payable",
              who: "Accountant",
            },
            {
              event: "Payroll bank payment (HR complete payout)",
              stock: ":",
              gl: "Pending on Transactions : Dr 20130 / Cr bank",
              who: "Accountant",
            },
          ],
        },
        {
          id: "reports",
          title: "Reports : how they connect",
          paragraphs: [
            "All three core reports read posted, non-voided journal entry lines. Nothing appears until the journal exists.",
          ],
          bullets: [
            "General Ledger : every account: opening, period activity, closing; expand a row to see journal lines",
            "Profit & Loss : income and expense accounts for the selected period (includes 500xx COGS, 630xx write-offs, 610xx operating expenses)",
            "Balance Sheet : assets, liabilities, and equity as of a date; cumulative P&L net income is rolled into equity so Assets = Liabilities + Equity",
            "Cash movements : cash and bank accounts derived from posted journals (not a separate cash ledger)",
          ],
        },
        {
          id: "cogs-faq",
          title: "COGS vs inventory loss vs expired",
          paragraphs: [
            "COGS is only for stock consumed on a revenue activity (treatment session or product sale). It is not used for expired, damaged, or internal-use stock.",
          ],
          bullets: [
            "COGS (500xx) : product used in treatment or sold on a paid invoice; reduces inventory asset",
            "Inventory Loss (63001) : spillage, damage, theft, physical count shrinkage",
            "Damage Cost / Expired (50007) : stock past expiry disposed (manual stock-out or open-vial wastage)",
            "Office Use (63002) : internal, sample, or staff consumption",
            "Retail sale: two flows : invoice revenue posts from Transactions (400xx / cash / AR); product cost posts automatically as invoice COGS when stock is deducted",
          ],
        },
        {
          id: "inventory",
          title: "Inventory & purchases",
          paragraphs: [
            "Receiving a purchase creates batches immediately. Capitalization to 12000 Inventory Asset happens when the accountant posts the purchase from Transactions (Dr 12000 / Cr cash or 20000 AP).",
            "Until that post, on-hand stock and operational reports will show the quantity, but the Balance Sheet inventory balance may not yet include the cost.",
          ],
          bullets: [
            "Credit purchase: Dr 12000 / Cr 20000 AP when posted from Transactions",
            "Cash purchase: Dr 12000 / Cr selected cash/bank account",
            "Consignment: no 12000 at receive; COGS on use/sale credits 20000 AP instead of inventory",
            "Supplier returns: queued like purchases : Dr 20000 AP / Cr 12000 when posted",
          ],
        },
      ],
    },
    pages: {
      transactions: {
        title: "Transactions : accounting queue",
        subtitle:
          "Review and post pending billings before they hit the General Ledger.",
        bullets: [
          "Pending items include invoices, expense payments, purchases, supplier payables, and other income : each with a draft journal preview.",
          "Posting creates balanced journal entries; most revenue, expense, and purchase capitalization flows through here.",
          "Inventory purchases: stock is already received; post here to move cost onto 12000 Inventory Asset (Dr 12000 / Cr cash or AP).",
          "Retail invoices: revenue and cash post here; product COGS posts automatically when the invoice is paid and stock is deducted.",
          "After posting, trace lines in General Ledger or run P&L / Balance Sheet for the period.",
        ],
        hubAnchor: "posting",
      },
      journalEntries: {
        title: "Journal Entries",
        subtitle:
          "Register of posted journals : the audit trail behind every account balance.",
        bullets: [
          "Most entries originate from Transactions (invoices, expenses, purchases). Inventory COGS and adjustments post automatically without appearing here first as pending.",
          "Expand a row to see debit and credit lines, source type, and links back to the originating billing where available.",
          "Manual journals (accounting managers) are for accruals, corrections, and period-end adjustments.",
          "Void or reverse from here only where the product allows; treatment COGS reversals use void consumption on the treatment, not journal reversal.",
        ],
        hubAnchor: "reports",
      },
      generalLedger: {
        title: "General Ledger",
        subtitle: "Account-level view of all posted activity for the period.",
        bullets: [
          "Each row is a chart-of-accounts line with opening balance, period debits and credits, and closing balance.",
          "Expand an account to drill into individual journal lines (date, journal no., memo, amounts).",
          "12000 and category inventory subs (12001–12007) show inventory asset movement; 500xx shows COGS debits.",
          "Use this report to reconcile why P&L or Balance Sheet totals changed.",
        ],
        hubAnchor: "reports",
      },
      profitLoss: {
        title: "Profit & Loss",
        subtitle:
          "Income and expense accounts for the selected period (accrual, from posted journals).",
        bullets: [
          "Income: credit minus debit on 400xx and related accounts.",
          "Expenses: debit minus credit : includes 500xx COGS, 610xx operating expenses, 630xx inventory write-offs, 50007 expired cost.",
          "Expand an account to see the journal lines that make up the balance.",
          "Unposted Transactions (pending purchases, expenses, invoice revenue) do not appear until posted.",
        ],
        hubAnchor: "cogs-faq",
      },
      balanceSheet: {
        title: "Balance Sheet",
        subtitle: "Assets, liabilities, and equity as of the selected date.",
        bullets: [
          "Current assets: Cash, Accounts receivable, and Other current assets (inventory, prepaid, and similar).",
          "Fixed assets show Property, plant & equipment (cost GL accounts 10001–10008) less accumulated depreciation (contra accounts 10051–10058), then net fixed assets.",
          "Post prior-system retained earnings to 32100 Retained Earnings via Chart of Accounts opening balance; Net income on the sheet is cumulative P&L since go-live.",
          "If inventory on hand (operational) and 12000 (financial) disagree, check for unposted purchases or timing of auto COGS.",
        ],
        hubAnchor: "inventory",
      },
      expenses: {
        title: "General expense register",
        subtitle:
          "Record operating costs; ledger updates when posted from Transactions.",
        bullets: [
          "Saving an expense creates a pending item on Transactions : it does not hit P&L or cash until posted.",
          "Typical post: Dr selected 610xx (or other expense account) / Cr cash or bank.",
          "Prepaid expenses follow a separate register; cash payments queue on Transactions, amortization posts on schedule.",
          "After posting, amounts appear on P&L under the expense account and in General Ledger.",
        ],
        hubAnchor: "posting",
      },
      payrollStatementInputs: {
        title: "Payroll statement inputs",
        subtitle:
          "Read-only year report of month payroll totals and posting status.",
        bullets: [
          "HR finalizes all staff rows, transfers salaries outside the system, then clicks Complete payout.",
          "Complete payout queues month accrual (Dr 620xx / Cr 20130) and payment (Dr 20130 / Cr bank) on Transactions.",
          "Finance posts accrual first, then payment; payment post creates cash outflow.",
          "This page lists each month in the reporting year — totals only, no per-staff detail.",
        ],
        hubAnchor: "posting",
      },
    },
  },
  my: {
    ui: {
      toggleEn: "English",
      toggleMy: "မြန်မာ",
      dontShowAgain: "ထပ်မပြပါနှင့်",
      close: "ပိတ်ရန်",
      fullGuide: "Accounting guide အပြည့်အစုံ",
      readMore: "Guide တွင် ဆက်ဖတ်ရန်",
      jumpNav: "ဤစာမျက်နှာတွင်",
      postingMatrixCaption:
        "Inventory event များတွင် stock သည် ချက်ချင်း update ဖြစ်သည်။ General Ledger သည် journal post လုပ်ပြီးမှ update ဖြစ်သည် (auto သို့မဟုတ် Transactions မှ)။",
    },
    hub: {
      title: "Accounting guide",
      subtitle:
        "DermaFairy သည် General Ledger၊ Profit & Loss နှင့် Balance Sheet သို့ မည်သို့ post လုပ်သည်ကို ရှင်းပြထားပါသည်။ ငွေပမာဏအားလုံးကို Myanmar Kyats (K) ဖြင့် ပြသထားပြီး account codes များသည် clinic chart of accounts အတိုင်း ဖြစ်ပါသည်။",
      sections: [
        {
          id: "overview",
          title: "Overview",
          paragraphs: [
            "DermaFairy သည် double-entry accounting သုံးပါသည် : posted journal တိုင်းတွင် debit နှင့် credit ညီမျှရပါမည်။",
            "Clinic သည် perpetual inventory model သုံးပါသည် : purchase post လုပ်သောအခါ stock ကို asset (12000 Inventory Asset နှင့် 12001–12007 subs) အဖြစ် capitalized လုပ်ပြီး treatment သို့မဟုတ် retail sale တွင် COGS (500xx) အဖြစ် expense လုပ်ကာ lost/ expired ဖြစ်ပါက write-off accounts သို့ post လုပ်ပါသည်။",
          ],
          bullets: [
            "12000 · Inventory Asset : Balance Sheet; purchase post တွင် တိုး၊ consumption/write-off တွင် လျော့",
            "500xx · Cost of Goods Sold : P&L; treatment use နှင့် retail/prescription sales",
            "63001 · Inventory Loss : P&L; damage, theft, spillage, count shrinkage",
            "50007 · Damage Cost (Expired) : P&L; expired stock dispose",
            "63002 · Office Use : P&L; internal/sample use",
            "45500 · Other Income : P&L; found stock (manual stock-in)",
            "20000 · Accounts Payable : Balance Sheet; credit purchases နှင့် consignment usage",
          ],
        },
        {
          id: "posting",
          title: "Ledger မည်သည့်အချိန်တွင် update ဖြစ်သနည်း?",
          paragraphs: [
            "Operational stock (batches/movements) သည် finance ထက် အရင် update ဖြစ်နိုင်ပါသည်။ Stock on hand ပြောင်းသော်လည်း Balance Sheet inventory balance မပြောင်းသေးပါက purchase သည် Transactions တွင် pending ဖြစ်နေနိုင်ပါသည်။",
          ],
          matrixHeaders: ["Event", "Stock", "General Ledger", "Who posts"],
          matrixRows: [
            {
              event: "Purchase receive (cash or credit)",
              stock: "Immediate",
              gl: "Pending on Transactions",
              who: "Accountant",
            },
            {
              event: "Consignment receive",
              stock: "Immediate",
              gl: "No inventory journal at receive",
              who: ":",
            },
            {
              event: "Treatment completed",
              stock: "Immediate",
              gl: "Auto : Dr 500xx COGS / Cr 120xx",
              who: "System",
            },
            {
              event: "Retail / prescription invoice paid",
              stock: "Immediate",
              gl: "Auto : Dr 500xx COGS / Cr 120xx (consignment: Cr 20000 AP)",
              who: "System",
            },
            {
              event: "Stock out / count-down adjustment",
              stock: "Immediate",
              gl: "Auto : Dr 50007 / 63001 / 63002 / Cr 120xx",
              who: "System",
            },
            {
              event: "Open-vial wastage",
              stock: "Immediate",
              gl: "Auto : Dr 50007 or 63001 / Cr 120xx",
              who: "System",
            },
            {
              event: "Expense saved",
              stock: ":",
              gl: "Pending on Transactions",
              who: "Accountant",
            },
            {
              event: "Invoice issued / payment collected",
              stock: ":",
              gl: "Pending on Transactions (revenue, AR, cash)",
              who: "Accountant",
            },
            {
              event: "Manual stock-in (found stock)",
              stock: "Immediate",
              gl: "Auto : Dr 12000 / Cr 45500",
              who: "System",
            },
            {
              event: "Payroll month accrual (HR complete payout)",
              stock: ":",
              gl: "Pending on Transactions : Dr 620xx / Cr 20130 Salaries Payable",
              who: "Accountant",
            },
            {
              event: "Payroll bank payment (HR complete payout)",
              stock: ":",
              gl: "Pending on Transactions : Dr 20130 / Cr bank",
              who: "Accountant",
            },
          ],
        },
        {
          id: "reports",
          title: "Reports : ချိတ်ဆက်မှု",
          paragraphs: [
            "Report သုံးမျိုးလုံးသည် posted၊ non-voided journal entry lines မှ ဖတ်ယူပါသည်။ journal မရှိသေးပါက report တွင် မပေါ်ပါ။",
          ],
          bullets: [
            "General Ledger : account အလိုက် opening၊ period activity၊ closing; journal lines ကြည့်ရန် expand လုပ်ပါ",
            "Profit & Loss : income နှင့် expense accounts (500xx COGS၊ 630xx write-offs၊ 610xx operating expenses ပါဝင်)",
            "Balance Sheet : asset၊ liability၊ equity; cumulative P&L net income က equity ထဲသို့ roll-in",
            "Cash movements : posted journals မှ cash/bank accounts (သီးခြား cash ledger မဟုတ်)",
          ],
        },
        {
          id: "cogs-faq",
          title: "COGS vs Inventory Loss vs Expired",
          paragraphs: [
            "COGS သည် revenue activity (treatment session သို့မဟုတ် product sale) တွင် stock consume လုပ်သောအခါသာ သုံးပါသည် : expired၊ damaged၊ internal-use အတွက် COGS မသုံးပါ။",
          ],
          bullets: [
            "COGS (500xx) : treatment သို့မဟုတ် paid invoice retail sale; inventory asset လျော့",
            "Inventory Loss (63001) : spillage, damage, theft, count shrinkage",
            "Damage Cost / Expired (50007) : expired stock dispose",
            "Office Use (63002) : internal/sample/staff use",
            "Retail sale : revenue သည် Transactions မှ post; product cost သည် invoice paid + stock deduct နှင့် auto COGS post",
          ],
        },
        {
          id: "inventory",
          title: "Inventory & purchases",
          paragraphs: [
            "Purchase receive လုပ်သောအခါ batches ချက်ချင်း ဖန်တီးပါသည်။ 12000 Inventory Asset capitalized လုပ်ရန် accountant သည် Transactions မှ post လုပ်ရပါမည် (Dr 12000 / Cr cash or 20000 AP)။",
            "Post မလုပ်မီ operational stock report တွင် quantity ပေါ်နိုင်သော်လည်း Balance Sheet inventory balance တွင် cost မပါသေးနိုင်ပါ။",
          ],
          bullets: [
            "Credit purchase post: Dr 12000 / Cr 20000 AP",
            "Cash purchase post: Dr 12000 / Cr cash/bank",
            "Consignment: receive တွင် 12000 မရှိ; use/sale တွင် COGS သည် 20000 AP ကို credit",
            "Supplier returns: Transactions queue : post လုပ်သောအခါ Dr 20000 AP / Cr 12000",
          ],
        },
      ],
    },
    pages: {
      transactions: {
        title: "Transactions : accounting queue",
        subtitle:
          "Pending billings များကို General Ledger သို့ post မလုပ်မီ review လုပ်ပါ။",
        bullets: [
          "Pending items : invoices, expenses, purchases, supplier payables, other income (draft journal preview ပါ)",
          "Post လုပ်ခြင်းဖြင့် balanced journal entries ဖန်တီးပါသည်",
          "Inventory purchases: stock receive ပြီးပြီ; Transactions မှ post လုပ်မှ 12000 Inventory Asset တွင် cost ပေါ်",
          "Retail invoices: revenue/cash ဤနေရာမှ; COGS သည် invoice paid + stock deduct နှင့် auto post",
          "Post ပြီးနောက် General Ledger သို့မဟုတ် P&L / Balance Sheet တွင် trace လုပ်ပါ",
        ],
        hubAnchor: "posting",
      },
      journalEntries: {
        title: "Journal Entries",
        subtitle:
          "Posted journals register : account balance တိုင်း၏ audit trail",
        bullets: [
          "Entries အများစု Transactions မှ : inventory COGS/adjustments သည် auto post (pending မရှိ)",
          "Row expand : debit/credit lines၊ source type",
          "Manual journals : accruals, corrections, period-end",
          "Treatment COGS void : treatment void consumption သုံး; journal reversal မသုံး",
        ],
        hubAnchor: "reports",
      },
      generalLedger: {
        title: "General Ledger",
        subtitle: "Posted activity အတွက် account-level view",
        bullets: [
          "Row တစ်ခုစီ : opening, period debits/credits, closing",
          "Account expand : journal lines (date, journal no., memo)",
          "12000/120xx : inventory asset; 500xx : COGS debits",
          "P&L / Balance Sheet totals ပြောင်းရခြင်း reconcile လုပ်ရန် သုံး",
        ],
        hubAnchor: "reports",
      },
      profitLoss: {
        title: "Profit & Loss",
        subtitle:
          "ရွေးချယ်ထားသော period အတွက် income နှင့် expense (posted journals)",
        bullets: [
          "Income: 400xx : credit minus debit",
          "Expenses: 500xx COGS, 610xx operating, 630xx write-offs, 50007 expired",
          "Account expand : journal lines",
          "Unposted Transactions : post မလုပ်မီ P&L တွင် မပေါ်",
        ],
        hubAnchor: "cogs-faq",
      },
      balanceSheet: {
        title: "Balance Sheet",
        subtitle: "ရွေးချယ်ထားသော date အတွက် assets, liabilities, equity",
        bullets: [
          "12000 Inventory Asset : purchase Transactions post လုပ်မှ တိုး",
          "20000 AP : supplier balances + consignment COGS accrual",
          "Equity : cumulative net income roll-in",
          "Operational stock vs 12000 မညီပါက unposted purchases စစ်ပါ",
        ],
        hubAnchor: "inventory",
      },
      expenses: {
        title: "General expense register",
        subtitle:
          "Operating costs မှတ်တမ်းတင် : Transactions post လုပ်မှ ledger update",
        bullets: [
          "Expense save : Transactions pending; P&L/cash မပြောင်းသေး",
          "Typical post: Dr 610xx / Cr cash or bank",
          "Prepaid : separate register; amortization schedule",
          "Post ပြီးနောက် P&L နှင့် General Ledger တွင် ပေါ်",
        ],
        hubAnchor: "posting",
      },
      payrollStatementInputs: {
        title: "Payroll statement inputs",
        subtitle:
          "နှစ်အလိုက် လစဉ် payroll စုစုပေါင်းနှင့် posting status ကြည့်ရန် (read-only)",
        bullets: [
          "HR သည် staff rows အားလုံး finalize လုပ်ပြီး ဘဏ်မှ လစာလွှဲပြီးနောက် Complete payout နှိပ်သည်",
          "Complete payout သည် month accrual (Dr 620xx / Cr 20130) နှင့် payment (Dr 20130 / Cr bank) ကို Transactions တွင် pending အဖြစ် ထည့်သည်",
          "Finance သည် accrual ကို ဦးစွာ post လုပ်ပြီး payment post — cash outflow ဖြစ်သည်",
          "ဤစာမျက်နှာတွင် နှစ်တစ်နှစ်လုံး လစဉ်စုစုပေါင်းသာ ပြသည် — staff တစ်ဦးချင်းမပါ",
        ],
        hubAnchor: "posting",
      },
    },
  },
};

export function getPageGuide(lang, pageId) {
  return FINANCE_GUIDE_I18N[lang]?.pages?.[pageId] ?? null;
}

export function getHubGuide(lang) {
  return FINANCE_GUIDE_I18N[lang]?.hub ?? FINANCE_GUIDE_I18N.en.hub;
}

export function getGuideUi(lang) {
  return FINANCE_GUIDE_I18N[lang]?.ui ?? FINANCE_GUIDE_I18N.en.ui;
}
