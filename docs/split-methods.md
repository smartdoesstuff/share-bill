# Ways to split a bill

Notes on split models seen in other apps and in everyday life, and how each one is computed.
"In app" marks what share-bill supports today. Everything is computed in integer cents so shares always add up to the total.

## Basic

| Method | How it works | In app |
| --- | --- | --- |
| Equal | `total / n`; the leftover cents go to the first people | Yes (per item) |
| Item and bill discounts | Percent or fixed amount per item and on the whole bill, shared in proportion to consumption | Yes |
| By item | Each item is split only between the people who had it | Yes |
| Exact amounts | Each person's amount is typed in; the sum must equal the total | No |
| Percentages | Each person pays `p%`; percentages must sum to 100 | No |
| Shares / weights | Each person has `w` shares and pays `total * w / sum(w)`. Adult = 2, child = 1; nights stayed; room size | No |
| Equal with adjustments | Subtract or add a fixed amount for some people, split the rest equally | No |
| Several payers | One expense paid in parts by different people; each part is a credit | Yes |

## Proportional

| Method | How it works |
| --- | --- |
| By income | Ratio of (preferably post-tax) income, e.g. 500:1000 → 1:3 / 2:3. Often applied only to essentials, with fun spending split 50/50 |
| By consumption | Metered usage (electricity, water, data), kilometres, nights, days present |
| By room size / features | Rent split by area, plus a premium for a private bathroom or balcony |
| Tax, tip and service charge | Allocated in proportion to each person's pre-tax subtotal, not equally (VAT 7%, service charge 10%). In app: yes |

## Social rules

| Method | How it works |
| --- | --- |
| Treat the guest of honour | Their share is divided among the others |
| Sponsor / company subsidy | A third party pays a fixed amount or percentage; the remainder is split |
| Drinkers vs non-drinkers | Two pools: shared food splits across everyone, alcohol only across drinkers |
| Cover up to a cap | Everyone pays up to a ceiling, whoever ordered more pays the excess |
| Couples as one unit | A couple counts as 2 shares (or 1 account) |
| Take turns | No ledger: whoever's turn it is pays; evens out over time |
| Roulette | Random payer (everyone's card in a pile, or dice); fair in expectation |
| Pot / kitty (กองกลาง) | Everyone puts in equal money up front, expenses come out of the pot, the leftover is refunded equally |
| Round up | The payer rounds each share up to a clean number to avoid change |

## Game-theory and algorithmic

| Method | How it works |
| --- | --- |
| Shapley value | For a shared cost that grows in steps (taxi with different drop-offs, airport runway): each person pays the average of their marginal cost over all arrival orders. Whoever gets off first pays least |
| Envy-free rent division | Assign rooms and prices so nobody would swap with anyone else (e.g. Spliddit). Each person bids a value per room, prices are tuned so everyone prefers their own room |
| Debt simplification | Net every balance, then match biggest debtor with biggest creditor to minimise transfers. Optimal minimisation is NP-hard; the greedy match is at most `n-1` transfers (used by share-bill) |

## Over time and money

| Method | How it works |
| --- | --- |
| Recurring / subscriptions | Shared plan (Netflix, rent, internet) split every month, optionally by joined date |
| Instalments | A large purchase split across months, each instalment settled separately |
| Multi-currency | Convert each expense at the rate of its date, or at a rate fixed for the trip |
| Partial settlement | Pay back part of a debt; the remainder stays open |

## Sources

Income-based, consumption-based and lifestyle-adjusted splits are from guides such as
[Jake Lee](https://jakelee.co.uk/using-income-ratio-spreadsheet-split-bills/),
[Partly](https://www.bepartly.com/blog/how-to-split-bills-proportionally-when-incomes-differ-a-fair-guide-for-couples)
and [Uneven Bill Split Calculator](https://expensessplit.com/uneven-bill-split-calculator.html).
Equal / exact / percentage / shares splits are from descriptions of Splitwise and
[Tricount](https://tricount.com/blog/expense-sharing-apps-what-to-look-for).
Shapley value, envy-free rent division and debt simplification are standard results from
cooperative game theory and fair division; they were not looked up in this research pass.
