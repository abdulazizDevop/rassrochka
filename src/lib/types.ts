export type ContractStatus =
  | 'В процессе'
  | 'Погашен'
  | 'Досрочно погашен'
  | 'Просрочен'
  | 'Списан'
  | 'На проверке';

export type PaymentStatus =
  | 'Погашен'
  | 'Не оплачено'
  | 'Оплачено'
  | 'Новый договор';

export interface Client {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string;
  phone: string;
  address?: string;
  contractsCount: number;
  passportPhotos?: string[]; // base64 data URLs
}

export interface Contract {
  id: string;
  number: number;
  createdAt: string;
  endDate: string;
  clientId: string;
  clientName: string;
  product: string;
  phone: string;
  status: ContractStatus;
  remainingDebt: number;
  monthlyPayment: number;
  paymentStatus: PaymentStatus;
  cost: number;
  purchaseCost?: number;
  markup: number;
  firstPayment: number;
  months: number;
  source: string;
  tariff: string;
  account: string;
  startDate: string;
  payDay: number;
  comment?: string;
  approved?: boolean;
}

export interface Partner {
  id: string;
  name: string;
  phone: string;
  balance: number;
}

export interface Employee {
  id: string;
  name: string;
  role: string;
  phone: string;
  login: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
}

export interface User {
  login: string;
  name: string;
  role: string;
}

export type UserRole = 'admin' | 'viewer';

export interface UserAccount {
  login: string;
  password: string;
  name: string;
  role: UserRole;
}

export type AccountType = 'нал' | 'безнал';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  /** Breakdown sub-balances */
  orgBalance?: number;
  investorsBalance?: number;
  investPoolBalance?: number;
  balance: number;
}

export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  comment: string;
  date: string;
}

export type LedgerOperationType =
  | 'Пополнение'
  | 'Списание'
  | 'Перевод между счетами'
  | 'Платёж клиента'
  | 'Новый договор';

export interface LedgerEntry {
  id: string;
  date: string;
  user: string;
  operation: LedgerOperationType | string;
  clientContract?: string;
  product?: string;
  amount: number;
  accountId: string;
  accountName: string;
  note: string;
  isOperationalExpense?: boolean;
}

export interface Investor {
  id: string;
  name: string;
  phone?: string;
  invested: number;
  available: number;
  orgProfit: number;
  investorProfit: number;
  accountId?: string;
  accountName?: string;
  accountType?: 'нал' | 'безнал';
  profitPercent?: number;     // % прибыли
  periodMonths?: number;      // период (мес), если не задан — «в месяц»
  periodLabel?: string;       // «в месяц» | «за X мес.»
}

export interface InvestPool {
  id: string;
  name: string;
  totalAmount: number;
  available: number;
  investors: string[];
}

export type AuditSection =
  | 'Договоры'
  | 'Клиенты'
  | 'Платежи'
  | 'Баланс'
  | 'Инвестиции'
  | 'Настройки'
  | 'Сотрудники'
  | 'Продукты';

export interface AppSettings {
  minFirstPaymentPercent: number;
  minFirstPaymentAmount: number;
  minMonths: number;
  maxMonths: number;
  daysUntilOverdue: number;
  enableSecurityDepartment: boolean;
  printFormat: 'A4' | 'Терминал';
  companyName: string;
  paymentMethods?: string[];
}

export interface Tariff {
  id: string;
  name: string;
  markup: number; // percent
  isDefault: boolean;
}

export interface BackupEntry {
  id: string;
  createdAt: string;
  size: string;
  note: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string; // "12.03.2026 17:26:31"
  employee: string;
  action: 'Создание' | 'Редактирование' | 'Удаление';
  section: AuditSection;
  entity: string;
  details: string;
}
