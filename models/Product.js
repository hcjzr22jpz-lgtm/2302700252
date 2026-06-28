'use strict';

const fs = require('fs');
const path = require('path');

const types = require('../data/types.json');
const Category = require('./Category');

const dataFile = path.join(__dirname, '..', 'data', 'products.json');

function readProducts() {
  try {
    const products = JSON.parse(fs.readFileSync(dataFile, 'utf8') || '[]');
    return Array.isArray(products) ? products : [];
  } catch (_) {
    return [];
  }
}

function writeProducts(products) {
  fs.writeFileSync(dataFile, JSON.stringify(products, null, 2));
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function normalizeProduct(fields, existing = {}) {
  const product = { ...existing, ...fields };
  const name = String(product.name || '').trim();
  const category = String(product.category || '').trim();
  const type = String(product.type || '').trim();
  const price = Number(product.price);

  if (!name || !category || !type) {
    throw new Error('Product name, category, and type are required.');
  }
  if (!Number.isFinite(price) || price <= 0) {
    throw new Error('Product price must be greater than 0.');
  }

  return {
    ...product,
    id: Number(product.id),
    name,
    price: +price.toFixed(2),
    image: String(product.image || '/images/red-tshirt.svg').trim(),
    category,
    type,
    badge: product.badge ? String(product.badge).trim() : null,
    desc: String(product.desc || '').trim(),
  };
}

class Product {
  static getAll()      { return readProducts(); }
  static getById(id)   { return Product.getAll().find(p => p.id === Number(id)); }
  static getCategories() {
    return unique([...Category.getAll(), ...Product.getAll().map(p => p.category)]);
  }
  static getTypes() {
    return unique([...types, ...Product.getAll().map(p => p.type)]);
  }

  static add(fields) {
    const products = Product.getAll();
    const nextId = products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
    const product = normalizeProduct({ ...fields, id: nextId });
    products.push(product);
    writeProducts(products);
    return product;
  }

  static update(id, fields) {
    const products = Product.getAll();
    const idx = products.findIndex(p => p.id === Number(id));
    if (idx === -1) throw new Error('Product not found.');
    const product = normalizeProduct({ ...fields, id: products[idx].id }, products[idx]);
    products[idx] = product;
    writeProducts(products);
    return product;
  }

  static remove(id) {
    const products = Product.getAll();
    const idx = products.findIndex(p => p.id === Number(id));
    if (idx === -1) throw new Error('Product not found.');
    const [removed] = products.splice(idx, 1);
    writeProducts(products);
    return removed;
  }
}

module.exports = Product;
