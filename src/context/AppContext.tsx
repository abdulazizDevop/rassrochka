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
  addContract: (contract: Contract) => void;
  deleteContract: (id: string) => void;
  addClient: (client: Client) => void;
  updateClient: (id: string, updates: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  updateContract: (id: string, updates: Partial<Contract>) => void;
  transferBetweenAccounts: (fromId: string, toId: string, amount: number, comment: string) => boolean;
  depositAccount: (accountId: string, amount: number, note: string) => void;
  withdrawAccount: (accountId: string, amount: number, note: string, isOperational: boolean) => boolean;
  addAccount: (account: Account) => void;
  deleteAccount: (id: string) => void;
    addInvestor: (investor: Investor, depositAmount?: number) => void;
  deleteInvestor: (id: string) => void;
  addAuditEntry: (entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'employee'>) => void;
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

    // Fetch all data from DB
    fetch('/api/data')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (!data) return;
        if (data.clients) setClients(data.clients);
        if (data.contracts) setContracts(data.contracts);
        if (data.accounts) setAccounts(data.accounts);
        if (data.ledger) setLedger(data.ledger);
        if (data.investors) setInvestors(data.investors);
        if (data.investPools) setInvestPools(data.investPools);
        if (data.transfers) setTransfers(data.transfers);
        if (data.auditLog) setAuditLog(data.auditLog);
        if (data.settings) setSettings(data.settings);
        if (data.tariffs) setTariffs(data.tariffs);
        if (data.products) setProducts(data.products);
      })
      .catch(() => { /* ignore fetch errors on initial load */ })
      .finally(() => setHydrated(true));
  }, []);

  const addAuditEntry = useCallback((entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'employee'>) => {
    const full: AuditLogEntry = {
      ...entry,
      id: String(Date.now()),
      timestamp: nowTimestamp(),
      employee: currentUser?.name ?? 'Система',
    };
    setAuditLog(prev => [full, ...prev]);
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(full),
    }).catch(() => {});
  }, [currentUser]);

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

  const addContract = useCallback((contract: Contract) => {
    setContracts(prev => [...prev, contract]);
    // Persist to DB
    fetch('/api/contracts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contract),
    }).catch(() => {});

    const auditEntry: AuditLogEntry = {
      id: String(Date.now()),
      timestamp: nowTimestamp(),
      employee: 'Админ',
      action: 'Создание',
      section: 'Договоры',
      entity: `Договор #${contract.number} (${contract.clientName})`,
      details: `Новый договор на сумму ${contract.cost.toLocaleString('ru-RU')} ₽ · ${contract.product}`,
    };
    setAuditLog(prev => [auditEntry, ...prev]);
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditEntry),
    }).catch(() => {});
  }, []);

  const deleteContract = useCallback((id: string) => {
    setContracts(prev => {
      const c = prev.find(x => x.id === id);
      if (!c) return prev.filter(x => x.id !== id);

      // Find all ledger entries linked to this contract (note contains "#NUMBER")
      const marker = `#${c.number}`;
      setLedger(prevLedger => {
        const linked = prevLedger.filter(e => e.note?.includes(marker));
        // Reverse account balances: deposits subtract, withdrawals add back
        const balanceDelta: Record<string, number> = {};
        for (const e of linked) {
          if (!e.accountId) continue;
          if (e.operation === 'Пополнение' || e.operation === 'Платёж клиента' || e.operation === 'Новый договор') {
            balanceDelta[e.accountId] = (balanceDelta[e.accountId] || 0) - e.amount;
          } else if (e.operation === 'Списание') {
            balanceDelta[e.accountId] = (balanceDelta[e.accountId] || 0) + e.amount;
          }
        }
        // Apply balance changes
        if (Object.keys(balanceDelta).length > 0) {
          setAccounts(prevAccs => {
            const updated = prevAccs.map(a => balanceDelta[a.id] !== undefined ? { ...a, balance: a.balance + balanceDelta[a.id] } : a);
            for (const accId of Object.keys(balanceDelta)) {
              const acc = updated.find(a => a.id === accId);
              if (acc) {
                fetch('/api/accounts', {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ id: accId, balance: acc.balance }),
                }).catch(() => {});
              }
            }
            return updated;
          });
        }
        // Remove linked entries from DB
        fetch(`/api/ledger?notePattern=${encodeURIComponent(marker)}`, { method: 'DELETE' }).catch(() => {});
        return prevLedger.filter(e => !e.note?.includes(marker));
      });

      const auditEntry: AuditLogEntry = {
        id: String(Date.now()),
        timestamp: nowTimestamp(),
        employee: 'Админ',
        action: 'Удаление',
        section: 'Договоры',
        entity: `Договор #${c.number} (${c.clientName})`,
        details: `Договор удалён · ${c.product} · ${c.cost.toLocaleString('ru-RU')} ₽ · все связанные операции отменены`,
      };
      setAuditLog(al => [auditEntry, ...al]);
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditEntry),
      }).catch(() => {});

      return prev.filter(x => x.id !== id);
    });
    fetch(`/api/contracts?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }, []);

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
            employee: 'Админ',
            action: 'Редактирование',
            section: 'Договоры',
            entity: `Договор #${c.number} (${c.clientName})`,
            details: changed,
          };
          setAuditLog(al => [auditEntry, ...al]);
          fetch('/api/audit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(auditEntry),
          }).catch(() => {});
        }
      }
      return prev.map(x => x.id === id ? { ...x, ...updates } : x);
    });
    fetch('/api/contracts', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    }).catch(() => {});
  }, []);

  const addClient = useCallback((client: Client) => {
    setClients(prev => [...prev, client]);
    fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    }).catch(() => {});

    const auditEntry: AuditLogEntry = {
      id: String(Date.now()),
      timestamp: nowTimestamp(),
      employee: 'Админ',
      action: 'Создание',
      section: 'Клиенты',
      entity: `${client.lastName} ${client.firstName}`,
      details: `Добавлен клиент · ${client.phone}`,
    };
    setAuditLog(prev => [auditEntry, ...prev]);
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditEntry),
    }).catch(() => {});
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(x => x.id === id ? { ...x, ...updates } : x));
    fetch('/api/clients', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    }).catch(() => {});
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => {
      const c = prev.find(x => x.id === id);
      if (c) {
        const auditEntry: AuditLogEntry = {
          id: String(Date.now()),
          timestamp: nowTimestamp(),
          employee: 'Админ',
          action: 'Удаление',
          section: 'Клиенты',
          entity: `${c.lastName} ${c.firstName}`,
          details: `Клиент удалён · ${c.phone}`,
        };
        setAuditLog(al => [auditEntry, ...al]);
        fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditEntry),
        }).catch(() => {});
      }
      return prev.filter(x => x.id !== id);
    });
    fetch(`/api/clients?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }, []);

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
      fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(transferEntry),
      }).catch(() => {});

      // Update both accounts in DB
      setAccounts(current => {
        const fromAcc = current.find(a => a.id === fromId);
        const toAcc = current.find(a => a.id === toId);
        if (fromAcc) {
          fetch('/api/accounts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: fromId, balance: fromAcc.balance }),
          }).catch(() => {});
        }
        if (toAcc) {
          fetch('/api/accounts', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: toId, balance: toAcc.balance }),
          }).catch(() => {});
        }

        const ledgerEntry: LedgerEntry = {
          id: String(Date.now()),
          date,
          user: 'Админ',
          operation: 'Перевод между счетами',
          amount,
          accountId: toId,
          accountName: toAcc?.name ?? toId,
          note: comment || `Перевод из "${fromAcc?.name}" в "${toAcc?.name}"`,
        };
        setLedger(prev => [ledgerEntry, ...prev]);
        fetch('/api/ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ledgerEntry),
        }).catch(() => {});

        const auditEntry: AuditLogEntry = {
          id: String(Date.now() + 1),
          timestamp: nowTimestamp(),
          employee: 'Админ',
          action: 'Создание',
          section: 'Баланс',
          entity: `Перевод ${amount.toLocaleString('ru-RU')} ₽`,
          details: `Из "${fromAcc?.name}" в "${toAcc?.name}"${comment ? ` · ${comment}` : ''}`,
        };
        setAuditLog(al => [auditEntry, ...al]);
        fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditEntry),
        }).catch(() => {});
        return current;
      });
    }
    return success;
  }, []);

  const depositAccount = useCallback((accountId: string, amount: number, note: string) => {
    setAccounts(prev => {
      const updated = prev.map(a => a.id === accountId ? { ...a, balance: a.balance + amount } : a);
      const acc = updated.find(a => a.id === accountId);
      if (acc) {
        fetch('/api/accounts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: accountId, balance: acc.balance }),
        }).catch(() => {});
      }
      return updated;
    });
    const accName = accounts.find(a => a.id === accountId)?.name ?? accountId;
    const date = nowStr();
    const ledgerEntry: LedgerEntry = {
      id: String(Date.now()),
      date,
      user: 'Админ',
      operation: 'Пополнение',
      amount,
      accountId,
      accountName: accName,
      note: note || 'Пополнение счёта',
    };
    setLedger(prev => [ledgerEntry, ...prev]);
    fetch('/api/ledger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ledgerEntry),
    }).catch(() => {});

    const auditEntry: AuditLogEntry = {
      id: String(Date.now() + 1),
      timestamp: nowTimestamp(),
      employee: 'Админ',
      action: 'Создание',
      section: 'Баланс',
      entity: `Пополнение ${amount.toLocaleString('ru-RU')} ₽`,
      details: `Счёт: ${accName}${note ? ` · ${note}` : ''}`,
    };
    setAuditLog(prev => [auditEntry, ...prev]);
    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(auditEntry),
    }).catch(() => {});
  }, [accounts]);

  const withdrawAccount = useCallback((accountId: string, amount: number, note: string, isOperational: boolean) => {
    let success = false;
    setAccounts(prev => {
      const acc = prev.find(a => a.id === accountId);
      if (!acc || acc.balance < amount) return prev;
      success = true;
      const updated = prev.map(a => a.id === accountId ? { ...a, balance: a.balance - amount } : a);
      const updatedAcc = updated.find(a => a.id === accountId);
      if (updatedAcc) {
        fetch('/api/accounts', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: accountId, balance: updatedAcc.balance }),
        }).catch(() => {});
      }
      return updated;
    });
    if (success) {
      const accName = accounts.find(a => a.id === accountId)?.name ?? accountId;
      const date = nowStr();
      const ledgerEntry: LedgerEntry = {
        id: String(Date.now()),
        date,
        user: 'Админ',
        operation: 'Списание',
        amount,
        accountId,
        accountName: accName,
        note: note || 'Списание со счёта',
        isOperationalExpense: isOperational,
      };
      setLedger(prev => [ledgerEntry, ...prev]);
      fetch('/api/ledger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ledgerEntry),
      }).catch(() => {});

      const auditEntry: AuditLogEntry = {
        id: String(Date.now() + 1),
        timestamp: nowTimestamp(),
        employee: 'Админ',
        action: 'Создание',
        section: 'Баланс',
        entity: `Списание ${amount.toLocaleString('ru-RU')} ₽`,
        details: `Счёт: ${accName}${note ? ` · ${note}` : ''}`,
      };
      setAuditLog(prev => [auditEntry, ...prev]);
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditEntry),
      }).catch(() => {});
    }
    return success;
  }, [accounts]);

    const addAccount = useCallback((account: Account) => {
    setAccounts(prev => [...prev, account]);
    fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(account),
    }).catch(() => {});
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
    fetch(`/api/accounts?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }, []);

    const addInvestor = useCallback((investor: Investor, depositAmount?: number) => {
      setInvestors(prev => [...prev, investor]);
      fetch('/api/investors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(investor),
      }).catch(() => {});

      // Add invested amount to the linked account balance
      if (depositAmount && depositAmount > 0 && investor.accountId) {
        setAccounts(prev => {
          const updated = prev.map(a =>
            a.id === investor.accountId ? { ...a, balance: a.balance + depositAmount, investorsBalance: (a.investorsBalance ?? 0) + depositAmount } : a
          );
          const acc = updated.find(a => a.id === investor.accountId);
          if (acc) {
            fetch('/api/accounts', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: investor.accountId, balance: acc.balance, investorsBalance: acc.investorsBalance }),
            }).catch(() => {});
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
        fetch('/api/ledger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(ledgerEntry),
        }).catch(() => {});
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
      fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(auditEntry),
      }).catch(() => {});
    }, [currentUser]);

  const deleteInvestor = useCallback((id: string) => {
    setInvestors(prev => {
      const inv = prev.find(x => x.id === id);
      if (inv) {
        const auditEntry: AuditLogEntry = {
          id: String(Date.now()),
          timestamp: nowTimestamp(),
          employee: 'Админ',
          action: 'Удаление',
          section: 'Инвестиции',
          entity: inv.name,
          details: `Инвестор удалён · было вложено ${inv.invested.toLocaleString('ru-RU')} ₽`,
        };
        setAuditLog(al => [auditEntry, ...al]);
        fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditEntry),
        }).catch(() => {});
      }
      return prev.filter(x => x.id !== id);
    });
    fetch(`/api/investors?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }, []);

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
          employee: 'Админ',
          action: 'Редактирование',
          section: 'Настройки',
          entity: '#1',
          details: changed,
        };
        setAuditLog(al => [auditEntry, ...al]);
        fetch('/api/audit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(auditEntry),
        }).catch(() => {});
      }
      return { ...prev, ...updates };
    });
    // Persist settings to DB
    fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    }).catch(() => {});
  }, []);

  const addTariff = useCallback((tariff: Tariff) => {
    setTariffs(prev => [...prev, tariff]);
    fetch('/api/tariffs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tariff),
    }).catch(() => {});
  }, []);

  const updateTariff = useCallback((id: string, updates: Partial<Tariff>) => {
    setTariffs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    fetch('/api/tariffs', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updates }),
    }).catch(() => {});
  }, []);

  const deleteTariff = useCallback((id: string) => {
    setTariffs(prev => prev.filter(t => t.id !== id));
    fetch(`/api/tariffs?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }, []);

  const addProduct = useCallback((product: Product) => {
    setProducts(prev => [...prev, product]);
    fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(product) }).catch(() => {});
  }, []);

  const deleteProduct = useCallback((id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
    fetch(`/api/products?id=${encodeURIComponent(id)}`, { method: 'DELETE' }).catch(() => {});
  }, []);

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
      addAuditEntry,
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
