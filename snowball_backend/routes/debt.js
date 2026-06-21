// debtRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('./pool');
const rateLimiter = require('./ratelimiter');

// Global rate limit for all debt routes: 100 requests per 15 minutes per IP
router.use(rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again after 15 minutes.'
}));

// ==================== 1. RETRIEVE DEBTS ====================
router.post("/retrieve-debts", (req, res) => {
    try {
        const { debtid, salesmanid } = req.body;

        let query;
        let values = [];

        if (debtid) {
            query = `SELECT 
                d.debtid,
                d.salesmanid,
                s.fullname AS salesman_name,
                s.mobileno AS salesman_mobile,
                d.type,
                DATE_FORMAT(d.debt_date, '%Y-%m-%d') AS debt_date,
                d.amount
            FROM salesman_debt d
            LEFT JOIN salesman s ON d.salesmanid = s.salesmanid
            WHERE d.debtid = ?`;
            values = [debtid];
        } else if (salesmanid) {
            query = `SELECT 
                d.debtid,
                d.salesmanid,
                s.fullname AS salesman_name,
                s.mobileno AS salesman_mobile,
                d.type,
                DATE_FORMAT(d.debt_date, '%Y-%m-%d') AS debt_date,
                d.amount
            FROM salesman_debt d
            LEFT JOIN salesman s ON d.salesmanid = s.salesmanid
            WHERE d.salesmanid = ?
            ORDER BY d.debt_date DESC`;
            values = [salesmanid];
        } else {
            query = `SELECT 
                d.debtid,
                d.salesmanid,
                s.fullname AS salesman_name,
                s.mobileno AS salesman_mobile,
                d.type,
                DATE_FORMAT(d.debt_date, '%Y-%m-%d') AS debt_date,
                d.amount
            FROM salesman_debt d
            LEFT JOIN salesman s ON d.salesmanid = s.salesmanid
            ORDER BY d.debt_date DESC`;
        }

        pool.query(query, values, (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: false, message: "Database Error" });
            }
            if (debtid && result.length === 0) {
                return res.status(404).json({ status: false, message: "Debt record not found", data: [] });
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

// ==================== 2. INSERT DEBT ====================
router.post("/insert-debt", (req, res) => {
    try {
        const { salesmanid, type, debt_date, amount } = req.body;

        if (!salesmanid || !type || !debt_date || !amount) {
            return res.status(400).json({ status: false, message: "Salesman ID, Type, Date, and Amount are required" });
        }

        // Verify salesman exists
        pool.query("SELECT salesmanid FROM salesman WHERE salesmanid = ?", [salesmanid], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Database Error" });
            }
            if (result.length === 0) {
                return res.status(404).json({ status: false, message: "Salesman not found" });
            }

            pool.query(
                "INSERT INTO salesman_debt (salesmanid, type, debt_date, amount, createdat, updatedat) VALUES (?, ?, ?, ?, NOW(), NOW())",
                [salesmanid, type, debt_date, amount],
                (error, insertResult) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).json({ status: false, message: "Database Error" });
                    }

                    // Fetch the newly inserted record
                    pool.query(
                        `SELECT d.debtid, d.salesmanid, s.fullname AS salesman_name, d.type, DATE_FORMAT(d.debt_date, '%Y-%m-%d') AS debt_date, d.amount
                        FROM salesman_debt d
                        LEFT JOIN salesman s ON d.salesmanid = s.salesmanid
                        WHERE d.debtid = ?`,
                        [insertResult.insertId],
                        (err, rows) => {
                            if (err) {
                                return res.status(200).json({ status: true, message: "Debt record added", data: { debtid: insertResult.insertId } });
                            }
                            return res.status(200).json({ status: true, message: "Debt record added successfully", data: rows[0] });
                        }
                    );
                }
            );
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: false, message: "Technical Issue" });
    }
});

// ==================== 3. UPDATE DEBT ====================
router.post("/update-debt", (req, res) => {
    try {
        const { debtid, salesmanid, type, debt_date, amount } = req.body;

        if (!debtid) {
            return res.status(400).json({ status: false, message: "Debt ID is required" });
        }

        let updateFields = [];
        let values = [];

        if (salesmanid !== undefined) { updateFields.push('salesmanid = ?'); values.push(salesmanid); }
        if (type !== undefined) { updateFields.push('type = ?'); values.push(type); }
        if (debt_date !== undefined) { updateFields.push('debt_date = ?'); values.push(debt_date); }
        if (amount !== undefined) { updateFields.push('amount = ?'); values.push(amount); }

        if (updateFields.length === 0) {
            return res.status(400).json({ status: false, message: "No fields to update" });
        }

        updateFields.push('updatedat = NOW()');
        const query = `UPDATE salesman_debt SET ${updateFields.join(', ')} WHERE debtid = ?`;
        values.push(debtid);

        pool.query(query, values, (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: false, message: "Database Error" });
            }
            if (result.affectedRows === 0) {
                return res.status(404).json({ status: false, message: "Debt record not found" });
            }

            // Fetch updated record
            pool.query(
                `SELECT d.debtid, d.salesmanid, s.fullname AS salesman_name, d.type, DATE_FORMAT(d.debt_date, '%Y-%m-%d') AS debt_date, d.amount
                FROM salesman_debt d
                LEFT JOIN salesman s ON d.salesmanid = s.salesmanid
                WHERE d.debtid = ?`,
                [debtid],
                (err, rows) => {
                    if (err) {
                        return res.status(200).json({ status: true, message: "Debt record updated" });
                    }
                    return res.status(200).json({ status: true, message: "Debt record updated successfully", data: rows[0] });
                }
            );
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: false, message: "Technical Issue" });
    }
});

// ==================== 4. DELETE DEBT ====================
router.post("/delete-debt", (req, res) => {
    try {
        const { debtid } = req.body;

        if (!debtid) {
            return res.status(400).json({ status: false, message: "Debt ID is required" });
        }

        // Fetch before delete
        pool.query(
            `SELECT d.debtid, d.salesmanid, s.fullname AS salesman_name, d.type, DATE_FORMAT(d.debt_date, '%Y-%m-%d') AS debt_date, d.amount
            FROM salesman_debt d
            LEFT JOIN salesman s ON d.salesmanid = s.salesmanid
            WHERE d.debtid = ?`,
            [debtid],
            (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ status: false, message: "Database Error" });
                }
                if (result.length === 0) {
                    return res.status(404).json({ status: false, message: "Debt record not found" });
                }
                const debtData = result[0];
                pool.query("DELETE FROM salesman_debt WHERE debtid = ?", [debtid], (error) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).json({ status: false, message: "Database Error" });
                    }
                    return res.status(200).json({ status: true, message: "Debt record deleted successfully", data: debtData });
                });
            }
        );
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: false, message: "Technical Issue" });
    }
});

module.exports = router;