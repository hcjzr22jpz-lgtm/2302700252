'use strict';

const fs = require('fs');
const path = require('path');
const Account = require('../models/Account');
const Order = require('../models/Order');
const Product = require('../models/Product');
const staffCtrl = require('../controllers/staffController');

const accountsFile = path.join(__dirname, '..', 'data', 'accounts.json');
const ordersFile = path.join(__dirname, '..', 'data', 'orders.json');
const productsFile = path.join(__dirname, '..', 'data', 'products.json');

let originalAccounts;
let originalOrders;
let originalProducts;

function mockRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.send = jest.fn(() => res);
  res.render = jest.fn(() => res);
  res.redirect = jest.fn(() => res);
  return res;
}

function staffReq(overrides = {}) {
  return {
    session: {
      user: { id: 99, name: 'Staff User', email: 'staff@example.com', role: 'staff' },
      cart: { items: {} },
    },
    query: {},
    params: {},
    body: {},
    ...overrides,
  };
}

beforeAll(() => {
  originalAccounts = fs.readFileSync(accountsFile, 'utf8');
  originalOrders = fs.readFileSync(ordersFile, 'utf8');
  originalProducts = fs.readFileSync(productsFile, 'utf8');
});

beforeEach(() => {
  fs.writeFileSync(accountsFile, '[]');
  fs.writeFileSync(ordersFile, '[]');
  fs.writeFileSync(productsFile, originalProducts);
});

afterEach(() => {
  fs.writeFileSync(accountsFile, '[]');
  fs.writeFileSync(ordersFile, '[]');
  fs.writeFileSync(productsFile, originalProducts);
});

afterAll(() => {
  fs.writeFileSync(accountsFile, originalAccounts);
  fs.writeFileSync(ordersFile, originalOrders);
  fs.writeFileSync(productsFile, originalProducts);
});

describe('staffController product management', () => {
  test('listProducts renders product management page', () => {
    const res = mockRes();
    staffCtrl.listProducts(staffReq(), res);
    expect(res.render).toHaveBeenCalledWith('staff-products', expect.objectContaining({
      products: expect.any(Array),
    }));
  });

  test('createProduct persists product and redirects', () => {
    const req = staffReq({
      body: {
        name: 'Staff Cap',
        price: '12.50',
        image: '/images/red-tshirt.svg',
        category: 'Apparel',
        type: 'Cap',
        badge: '',
        desc: 'Internal staff cap',
      },
    });
    const res = mockRes();
    staffCtrl.createProduct(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/products?created=1');
    expect(Product.getAll().some(p => p.name === 'Staff Cap')).toBe(true);
  });

  test('createProduct re-renders form on validation errors', () => {
    const req = staffReq({ body: { name: '', price: 0, category: '', type: '' } });
    const res = mockRes();
    staffCtrl.createProduct(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith('staff-product-form', expect.objectContaining({
      error: expect.stringMatching(/required|price/i),
    }));
  });

  test('updateProduct edits an existing product', () => {
    const req = staffReq({
      params: { id: '1' },
      body: { name: 'Updated Backpack', price: '35', category: 'Accessories', type: 'Backpack', image: '', badge: '', desc: 'Updated' },
    });
    const res = mockRes();
    staffCtrl.updateProduct(req, res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/products?updated=1');
    expect(Product.getById(1).name).toBe('Updated Backpack');
  });

  test('deleteProduct removes an existing product', () => {
    const res = mockRes();
    staffCtrl.deleteProduct(staffReq({ params: { id: '2' } }), res);
    expect(res.redirect).toHaveBeenCalledWith('/staff/products?deleted=1');
    expect(Product.getById(2)).toBeUndefined();
  });
});

describe('staffController customer orders', () => {
  test('showCreateOrder renders customers and products', () => {
    Account.add({ name: 'Buyer', email: 'buyer@example.com', password: 'pass', address: '1 St' });
    Account.add({ name: 'Staff', email: 'staff2@example.com', password: 'pass', address: 'HQ', role: 'staff' });
    const res = mockRes();

    staffCtrl.showCreateOrder(staffReq(), res);

    const data = res.render.mock.calls[0][1];
    expect(res.render.mock.calls[0][0]).toBe('staff-order');
    expect(data.customers).toHaveLength(1);
    expect(data.products.length).toBeGreaterThan(0);
  });

  test('createOrder places an order for the selected customer', () => {
    const customer = Account.add({ name: 'Buyer', email: 'buyer@example.com', password: 'pass', address: '1 St' });
    const req = staffReq({
      body: {
        customerId: String(customer.id),
        qty_1: '1',
        qty_2: '0',
      },
    });
    const res = mockRes();

    staffCtrl.createOrder(req, res);

    expect(res.render).toHaveBeenCalledWith('order-complete', expect.objectContaining({
      order: expect.objectContaining({ userId: customer.id, channel: 'staff' }),
    }));
    expect(Order.getAll()).toHaveLength(1);
  });

  test('createOrder re-renders form when no product quantity is selected', () => {
    const customer = Account.add({ name: 'Buyer', email: 'buyer@example.com', password: 'pass', address: '1 St' });
    const res = mockRes();

    staffCtrl.createOrder(staffReq({ body: { customerId: customer.id, qty_1: '0' } }), res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.render).toHaveBeenCalledWith('staff-order', expect.objectContaining({
      error: 'Order must contain at least one item.',
    }));
  });
});
