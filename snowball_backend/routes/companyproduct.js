const express = require('express');
const router = express.Router();
const pool = require('./pool');
const rateLimiter = require('./rateLimiter');

// ==================== 1. RETRIEVE ALL COMPANY PRODUCTS ====================
router.post("/retrieve-company-products", rateLimiter.high(), (req, res) => {
  try {
    const query = `SELECT 
      companyproductid,
      entry_date,
      details,
      DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
      DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
    FROM company_products 
    ORDER BY entry_date DESC`;

    pool.query(query, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }

      const parsedResult = result.map(record => ({
        ...record,
        details: typeof record.details === 'string' ? JSON.parse(record.details) : record.details
      }));

      return res.status(200).json({
        status: true,
        message: "Success",
        count: parsedResult.length,
        data: parsedResult
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 2. INSERT COMPANY PRODUCT (only details + entry_date) ====================
router.post("/insert-company-product", rateLimiter.critical(), (req, res) => {
  try {
    const { entry_date, details } = req.body;

    if (!details || (Array.isArray(details) && details.length === 0)) {
      return res.status(400).json({ status: false, message: "At least one product detail is required" });
    }

    const query = `INSERT INTO company_products 
      (entry_date, details, createdat, updatedat) 
      VALUES (?, ?, NOW(), NOW())`;

    const values = [
      entry_date || new Date().toISOString().split('T')[0],
      JSON.stringify(details)
    ];

    pool.query(query, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }

      pool.query(
        `SELECT companyproductid, entry_date, details FROM company_products WHERE companyproductid = ?`,
        [result.insertId],
        (err, rows) => {
          if (err) {
            return res.status(200).json({ status: true, message: "Product added", data: { companyproductid: result.insertId } });
          }
          const data = rows[0];
          data.details = typeof data.details === 'string' ? JSON.parse(data.details) : data.details;
          return res.status(200).json({ status: true, message: "Product added successfully", data });
        }
      );
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 3. UPDATE COMPANY PRODUCT ====================
router.post("/update-company-product", rateLimiter.critical(), (req, res) => {
  try {
    const { companyproductid, entry_date, details } = req.body;

    if (!companyproductid) {
      return res.status(400).json({ status: false, message: "Product ID is required" });
    }

    let updateFields = [];
    let values = [];

    if (entry_date !== undefined) { updateFields.push('entry_date = ?'); values.push(entry_date); }
    if (details !== undefined) { updateFields.push('details = ?'); values.push(JSON.stringify(details)); }

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

      pool.query(
        `SELECT companyproductid, entry_date, details FROM company_products WHERE companyproductid = ?`,
        [companyproductid],
        (err, rows) => {
          if (err) {
            return res.status(200).json({ status: true, message: "Product updated" });
          }
          const data = rows[0];
          data.details = typeof data.details === 'string' ? JSON.parse(data.details) : data.details;
          return res.status(200).json({ status: true, message: "Product updated successfully", data });
        }
      );
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 4. DELETE COMPANY PRODUCT ====================
router.post("/delete-company-product", rateLimiter.critical(), (req, res) => {
  try {
    const { companyproductid } = req.body;
    if (!companyproductid) {
      return res.status(400).json({ status: false, message: "Product ID is required" });
    }

    pool.query(
      `SELECT companyproductid, entry_date, details FROM company_products WHERE companyproductid = ?`,
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
        productData.details = typeof productData.details === 'string' ? JSON.parse(productData.details) : productData.details;
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

// ==================== 5. GET UNIQUE MONTHS/YEARS FROM DATA ====================
router.post("/get-available-months", rateLimiter.low(), (req, res) => {
  try {
    const query = `SELECT DISTINCT 
      DATE_FORMAT(entry_date, '%Y-%m') AS month_key,
      DATE_FORMAT(entry_date, '%M %Y') AS month_label,
      DATE_FORMAT(entry_date, '%Y') AS year,
      DATE_FORMAT(entry_date, '%m') AS month
    FROM company_products 
    ORDER BY entry_date DESC`;

    pool.query(query, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      return res.status(200).json({
        status: true,
        message: "Success",
        data: result
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 6. RETRIEVE COMPANY PRODUCTS BY MONTH/YEAR ====================
router.post("/retrieve-company-products-by-month", rateLimiter.low(), (req, res) => {
  try {
    const { month, year } = req.body;

    let query = `SELECT 
      companyproductid,
      entry_date,
      details,
      DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
      DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
    FROM company_products WHERE 1=1`;

    let values = [];

    if (year) {
      query += ` AND YEAR(entry_date) = ?`;
      values.push(year);
    }
    if (month) {
      query += ` AND MONTH(entry_date) = ?`;
      values.push(month);
    }

    query += ` ORDER BY entry_date DESC`;

    pool.query(query, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }

      const parsedResult = result.map(record => ({
        ...record,
        details: typeof record.details === 'string' ? JSON.parse(record.details) : record.details
      }));

      return res.status(200).json({
        status: true,
        message: "Success",
        count: parsedResult.length,
        data: parsedResult
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

module.exports = router;