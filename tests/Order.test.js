'use strict';

const fs    = require('fs');
const path  = require('path');
const Account = require('../models/Account');
const Order = require('../models/Order');

const dataFile = path.join(__dirname, '..', 'data', 'orders.json');
const backup   = path.join(__dirname, '..', 'data', 'orders.json.bak');
const accountsFile = path.join(__dirname, '..', 'data', 'accounts.json');
const accountsBackup = path.join(__dirname, '..', 'data', 'accounts.json.bak');

const makeOrder = (overrides = {}) => ({
  id:        'ORD-001',
  userId:    100,
  email:     'user@example.com',
  name:      'Test User',
  address:   '123 St',
  items:     [{ product: { id: 1, name: 'Backpack', price: 29.99 }, qty: 1, subtotal: 29.99 }],
  total:     32.39,
  placedAt:  '2026-05-21',
  ...overrides,
});

beforeAll(() => {
  if (fs.existsSync(dataFile)) fs.copyFileSync(dataFile, backup);
  if (fs.existsSync(accountsFile)) fs.copyFileSync(accountsFile, accountsBackup);
});
afterAll(() => {
  if (fs.existsSync(backup)) { fs.copyFileSync(backup, dataFile); fs.unlinkSync(backup); }
  if (fs.existsSync(accountsBackup)) { fs.copyFileSync(accountsBackup, accountsFile); fs.unlinkSync(accountsBackup); }
});
beforeEach(() => {
  fs.writeFileSync(dataFile, '[]');
  fs.writeFileSync(accountsFile, '[]');
});
afterEach (() => {
  fs.writeFileSync(dataFile, '[]');
  fs.writeFileSync(accountsFile, '[]');
});

describe('Order.getAll()', () => {
  test('returns empty array initially', () => expect(Order.getAll()).toEqual([]));
});

describe('Order.add()', () => {
  test('appends order and auto-fills status + createdAt', () => {
    const order = Order.add(makeOrder());
    expect(order.status).toBe('confirmed');
    expect(order.createdAt).toBeDefined();
    expect(Order.getAll()).toHaveLength(1);
  });

  test('persists multiple orders', () => {
    Order.add(makeOrder({ id: 'ORD-001' }));
    Order.add(makeOrder({ id: 'ORD-002' }));
    expect(Order.getAll()).toHaveLength(2);
  });
});

describe('Order.getById()', () => {
  test('returns matching order', () => {
    Order.add(makeOrder({ id: 'ORD-XYZ' }));
    expect(Order.getById('ORD-XYZ')).not.toBeNull();
  });
  test('returns null for unknown id', () => {
    expect(Order.getById('NO-SUCH')).toBeNull();
  });
});

describe('Order.getByUserId()', () => {
  test('returns only orders for the given user', () => {
    Order.add(makeOrder({ id: 'ORD-A', userId: 100 }));
    Order.add(makeOrder({ id: 'ORD-B', userId: 200 }));
    const result = Order.getByUserId(100);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('ORD-A');
  });
  test('works with string or numeric userId', () => {
    Order.add(makeOrder({ id: 'ORD-C', userId: 100 }));
    expect(Order.getByUserId('100')).toHaveLength(1);
  });
  test('returns empty array when user has no orders', () => {
    expect(Order.getByUserId(999)).toEqual([]);
  });
});

describe('Order.updateStatus()', () => {
  test('updates order status', () => {
    Order.add(makeOrder({ id: 'ORD-ST' }));
    const updated = Order.updateStatus('ORD-ST', 'shipped');
    expect(updated.status).toBe('shipped');
    expect(updated.updatedAt).toBeDefined();
  });
  test('throws for unknown order id', () => {
    expect(() => Order.updateStatus('GHOST', 'cancelled')).toThrow('Order not found.');
  });
});

describe('Order.createForCustomer()', () => {
  test('staff can create an order for a customer account', () => {
    const customer = Account.add({
      name: 'Customer One',
      email: 'customer@example.com',
      password: 'pass',
      address: '12 Customer St',
    });

    const order = Order.createForCustomer(customer.id, [{ productId: 1, qty: 2 }], {
      id: 7,
      name: 'Staff User',
      email: 'staff@example.com',
      role: 'staff',
    });

    expect(order).toMatchObject({
      userId: customer.id,
      email: 'customer@example.com',
      channel: 'staff',
      createdBy: expect.objectContaining({ id: 7, role: 'staff' }),
      subtotal: 59.98,
      tax: 4.8,
      total: 64.78,
    });
    expect(order.items[0]).toMatchObject({ qty: 2, subtotal: 59.98 });
    expect(Order.getAll()).toHaveLength(1);
  });

  test('rejects staff accounts as order customers', () => {
    const staff = Account.add({
      name: 'Staff',
      email: 'staff@example.com',
      password: 'pass',
      address: 'HQ',
      role: 'staff',
    });

    expect(() => Order.createForCustomer(staff.id, [{ productId: 1, qty: 1 }], staff))
      .toThrow('Customer not found.');
  });

  test('requires at least one positive quantity item', () => {
    const customer = Account.add({
      name: 'Customer Two',
      email: 'customer2@example.com',
      password: 'pass',
      address: '34 Customer St',
    });

    expect(() => Order.createForCustomer(customer.id, [{ productId: 1, qty: 0 }], null))
      .toThrow('Order must contain at least one item.');
  });
});

describe('Order.count() / totalRevenue()', () => {
  test('count returns number of orders', () => {
    Order.add(makeOrder({ id: 'O1' }));
    Order.add(makeOrder({ id: 'O2' }));
    expect(Order.count()).toBe(2);
  });
  test('totalRevenue sums all order totals', () => {
    Order.add(makeOrder({ id: 'O1', total: 32.39 }));
    Order.add(makeOrder({ id: 'O2', total: 17.27 }));
    expect(Order.totalRevenue()).toBeCloseTo(49.66, 2);
  });
});
