'use client';
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Contract, Client, Product, Account, Transfer, LedgerEntry, Investor, InvestPool, AuditLogEntry, AppSettings, Tariff, BackupEntry, UserAccount, UserRole } from '@/lib/types';

interface AppContextType {
  contracts: Contract[];
  clients: Client[];
  products: Product[];
  accounts: Account[];
  transfers: Transfer[];
  ledger: LedgerEntry[];
  investors: Investor[];
  investPools: InvestPool[];
  auditLog: AuditLogEntry[];
  settings: AppSettings;
  tariffs: Tariff[];
  backups: BackupEntry[];
  isLoggedIn: boolean;
  hydrated: boolean;
  currentUser: UserAccount | null;
  users: UserAccount[];
  login: (username: string, password: string) => boolean;
  loginWithApi: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
    updateUser: (login: string, updates: Partial<Pick<UserAccount, 'name' | 'password'>>) => void;
    updateUserViaApi: (login: string, newPassword: string) => Promise<boolean>;
    updateUserFull: (login: string, newLogin?: string, newPassword?: string, currentPassword?: string, skipCurrentPasswordCheck?: boolean) => Promise<{ ok: boolean; error?: string; newLogin?: string }>;
    addUserViaApi: (login: string, password: string, name: string, role: UserRole) => Promise<{ ok: boolean; error?: string }>;
    deleteUserViaApi: (login: string) => Promise<{ ok: boolean; error?: string }>;
    refreshUsers: () => Promise<void>;
  addContract: (contract: Contract) => Promise<boolean>;
  deleteContract: (id: string) => void;
  addClient: (client: Client) => Promise<boolean>;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  updateContract: (id: string, updates: Partial<Contract>) => void;
  transferBetweenAccounts: (fromId: string, toId: string, amount: number, comment: string) => boolean;
  depositAccount: (accountId: string, amount: number, note: string) => void;
  withdrawAccount: (accountId: string, amount: number, note: string, isOperational: boolean) => boolean;
  addAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
    addInvestor: (investor: Investor, depositAmount?: number) => Promise<boolean>;
  deleteInvestor: (id: string) => void;
  addAuditEntry: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'employee'>) => void;
  clearAuditLog: () => void;
  clearOperationalExpenses: () => void;
  deleteLedgerEntry: (id: string) => void;
  clearAllBusinessData: () => Promise<void>;
  updateSettings: (updates: Partial<AppSettings>) => void;
  addTariff: (tariff: Tariff) => void;
  updateTariff: (id: string, updates: Partial<Tariff>) => void;
  deleteTariff: (id: string) => void;
  addProduct: (product: Product) => void;
  deleteProduct: (id: string) => void;
  createBackup: () => void;
  deleteBackup: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

const DEFAULT_SETTINGS: AppSettings = {
  minFirstPaymentPercent: 25,
  minFirstPaymentAmount: 0,
  minMonths: 1,
  maxMonths: 9,
  daysUntilOverdue: 4,
  enableSecurityDepartment: false,
  printFormat: 'A4',
  companyName: 'AkhmadPay',
  paymentMethods: ['Наличка', 'Сбербанк', 'Тинькофф'],
  contractStatuses: ['В процессе', 'Погашен', 'Досрочно погашен', 'Просрочен', 'Списан', 'На проверке'],
  paymentStatuses: ['Погашен', 'Не оплачено', 'Оплачено', 'Новый договор'],
};

function nowStr() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
}

function nowTimestamp() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [investPools, setInvestPools] = useState<InvestPool[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [backups, setBackups] = useState<BackupEntry[]>([]);

  // Helper: persist to API with error logging and optional state rollback
  const apiCall = useCallback(async (url: string, options: RequestInit) => {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        console.error(`API error ${res.status} ${options.method ?? 'GET'} ${url}:`, text);
      }
      return res;
    } catch (err) {
      console.error(`API fetch failed ${options.method ?? 'GET'} ${url}:`, err);
      return null;
    }
  }, []);

  // Reload all data from DB — used on mount and can be called after suspected inconsistency
  const reloadFromDb = useCallback(async () => {
    try {
      const res = await fetch('/api/data');
      if (!res.ok) {
        console.error('Failed to load data from API, status:', res.status);
        return;
      }
      const data = await res.json();
      if (!data) return;
      if (data.clients) setClients(data.clients); else setClients([]);
      if (data.contracts) setContracts(data.contracts); else setContracts([]);
      if (data.accounts) setAccounts(data.accounts);
      if (data.ledger) setLedger(data.ledger); else setLedger([]);
      if (data.investors) setInvestors(data.investors); else setInvestors([]);
      if (data.investPools) setInvestPools(data.investPools); else setInvestPools([]);
      if (data.transfers) setTransfers(data.transfers); else setTransfers([]);
      if (data.auditLog) setAuditLog(data.auditLog); else setAuditLog([]);
      if (data.settings) setSettings(prev => ({ ...prev, ...data.settings }));
      if (data.tariffs) setTariffs(data.tariffs); else setTariffs([]);
      if (data.products) setProducts(data.products); else setProducts([]);
    } catch (err) {
      console.error('Failed to reload data from DB:', err);
    }
  }, []);

  // Load all data from database on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const session = localStorage.getItem('bp_session') === '1';
    if (session) {
      setIsLoggedIn(true);
      try {
        const s = localStorage.getItem('bp_user');
        if (s) setCurrentUser(JSON.parse(s) as UserAccount);
      } catch { /* ignore */ }
    }

    reloadFromDb().finally(() => setHydrated(true));
  }, [reloadFromDb]);

  const addAuditEntry = useCallback((entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'employee'>) => {
    const full: AuditLogEntry = {
      ...entry,
      id: String(Date.now()),
      timestamp: nowTimestamp(),
      employee: currentUser?.name ?? 'Система',
    };
    setAuditLog(prev => [full, ...prev]);
    apiCall('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(full),
    });
  }, [currentUser, apiCall]);

  const clearAuditLog = useCallback(() => {
    setAuditLog([]);
    apiCall('/api/audit', { method: 'DELETE' });
  }, [apiCall]);

  // Removes ALL ledger entries flagged as operational expenses and refunds the
  // accounts they were withdrawn from (since each was a withdrawAccount call).
  const clearOperationalExpenses = useCallback(() => {
    setLedger(prev => {
      const opEntries = prev.filter(e => e.isOperationalExpense);
      if (opEntries.length === 0) return prev;
      // Refund balances
      const refundByAccount: Record<string, number> = {};
      for (const e of opEntries) {
        if (!e.accountId) continue;
        refundByAccount[e.accountId] = (refundByAccount[e.accountId] || 0) + e.amount;
      }
      setAccounts(accs => accs.map(a => refundByAccount[a.id]
        ? { ...a, balance: a.balance + refundByAccount[a.id] }
        : a
      ));
      // Persist account refunds
      for (const [accId, delta] of Object.entries(refundByAccount)) {
        setAccounts(current => {
          const acc = current.find(a => a.id === accId);
          if (acc) {
            apiCall('/api/accounts', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: accId, balance: acc.balance }),
            });
          }
          return current;
        });
      }
      return prev.filter(e => !e.isOperationalExpense);
    });
    apiCall('/api/ledger?operationalOnly=1', { method: 'DELETE' });
  }, [apiCall]);

  const deleteLedgerEntry = useCallback((id: string) => {
    setLedger(prev => {
      const entry = prev.find(e => e.id === id);
      if (!entry) return prev;
      // If this was a withdrawal/operational expense, refund the account
      if (entry.isOperationalExpense && entry.accountId) {
        setAccounts(accs => accs.map(a =>
          a.id === entry.accountId ? { ...a, balance: a.balance + entry.amount } : a
        ));
        setAccounts(current => {
          const acc = current.find(a => a.id === entry.accountId);
          if (acc) {
            apiCall('/api/accounts', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: entry.accountId, balance: acc.balance }),
            });
          }
          return current;
        });
      }
      return prev.filter(e => e.id !== id);
    });
    apiCall(`/api/ledger?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, [apiCall]);

  // Wipe all business data — contracts, clients, ledger, investors, pools,
  // and reset account balances to 0. Used by admins to clear test data.
  const clearAllBusinessData = useCallback(async () => {
    // Delete each contract on the backend; cascades its ledger entries
    const existingContracts = await fetch('/api/data').then(r => r.ok ? r.json() : null).catch(() => null);
    if (existingContracts) {
      for (const c of existingContracts.contracts ?? []) {
        await apiCall(`/api/contracts?id=${encodeURIComponent(c.id)}`, { method: 'DELETE' });
      }
      for (const cl of existingContracts.clients ?? []) {
        await apiCall(`/api/clients?id=${encodeURIComponent(cl.id)}`, { method: 'DELETE' });
      }
      for (const inv of existingContracts.investors ?? []) {
        await apiCall(`/api/investors?id=${encodeURIComponent(inv.id)}`, { method: 'DELETE' });
      }
      for (const acc of existingContracts.accounts ?? []) {
        await apiCall('/api/accounts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: acc.id, balance: 0, orgBalance: 0, investorsBalance: 0, investPoolBalance: 0 }),
        });
      }
    }
    // Clear client-side state
    setContracts([]);
    setClients([]);
    setLedger([]);
    setInvestors([]);
    setInvestPools([]);
    setTransfers([]);
    setAccounts(prev => prev.map(a => ({ ...a, balance: 0, orgBalance: 0, investorsBalance: 0, investPoolBalance: 0 })));
  }, [apiCall]);

  const login = useCallback((username: string, password: string) => {
    const found = users.find(u => u.login === username && u.password === password);
    if (found) { setIsLoggedIn(true); setCurrentUser(found); return true; }
    return false;
  }, [users]);

    const loginWithApi = useCallback(async (username: string, password: string): Promise<boolean> => {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: username, password }),
      });
      if (!res.ok) return false;
      const user = await res.json() as UserAccount;
        const fullUser = { ...user, password };
        setIsLoggedIn(true);
        setCurrentUser(fullUser);
        if (typeof window !== 'undefined') {
          localStorage.setItem('bp_session', '1');
          localStorage.setItem('bp_user', JSON.stringify(fullUser));
        }
      // Sync all users from DB
      try {
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const allUsers = await usersRes.json() as Omit<UserAccount, 'password'>[];
          setUsers(allUsers.map(u => ({ ...u, password: u.login === username ? password : '' })));
        }
      } catch { /* ignore */ }
      return true;
    }, []);

  const updateUserViaApi = useCallback(async (loginStr: string, newPassword: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginStr, newPassword }),
      });
      if (!res.ok) return false;
      setUsers(prev => prev.map(u => u.login === loginStr ? { ...u, password: newPassword } : u));
      return true;
    } catch {
      return false;
    }
  }, []);

  const logout = useCallback(() => {
    setIsLoggedIn(false);
    setCurrentUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('bp_session');
      localStorage.removeItem('bp_user');
    }
  }, []);

    const updateUser = useCallback((login: string, updates: Partial<Pick<UserAccount, 'name' | 'password'>>) => {
      setUsers(prev => prev.map(u => u.login === login ? { ...u, ...updates } : u));
      setCurrentUser(prev => prev?.login === login ? { ...prev, ...updates } : prev);
    }, []);

    const updateUserFull = useCallback(async (loginStr: string, newLogin?: string, newPassword?: string, currentPassword?: string, skipCurrentPasswordCheck?: boolean): Promise<{ ok: boolean; error?: string; newLogin?: string }> => {
      try {
        const body: Record<string, unknown> = { login: loginStr };
        if (newLogin && newLogin !== loginStr) body.newLogin = newLogin;
        if (newPassword) body.newPassword = newPassword;
        if (currentPassword !== undefined) body.currentPassword = currentPassword;
        if (skipCurrentPasswordCheck) body.skipCurrentPasswordCheck = true;
        const res = await fetch('/api/users', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({})) as { error?: string };
          return { ok: false, error: data.error ?? 'Ошибка сохранения' };
        }
        const updated = await res.json() as { login: string };
        const finalLogin = updated.login;
        setUsers(prev => prev.map(u => u.login === loginStr ? { ...u, login: finalLogin, ...(newPassword ? { password: newPassword } : {}) } : u));
        setCurrentUser(prev => {
          if (!prev) return prev;
          if (prev.login === loginStr) return { ...prev, login: finalLogin, ...(newPassword ? { password: newPassword } : {}) };
          return prev;
        });
        return { ok: true, newLogin: finalLogin };
      } catch {
        return { ok: false, error: 'Ошибка соединения' };
      }
    }, []);

  const addUserViaApi = useCallback(async (loginStr: string, password: string, name: string, role: UserRole): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginStr, password, name, role }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        return { ok: false, error: data.error ?? 'Ошибка создания' };
      }
      const created = await res.json() as { login: string; name: string; role: string };
      setUsers(prev => [...prev, { login: created.login, name: created.name, role: created.role as UserRole, password: '' }]);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Ошибка соединения' };
    }
  }, []);

  const deleteUserViaApi = useCallback(async (loginStr: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const res = await fetch(`/api/users?login=${encodeURIComponent(loginStr)}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        return { ok: false, error: data.error ?? 'Ошибка удаления' };
      }
      setUsers(prev => prev.filter(u => u.login !== loginStr));
      return { ok: true };
    } catch {
      return { ok: false, error: 'Ошибка соединения' };
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const allUsers = await res.json() as Omit<UserAccount, 'password'>[];
        setUsers(prev => allUsers.map(u => {
          const existing = prev.find(p => p.login === u.login);
          return { ...u, password: existing?.password ?? '' } as UserAccount;
        }));
      }
    } catch { /* ignore */ }
  }, []);

  const addContract = useCallback(async (contract: Contract): Promise<boolean> => {
    const res = await apiCall('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contract),
    });
    if (!res || !res.ok) {
      console.error('addContract: API failed, not updating state');
      return false;
    }
    setContracts(prev => [...prev, contract]);

    const auditEntry: AuditLogEntry = {
      id: String(Date.now()),
      timestamp: nowTimestamp(),
      employee: currentUser?.name ?? 'Админ',
      action: 'Создание',
      section: 'Договоры',
      entity: `Договор #${contract.number} (${contract.clientName})`,
      details: `Новый договор на сумму ${contract.cost.toLocaleString('ru-RU')} ₽ · ${contract.product}`,
    };
    setAuditLog(prev => [auditEntry, ...prev]);
    apiCall('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditEntry),
    });
    return true;
  }, [apiCall, currentUser]);

  const deleteContract = useCallback((id: string) => {
    // 1. Compute everything upfront from current state (no nested setState)
    const c = contracts.find(x => x.id === id);
    if (!c) return;

    const marker = `#${c.number}`;
    const linkedLedger = ledger.filter(e => e.note?.includes(marker));

    // 2. Calculate balance reversal deltas
    const balanceDelta: Record<string, number> = {};
    for (const e of linkedLedger) {
      if (!e.accountId) continue;
      if (e.operation === 'Пополнение' || e.operation === 'Платёж клиента' || e.operation === 'Новый договор') {
        balanceDelta[e.accountId] = (balanceDelta[e.accountId] || 0) - e.amount;
      } else if (e.operation === 'Списание') {
        balanceDelta[e.accountId] = (balanceDelta[e.accountId] || 0) + e.amount;
      }
    }

    // 3. Build the audit entry
    const auditEntry: AuditLogEntry = {
      id: String(Date.now()),
      timestamp: nowTimestamp(),
      employee: 'Админ',
      action: 'Удаление',
      section: 'Договоры',
      entity: `Договор #${c.number} (${c.clientName})`,
      details: `Договор удалён · ${c.product} · ${c.cost.toLocaleString('ru-RU')} ₽ · все связанные операции отменены`,
    };

    // 4. Apply all state updates (pure updaters, no side effects)
    setContracts(prev => prev.filter(x => x.id !== id));
    setLedger(prev => prev.filter(e => !e.note?.includes(marker)));
    if (Object.keys(balanceDelta).length > 0) {
      setAccounts(prev => prev.map(a =>
        balanceDelta[a.id] !== undefined ? { ...a, balance: a.balance + balanceDelta[a.id] } : a
      ));
    }
    setAuditLog(prev => [auditEntry, ...prev]);

    // 5. All side effects after state updates — each runs exactly once
    apiCall(`/api/contracts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    apiCall(`/api/ledger?notePattern=${encodeURIComponent(marker)}`, { method: 'DELETE' });
    for (const [accId, delta] of Object.entries(balanceDelta)) {
      const acc = accounts.find(a => a.id === accId);
      if (acc) {
        apiCall('/api/accounts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: accId, balance: acc.balance + delta }),
        });
      }
    }
    apiCall('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditEntry),
    });
  }, [contracts, ledger, accounts, apiCall]);

  const updateContract = useCallback((id: string, updates: Partial<Contract>) => {
    setContracts(prev => {
      const c = prev.find(x => x.id === id);
      if (c) {
          const changed = Object.entries(updates)
            .filter(([k, v]) => (c as unknown as Record<string, unknown>)[k] !== v)
            .map(([k, v]) => `${k}: было '${(c as unknown as Record<string, unknown>)[k]}', стало '${v}'`)
            .join('; ');
        if (changed) {
          const auditEntry: AuditLogEntry = {
            id: String(Date.now()),
            timestamp: nowTimestamp(),
            employee: currentUser?.name ?? 'Админ',
            action: 'Редактирование',
            section: 'Договоры',
            entity: `Договор #${c.number} (${c.clientName})`,
            details: changed,
          };
          setAuditLog(al => [auditEntry, ...al]);
          apiCall('/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(auditEntry),
          });
        }
      }
      return prev.map(x => x.id === id ? { ...x, ...updates } : x);
    });
    apiCall('/api/contracts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
  }, [apiCall, currentUser]);

  const addClient = useCallback(async (client: Client): Promise<boolean> => {
    // Send client without passportPhotos (photos are saved separately via /api/photos)
    const { passportPhotos, ...clientForDb } = client as Client & { passportPhotos?: string[] };
    const res = await apiCall('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientForDb),
    });
    if (!res || !res.ok) {
      console.error('addClient: API failed, not updating state');
      return false;
    }
    setClients(prev => [...prev, client]);

    const auditEntry: AuditLogEntry = {
      id: String(Date.now()),
      timestamp: nowTimestamp(),
      employee: currentUser?.name ?? 'Админ',
      action: 'Создание',
      section: 'Клиенты',
      entity: `${client.lastName} ${client.firstName}`.trim() || client.phone || 'Без имени',
      details: `Добавлен клиент · ${client.phone}`,
    };
    setAuditLog(prev => [auditEntry, ...prev]);
    apiCall('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditEntry),
    });
    return true;
  }, [apiCall, currentUser]);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(x => x.id === id ? { ...x, ...updates } : x));
    apiCall('/api/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
  }, [apiCall]);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => {
      const c = prev.find(x => x.id === id);
      if (c) {
        const auditEntry: AuditLogEntry = {
          id: String(Date.now()),
          timestamp: nowTimestamp(),
          employee: currentUser?.name ?? 'Админ',
          action: 'Удаление',
          section: 'Клиенты',
          entity: `${c.lastName} ${c.firstName}`,
          details: `Клиент удалён · ${c.phone}`,
        };
        setAuditLog(al => [auditEntry, ...al]);
        apiCall('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditEntry),
        });
      }
      return prev.filter(x => x.id !== id);
    });
    apiCall(`/api/clients?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, [apiCall, currentUser]);

  const transferBetweenAccounts = useCallback((fromId: string, toId: string, amount: number, comment: string) => {
    let success = false;
    setAccounts(prev => {
      const from = prev.find(a => a.id === fromId);
      if (!from || from.balance < amount) return prev;
      success = true;
      return prev.map(a => {
        if (a.id === fromId) return { ...a, balance: a.balance - amount };
        if (a.id === toId) return { ...a, balance: a.balance + amount };
        return a;
      });
    });
    if (success) {
      const date = nowStr();
      const transferEntry: Transfer = { id: String(Date.now()), fromAccountId: fromId, toAccountId: toId, amount, comment, date };
      setTransfers(prev => [transferEntry, ...prev]);
      apiCall('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferEntry),
      });

      // Update both accounts in DB
      setAccounts(current => {
        const fromAcc = current.find(a => a.id === fromId);
        const toAcc = current.find(a => a.id === toId);
        if (fromAcc) {
          apiCall('/api/accounts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: fromId, balance: fromAcc.balance }),
          });
        }
        if (toAcc) {
          apiCall('/api/accounts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: toId, balance: toAcc.balance }),
          });
        }

        const ledgerEntry: LedgerEntry = {
          id: String(Date.now()),
          date,
          user: currentUser?.name ?? 'Админ',
          operation: 'Перевод между счетами',
          amount,
          accountId: toId,
          accountName: toAcc?.name ?? toId,
          note: comment || `Перевод из "${fromAcc?.name}" в "${toAcc?.name}"`,
        };
        setLedger(prev => [ledgerEntry, ...prev]);
        apiCall('/api/ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ledgerEntry),
        });

        const auditEntry: AuditLogEntry = {
          id: String(Date.now() + 1),
          timestamp: nowTimestamp(),
          employee: currentUser?.name ?? 'Админ',
          action: 'Создание',
          section: 'Баланс',
          entity: `Перевод ${amount.toLocaleString('ru-RU')} ₽`,
          details: `Из "${fromAcc?.name}" в "${toAcc?.name}"${comment ? ` · ${comment}` : ''}`,
        };
        setAuditLog(al => [auditEntry, ...al]);
        apiCall('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditEntry),
        });
        return current;
      });
    }
    return success;
  }, [apiCall, currentUser]);

  const depositAccount = useCallback((accountId: string, amount: number, note: string) => {
    setAccounts(prev => {
      const updated = prev.map(a => a.id === accountId ? { ...a, balance: a.balance + amount } : a);
      const acc = updated.find(a => a.id === accountId);
      if (acc) {
        apiCall('/api/accounts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: accountId, balance: acc.balance, orgBalance: acc.orgBalance, investorsBalance: acc.investorsBalance, investPoolBalance: acc.investPoolBalance }),
        });
      }
      return updated;
    });
    const accName = accounts.find(a => a.id === accountId)?.name ?? accountId;
    const date = nowStr();
    const ledgerEntry: LedgerEntry = {
      id: String(Date.now()),
      date,
      user: currentUser?.name ?? 'Админ',
      operation: 'Пополнение',
      amount,
      accountId,
      accountName: accName,
      note: note || 'Пополнение счёта',
    };
    setLedger(prev => [ledgerEntry, ...prev]);
    apiCall('/api/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ledgerEntry),
    });

    const auditEntry: AuditLogEntry = {
      id: String(Date.now() + 1),
      timestamp: nowTimestamp(),
      employee: currentUser?.name ?? 'Админ',
      action: 'Создание',
      section: 'Баланс',
      entity: `Пополнение ${amount.toLocaleString('ru-RU')} ₽`,
      details: `Счёт: ${accName}${note ? ` · ${note}` : ''}`,
    };
    setAuditLog(prev => [auditEntry, ...prev]);
    apiCall('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditEntry),
    });
  }, [accounts, apiCall, currentUser]);

  const withdrawAccount = useCallback((accountId: string, amount: number, note: string, isOperational: boolean) => {
    let success = false;
    setAccounts(prev => {
      const acc = prev.find(a => a.id === accountId);
      if (!acc || acc.balance < amount) return prev;
      success = true;
      const updated = prev.map(a => a.id === accountId ? { ...a, balance: a.balance - amount } : a);
      const updatedAcc = updated.find(a => a.id === accountId);
      if (updatedAcc) {
        apiCall('/api/accounts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: accountId, balance: updatedAcc.balance, orgBalance: updatedAcc.orgBalance, investorsBalance: updatedAcc.investorsBalance, investPoolBalance: updatedAcc.investPoolBalance }),
        });
      }
      return updated;
    });
    if (success) {
      const accName = accounts.find(a => a.id === accountId)?.name ?? accountId;
      const date = nowStr();
      const ledgerEntry: LedgerEntry = {
        id: String(Date.now()),
        date,
        user: currentUser?.name ?? 'Админ',
        operation: 'Списание',
        amount,
        accountId,
        accountName: accName,
        note: note || 'Списание со счёта',
        isOperationalExpense: isOperational,
      };
      setLedger(prev => [ledgerEntry, ...prev]);
      apiCall('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ledgerEntry),
      });

      const auditEntry: AuditLogEntry = {
        id: String(Date.now() + 1),
        timestamp: nowTimestamp(),
        employee: currentUser?.name ?? 'Админ',
        action: 'Создание',
        section: 'Баланс',
        entity: `Списание ${amount.toLocaleString('ru-RU')} ₽`,
        details: `Счёт: ${accName}${note ? ` · ${note}` : ''}`,
      };
      setAuditLog(prev => [auditEntry, ...prev]);
      apiCall('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditEntry),
      });
    }
    return success;
  }, [accounts, apiCall, currentUser]);

    const addAccount = useCallback((account: Account) => {
    setAccounts(prev => [...prev, account]);
    apiCall('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    });
  }, [apiCall]);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    apiCall(`/api/accounts?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, [apiCall]);

    const addInvestor = useCallback(async (investor: Investor, depositAmount?: number): Promise<boolean> => {
      const res = await apiCall('/api/investors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(investor),
      });
      if (!res || !res.ok) {
        console.error('addInvestor: API failed, not updating state');
        return false;
      }
      setInvestors(prev => [...prev, investor]);

      // Add invested amount to the linked account balance
      if (depositAmount && depositAmount > 0 && investor.accountId) {
        setAccounts(prev => {
          const updated = prev.map(a =>
            a.id === investor.accountId ? { ...a, balance: a.balance + depositAmount, investorsBalance: (a.investorsBalance ?? 0) + depositAmount } : a
          );
          const acc = updated.find(a => a.id === investor.accountId);
          if (acc) {
            apiCall('/api/accounts', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: investor.accountId, balance: acc.balance, investorsBalance: acc.investorsBalance }),
            });
          }
          return updated;
        });
        const date = nowStr();
        const ledgerEntry: LedgerEntry = {
          id: String(Date.now()),
          date,
          user: currentUser?.name ?? 'Админ',
          operation: 'Пополнение',
          amount: depositAmount,
          accountId: investor.accountId!,
          accountName: investor.accountName ?? investor.accountId!,
          note: `Вложение партнёра: ${investor.name}`,
        };
        setLedger(prev => [ledgerEntry, ...prev]);
        apiCall('/api/ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ledgerEntry),
        });
      }
      const auditEntry: AuditLogEntry = {
        id: String(Date.now() + 1),
        timestamp: nowTimestamp(),
        employee: currentUser?.name ?? 'Админ',
        action: 'Создание',
        section: 'Инвестиции',
        entity: investor.name,
        details: `Добавлен партнёр · вложено ${investor.invested.toLocaleString('ru-RU')} ₽${investor.accountName ? ` · счёт: ${investor.accountName}` : ''}`,
      };
      setAuditLog(prev => [auditEntry, ...prev]);
      apiCall('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditEntry),
      });
      return true;
    }, [currentUser, apiCall]);

  const deleteInvestor = useCallback((id: string) => {
    setInvestors(prev => {
      const inv = prev.find(x => x.id === id);
      if (inv) {
        const auditEntry: AuditLogEntry = {
          id: String(Date.now()),
          timestamp: nowTimestamp(),
          employee: currentUser?.name ?? 'Админ',
          action: 'Удаление',
          section: 'Инвестиции',
          entity: inv.name,
          details: `Инвестор удалён · было вложено ${inv.invested.toLocaleString('ru-RU')} ₽`,
        };
        setAuditLog(al => [auditEntry, ...al]);
        apiCall('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditEntry),
        });
      }
      return prev.filter(x => x.id !== id);
    });
    apiCall(`/api/investors?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, [apiCall, currentUser]);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
        const changed = Object.entries(updates)
          .filter(([k, v]) => (prev as unknown as Record<string, unknown>)[k] !== v)
          .map(([k, v]) => `${k}: было '${(prev as unknown as Record<string, unknown>)[k]}', стало '${v}'`)
          .join('; ');
      if (changed) {
        const auditEntry: AuditLogEntry = {
          id: String(Date.now()),
          timestamp: nowTimestamp(),
          employee: currentUser?.name ?? 'Админ',
          action: 'Редактирование',
          section: 'Настройки',
          entity: '#1',
          details: changed,
        };
        setAuditLog(al => [auditEntry, ...al]);
        apiCall('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditEntry),
        });
      }
      return { ...prev, ...updates };
    });
    apiCall('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  }, [apiCall, currentUser]);

  const addTariff = useCallback((tariff: Tariff) => {
    setTariffs(prev => [...prev, tariff]);
    apiCall('/api/tariffs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tariff),
    });
  }, [apiCall]);

  const updateTariff = useCallback((id: string, updates: Partial<Tariff>) => {
    setTariffs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    apiCall('/api/tariffs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    });
  }, [apiCall]);

  const deleteTariff = useCallback((id: string) => {
    setTariffs(prev => prev.filter(t => t.id !== id));
    apiCall(`/api/tariffs?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, [apiCall]);

  const addProduct = useCallback((product: Product) => {
    setProducts(prev => [...prev, product]);
    apiCall('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(product) });
  }, [apiCall]);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    apiCall(`/api/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
  }, [apiCall]);

  const createBackup = useCallback(() => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const ts = `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    const entry: BackupEntry = {
      id: String(Date.now()),
      createdAt: ts,
      size: '—',
      note: 'Ручное создание',
    };
    setBackups(prev => [entry, ...prev]);
  }, []);

  const deleteBackup = useCallback((id: string) => {
    setBackups(prev => prev.filter(b => b.id !== id));
  }, []);

    return (
    <AppContext.Provider value={{
      contracts, clients, products, accounts, transfers, ledger, investors, investPools,
      auditLog, settings, tariffs, backups,
        isLoggedIn, hydrated, currentUser, users, login, loginWithApi, logout, updateUser, updateUserViaApi, updateUserFull, addUserViaApi, deleteUserViaApi, refreshUsers,
        addContract, deleteContract, addClient, updateClient, deleteClient, updateContract,
      transferBetweenAccounts, depositAccount, withdrawAccount,
      addAccount, deleteAccount,
      addInvestor, deleteInvestor,
      addAuditEntry, clearAuditLog, clearOperationalExpenses, deleteLedgerEntry, clearAllBusinessData,
      updateSettings, addTariff, updateTariff, deleteTariff,
      addProduct, deleteProduct,
      createBackup, deleteBackup,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
