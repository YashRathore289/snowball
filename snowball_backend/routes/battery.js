const express = require('express');
const router = express.Router();
const pool = require('./pool');               // your DB connection
const rateLimiter = require('./ratelimiter');  // import the rate limiter

// Apply global rate limit: 100 requests per 15 min per IP
router.use(rateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests, please try again after 15 minutes.'
}));

// ==================== 1. RETRIEVE ALL BATTERIES ====================
router.post("/retrieve-batteries", (req, res) => {
    try {
        const query = `SELECT 
            batteryid,
            batteryname,
            DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
            DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
        FROM batteries 
        ORDER BY batteryname`;

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
router.post("/insert-battery", (req, res) => {
    try {
        const { batteryname } = req.body;
        if (!batteryname) {
            return res.status(400).json({ status: false, message: "Battery name is required" });
        }

        // Check for duplicate
        pool.query("SELECT batteryid FROM batteries WHERE batteryname = ?", [batteryname], (err, checkResult) => {
            if (err) {
                console.error(err);
                return res.status(500).json({ status: false, message: "Database Error" });
            }
            if (checkResult.length > 0) {
                return res.status(400).json({ status: false, message: "Battery name already exists" });
            }

            pool.query(
                "INSERT INTO batteries (batteryname, createdat, updatedat) VALUES (?, NOW(), NOW())",
                [batteryname],
                (error, result) => {
                    if (error) {
                        console.error(error);
                        return res.status(500).json({ status: false, message: "Database Error" });
                    }
                    return res.status(200).json({
                        status: true,
                        message: "Battery added successfully",
                        data: { batteryid: result.insertId, batteryname }
                    });
                }
            );
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ status: false, message: "Technical Issue" });
    }
});

// ==================== 3. UPDATE BATTERY ====================
router.post("/update-battery", (req, res) => {
    try {
        const { batteryid, batteryname } = req.body;
        if (!batteryid || !batteryname) {
            return res.status(400).json({ status: false, message: "Battery ID and name are required" });
        }

        // Check for duplicate name excluding itself
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
router.post("/delete-battery", (req, res) => {
    try {
        const { batteryid } = req.body;
        if (!batteryid) {
            return res.status(400).json({ status: false, message: "Battery ID is required" });
        }

        // First fetch the battery to return it in the response
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

module.exports = router;