// handedGoodsRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('./pool');
const rateLimiter = require('./rateLimiter');

// ==================== 1. RETRIEVE HANDED GOODS ====================
router.post("/retrieve-handed-goods", rateLimiter.high(), (req, res) => {
  try {
    const { date, month, year } = req.body;

    let query;
    let values = [];

    if (date) {
      query = `SELECT 
        h.handedgoodsid,
        h.salesmanid,
        s.fullname AS salesman_name,
        h.details,
        DATE_FORMAT(h.date, '%Y-%m-%d') AS date,
        h.returnamt,
        h.commission,
        h.finalamount,
        h.clear_status,
        h.submit_amount
      FROM handed_goods h
      LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
      WHERE h.date = ?
      ORDER BY s.fullname ASC`;
      values = [date];
    } else if (month && year) {
      query = `SELECT 
        h.handedgoodsid,
        h.salesmanid,
        s.fullname AS salesman_name,
        h.details,
        DATE_FORMAT(h.date, '%Y-%m-%d') AS date,
        h.returnamt,
        h.commission,
        h.finalamount,
        h.clear_status,
        h.submit_amount
      FROM handed_goods h
      LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
      WHERE MONTH(h.date) = ? AND YEAR(h.date) = ?
      ORDER BY h.date DESC, s.fullname ASC`;
      values = [month, year];
    } else {
      return res.status(400).json({ status: false, message: "Please provide date or month/year" });
    }

    pool.query(query, values, (error, result) => {
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

// ==================== 2. INSERT HANDED GOODS ====================
router.post("/insert-handed-goods", rateLimiter.critical(), (req, res) => {
  try {
    const { salesmanid, details, date, returnamt, commission, finalamount, clear_status, submit_amount } = req.body;

    if (!salesmanid || !details || !date) {
      return res.status(400).json({ status: false, message: "Salesman ID, Details, and Date are required" });
    }

    pool.query("SELECT salesmanid FROM salesman WHERE salesmanid = ?", [salesmanid], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      if (result.length === 0) {
        return res.status(404).json({ status: false, message: "Salesman not found" });
      }

      const returnAmt = (returnamt === null || returnamt === undefined || returnamt === '') ? null : returnamt;
      const finalAmt = finalamount !== undefined
        ? (finalamount === null ? 0 : parseFloat(finalamount))
        : (parseFloat(returnamt) || 0) + (parseFloat(commission) || 0);
      const clearVal = clear_status !== undefined ? (clear_status ? 1 : 0) : 0;
      const submitAmt = submit_amount !== undefined ? parseFloat(submit_amount) : 0;

      const query = `INSERT INTO handed_goods 
  (salesmanid, details, date, returnamt, commission, finalamount, clear_status, submit_amount, createdat, updatedat) 
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
      const values = [salesmanid, details, date, returnAmt, parseFloat(commission) || 0, finalAmt, clearVal, submitAmt];

      pool.query(query, values, (error, insertResult) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ status: false, message: "Database Error" });
        }

        const selectQuery = `SELECT 
          h.handedgoodsid,
          h.salesmanid,
          s.fullname AS salesman_name,
          h.details,
          DATE_FORMAT(h.date, '%Y-%m-%d') AS date,
          h.returnamt,
          h.commission,
          h.finalamount,
          h.clear_status,
          h.submit_amount
        FROM handed_goods h
        LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
        WHERE h.handedgoodsid = ?`;

        pool.query(selectQuery, [insertResult.insertId], (err, rows) => {
          if (err) {
            return res.status(200).json({ status: true, message: "Record added", data: { handedgoodsid: insertResult.insertId } });
          }
          return res.status(200).json({ status: true, message: "Record added successfully", data: rows[0] });
        });
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 3. UPDATE HANDED GOODS ====================
router.post("/update-handed-goods", rateLimiter.critical(), (req, res) => {
  try {
    const { handedgoodsid, salesmanid, details, date, returnamt, commission, finalamount, clear_status, submit_amount } = req.body;

    if (!handedgoodsid) {
      return res.status(400).json({ status: false, message: "Handed Goods ID is required" });
    }

    let updateFields = [];
    let values = [];

    if (salesmanid !== undefined) { updateFields.push('salesmanid = ?'); values.push(salesmanid); }
    if (details !== undefined) { updateFields.push('details = ?'); values.push(details); }
    if (date !== undefined) { updateFields.push('date = ?'); values.push(date); }
    if (returnamt !== undefined) { updateFields.push('returnamt = ?'); values.push(returnamt === null || returnamt === '' ? null : returnamt); }
    if (commission !== undefined) { updateFields.push('commission = ?'); values.push(commission === null ? null : parseFloat(commission)); }
    if (clear_status !== undefined) { updateFields.push('clear_status = ?'); values.push(clear_status ? 1 : 0); }
    if (submit_amount !== undefined) { updateFields.push('submit_amount = ?'); values.push(parseFloat(submit_amount)); }

    if (finalamount !== undefined) {
      updateFields.push('finalamount = ?');
      values.push(finalamount === null ? null : parseFloat(finalamount));
    }

    proceedUpdate();

    function proceedUpdate() {
      if (updateFields.length === 0) {
        return res.status(400).json({ status: false, message: "No fields to update" });
      }
      updateFields.push('updatedat = NOW()');
      const query = `UPDATE handed_goods SET ${updateFields.join(', ')} WHERE handedgoodsid = ?`;
      values.push(handedgoodsid);

      pool.query(query, values, (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ status: false, message: "Database Error" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ status: false, message: "Record not found" });
        }

        const selectQuery = `SELECT 
          h.handedgoodsid,
          h.salesmanid,
          s.fullname AS salesman_name,
          h.details,
          DATE_FORMAT(h.date, '%Y-%m-%d') AS date,
          h.returnamt,
          h.commission,
          h.finalamount,
          h.clear_status,
          h.submit_amount
        FROM handed_goods h
        LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
        WHERE h.handedgoodsid = ?`;

        pool.query(selectQuery, [handedgoodsid], (err, rows) => {
          if (err) {
            return res.status(200).json({ status: true, message: "Record updated" });
          }
          return res.status(200).json({ status: true, message: "Record updated successfully", data: rows[0] });
        });
      });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 4. DELETE HANDED GOODS ====================
router.post("/delete-handed-goods", rateLimiter.critical(), (req, res) => {
  try {
    const { handedgoodsid } = req.body;
    if (!handedgoodsid) {
      return res.status(400).json({ status: false, message: "Handed Goods ID is required" });
    }

    const selectQuery = `SELECT 
      h.handedgoodsid, h.salesmanid, s.fullname AS salesman_name, h.details,
      DATE_FORMAT(h.date, '%Y-%m-%d') AS date, h.returnamt, h.commission, h.finalamount,
      h.clear_status, h.submit_amount
    FROM handed_goods h
    LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
    WHERE h.handedgoodsid = ?`;

    pool.query(selectQuery, [handedgoodsid], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      if (result.length === 0) {
        return res.status(404).json({ status: false, message: "Record not found" });
      }
      const recordData = result[0];
      pool.query("DELETE FROM handed_goods WHERE handedgoodsid = ?", [handedgoodsid], (error) => {
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

// ==================== 5. MONTHLY SALES REPORT ====================
router.post("/monthly-sales-report", rateLimiter.low(), (req, res) => {
  try {
    const { month, year } = req.body;
    const searchMonth = month || new Date().getMonth() + 1;
    const searchYear = year || new Date().getFullYear();

    const query = `
      SELECT 
        s.salesmanid,
        s.fullname AS salesman_name,
        DATE_FORMAT(hg.date, '%Y-%m-%d') AS sale_date,
        hg.returnamt,
        hg.commission,
        hg.finalamount,
        hg.clear_status,
        hg.submit_amount,
        hg.details
      FROM salesman s
      LEFT JOIN handed_goods hg ON s.salesmanid = hg.salesmanid 
        AND MONTH(hg.date) = ? 
        AND YEAR(hg.date) = ?
      WHERE s.salesmanid IN (SELECT DISTINCT salesmanid FROM handed_goods WHERE MONTH(date) = ? AND YEAR(date) = ?)
      ORDER BY hg.date ASC, s.fullname ASC
    `;

    pool.query(query, [searchMonth, searchYear, searchMonth, searchYear], (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }

      const salesmenData = {};
      const allDates = new Set();

      result.forEach(record => {
        const sid = record.salesmanid;
        const sname = record.salesman_name;
        const saleDate = record.sale_date;
        const submitAmount = parseFloat(record.submit_amount) || 0;
        const finalAmount = parseFloat(record.finalamount) || 0;

        // Use submit_amount if available (> 0), otherwise use finalamount
        const displayAmount = submitAmount > 0 ? submitAmount : finalAmount;

        if (!salesmenData[sid]) {
          salesmenData[sid] = {
            salesmanid: sid,
            salesman_name: sname,
            entries: {},
            total: 0
          };
        }

        if (saleDate) {
          salesmenData[sid].entries[saleDate] = displayAmount;
          salesmenData[sid].total += displayAmount;
          allDates.add(saleDate);
        }
      });

      const sortedDates = Array.from(allDates).sort();
      const salesmenArray = Object.values(salesmenData);
      const grandTotal = salesmenArray.reduce((sum, s) => sum + s.total, 0);

      const reportData = {
        month: searchMonth,
        year: searchYear,
        dates: sortedDates,
        salesmen: salesmenArray,
        grandTotal: grandTotal
      };

      return res.status(200).json({ status: true, message: "Success", data: reportData });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

router.post("/retrieve-account-summary", rateLimiter.high(), (req, res) => {
  try {
    const query = `
      SELECT 
        s.salesmanid,
        s.fullname,
        s.mobileno,
        hg.details,
        hg.submit_amount,
        hg.clear_status
      FROM salesman s
      LEFT JOIN handed_goods hg ON s.salesmanid = hg.salesmanid
      ORDER BY s.fullname ASC
    `;

    pool.query(query, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }

      // Process results in Node.js
      const salesmenMap = {};

      result.forEach(row => {
        if (!salesmenMap[row.salesmanid]) {
          salesmenMap[row.salesmanid] = {
            salesmanid: row.salesmanid,
            fullname: row.fullname,
            mobileno: row.mobileno,
            total_items: 0,
            total_submit: 0,
            has_pending: false // 👈 CHANGED: Track if has pending entries
          };
        }

        // Skip if no handed_goods record (LEFT JOIN returns null)
        if (!row.details) return;

        // Parse details JSON
        let details = row.details;
        if (typeof details === 'string') {
          try { details = JSON.parse(details); } catch (e) { details = null; }
        }

        if (!details || !details.items) return;

        // Only count non-cleared entries
        if (row.clear_status === 0) {
          salesmenMap[row.salesmanid].has_pending = true; // 👈 CHANGED: Mark as pending

          // Sum item totals
          details.items.forEach(item => {
            const qty = parseFloat(item.qty) || 0;
            const price = parseFloat(item.price) || 0;
            const total = parseFloat(item.total) || (qty * price);
            salesmenMap[row.salesmanid].total_items += total;
          });

          // Add submit amount
          salesmenMap[row.salesmanid].total_submit += parseFloat(row.submit_amount || 0) || 0;
        }
      });

      // 👈 CHANGED: Only return salesmen with pending entries
      const data = Object.values(salesmenMap).filter(s => s.has_pending);

      return res.status(200).json({
        status: true,
        message: "Success",
        count: data.length,
        data: data
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 2. RETRIEVE SALESMAN ENTRIES ====================
router.post("/retrieve-salesman-entries", rateLimiter.high(), (req, res) => {
  try {
    const { salesmanid, from_date, to_date } = req.body;

    if (!salesmanid) {
      return res.status(400).json({ status: false, message: "Salesman ID is required" });
    }

    let query = `
      SELECT 
        handedgoodsid,
        salesmanid,
        DATE_FORMAT(date, '%Y-%m-%d') AS date,
        details,
        finalamount,
        submit_amount,
        clear_status
      FROM handed_goods
      WHERE salesmanid = ?
    `;

    let values = [salesmanid];

    // Add date filter if provided
    if (from_date && to_date) {
      query += ` AND date BETWEEN ? AND ?`;
      values.push(from_date, to_date);
    }

    query += ` ORDER BY date ASC`;

    pool.query(query, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }

      const parsedResult = result.map(record => {
        let details = record.details;
        if (typeof details === 'string') {
          details = JSON.parse(details);
        }

        let itemTotal = 0;
        if (details?.items && Array.isArray(details.items)) {
          itemTotal = details.items.reduce((sum, item) => {
            return sum + (parseFloat(item.total) || parseFloat(item.qty || 0) * parseFloat(item.price || 0) || 0);
          }, 0);
        }

        return {
          handedgoodsid: record.handedgoodsid,
          salesmanid: record.salesmanid,
          date: record.date,
          item_total: itemTotal,
          finalamount: record.finalamount,
          submit_amount: record.submit_amount,
          clear_status: record.clear_status
        };
      });

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

// ==================== SAVE SETTLEMENT ====================
router.post("/save-settlement", rateLimiter.critical(), (req, res) => {
  try {
    const {
      salesmanid,
      total_item_amount,
      return_amount,
      after_return,
      commission_amount,
      after_commission,
      final_balance
    } = req.body;

    if (!salesmanid) {
      return res.status(400).json({ status: false, message: "Salesman ID is required" });
    }

    const settlementDate = new Date().toISOString().split('T')[0];

    // Step 1: Set clear_status = 1 for all currently uncleared entries
    // 👈 CHANGED: Also update finalamount and submit_amount for today's entries
    pool.query(
      `UPDATE handed_goods 
       SET clear_status = 1, 
           finalamount = CASE WHEN date = ? THEN ? ELSE finalamount END,
           submit_amount = CASE WHEN date = ? THEN ? ELSE submit_amount END,
           updatedat = NOW() 
       WHERE salesmanid = ? AND clear_status = 0`,
      [settlementDate, final_balance || 0, settlementDate, final_balance || 0, salesmanid],
      (err, updateResult) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ status: false, message: "Database Error" });
        }

        // Save to account_settlements
        const checkQuery = "SELECT settlementid FROM account_settlements WHERE salesmanid = ? ORDER BY createdat DESC LIMIT 1";

        pool.query(checkQuery, [salesmanid], (err, checkResult) => {
          if (err) {
            console.error(err);
            return res.status(500).json({ status: false, message: "Database Error" });
          }

          if (checkResult.length > 0) {
            // Update existing settlement
            const updateQuery = `
              UPDATE account_settlements 
              SET total_item_amount = ?, return_amount = ?, after_return = ?, 
                  commission_amount = ?, after_commission = ?, final_balance = ?,
                  settlement_date = ?, updatedat = NOW()
              WHERE settlementid = ?`;
            const values = [
              total_item_amount || 0, return_amount || 0, after_return || 0,
              commission_amount || 0, after_commission || 0, final_balance || 0,
              settlementDate, checkResult[0].settlementid
            ];

            pool.query(updateQuery, values, (error) => {
              if (error) {
                console.error(error);
                return res.status(500).json({ status: false, message: "Database Error" });
              }
              return res.status(200).json({
                status: true,
                message: "Settlement updated successfully",
                clearedEntries: updateResult.affectedRows
              });
            });
          } else {
            // Insert new settlement
            const insertQuery = `
              INSERT INTO account_settlements 
              (salesmanid, total_item_amount, return_amount, after_return, 
               commission_amount, after_commission, final_balance, settlement_date, createdat, updatedat) 
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;
            const values = [
              salesmanid, total_item_amount || 0, return_amount || 0, after_return || 0,
              commission_amount || 0, after_commission || 0, final_balance || 0, settlementDate
            ];

            pool.query(insertQuery, values, (error) => {
              if (error) {
                console.error(error);
                return res.status(500).json({ status: false, message: "Database Error" });
              }
              return res.status(200).json({
                status: true,
                message: "Settlement saved successfully",
                clearedEntries: updateResult.affectedRows
              });
            });
          }
        });
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

module.exports = router;