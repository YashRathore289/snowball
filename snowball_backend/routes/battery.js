const express = require('express');
const router = express.Router();
const pool = require('./pool');
const rateLimiter = require('./rateLimiter');

// ==================== 1. RETRIEVE ALL BATTERIES (Sorted by sort_order) ====================
router.post("/retrieve-batteries", rateLimiter.low(), (req, res) => {
    try {
        const query = `SELECT 
            batteryid,
            batteryname,
            sort_order,
            DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
            DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
        FROM batteries 
        ORDER BY sort_order ASC, batteryname ASC`;

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

// ==================== 2. INSERT BATTERY ====================
router.post("/insert-battery", rateLimiter.critical(), (req, res) => {
    try {
        const { batteryname } = req.body;
        if (!batteryname) {
            return res.status(400).json({ status: false, message: "Battery name is required" });
        }

        pool.query("SELECT batteryid FROM batteries WHERE batteryname = ?", [batteryname], (err, checkResult) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Database Error" });
            }
            if (checkResult.length > 0) {
                return res.status(400).json({ status: false, message: "Battery name already exists" });
            }

            // Get max sort_order
            pool.query("SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM batteries", (err, orderResult) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ status: false, message: "Database Error" });
                }
                const nextOrder = orderResult[0].next_order;

                pool.query(
                    "INSERT INTO batteries (batteryname, sort_order, createdat, updatedat) VALUES (?, ?, NOW(), NOW())",
                    [batteryname, nextOrder],
                    (error, result) => {
                        if (error) {
                            console.error(error);
                            return res.status(500).json({ status: false, message: "Database Error" });
                        }
                        return res.status(200).json({
                            status: true,
                            message: "Battery added successfully",
                            data: { batteryid: result.insertId, batteryname, sort_order: nextOrder }
                        });
                    }
                );
            });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: false, message: "Technical Issue" });
    }
});

// ==================== 3. UPDATE BATTERY ====================
router.post("/update-battery", rateLimiter.critical(), (req, res) => {
    try {
        const { batteryid, batteryname } = req.body;
        if (!batteryid || !batteryname) {
            return res.status(400).json({ status: false, message: "Battery ID and name are required" });
        }

        pool.query(
            "SELECT batteryid FROM batteries WHERE batteryname = ? AND batteryid != ?",
            [batteryname, batteryid],
            (err, checkResult) => {
                if (err) {
                    console.error(err);
                    return res.status(500).json({ status: false, message: "Database Error" });
                }
                if (checkResult.length > 0) {
                    return res.status(400).json({ status: false, message: "Battery name already exists" });
                }

                pool.query(
                    "UPDATE batteries SET batteryname = ?, updatedat = NOW() WHERE batteryid = ?",
                    [batteryname, batteryid],
                    (error, result) => {
                        if (error) {
                            console.error(error);
                            return res.status(500).json({ status: false, message: "Database Error" });
                        }
                        if (result.affectedRows === 0) {
                            return res.status(404).json({ status: false, message: "Battery not found" });
                        }
                        return res.status(200).json({
                            status: true,
                            message: "Battery updated successfully",
                            data: { batteryid, batteryname }
                        });
                    }
                );
            }
        );
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: false, message: "Technical Issue" });
    }
});

// ==================== 4. DELETE BATTERY ====================
router.post("/delete-battery", rateLimiter.critical(), (req, res) => {
    try {
        const { batteryid } = req.body;
        if (!batteryid) {
            return res.status(400).json({ status: false, message: "Battery ID is required" });
        }

        pool.query("SELECT batteryid, batteryname FROM batteries WHERE batteryid = ?", [batteryid], (err, result) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Database Error" });
            }
            if (result.length === 0) {
                return res.status(404).json({ status: false, message: "Battery not found" });
            }

            const batteryData = result[0];
            pool.query("DELETE FROM batteries WHERE batteryid = ?", [batteryid], (error) => {
                if (error) {
                    console.error(error);
                    return res.status(500).json({ status: false, message: "Database Error" });
                }
                return res.status(200).json({
                    status: true,
                    message: "Battery deleted successfully",
                    data: batteryData
                });
            });
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: false, message: "Technical Issue" });
    }
});

// ==================== 5. UPDATE BATTERY SORT ORDER ====================
router.post("/update-battery-sort-order", rateLimiter.critical(), (req, res) => {
    try {
        const { batteries } = req.body; // [{ batteryid: 1, sort_order: 0 }, { batteryid: 2, sort_order: 1 }]

        if (!Array.isArray(batteries) || batteries.length === 0) {
            return res.status(400).json({ status: false, message: "Batteries array is required" });
        }

        let completed = 0;
        const total = batteries.length;
        const errors = [];

        batteries.forEach(({ batteryid, sort_order }) => {
            pool.query(
                "UPDATE batteries SET sort_order = ?, updatedat = NOW() WHERE batteryid = ?",
                [sort_order, batteryid],
                (err) => {
                    if (err) errors.push({ batteryid, error: err.sqlMessage });
                    completed++;
                    if (completed === total) {
                        if (errors.length > 0) {
                            return res.status(200).json({ status: true, message: "Sort order updated with some errors", errors });
                        }
                        return res.status(200).json({ status: true, message: "Sort order updated successfully" });
                    }
                }
            );
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: false, message: "Technical Issue" });
    }
});

module.exports = router;