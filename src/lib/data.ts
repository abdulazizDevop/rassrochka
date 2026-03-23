import { Client, Contract, Partner, Employee, Product, Account, LedgerEntry, Investor, InvestPool } from './types';

export const MOCK_CLIENTS: Client[] = [
  { id: '1', firstName: 'a111', lastName: 'a111', middleName: 'a111', phone: '+7 (222) 222-22-22', contractsCount: 1 },
  { id: '2', firstName: 'a11', lastName: 'a11', middleName: 'a11', phone: '+7 (222) 222-22-22', contractsCount: 1 },
  { id: '3', firstName: 'a1', lastName: 'a1', middleName: 'a1', phone: '+7 (111) 111-11-1', contractsCount: 1 },
  { id: '4', firstName: 'a222', lastName: 'a222', middleName: 'a222', phone: '+7 (555) 555-55-55', contractsCount: 1 },
  { id: '5', firstName: 'a22', lastName: 'a22', middleName: 'a22', phone: '+7 (333) 333-33-33', contractsCount: 1 },
  { id: '6', firstName: 'a2', lastName: 'a2', middleName: 'a2', phone: '+7 (222) 222-22-22', contractsCount: 1 },
  { id: '7', firstName: 'нуцалов', lastName: 'шамиль', middleName: '', phone: '+7 (928) 504-76-97', contractsCount: 1 },
  { id: '8', firstName: 'пул1', lastName: 'пул1', middleName: 'пул1', phone: '+7 (555) 555-55-55', contractsCount: 1 },
  { id: '9', firstName: 'пул2', lastName: 'пул2', middleName: 'пул2', phone: '+7 (666) 666-66-66', contractsCount: 1 },
  { id: '10', firstName: 'пул3', lastName: 'пул3', middleName: 'пул3', phone: '+7 (777) 777-77-77', contractsCount: 1 },
  { id: '11', firstName: 'пул4', lastName: 'пул4', middleName: 'пул4', phone: '+7 (926) 869-61-69', address: 'Хазар ул. Школьная 4', contractsCount: 1 },
  { id: '12', firstName: 'старый', lastName: 'старый', middleName: '', phone: '+7 (444) 444-44-44', contractsCount: 1 },
];

export const MOCK_CONTRACTS: Contract[] = [
  { id: '1', number: 1, createdAt: '03.08.2025', endDate: '03.01.2026', clientId: '12', clientName: 'старый', product: 'Холодильник', phone: '+7 (444) 444-44-44', status: 'Погашен', remainingDebt: 0, monthlyPayment: 7800, paymentStatus: 'Погашен', cost: 46800, markup: 0, firstPayment: 0, months: 6, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '03.08.2025', payDay: 3 },
  { id: '2', number: 2, createdAt: '03.09.2025', endDate: '03.06.2026', clientId: '4', clientName: 'a222 a222 a222', product: 'Ковер', phone: '+7 (555) 555-55-55', status: 'Просрочен', remainingDebt: 234000, monthlyPayment: 26000, paymentStatus: 'Не оплачено', cost: 156000, markup: 0, firstPayment: 0, months: 9, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '03.09.2025', payDay: 3 },
  { id: '3', number: 3, createdAt: '03.11.2025', endDate: '03.06.2026', clientId: '1', clientName: 'a111 a111 a111', product: 'Телевизор', phone: '+7 (222) 222-22-22', status: 'Списан', remainingDebt: 4287, monthlyPayment: 18571, paymentStatus: 'Оплачено', cost: 130000, markup: 0, firstPayment: 0, months: 7, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '03.11.2025', payDay: 3 },
  { id: '4', number: 4, createdAt: '02.01.2026', endDate: '02.04.2026', clientId: '9', clientName: 'пул2 пул2 пул2', product: 'айфон', phone: '+7 (666) 666-66-66', status: 'Просрочен', remainingDebt: 85800, monthlyPayment: 42900, paymentStatus: 'Оплачено', cost: 85800, markup: 0, firstPayment: 0, months: 2, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '02.01.2026', payDay: 2 },
  { id: '5', number: 5, createdAt: '13.02.2026', endDate: '13.08.2026', clientId: '7', clientName: 'нуцалов шамиль', product: 'телефон айфон', phone: '+7 (928) 504-76-97', status: 'В процессе', remainingDebt: 58500, monthlyPayment: 19500, paymentStatus: 'Оплачено', cost: 117000, markup: 0, firstPayment: 0, months: 6, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '13.02.2026', payDay: 13 },
  { id: '6', number: 6, createdAt: '03.03.2026', endDate: '03.09.2026', clientId: '3', clientName: 'a1 a1 a1', product: 'Айфон', phone: '+7 (111) 111-11-1', status: 'В процессе', remainingDebt: 91000, monthlyPayment: 15167, paymentStatus: 'Новый договор', cost: 91000, markup: 0, firstPayment: 0, months: 6, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '03.03.2026', payDay: 5 },
  { id: '7', number: 7, createdAt: '03.03.2026', endDate: '03.11.2026', clientId: '6', clientName: 'a2 a2 a2', product: 'Айфон', phone: '+7 (222) 222-22-22', status: 'В процессе', remainingDebt: 91000, monthlyPayment: 11375, paymentStatus: 'Новый договор', cost: 91000, markup: 0, firstPayment: 0, months: 8, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '03.03.2026', payDay: 5 },
  { id: '8', number: 8, createdAt: '03.03.2026', endDate: '03.12.2026', clientId: '2', clientName: 'a11 a11 a11', product: 'Айфон', phone: '+7 (222) 222-22-22', status: 'В процессе', remainingDebt: 195000, monthlyPayment: 21667, paymentStatus: 'Новый договор', cost: 195000, markup: 0, firstPayment: 0, months: 9, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '03.03.2026', payDay: 5 },
  { id: '9', number: 9, createdAt: '03.03.2026', endDate: '03.06.2026', clientId: '5', clientName: 'a22 a22 a22', product: 'Айфон', phone: '+7 (333) 333-33-33', status: 'В процессе', remainingDebt: 195000, monthlyPayment: 65000, paymentStatus: 'Новый договор', cost: 195000, markup: 0, firstPayment: 0, months: 3, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '03.03.2026', payDay: 5 },
  { id: '10', number: 10, createdAt: '03.03.2026', endDate: '03.06.2026', clientId: '8', clientName: 'пул1 пул1 пул1', product: 'Айфон', phone: '+7 (555) 555-55-55', status: 'В процессе', remainingDebt: 25000, monthlyPayment: 13000, paymentStatus: 'Новый договор', cost: 25000, markup: 0, firstPayment: 0, months: 3, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '03.03.2026', payDay: 5 },
  { id: '11', number: 11, createdAt: '03.03.2026', endDate: '03.06.2026', clientId: '10', clientName: 'пул3 пул3 пул3', product: 'Ноутбук', phone: '+7 (777) 777-77-77', status: 'Досрочно погашен', remainingDebt: 0, monthlyPayment: 32500, paymentStatus: 'Погашен', cost: 97500, markup: 0, firstPayment: 0, months: 3, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '03.03.2026', payDay: 5 },
  { id: '12', number: 12, createdAt: '03.03.2026', endDate: '03.06.2026', clientId: '11', clientName: 'пул4 пул4 пул4', product: 'Смартфон', phone: '+7 (999) 999-99-99', status: 'Досрочно погашен', remainingDebt: 0, monthlyPayment: 18571, paymentStatus: 'Погашен', cost: 130000, markup: 0, firstPayment: 0, months: 7, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '03.03.2026', payDay: 5 },
  { id: '13', number: 13, createdAt: '03.03.2026', endDate: '03.06.2026', clientId: '7', clientName: 'нуцалов шамиль', product: 'Планшет', phone: '+7 (926) 869-61-69', status: 'Досрочно погашен', remainingDebt: 0, monthlyPayment: 32500, paymentStatus: 'Погашен', cost: 97500, markup: 0, firstPayment: 0, months: 3, source: 'Баланс', tariff: 'стандарт', account: 'общий', startDate: '03.03.2026', payDay: 5 },
];

export const MOCK_PRODUCTS: Product[] = [
  { id: '1', name: 'iPhone 15 Pro', category: 'Телефоны', price: 130000 },
  { id: '2', name: 'Samsung Galaxy S24', category: 'Телефоны', price: 95000 },
  { id: '3', name: 'MacBook Air', category: 'Ноутбуки', price: 195000 },
  { id: '4', name: 'Холодильник Samsung', category: 'Техника', price: 85000 },
  { id: '5', name: 'Телевизор LG 55"', category: 'Техника', price: 75000 },
];

export const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Администратор', role: 'Администратор', phone: '+7 (900) 000-00-01', login: 'admin' },
  { id: '2', name: 'Менеджер 1', role: 'Менеджер', phone: '+7 (900) 000-00-02', login: 'manager1' },
];

export const MOCK_PARTNERS: Partner[] = [
  { id: '1', name: 'Партнер 1', phone: '+7 (900) 100-00-01', balance: 50000 },
  { id: '2', name: 'Партнер 2', phone: '+7 (900) 100-00-02', balance: 120000 },
];

export const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'cash',
    name: 'общий',
    type: 'нал',
    balance: 3945563,
    orgBalance: 0,
    investorsBalance: 2391093,
    investPoolBalance: 1554471,
  },
  {
    id: 'bank_main',
    name: 'Средства в банке',
    type: 'безнал',
    balance: 0,
    orgBalance: 0,
    investorsBalance: 0,
    investPoolBalance: 0,
  },
];

export const MOCK_LEDGER: LedgerEntry[] = [
  { id: '1', date: '10.03.2026 13:53', user: 'Админ', operation: 'Отмена: Платёж клиента', clientContract: 'пулл пулл пулл — договор #16', product: 'Кухня', amount: 0, accountId: 'cash', accountName: 'Долг клиента', note: 'Долг закрыт' },
  { id: '2', date: '10.03.2026 13:53', user: 'Админ', operation: 'Отмена: Перевод денег пула', clientContract: 'пулл пулл пулл — договор #16', product: 'Кухня', amount: 20000, accountId: 'cash', accountName: 'общий', note: 'Удаление платежа #18: о переносе платежа в пул' },
  { id: '3', date: '10.03.2026 12:56', user: 'Админ', operation: 'Перевод денег пула', clientContract: 'пул4 пул4 пул4 — договор #17', product: 'стол', amount: 150000, accountId: 'cash', accountName: 'общий', note: 'Перенос первого взноса по договору #17 в пул 2' },
  { id: '4', date: '10.03.2026 12:56', user: 'Админ', operation: 'Платёж клиента', clientContract: 'пул4 пул4 пул4 — договор #17', product: 'стол', amount: 150000, accountId: 'cash', accountName: 'общий', note: 'Первый взнос по договору' },
  { id: '5', date: '10.03.2026 12:56', user: 'Админ', operation: 'Новый договор', clientContract: 'пул4 пул4 пул4 — договор #17', product: 'стол', amount: 345000, accountId: 'cash', accountName: 'Долг клиента', note: 'Создание договора с пул4 пул4 (#17) · стол · стоим. 345 000 ₽ = 300 000 ₽ тс + 45 000 ₽ наценка' },
  { id: '6', date: '10.03.2026 12:56', user: 'Админ', operation: 'Перевод денег пула', clientContract: 'пул4 пул4 пул4 — договор #17', product: 'стол', amount: 300000, accountId: 'cash', accountName: 'общий', note: 'Покрытие покупки товара #2' },
  { id: '7', date: '10.03.2026 12:56', user: 'Админ', operation: 'Отмена: ContractReserveCash', clientContract: 'пул4 пул4 пул4 — договор #17', product: 'стол', amount: 300000, accountId: 'cash', accountName: 'общий', note: 'Разморожено по договору' },
  { id: '8', date: '10.03.2026 12:56', user: 'Админ', operation: 'Отмена: ContractReservePool', clientContract: 'пул4 пул4 пул4 — договор #17', product: 'стол', amount: 300000, accountId: 'bank_main', accountName: 'Обязательство: ааа ааа ааа', note: 'Разморожено по договору' },
  { id: '9', date: '10.03.2026 12:56', user: 'Админ', operation: 'ContractReservePool', clientContract: 'пул4 пул4 пул4 — договор #17', product: 'стол', amount: 300000, accountId: 'cash', accountName: 'Счет резерва', note: 'Заморожено по договору (пул)' },
  { id: '10', date: '10.03.2026 12:56', user: 'Админ', operation: 'ContractReserveCash', clientContract: 'пул4 пул4 пул4 — договор #17', product: 'стол', amount: 300000, accountId: 'cash', accountName: 'Счет резерва', note: 'Заморожено по договору (касса)' },
  { id: '11', date: '10.03.2026 03:00', user: 'Админ', operation: 'Перевод денег пула', clientContract: 'пулл пулл пулл — договор #16', product: 'Кухня', amount: 10000, accountId: 'cash', accountName: 'общий', note: 'Перенос платежа #22 в пул' },
  { id: '12', date: '10.03.2026 03:00', user: 'Админ', operation: 'Платёж клиента', clientContract: 'пулл пулл пулл — договор #16', product: 'Кухня', amount: 10000, accountId: 'cash', accountName: 'общий', note: 'Платеж #22 по договору пулл пулл (#16)' },
  { id: '13', date: '10.03.2026 03:00', user: 'Админ', operation: 'Перевод денег пула', clientContract: 'пулл пулл пулл — договор #16', product: 'Кухня', amount: 20000, accountId: 'cash', accountName: 'общий', note: 'Перенос платежа #21 в пул' },
  { id: '14', date: '10.03.2026 03:00', user: 'Админ', operation: 'Платёж клиента', clientContract: 'пулл пулл пулл — договор #16', product: 'Кухня', amount: 20000, accountId: 'cash', accountName: 'общий', note: 'Платеж #21 по договору пулл пулл (#16)' },
];

export const MOCK_INVESTORS: Investor[] = [
  { id: '1', name: 'a1', invested: 1000000, available: 0, orgProfit: 42900, investorProfit: 42900 },
  { id: '2', name: 'a2', invested: 500000, available: 0, orgProfit: 17482, investorProfit: 26222 },
  { id: '3', name: 'a3', invested: 1000000, available: 0, orgProfit: 0, investorProfit: 0 },
  { id: '4', name: 'шамиль', invested: 1000000, available: 0, orgProfit: 0, investorProfit: 0 },
  { id: '5', name: 'шамиль1', invested: 500000, available: 0, orgProfit: 0, investorProfit: 0 },
  { id: '6', name: 'шамиль2', invested: 300000, available: 0, orgProfit: 0, investorProfit: 0 },
];

export const MOCK_INVEST_POOLS: InvestPool[] = [
  { id: '1', name: 'Пул 1', totalAmount: 1500000, available: 800000, investors: ['a1', 'a2'] },
  { id: '2', name: 'Пул 2', totalAmount: 2000000, available: 1200000, investors: ['a3', 'шамиль'] },
];
