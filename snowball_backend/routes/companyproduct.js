// companyProductRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('./pool');
const rateLimiter = require('./rateLimiter');

// Global rate limit: 100 requests per 15 minutes per IP
router.use(rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again after 15 minutes.'
}));

// ==================== 1. RETRIEVE ALL COMPANY PRODUCTS ====================
router.post("/retrieve-company-products", (req, res) => {
  try {
    const query = `SELECT 
      companyproductid,
      icecreamname,
      entry_date,
      type,
      orderedqty,
      orderedamount,
      deliveredqty,
      deliveredamount,
      (orderedqty - deliveredqty) AS remainingqty,
      DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
      DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
    FROM company_products 
    ORDER BY icecreamname`;

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

// ==================== 2. INSERT COMPANY PRODUCT ====================
router.post("/insert-company-product", (req, res) => {
  try {
    const { 
      icecreamname, type, orderedqty, orderedamount, 
      deliveredqty, deliveredamount, entry_date 
    } = req.body;

    if (!icecreamname || !type) {
      return res.status(400).json({ status: false, message: "Ice cream name and type are required" });
    }

    const query = `INSERT INTO company_products 
      (icecreamname, type, orderedqty, orderedamount, deliveredqty, deliveredamount, entry_date, createdat, updatedat) 
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

    const values = [
      icecreamname,
      type,
      orderedqty || 0,
      orderedamount || 0,
      deliveredqty || 0,
      deliveredamount || 0,
      entry_date || new Date().toISOString().split('T')[0]
    ];

    pool.query(query, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      // Return the inserted ID and data
      pool.query(
        `SELECT companyproductid, icecreamname, type, orderedqty, orderedamount, deliveredqty, deliveredamount,
        (orderedqty - deliveredqty) AS remainingqty
        FROM company_products WHERE companyproductid = ?`,
        [result.insertId],
        (err, rows) => {
          if (err) {
            return res.status(200).json({ status: true, message: "Product added", data: { companyproductid: result.insertId } });
          }
          return res.status(200).json({ status: true, message: "Product added successfully", data: rows[0] });
        }
      );
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 3. UPDATE COMPANY PRODUCT ====================
router.post("/update-company-product", (req, res) => {
  try {
    const { 
      companyproductid, icecreamname, type, orderedqty, orderedamount,
      deliveredqty, deliveredamount, entry_date 
    } = req.body;

    if (!companyproductid) {
      return res.status(400).json({ status: false, message: "Product ID is required" });
    }

    // Build dynamic SET clause
    let updateFields = [];
    let values = [];

    if (icecreamname !== undefined) { updateFields.push('icecreamname = ?'); values.push(icecreamname); }
    if (type !== undefined) { updateFields.push('type = ?'); values.push(type); }
    if (orderedqty !== undefined) { updateFields.push('orderedqty = ?'); values.push(orderedqty); }
    if (orderedamount !== undefined) { updateFields.push('orderedamount = ?'); values.push(orderedamount); }
    if (deliveredqty !== undefined) { updateFields.push('deliveredqty = ?'); values.push(deliveredqty); }
    if (deliveredamount !== undefined) { updateFields.push('deliveredamount = ?'); values.push(deliveredamount); }
    if (entry_date !== undefined) { updateFields.push('entry_date = ?'); values.push(entry_date); }

    if (updateFields.length === 0) {
      return res.status(400).json({ status: false, message: "No fields to update" });
    }

    updateFields.push('updatedat = NOW()');
    const query = `UPDATE company_products SET ${updateFields.join(', ')} WHERE companyproductid = ?`;
    values.push(companyproductid);

    pool.query(query, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: false, message: "Product not found" });
      }

      // Fetch updated record
      pool.query(
        `SELECT companyproductid, icecreamname, type, orderedqty, orderedamount, deliveredqty, deliveredamount,
        (orderedqty - deliveredqty) AS remainingqty, entry_date
        FROM company_products WHERE companyproductid = ?`,
        [companyproductid],
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

// ==================== 4. DELETE COMPANY PRODUCT ====================
router.post("/delete-company-product", (req, res) => {
  try {
    const { companyproductid } = req.body;
    if (!companyproductid) {
      return res.status(400).json({ status: false, message: "Product ID is required" });
    }

    // Fetch before delete
    pool.query(
      `SELECT companyproductid, icecreamname, type, orderedqty, deliveredqty FROM company_products WHERE companyproductid = ?`,
      [companyproductid],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ status: false, message: "Database Error" });
        }
        if (result.length === 0) {
          return res.status(404).json({ status: false, message: "Product not found" });
        }
        const productData = result[0];
        pool.query("DELETE FROM company_products WHERE companyproductid = ?", [companyproductid], (error) => {
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