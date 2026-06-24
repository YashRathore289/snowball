// productRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('./pool');
const rateLimiter = require('./rateLimiter');

// ==================== 1. RETRIEVE PRODUCTS ====================
router.post("/retrieve-products", rateLimiter.high(), (req, res) => {
  try {
    // Frontend never sends productid for listing; only need to fetch all
    const query = `SELECT 
      productid, 
      productname, 
      productprice,
      DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
      DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
    FROM products ORDER BY productname`;

    pool.query(query, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      return res.status(200).json({
        status: true,
        message: "Success",
        count: result.length,
        data: result
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 2. INSERT PRODUCT ====================
router.post("/insert-product", rateLimiter.critical(), (req, res) => {
  try {
    const { productname, productprice } = req.body;
    if (!productname || !productprice) {
      return res.status(400).json({ status: false, message: "Product name and price are required" });
    }

    pool.query(
      "INSERT INTO products (productname, productprice, createdat, updatedat) VALUES (?, ?, NOW(), NOW())",
      [productname, productprice],
      (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ status: false, message: "Database Error" });
        }

        // Return the inserted product
        pool.query(
          `SELECT productid, productname, productprice,
          DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
          DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
          FROM products WHERE productid = ?`,
          [result.insertId],
          (err, rows) => {
            if (err) {
              return res.status(200).json({ status: true, message: "Product added", data: { productid: result.insertId } });
            }
            return res.status(200).json({ status: true, message: "Product added successfully", data: rows[0] });
          }
        );
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 3. UPDATE PRODUCT ====================
router.post("/update-product", rateLimiter.critical(), (req, res) => {
  try {
    const { productid, productname, productprice } = req.body;
    if (!productid) {
      return res.status(400).json({ status: false, message: "Product ID is required" });
    }

    let updateFields = [];
    let values = [];
    if (productname !== undefined) { updateFields.push('productname = ?'); values.push(productname); }
    if (productprice !== undefined) { updateFields.push('productprice = ?'); values.push(productprice); }

    if (updateFields.length === 0) {
      return res.status(400).json({ status: false, message: "No fields to update" });
    }

    updateFields.push('updatedat = NOW()');
    const query = `UPDATE products SET ${updateFields.join(', ')} WHERE productid = ?`;
    values.push(productid);

    pool.query(query, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: false, message: "Product not found" });
      }

      // Return the updated product
      pool.query(
        `SELECT productid, productname, productprice,
        DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
        DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
        FROM products WHERE productid = ?`,
        [productid],
        (err, rows) => {
          if (err) {
            return res.status(200).json({ status: true, message: "Product updated" });
          }
          return res.status(200).json({ status: true, message: "Product updated successfully", data: rows[0] });
        }
      );
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 4. DELETE PRODUCT ====================
router.post("/delete-product", rateLimiter.critical(), (req, res) => {
  try {
    const { productid } = req.body;
    if (!productid) {
      return res.status(400).json({ status: false, message: "Product ID is required" });
    }

    // Fetch before delete to return data
    pool.query(
      "SELECT productid, productname, productprice FROM products WHERE productid = ?",
      [productid],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ status: false, message: "Database Error" });
        }
        if (result.length === 0) {
          return res.status(404).json({ status: false, message: "Product not found" });
        }
        const productData = result[0];

        pool.query("DELETE FROM products WHERE productid = ?", [productid], (error) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ status: false, message: "Database Error" });
          }
          return res.status(200).json({ status: true, message: "Product deleted successfully", data: productData });
        });
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

module.exports = router;