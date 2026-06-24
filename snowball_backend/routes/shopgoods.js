// shopGoodsRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('./pool');
const rateLimiter = require('./rateLimiter');

// ==================== 1. RETRIEVE SHOP GOODS ====================
router.post("/retrieve-shop-goods", rateLimiter.high(), (req, res) => {
  try {
    const { date, month, year } = req.body; // only these are sent by frontend

    let query;
    let values = [];

    if (date) {
      query = `SELECT 
        shopgoodsid,
        shopownerid,
        details,
        DATE_FORMAT(date, '%Y-%m-%d') AS date,
        commission,
        finalamount
      FROM shop_goods 
      WHERE date = ?
      ORDER BY shopownerid ASC`;
      values = [date];
    } else if (month && year) {
      query = `SELECT 
        shopgoodsid,
        shopownerid,
        details,
        DATE_FORMAT(date, '%Y-%m-%d') AS date,
        commission,
        finalamount
      FROM shop_goods 
      WHERE MONTH(date) = ? AND YEAR(date) = ?
      ORDER BY date DESC, shopownerid ASC`;
      values = [month, year];
    } else {
      // Should not happen, but fallback to all records ordered by date
      query = `SELECT 
        shopgoodsid,
        shopownerid,
        details,
        DATE_FORMAT(date, '%Y-%m-%d') AS date,
        commission,
        finalamount
      FROM shop_goods 
      ORDER BY date DESC, shopownerid ASC`;
    }

    pool.query(query, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }

      // Parse details JSON for each record
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

// ==================== 2. INSERT SHOP GOODS ====================
router.post("/insert-shop-goods", rateLimiter.critical(), (req, res) => {
  try {
    const { shopownerid, details, date, commission, finalamount } = req.body;

    if (!shopownerid || !details || !date) {
      return res.status(400).json({ status: false, message: "Shop owner ID, details, and date are required" });
    }

    const query = `INSERT INTO shop_goods 
      (shopownerid, details, date, commission, finalamount, createdat, updatedat) 
      VALUES (?, ?, ?, ?, ?, NOW(), NOW())`;
    const values = [
      shopownerid,
      details,
      date,
      commission || 0,
      finalamount || 0
    ];

    pool.query(query, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }

      // Return the inserted record
      const selectQuery = `SELECT 
        shopgoodsid,
        shopownerid,
        details,
        DATE_FORMAT(date, '%Y-%m-%d') AS date,
        commission,
        finalamount
      FROM shop_goods WHERE shopgoodsid = ?`;

      pool.query(selectQuery, [result.insertId], (err, rows) => {
        if (err) {
          return res.status(200).json({ status: true, message: "Record added", data: { shopgoodsid: result.insertId } });
        }
        return res.status(200).json({ status: true, message: "Record added successfully", data: rows[0] });
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 3. UPDATE SHOP GOODS ====================
router.post("/update-shop-goods", rateLimiter.critical(), (req, res) => {
  try {
    const { shopgoodsid, shopownerid, details, date, commission, finalamount } = req.body;

    if (!shopgoodsid) {
      return res.status(400).json({ status: false, message: "Shop Goods ID is required" });
    }

    let updateFields = [];
    let values = [];

    if (shopownerid !== undefined) { updateFields.push('shopownerid = ?'); values.push(shopownerid); }
    if (details !== undefined) { updateFields.push('details = ?'); values.push(details); }
    if (date !== undefined) { updateFields.push('date = ?'); values.push(date); }
    if (commission !== undefined) { updateFields.push('commission = ?'); values.push(commission); }
    if (finalamount !== undefined) { updateFields.push('finalamount = ?'); values.push(finalamount); }

    if (updateFields.length === 0) {
      return res.status(400).json({ status: false, message: "No fields to update" });
    }

    updateFields.push('updatedat = NOW()');
    const query = `UPDATE shop_goods SET ${updateFields.join(', ')} WHERE shopgoodsid = ?`;
    values.push(shopgoodsid);

    pool.query(query, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: false, message: "Record not found" });
      }

      // Return updated record
      const selectQuery = `SELECT 
        shopgoodsid,
        shopownerid,
        details,
        DATE_FORMAT(date, '%Y-%m-%d') AS date,
        commission,
        finalamount
      FROM shop_goods WHERE shopgoodsid = ?`;

      pool.query(selectQuery, [shopgoodsid], (err, rows) => {
        if (err) {
          return res.status(200).json({ status: true, message: "Record updated" });
        }
        return res.status(200).json({ status: true, message: "Record updated successfully", data: rows[0] });
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 4. DELETE SHOP GOODS ====================
router.post("/delete-shop-goods", rateLimiter.critical(), (req, res) => {
  try {
    const { shopgoodsid } = req.body;
    if (!shopgoodsid) {
      return res.status(400).json({ status: false, message: "Shop Goods ID is required" });
    }

    // Fetch before delete
    const selectQuery = `SELECT 
      shopgoodsid, shopownerid, details,
      DATE_FORMAT(date, '%Y-%m-%d') AS date,
      commission, finalamount
    FROM shop_goods WHERE shopgoodsid = ?`;

    pool.query(selectQuery, [shopgoodsid], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      if (result.length === 0) {
        return res.status(404).json({ status: false, message: "Record not found" });
      }

      const recordData = result[0];

      pool.query("DELETE FROM shop_goods WHERE shopgoodsid = ?", [shopgoodsid], (error) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ status: false, message: "Database Error" });
        }
        return res.status(200).json({ status: true, message: "Record deleted successfully", data: recordData });
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

module.exports = router;