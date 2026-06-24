const express = require('express');
const router = express.Router();
const pool = require('./pool');
const rateLimiter = require('./rateLimiter');

// ==================== 1. RETRIEVE ATTENDANCE ====================
router.post("/retrieve-attendance", rateLimiter.high(), async (req, res) => {
    try {
        const { attendance_date, month, year } = req.body;

        let query;
        let values = [];

        if (attendance_date) {
            // Daily view: get all records for this date
            query = `SELECT 
        sa.attendanceid,
        sa.salesmanid,
        s.fullname AS salesman_name,
        DATE_FORMAT(sa.attendance_date, '%Y-%m-%d') AS attendance_date,
        sa.status
      FROM salesman_attendance sa
      LEFT JOIN salesman s ON sa.salesmanid = s.salesmanid
      WHERE sa.attendance_date = ?
      ORDER BY s.fullname`;
            values = [attendance_date];
        } else if (month && year) {
            // Monthly view: get all records for the whole month
            query = `SELECT 
        sa.attendanceid,
        sa.salesmanid,
        s.fullname AS salesman_name,
        DATE_FORMAT(sa.attendance_date, '%Y-%m-%d') AS attendance_date,
        sa.status
      FROM salesman_attendance sa
      LEFT JOIN salesman s ON sa.salesmanid = s.salesmanid
      WHERE MONTH(sa.attendance_date) = ? AND YEAR(sa.attendance_date) = ?
      ORDER BY sa.attendance_date DESC, s.fullname`;
            values = [month, year];
        } else {
            return res.status(400).json({
                status: false,
                message: "Either attendance_date or (month and year) is required"
            });
        }

        pool.query(query, values, (error, result) => {
            if (error) {
                console.error(error);
                return res.status(500).json({ status: false, message: "Database Error" });
            }
            res.status(200).json({
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

// ==================== 2. MARK ATTENDANCE (upsert) ====================
// Stricter limit: 10 requests per minute per IP
router.post("/mark-attendance", rateLimiter.critical(), async (req, res) => {
    try {
        const { salesmanid, attendance_date, status } = req.body;

        if (!salesmanid || !attendance_date || !status) {
            return res.status(400).json({
                status: false,
                message: "salesmanid, attendance_date and status are required"
            });
        }

        // Validate salesman exists
        pool.query("SELECT salesmanid FROM salesman WHERE salesmanid = ?", [salesmanid], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Database Error" });
            }
            if (result.length === 0) {
                return res.status(404).json({ status: false, message: "Salesman not found" });
            }

            // Check if attendance already exists for this salesman + date
            const checkQuery = "SELECT attendanceid FROM salesman_attendance WHERE salesmanid = ? AND attendance_date = ?";
            pool.query(checkQuery, [salesmanid, attendance_date], (err, checkResult) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ status: false, message: "Database Error" });
                }

                if (checkResult.length > 0) {
                    // Update
                    const updateQuery = "UPDATE salesman_attendance SET status = ?, updatedat = NOW() WHERE salesmanid = ? AND attendance_date = ?";
                    pool.query(updateQuery, [status, salesmanid, attendance_date], (err) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ status: false, message: "Database Error" });
                        }
                        return res.status(200).json({ status: true, message: "Attendance updated successfully" });
                    });
                } else {
                    // Insert
                    const insertQuery = "INSERT INTO salesman_attendance (salesmanid, attendance_date, status, createdat, updatedat) VALUES (?, ?, ?, NOW(), NOW())";
                    pool.query(insertQuery, [salesmanid, attendance_date, status], (err, insertResult) => {
                        if (err) {
                            console.error(err);
                            return res.status(500).json({ status: false, message: "Database Error" });
                        }
                        return res.status(200).json({
                            status: true,
                            message: "Attendance marked successfully",
                            data: { attendanceid: insertResult.insertId, salesmanid, attendance_date, status }
                        });
                    });
                }
            });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: false, message: "Technical Issue" });
    }
});

// ==================== 3. DELETE ATTENDANCE ====================
router.post("/delete-attendance", rateLimiter.critical(), async (req, res) => {
    try {
        const { attendanceid } = req.body;
        if (!attendanceid) {
            return res.status(400).json({ status: false, message: "attendanceid is required" });
        }

        const selectQuery = "SELECT * FROM salesman_attendance WHERE attendanceid = ?";
        pool.query(selectQuery, [attendanceid], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Database Error" });
            }
            if (result.length === 0) {
                return res.status(404).json({ status: false, message: "Attendance record not found" });
            }

            const deleteQuery = "DELETE FROM salesman_attendance WHERE attendanceid = ?";
            pool.query(deleteQuery, [attendanceid], (err) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ status: false, message: "Database Error" });
                }
                return res.status(200).json({ status: true, message: "Attendance deleted successfully" });
            });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: false, message: "Technical Issue" });
    }
});

// ==================== BATCH MARK ATTENDANCE ====================
router.post("/mark-attendance-batch", rateLimiter.critical(), (req, res) => {
    try {
        const { records, attendance_date } = req.body;
        // records = [ { salesmanid: 1, status: 'Present' }, { salesmanid: 2, status: 'Absent' } ]

        if (!Array.isArray(records) || records.length === 0 || !attendance_date) {
            return res.status(400).json({ status: false, message: "records array and attendance_date are required" });
        }

        // Validate all salesman IDs exist first (optional but nice)
        const salesmenIds = records.map(r => r.salesmanid);
        pool.query(
            "SELECT salesmanid FROM salesman WHERE salesmanid IN (?)",
            [salesmenIds],
            (err, results) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ status: false, message: "Database Error" });
                }
                // Process each record: upsert
                let completed = 0;
                const total = records.length;
                const errors = [];

                records.forEach(record => {
                    const { salesmanid, status } = record;
                    // First check if attendance exists
                    const checkQuery = "SELECT attendanceid FROM salesman_attendance WHERE salesmanid = ? AND attendance_date = ?";
                    pool.query(checkQuery, [salesmanid, attendance_date], (err, checkResult) => {
                        if (err) {
                            errors.push({ salesmanid, error: err.sqlMessage });
                            completed++;
                            if (completed === total) finish();
                            return;
                        }

                        if (checkResult.length > 0) {
                            // Update
                            const updateQuery = "UPDATE salesman_attendance SET status = ?, updatedat = NOW() WHERE salesmanid = ? AND attendance_date = ?";
                            pool.query(updateQuery, [status, salesmanid, attendance_date], (err) => {
                                if (err) errors.push({ salesmanid, error: err.sqlMessage });
                                completed++;
                                if (completed === total) finish();
                            });
                        } else {
                            // Insert
                            const insertQuery = "INSERT INTO salesman_attendance (salesmanid, attendance_date, status, createdat, updatedat) VALUES (?, ?, ?, NOW(), NOW())";
                            pool.query(insertQuery, [salesmanid, attendance_date, status], (err) => {
                                if (err) errors.push({ salesmanid, error: err.sqlMessage });
                                completed++;
                                if (completed === total) finish();
                            });
                        }
                    });
                });

                function finish() {
                    if (errors.length > 0) {
                        return res.status(200).json({ status: true, message: "Batch processed with some errors", errors });
                    }
                    return res.status(200).json({ status: true, message: `Batch updated ${total} records successfully` });
                }
            }
        );
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: false, message: "Technical Issue" });
    }
});

module.exports = router;