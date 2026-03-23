'use client';
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Contract, Client, Product, Account, Transfer, LedgerEntry, Investor, InvestPool, AuditLogEntry, AppSettings, Tariff, BackupEntry, UserAccount, UserRole } from '@/lib/types';
import { MOCK_CONTRACTS, MOCK_CLIENTS, MOCK_PRODUCTS, MOCK_ACCOUNTS, MOCK_LEDGER, MOCK_INVESTORS, MOCK_INVEST_POOLS } from '@/lib/data';

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
  currentUser: UserAccount | null;
  users: UserAccount[];
  login: (username: string, password: string) => boolean;
  loginWithApi: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
    updateUser: (login: string, updates: Partial<Pick<UserAccount, 'name' | 'password'>>) => void;
    updateUserViaApi: (login: string, newPassword: string) => Promise<boolean>;
    updateUserFull: (login: string, newLogin?: string, newPassword?: string, currentPassword?: string, skipCurrentPasswordCheck?: boolean) => Promise<{ ok: boolean; error?: string; newLogin?: string }>;
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
  createBackup: () => void;
  deleteBackup: (id: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

function nowStr() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
}

function nowTimestamp() {
  const now = new Date();
  return `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [contracts, setContracts] = useState<Contract[]>(MOCK_CONTRACTS);
  const [clients, setClients] = useState<Client[]>(MOCK_CLIENTS);
  const [products] = useState<Product[]>(MOCK_PRODUCTS);
  const [accounts, setAccounts] = useState<Account[]>(MOCK_ACCOUNTS);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>(MOCK_LEDGER);
  const [investors, setInvestors] = useState<Investor[]>(MOCK_INVESTORS);
  const [investPools] = useState<InvestPool[]>(MOCK_INVEST_POOLS);
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('bp_session') === '1';
  });
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const s = localStorage.getItem('bp_user');
      return s ? JSON.parse(s) as UserAccount : null;
    } catch { return null; }
  });
    const [users, setUsers] = useState<UserAccount[]>([]);
  const [auditLog, setAuditLog] = useState<AuditLogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    minFirstPaymentPercent: 25,
    minFirstPaymentAmount: 0,
    minMonths: 1,
    maxMonths: 9,
    daysUntilOverdue: 4,
    enableSecurityDepartment: false,
    printFormat: 'A4',
    companyName: 'AkhmadPay',
  });
  const [tariffs, setTariffs] = useState<Tariff[]>([
    { id: '1', name: 'стандарт', markup: 0, isDefault: true },
  ]);
  const [backups, setBackups] = useState<BackupEntry[]>([]);

  const addAuditEntry = useCallback((entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'employee'>) => {
    setAuditLog(prev => [{
      ...entry,
      id: String(Date.now()),
      timestamp: nowTimestamp(),
      employee: currentUser?.name ?? 'Система',
    }, ...prev]);
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
      // also update in-memory
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

  const addContract = useCallback((contract: Contract) => {
    setContracts(prev => [...prev, contract]);
    setAuditLog(prev => [{
      id: String(Date.now()),
      timestamp: nowTimestamp(),
      employee: 'Админ',
      action: 'Создание',
      section: 'Договоры',
      entity: `Договор #${contract.number} (${contract.clientName})`,
      details: `Новый договор на сумму ${contract.cost.toLocaleString('ru-RU')} ₽ · ${contract.product}`,
    }, ...prev]);
  }, []);

  const deleteContract = useCallback((id: string) => {
    setContracts(prev => {
      const c = prev.find(x => x.id === id);
      if (c) {
        setAuditLog(al => [{
          id: String(Date.now()),
          timestamp: nowTimestamp(),
          employee: 'Админ',
          action: 'Удаление',
          section: 'Договоры',
          entity: `Договор #${c.number} (${c.clientName})`,
          details: `Договор удалён · ${c.product} · ${c.cost.toLocaleString('ru-RU')} ₽`,
        }, ...al]);
      }
      return prev.filter(x => x.id !== id);
    });
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
          setAuditLog(al => [{
            id: String(Date.now()),
            timestamp: nowTimestamp(),
            employee: 'Админ',
            action: 'Редактирование',
            section: 'Договоры',
            entity: `Договор #${c.number} (${c.clientName})`,
            details: changed,
          }, ...al]);
        }
      }
      return prev.map(x => x.id === id ? { ...x, ...updates } : x);
    });
  }, []);

  const addClient = useCallback((client: Client) => {
    setClients(prev => [...prev, client]);
    setAuditLog(prev => [{
      id: String(Date.now()),
      timestamp: nowTimestamp(),
      employee: 'Админ',
      action: 'Создание',
      section: 'Клиенты',
      entity: `${client.lastName} ${client.firstName}`,
      details: `Добавлен клиент · ${client.phone}`,
    }, ...prev]);
  }, []);

  const updateClient = useCallback((id: string, updates: Partial<Client>) => {
    setClients(prev => prev.map(x => x.id === id ? { ...x, ...updates } : x));
  }, []);

  const deleteClient = useCallback((id: string) => {
    setClients(prev => {
      const c = prev.find(x => x.id === id);
      if (c) {
        setAuditLog(al => [{
          id: String(Date.now()),
          timestamp: nowTimestamp(),
          employee: 'Админ',
          action: 'Удаление',
          section: 'Клиенты',
          entity: `${c.lastName} ${c.firstName}`,
          details: `Клиент удалён · ${c.phone}`,
        }, ...al]);
      }
      return prev.filter(x => x.id !== id);
    });
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
      setTransfers(prev => [{ id: String(Date.now()), fromAccountId: fromId, toAccountId: toId, amount, comment, date }, ...prev]);
      setAccounts(current => {
        const fromAcc = current.find(a => a.id === fromId);
        const toAcc = current.find(a => a.id === toId);
        setLedger(prev => [{
          id: String(Date.now()),
          date,
          user: 'Админ',
          operation: 'Перевод между счетами',
          amount,
          accountId: toId,
          accountName: toAcc?.name ?? toId,
          note: comment || `Перевод из "${fromAcc?.name}" в "${toAcc?.name}"`,
        }, ...prev]);
        setAuditLog(al => [{
          id: String(Date.now() + 1),
          timestamp: nowTimestamp(),
          employee: 'Админ',
          action: 'Создание',
          section: 'Баланс',
          entity: `Перевод ${amount.toLocaleString('ru-RU')} ₽`,
          details: `Из "${fromAcc?.name}" в "${toAcc?.name}"${comment ? ` · ${comment}` : ''}`,
        }, ...al]);
        return current;
      });
    }
    return success;
  }, []);

  const depositAccount = useCallback((accountId: string, amount: number, note: string) => {
    setAccounts(prev => prev.map(a => a.id === accountId ? { ...a, balance: a.balance + amount } : a));
    const accName = MOCK_ACCOUNTS.find(a => a.id === accountId)?.name ?? accountId;
    const date = nowStr();
    setLedger(prev => [{
      id: String(Date.now()),
      date,
      user: 'Админ',
      operation: 'Пополнение',
      amount,
      accountId,
      accountName: accName,
      note: note || 'Пополнение счёта',
    }, ...prev]);
    setAuditLog(prev => [{
      id: String(Date.now() + 1),
      timestamp: nowTimestamp(),
      employee: 'Админ',
      action: 'Создание',
      section: 'Баланс',
      entity: `Пополнение ${amount.toLocaleString('ru-RU')} ₽`,
      details: `Счёт: ${accName}${note ? ` · ${note}` : ''}`,
    }, ...prev]);
  }, []);

  const withdrawAccount = useCallback((accountId: string, amount: number, note: string, isOperational: boolean) => {
    let success = false;
    setAccounts(prev => {
      const acc = prev.find(a => a.id === accountId);
      if (!acc || acc.balance < amount) return prev;
      success = true;
      return prev.map(a => a.id === accountId ? { ...a, balance: a.balance - amount } : a);
    });
    if (success) {
      const accName = MOCK_ACCOUNTS.find(a => a.id === accountId)?.name ?? accountId;
      const date = nowStr();
      setLedger(prev => [{
        id: String(Date.now()),
        date,
        user: 'Админ',
        operation: 'Списание',
        amount,
        accountId,
        accountName: accName,
        note: note || 'Списание со счёта',
        isOperationalExpense: isOperational,
      }, ...prev]);
      setAuditLog(prev => [{
        id: String(Date.now() + 1),
        timestamp: nowTimestamp(),
        employee: 'Админ',
        action: 'Создание',
        section: 'Баланс',
        entity: `Списание ${amount.toLocaleString('ru-RU')} ₽`,
        details: `Счёт: ${accName}${note ? ` · ${note}` : ''}`,
      }, ...prev]);
    }
    return success;
  }, []);

    const addAccount = useCallback((account: Account) => {
    setAccounts(prev => [...prev, account]);
  }, []);

  const deleteAccount = useCallback((id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
  }, []);

    const addInvestor = useCallback((investor: Investor, depositAmount?: number) => {
      setInvestors(prev => [...prev, investor]);
      // Add invested amount to the linked account balance
      if (depositAmount && depositAmount > 0 && investor.accountId) {
        setAccounts(prev => prev.map(a =>
          a.id === investor.accountId ? { ...a, balance: a.balance + depositAmount, investorsBalance: (a.investorsBalance ?? 0) + depositAmount } : a
        ));
        const date = nowStr();
        setLedger(prev => [{
          id: String(Date.now()),
          date,
          user: currentUser?.name ?? 'Админ',
          operation: 'Пополнение',
          amount: depositAmount,
          accountId: investor.accountId!,
          accountName: investor.accountName ?? investor.accountId!,
          note: `Вложение партнёра: ${investor.name}`,
        }, ...prev]);
      }
      setAuditLog(prev => [{
        id: String(Date.now() + 1),
        timestamp: nowTimestamp(),
        employee: currentUser?.name ?? 'Админ',
        action: 'Создание',
        section: 'Инвестиции',
        entity: investor.name,
        details: `Добавлен партнёр · вложено ${investor.invested.toLocaleString('ru-RU')} ₽${investor.accountName ? ` · счёт: ${investor.accountName}` : ''}`,
      }, ...prev]);
    }, [currentUser]);

  const deleteInvestor = useCallback((id: string) => {
    setInvestors(prev => {
      const inv = prev.find(x => x.id === id);
      if (inv) {
        setAuditLog(al => [{
          id: String(Date.now()),
          timestamp: nowTimestamp(),
          employee: 'Админ',
          action: 'Удаление',
          section: 'Инвестиции',
          entity: inv.name,
          details: `Инвестор удалён · было вложено ${inv.invested.toLocaleString('ru-RU')} ₽`,
        }, ...al]);
      }
      return prev.filter(x => x.id !== id);
    });
  }, []);

  const updateSettings = useCallback((updates: Partial<AppSettings>) => {
    setSettings(prev => {
        const changed = Object.entries(updates)
          .filter(([k, v]) => (prev as unknown as Record<string, unknown>)[k] !== v)
          .map(([k, v]) => `${k}: было '${(prev as unknown as Record<string, unknown>)[k]}', стало '${v}'`)
          .join('; ');
      if (changed) {
        setAuditLog(al => [{
          id: String(Date.now()),
          timestamp: nowTimestamp(),
          employee: 'Админ',
          action: 'Редактирование',
          section: 'Настройки',
          entity: '#1',
          details: changed,
        }, ...al]);
      }
      return { ...prev, ...updates };
    });
  }, []);

  const addTariff = useCallback((tariff: Tariff) => {
    setTariffs(prev => [...prev, tariff]);
  }, []);

  const updateTariff = useCallback((id: string, updates: Partial<Tariff>) => {
    setTariffs(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  }, []);

  const deleteTariff = useCallback((id: string) => {
    setTariffs(prev => prev.filter(t => t.id !== id));
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
        isLoggedIn, currentUser, users, login, loginWithApi, logout, updateUser, updateUserViaApi, updateUserFull,
        addContract, deleteContract, addClient, updateClient, deleteClient, updateContract,
      transferBetweenAccounts, depositAccount, withdrawAccount,
      addAccount, deleteAccount,
      addInvestor, deleteInvestor,
      addAuditEntry,
      updateSettings, addTariff, updateTariff, deleteTariff,
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
