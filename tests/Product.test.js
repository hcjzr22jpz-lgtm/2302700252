'use strict';

const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');

const dataFile = path.join(__dirname, '..', 'data', 'products.json');
let originalProducts;

beforeAll(() => {
  originalProducts = fs.readFileSync(dataFile, 'utf8');
});

beforeEach(() => fs.writeFileSync(dataFile, originalProducts));
afterEach(() => fs.writeFileSync(dataFile, originalProducts));
afterAll(() => fs.writeFileSync(dataFile, originalProducts));

describe('Product model', () => {
  test('getAll returns all products', () => {
    const products = Product.getAll();
    expect(products).toBeInstanceOf(Array);
    expect(products.length).toBeGreaterThanOrEqual(6);
  });

  test('getById returns the correct product', () => {
    const product = Product.getById(1);
    expect(product).toBeDefined();
    expect(product.id).toBe(1);
    expect(product.name).toContain('Sauce Labs Backpack');
  });

  test('getById returns undefined for missing product', () => {
    expect(Product.getById(999)).toBeUndefined();
  });

  test('getCategories returns unique categories', () => {
    const categories = Product.getCategories();
    expect(Array.isArray(categories)).toBe(true);
    expect(new Set(categories).size).toBe(categories.length);
    expect(categories).toEqual(expect.arrayContaining(['Accessories', 'Apparel', 'Outdoor']));
  });

  test('getTypes returns unique types from JSON', () => {
    const types = Product.getTypes();
    expect(Array.isArray(types)).toBe(true);
    expect(new Set(types).size).toBe(types.length);
    expect(types).toEqual(expect.arrayContaining(['Backpack', 'T-Shirt', 'Onesie']));
  });

  test('add creates and persists a new product', () => {
    const created = Product.add({
      name: 'QA Hoodie',
      price: '24.50',
      image: '/images/fleece-jacket.svg',
      category: 'Apparel',
      type: 'Hoodie',
      badge: 'New',
      desc: 'Warm staff favorite.',
    });

    expect(created.id).toBeGreaterThan(6);
    expect(created.price).toBe(24.5);
    expect(Product.getById(created.id)).toMatchObject({ name: 'QA Hoodie', type: 'Hoodie' });
  });

  test('update edits an existing product', () => {
    const updated = Product.update(1, { price: '31.25', badge: 'Sale' });
    expect(updated.price).toBe(31.25);
    expect(updated.badge).toBe('Sale');
    expect(Product.getById(1).price).toBe(31.25);
  });

  test('remove deletes and returns a product', () => {
    const removed = Product.remove(2);
    expect(removed.id).toBe(2);
    expect(Product.getById(2)).toBeUndefined();
  });

  test('throws when required product fields are missing', () => {
    expect(() => Product.add({ name: '', price: 10, category: '', type: '' }))
      .toThrow('Product name, category, and type are required.');
  });

  test('throws when product price is invalid', () => {
    expect(() => Product.update(1, { price: 0 })).toThrow('Product price must be greater than 0.');
  });

  test('throws when updating or removing an unknown product', () => {
    expect(() => Product.update(999, { name: 'Ghost' })).toThrow('Product not found.');
    expect(() => Product.remove(999)).toThrow('Product not found.');
  });
});
