'use strict';

const fs   = require('fs');
const path = require('path');
const Account = require('./Account');
const Product = require('./Product');

const dataFile = path.join(__dirname, '..', 'data', 'orders.json');
const TAX_RATE = 0.08;

function readOrders() {
  try {
    return JSON.parse(fs.readFileSync(dataFile, 'utf8') || '[]');
  } catch (_) {
    return [];
  }
}

function writeOrders(orders) {
  fs.writeFileSync(dataFile, JSON.stringify(orders, null, 2));
}

function buildOrderLines(items) {
  if (!Array.isArray(items)) {
    throw new Error('Order must contain at least one item.');
  }

  const lines = items
    .map(item => ({
      productId: item.productId,
      qty: Number(item.qty),
    }))
    .filter(item => item.qty > 0)
    .map(item => {
      const product = Product.getById(item.productId);
      if (!product) throw new Error('Product not found.');
      return {
        product,
        qty: item.qty,
        subtotal: +(product.price * item.qty).toFixed(2),
      };
    });

  if (lines.length === 0) {
    throw new Error('Order must contain at least one item.');
  }
  return lines;
}

function normalizeCreator(staff) {
  if (!staff) return null;
  return {
    id: staff.id,
    name: staff.name,
    email: staff.email,
    role: staff.role || 'staff',
  };
}

class Order {
  static getAll() {
    return readOrders();
  }

  static getById(orderId) {
    return Order.getAll().find(o => o.id === String(orderId)) || null;
  }

  static getByUserId(userId) {
    return Order.getAll()
      .filter(o => String(o.userId) === String(userId))
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }

  static add(order) {
    const orders = Order.getAll();
    const enriched = {
      ...order,
      createdAt: order.createdAt || new Date().toISOString(),
      status:    order.status    || 'confirmed',
    };
    orders.push(enriched);
    writeOrders(orders);
    return enriched;
  }

  static createForCustomer(customerId, items, staff) {
    const customer = Account.findById(customerId);
    if (!customer || Account.isStaff(customer)) {
      throw new Error('Customer not found.');
    }

    const lines = buildOrderLines(items);
    const subtotal = +lines.reduce((sum, line) => sum + line.subtotal, 0).toFixed(2);
    const tax = +(subtotal * TAX_RATE).toFixed(2);
    const total = +(subtotal + tax).toFixed(2);

    return Order.add({
      id: 'ORD-' + Date.now(),
      userId: customer.id,
      email: customer.email,
      name: customer.name,
      address: customer.address,
      items: lines,
      subtotal,
      tax,
      total,
      placedAt: new Date().toLocaleString('vi-VN'),
      channel: 'staff',
      createdBy: normalizeCreator(staff),
    });
  }

  static updateStatus(orderId, status) {
    const orders = Order.getAll();
    const idx = orders.findIndex(o => o.id === String(orderId));
    if (idx === -1) throw new Error('Order not found.');
    orders[idx].status = status;
    orders[idx].updatedAt = new Date().toISOString();
    writeOrders(orders);
    return orders[idx];
  }

  static count() {
    return Order.getAll().length;
  }

  static totalRevenue() {
    return +Order.getAll().reduce((s, o) => s + (o.total || 0), 0).toFixed(2);
  }
}

module.exports = Order;
