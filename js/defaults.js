const FALLBACK_EXPENSE_CATEGORY_NAMES = [
    "Nayara", "Driving", "Investment", "Loan Given", "Takeaway", "BDT_transfer",
    "Grocery", "Transport", "Shopping", "saving", "projucti/prologic", "Nayma",
    "Loan paid", "Medical", "Visa", "Paypal", "Entertainment", "other",
];

const FALLBACK_EARNING_SOURCE_NAMES = [
    "V1", "Nayma", "Prologic", "Projucti", "Loan taken", "Loan returned",
    "From Savings", "Other",
];

const DEFAULT_SPENDING_CATEGORIES = [
    { name: "Takeaway", potMax: 50, isRecurring: true, isFixedAmount: false, sortOrder: 1 },
    { name: "Grocery", potMax: 450, isRecurring: true, isFixedAmount: false, sortOrder: 2 },
    { name: "Shopping", potMax: 100, isRecurring: true, isFixedAmount: false, sortOrder: 3 },
    { name: "BDT_transfer", potMax: 225, isRecurring: true, isFixedAmount: true, sortOrder: 4 },
    { name: "Nayma", potMax: 500, isRecurring: true, isFixedAmount: true, sortOrder: 5 },
    { name: "Loan paid", potMax: 875, isRecurring: true, isFixedAmount: false, sortOrder: 6 },
    { name: "projucti/prologic", potMax: 20, isRecurring: true, isFixedAmount: false, sortOrder: 7 },
    { name: "Nayara", potMax: 0, isRecurring: false, isFixedAmount: false, sortOrder: 8 },
    { name: "Driving", potMax: 0, isRecurring: false, isFixedAmount: false, sortOrder: 9 },
    { name: "Investment", potMax: 0, isRecurring: false, isFixedAmount: false, sortOrder: 10 },
    { name: "Loan Given", potMax: 0, isRecurring: false, isFixedAmount: false, sortOrder: 11 },
    { name: "Transport", potMax: 0, isRecurring: false, isFixedAmount: false, sortOrder: 12 },
    { name: "saving", potMax: 0, isRecurring: false, isFixedAmount: false, sortOrder: 13 },
    { name: "Medical", potMax: 0, isRecurring: false, isFixedAmount: false, sortOrder: 14 },
    { name: "Visa", potMax: 0, isRecurring: false, isFixedAmount: false, sortOrder: 15 },
    { name: "Paypal", potMax: 0, isRecurring: false, isFixedAmount: false, sortOrder: 16 },
    { name: "Entertainment", potMax: 0, isRecurring: false, isFixedAmount: false, sortOrder: 17 },
    { name: "other", potMax: 0, isRecurring: false, isFixedAmount: false, sortOrder: 18 },
];

const DEFAULT_EARNING_CATEGORIES = [
    { name: "V1", defaultAmount: 4495.36, isRecurring: true, scheduledDay: 1, sortOrder: 1 },
    { name: "Nayma", defaultAmount: 0, isRecurring: false, sortOrder: 2 },
    { name: "Prologic", defaultAmount: 0, isRecurring: false, sortOrder: 3 },
    { name: "Projucti", defaultAmount: 0, isRecurring: false, sortOrder: 4 },
    { name: "Loan taken", defaultAmount: 0, isRecurring: false, sortOrder: 5 },
    { name: "Loan returned", defaultAmount: 0, isRecurring: false, sortOrder: 6 },
    { name: "From Savings", defaultAmount: 0, isRecurring: false, sortOrder: 7 },
    { name: "Other", defaultAmount: 0, isRecurring: false, sortOrder: 8 },
];
