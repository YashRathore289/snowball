const express = require('express');
const router = express.Router();
const pool = require('./pool'); // Your database connection

// ==================== 1. SELECT (Retrieve) API ====================
router.post("/retrieve-batteries", function (req, res, next) {
    try {
        const { batteryid } = req.body;

        let query;
        let values = [];

        if (batteryid) {
            // Get single battery by ID
            query = `SELECT 
                batteryid,
                batteryname,
                DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM batteries WHERE batteryid = ?`;
            values = [batteryid];
        } else {
            // Get all batteries
            query = `SELECT 
                batteryid,
                batteryname,
                DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM batteries ORDER BY batteryname`;
        }

        pool.query(query, values, function (error, result) {
            if (error) {
                console.log(error);
                res.status(500).json({
                    status: false,
                    message: "Database Error...",
                    error: error.sqlMessage
                });
            } else {
                if (batteryid && result.length === 0) {
                    return res.status(404).json({
                        status: false,
                        message: "Battery not found",
                        data: []
                    });
                }
                return res.status(200).json({
                    status: true,
                    message: "Success",
                    count: result.length,
                    data: result
                });
            }
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

// ==================== 2. INSERT API ====================
router.post("/insert-battery", function (req, res, next) {
    try {
        const { batteryname } = req.body;

        if (!batteryname) {
            return res.status(400).json({
                status: false,
                message: "Battery name is required"
            });
        }

        // Check if battery already exists
        const checkQuery = "SELECT batteryid FROM batteries WHERE batteryname = ?";
        pool.query(checkQuery, [batteryname], function (err, checkResult) {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    status: false,
                    message: "Database Error...",
                    error: err.sqlMessage
                });
            }

            if (checkResult.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: "Battery name already exists"
                });
            }

            const query = `INSERT INTO batteries (batteryname, createdat, updatedat) 
                           VALUES (?, NOW(), NOW())`;
            const values = [batteryname];

            pool.query(query, values, function (error, result) {
                if (error) {
                    console.log(error);
                    res.status(500).json({
                        status: false,
                        message: "Database Error...",
                        error: error.sqlMessage
                    });
                } else {
                    const selectQuery = `SELECT 
                        batteryid,
                        batteryname,
                        DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                        DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                        FROM batteries WHERE batteryid = ?`;

                    pool.query(selectQuery, [result.insertId], function (err, insertedData) {
                        if (err) {
                            return res.status(200).json({
                                status: true,
                                message: "Battery added successfully",
                                data: { batteryid: result.insertId }
                            });
                        }
                        return res.status(200).json({
                            status: true,
                            message: "Battery added successfully",
                            data: insertedData[0]
                        });
                    });
                }
            });
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

// ==================== 3. UPDATE API ====================
router.post("/update-battery", function (req, res, next) {
    try {
        const { batteryid, batteryname } = req.body;

        if (!batteryid) {
            return res.status(400).json({
                status: false,
                message: "Battery ID is required"
            });
        }

        if (!batteryname) {
            return res.status(400).json({
                status: false,
                message: "Battery name is required"
            });
        }

        // Check if battery name already exists (excluding current)
        const checkQuery = "SELECT batteryid FROM batteries WHERE batteryname = ? AND batteryid != ?";
        pool.query(checkQuery, [batteryname, batteryid], function (err, checkResult) {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    status: false,
                    message: "Database Error...",
                    error: err.sqlMessage
                });
            }

            if (checkResult.length > 0) {
                return res.status(400).json({
                    status: false,
                    message: "Battery name already exists"
                });
            }

            const query = `UPDATE batteries SET batteryname = ?, updatedat = NOW() WHERE batteryid = ?`;
            const values = [batteryname, batteryid];

            pool.query(query, values, function (error, result) {
                if (error) {
                    console.log(error);
                    res.status(500).json({
                        status: false,
                        message: "Database Error...",
                        error: error.sqlMessage
                    });
                } else {
                    if (result.affectedRows === 0) {
                        return res.status(404).json({
                            status: false,
                            message: "Battery not found"
                        });
                    }

                    const selectQuery = `SELECT 
                        batteryid,
                        batteryname,
                        DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                        DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                        FROM batteries WHERE batteryid = ?`;

                    pool.query(selectQuery, [batteryid], function (err, updatedData) {
                        if (err) {
                            return res.status(200).json({
                                status: true,
                                message: "Battery updated successfully",
                                affectedRows: result.affectedRows
                            });
                        }
                        return res.status(200).json({
                            status: true,
                            message: "Battery updated successfully",
                            affectedRows: result.affectedRows,
                            data: updatedData[0]
                        });
                    });
                }
            });
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

// ==================== 4. DELETE API ====================
router.post("/delete-battery", function (req, res, next) {
    try {
        const { batteryid } = req.body;

        if (!batteryid) {
            return res.status(400).json({
                status: false,
                message: "Battery ID is required"
            });
        }

        const selectQuery = `SELECT batteryid, batteryname FROM batteries WHERE batteryid = ?`;

        pool.query(selectQuery, [batteryid], function (error, result) {
            if (error) {
                console.log(error);
                return res.status(500).json({
                    status: false,
                    message: "Database Error...",
                    error: error.sqlMessage
                });
            }

            if (result.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Battery not found"
                });
            }

            const batteryData = result[0];

            const deleteQuery = "DELETE FROM batteries WHERE batteryid = ?";

            pool.query(deleteQuery, [batteryid], function (error, deleteResult) {
                if (error) {
                    console.log(error);
                    return res.status(500).json({
                        status: false,
                        message: "Database Error...",
                        error: error.sqlMessage
                    });
                }

                return res.status(200).json({
                    status: true,
                    message: "Battery deleted successfully",
                    data: batteryData
                });
            });
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

module.exports = router;