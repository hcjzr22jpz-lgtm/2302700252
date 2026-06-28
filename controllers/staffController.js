'use strict';

const Account = require('../models/Account');
const Cart = require('../models/Cart');
const Order = require('../models/Order');
const Product = require('../models/Product');

function getCart(req) {
  return new Cart(req.session.cart || {});
}

function baseViewData(req, extra = {}) {
  return {
    cartCount: getCart(req).count,
    ...extra,
  };
}

function productFromBody(body) {
  return {
    name: body.name,
    price: body.price,
    image: body.image,
    category: body.category,
    type: body.type,
    badge: body.badge,
    desc: body.desc,
  };
}

function productFormData(req, extra = {}) {
  return baseViewData(req, {
    categories: Product.getCategories(),
    types: Product.getTypes(),
    ...extra,
  });
}

function orderFormData(req, extra = {}) {
  const selectedCustomerId = extra.selectedCustomerId || '';
  const quantities = extra.quantities || {};
  return baseViewData(req, {
    customers: Account.getCustomers().map(customer => ({
      ...customer,
      selected: String(customer.id) === String(selectedCustomerId),
    })),
    products: Product.getAll().map(product => ({
      ...product,
      qty: quantities[`qty_${product.id}`] || '',
    })),
    ...extra,
  });
}

exports.redirectToProducts = (_req, res) => {
  res.redirect('/staff/products');
};

exports.listProducts = (req, res) => {
  const messages = {
    created: req.query.created === '1' ? 'Product created successfully.' : null,
    updated: req.query.updated === '1' ? 'Product updated successfully.' : null,
    deleted: req.query.deleted === '1' ? 'Product deleted successfully.' : null,
  };

  res.render('staff-products', baseViewData(req, {
    products: Product.getAll(),
    messages,
  }));
};

exports.showNewProduct = (req, res) => {
  res.render('staff-product-form', productFormData(req, {
    title: 'Add Product',
    action: '/staff/products',
    product: {},
  }));
};

exports.createProduct = (req, res) => {
  try {
    Product.add(productFromBody(req.body));
    res.redirect('/staff/products?created=1');
  } catch (err) {
    res.status(400).render('staff-product-form', productFormData(req, {
      title: 'Add Product',
      action: '/staff/products',
      product: productFromBody(req.body),
      error: err.message,
    }));
  }
};

exports.showEditProduct = (req, res) => {
  const product = Product.getById(req.params.id);
  if (!product) return res.status(404).send('Product not found');

  res.render('staff-product-form', productFormData(req, {
    title: 'Edit Product',
    action: `/staff/products/${product.id}/edit`,
    product,
    isEdit: true,
  }));
};

exports.updateProduct = (req, res) => {
  try {
    Product.update(req.params.id, productFromBody(req.body));
    res.redirect('/staff/products?updated=1');
  } catch (err) {
    res.status(err.message === 'Product not found.' ? 404 : 400).render('staff-product-form', productFormData(req, {
      title: 'Edit Product',
      action: `/staff/products/${req.params.id}/edit`,
      product: { ...productFromBody(req.body), id: req.params.id },
      isEdit: true,
      error: err.message,
    }));
  }
};

exports.deleteProduct = (req, res) => {
  try {
    Product.remove(req.params.id);
    res.redirect('/staff/products?deleted=1');
  } catch (err) {
    res.status(404).send(err.message);
  }
};

exports.showCreateOrder = (req, res) => {
  res.render('staff-order', orderFormData(req));
};

exports.createOrder = (req, res) => {
  try {
    const items = Product.getAll().map(product => ({
      productId: product.id,
      qty: req.body[`qty_${product.id}`],
    }));
    const order = Order.createForCustomer(req.body.customerId, items, req.session.user);
    res.render('order-complete', baseViewData(req, { order }));
  } catch (err) {
    res.status(400).render('staff-order', orderFormData(req, {
      selectedCustomerId: req.body.customerId,
      quantities: req.body,
      error: err.message,
    }));
  }
};
