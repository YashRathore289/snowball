const express = require('express');
const router = express.Router();
const pool = require('./pool'); // Your database connection

// ==================== 1. SELECT (Retrieve) API ====================
router.post("/retrieve-handed-goods", function (req, res, next) {
    try {
        const { handedgoodsid, salesmanid, from_date, to_date, month, year } = req.body;

        let query;
        let values = [];

        if (handedgoodsid) {
            // Get single record by ID
            query = `SELECT 
                h.handedgoodsid,
                h.salesmanid,
                s.fullname as salesman_name,
                s.mobileno as salesman_mobile,
                h.details,
                DATE_FORMAT(h.date, '%Y-%m-%d') as date,
                h.returnamt,
                h.commission,
                h.finalamount,
                DATE_FORMAT(h.createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(h.updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM handed_goods h
                LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
                WHERE h.handedgoodsid = ?`;
            values = [handedgoodsid];
        } else if (salesmanid) {
            // Get records for specific salesman
            query = `SELECT 
                h.handedgoodsid,
                h.salesmanid,
                s.fullname as salesman_name,
                s.mobileno as salesman_mobile,
                h.details,
                DATE_FORMAT(h.date, '%Y-%m-%d') as date,
                h.returnamt,
                h.commission,
                h.finalamount,
                DATE_FORMAT(h.createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(h.updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM handed_goods h
                LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
                WHERE h.salesmanid = ?
                ORDER BY h.date DESC`;
            values = [salesmanid];
        } else if (from_date && to_date) {
            // Get records for date range
            query = `SELECT 
                h.handedgoodsid,
                h.salesmanid,
                s.fullname as salesman_name,
                s.mobileno as salesman_mobile,
                h.details,
                DATE_FORMAT(h.date, '%Y-%m-%d') as date,
                h.returnamt,
                h.commission,
                h.finalamount,
                DATE_FORMAT(h.createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(h.updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM handed_goods h
                LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
                WHERE h.date BETWEEN ? AND ?
                ORDER BY h.date DESC`;
            values = [from_date, to_date];
        } else if (month && year) {
            // Get records for specific month/year
            query = `SELECT 
                h.handedgoodsid,
                h.salesmanid,
                s.fullname as salesman_name,
                s.mobileno as salesman_mobile,
                h.details,
                DATE_FORMAT(h.date, '%Y-%m-%d') as date,
                h.returnamt,
                h.commission,
                h.finalamount,
                DATE_FORMAT(h.createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(h.updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM handed_goods h
                LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
                WHERE MONTH(h.date) = ? AND YEAR(h.date) = ?
                ORDER BY h.date DESC`;
            values = [month, year];
        } else {
            // Get all records
            query = `SELECT 
                h.handedgoodsid,
                h.salesmanid,
                s.fullname as salesman_name,
                s.mobileno as salesman_mobile,
                h.details,
                DATE_FORMAT(h.date, '%Y-%m-%d') as date,
                h.returnamt,
                h.commission,
                h.finalamount,
                DATE_FORMAT(h.createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(h.updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM handed_goods h
                LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
                ORDER BY h.date DESC`;
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
                if (handedgoodsid && result.length === 0) {
                    return res.status(404).json({
                        status: false,
                        message: "Record not found",
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
router.post("/insert-handed-goods", function (req, res, next) {
    try {
        const { salesmanid, details, date, returnamt, commission } = req.body;

        // Validate input
        if (!salesmanid || !details || !date) {
            return res.status(400).json({
                status: false,
                message: "Salesman ID, Details, and Date are required"
            });
        }

        // Check if salesman exists
        const checkSalesman = "SELECT salesmanid FROM salesman WHERE salesmanid = ?";
        pool.query(checkSalesman, [salesmanid], function (err, result) {
            if (err) {
                console.log(err);
                return res.status(500).json({
                    status: false,
                    message: "Database Error...",
                    error: err.sqlMessage
                });
            }

            if (result.length === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Salesman not found"
                });
            }

            // Calculate finalamount
            const returnAmt = parseFloat(returnamt) || 0;
            const commissionAmt = parseFloat(commission) || 0;
            const finalAmount = returnAmt + commissionAmt;

            // Insert record
            const query = `INSERT INTO handed_goods 
                (salesmanid, details, date, returnamt, commission, finalamount, createdat, updatedat) 
                VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`;
            const values = [salesmanid, details, date, returnAmt, commissionAmt, finalAmount];

            pool.query(query, values, function (error, insertResult) {
                if (error) {
                    console.log(error);
                    return res.status(500).json({
                        status: false,
                        message: "Database Error...",
                        error: error.sqlMessage
                    });
                }

                // Retrieve the inserted record
                const selectQuery = `SELECT 
                    h.handedgoodsid,
                    h.salesmanid,
                    s.fullname as salesman_name,
                    s.mobileno as salesman_mobile,
                    h.details,
                    DATE_FORMAT(h.date, '%Y-%m-%d') as date,
                    h.returnamt,
                    h.commission,
                    h.finalamount,
                    DATE_FORMAT(h.createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                    DATE_FORMAT(h.updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                    FROM handed_goods h
                    LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
                    WHERE h.handedgoodsid = ?`;

                pool.query(selectQuery, [insertResult.insertId], function (err, insertedData) {
                    if (err) {
                        return res.status(200).json({
                            status: true,
                            message: "Record added successfully",
                            data: { handedgoodsid: insertResult.insertId }
                        });
                    }
                    return res.status(200).json({
                        status: true,
                        message: "Record added successfully",
                        data: insertedData[0]
                    });
                });
            });
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

// ==================== 3. UPDATE API ====================
router.post("/update-handed-goods", function (req, res, next) {
    try {
        const { handedgoodsid, salesmanid, details, date, returnamt, commission } = req.body;

        if (!handedgoodsid) {
            return res.status(400).json({
                status: false,
                message: "Handed Goods ID is required"
            });
        }

        // Build dynamic update query
        let updateFields = [];
        let values = [];

        if (salesmanid !== undefined && salesmanid !== '') {
            // Check if salesman exists
            const checkSalesman = "SELECT salesmanid FROM salesman WHERE salesmanid = ?";
            pool.query(checkSalesman, [salesmanid], function (err, result) {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        status: false,
                        message: "Database Error..."
                    });
                }
                if (result.length === 0) {
                    return res.status(404).json({
                        status: false,
                        message: "Salesman not found"
                    });
                }
            });
            updateFields.push('salesmanid = ?');
            values.push(salesmanid);
        }
        if (details !== undefined && details !== '') {
            updateFields.push('details = ?');
            values.push(details);
        }
        if (date !== undefined && date !== '') {
            updateFields.push('date = ?');
            values.push(date);
        }
        if (returnamt !== undefined && returnamt !== '') {
            updateFields.push('returnamt = ?');
            values.push(returnamt);
        }
        if (commission !== undefined && commission !== '') {
            updateFields.push('commission = ?');
            values.push(commission);
        }

        // If returnamt or commission is updated, recalculate finalamount
        if (returnamt !== undefined || commission !== undefined) {
            // Get current values to calculate finalamount
            const getCurrentQuery = "SELECT returnamt, commission FROM handed_goods WHERE handedgoodsid = ?";
            pool.query(getCurrentQuery, [handedgoodsid], function (err, currentResult) {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        status: false,
                        message: "Database Error..."
                    });
                }

                const currentReturn = currentResult.length > 0 ? parseFloat(currentResult[0].returnamt) : 0;
                const currentCommission = currentResult.length > 0 ? parseFloat(currentResult[0].commission) : 0;
                
                const newReturn = returnamt !== undefined ? parseFloat(returnamt) : currentReturn;
                const newCommission = commission !== undefined ? parseFloat(commission) : currentCommission;
                const finalAmount = newReturn + newCommission;

                updateFields.push('finalamount = ?');
                values.push(finalAmount);
            });
        }

        if (updateFields.length === 0) {
            return res.status(400).json({
                status: false,
                message: "No fields to update"
            });
        }

        // Add updated timestamp
        updateFields.push('updatedat = NOW()');

        const query = `UPDATE handed_goods SET ${updateFields.join(', ')} WHERE handedgoodsid = ?`;
        values.push(handedgoodsid);

        pool.query(query, values, function (error, result) {
            if (error) {
                console.log(error);
                return res.status(500).json({
                    status: false,
                    message: "Database Error...",
                    error: error.sqlMessage
                });
            }

            if (result.affectedRows === 0) {
                return res.status(404).json({
                    status: false,
                    message: "Record not found"
                });
            }

            // Retrieve the updated record
            const selectQuery = `SELECT 
                h.handedgoodsid,
                h.salesmanid,
                s.fullname as salesman_name,
                s.mobileno as salesman_mobile,
                h.details,
                DATE_FORMAT(h.date, '%Y-%m-%d') as date,
                h.returnamt,
                h.commission,
                h.finalamount,
                DATE_FORMAT(h.createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(h.updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM handed_goods h
                LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
                WHERE h.handedgoodsid = ?`;

            pool.query(selectQuery, [handedgoodsid], function (err, updatedData) {
                if (err) {
                    return res.status(200).json({
                        status: true,
                        message: "Record updated successfully",
                        affectedRows: result.affectedRows
                    });
                }
                return res.status(200).json({
                    status: true,
                    message: "Record updated successfully",
                    affectedRows: result.affectedRows,
                    data: updatedData[0]
                });
            });
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

// ==================== 4. DELETE API ====================
router.post("/delete-handed-goods", function (req, res, next) {
    try {
        const { handedgoodsid } = req.body;

        if (!handedgoodsid) {
            return res.status(400).json({
                status: false,
                message: "Handed Goods ID is required"
            });
        }

        // First get the record details before deletion
        const selectQuery = `SELECT 
            h.handedgoodsid,
            h.salesmanid,
            s.fullname as salesman_name,
            h.details,
            DATE_FORMAT(h.date, '%Y-%m-%d') as date,
            h.returnamt,
            h.commission,
            h.finalamount
            FROM handed_goods h
            LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
            WHERE h.handedgoodsid = ?`;

        pool.query(selectQuery, [handedgoodsid], function (error, result) {
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
                    message: "Record not found"
                });
            }

            const recordData = result[0];

            // Delete the record
            const deleteQuery = "DELETE FROM handed_goods WHERE handedgoodsid = ?";

            pool.query(deleteQuery, [handedgoodsid], function (error, deleteResult) {
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
                    message: "Record deleted successfully",
                    data: recordData
                });
            });
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

// ==================== 5. GET SUMMARY API ====================
router.post("/handed-goods-summary", function (req, res, next) {
    try {
        const { salesmanid, from_date, to_date, month, year } = req.body;

        let query;
        let values = [];
        let groupBy = '';

        if (salesmanid && from_date && to_date) {
            // Summary for specific salesman in date range
            query = `SELECT 
                h.salesmanid,
                s.fullname as salesman_name,
                COUNT(*) as total_records,
                SUM(h.returnamt) as total_returnamt,
                SUM(h.commission) as total_commission,
                SUM(h.finalamount) as total_finalamount,
                AVG(h.returnamt) as avg_returnamt,
                AVG(h.commission) as avg_commission,
                AVG(h.finalamount) as avg_finalamount
                FROM handed_goods h
                LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
                WHERE h.salesmanid = ? AND h.date BETWEEN ? AND ?
                GROUP BY h.salesmanid, s.fullname`;
            values = [salesmanid, from_date, to_date];
        } else if (salesmanid) {
            // Summary for specific salesman
            query = `SELECT 
                h.salesmanid,
                s.fullname as salesman_name,
                COUNT(*) as total_records,
                SUM(h.returnamt) as total_returnamt,
                SUM(h.commission) as total_commission,
                SUM(h.finalamount) as total_finalamount,
                AVG(h.returnamt) as avg_returnamt,
                AVG(h.commission) as avg_commission,
                AVG(h.finalamount) as avg_finalamount
                FROM handed_goods h
                LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
                WHERE h.salesmanid = ?
                GROUP BY h.salesmanid, s.fullname`;
            values = [salesmanid];
        } else if (from_date && to_date) {
            // Summary for date range
            query = `SELECT 
                h.salesmanid,
                s.fullname as salesman_name,
                COUNT(*) as total_records,
                SUM(h.returnamt) as total_returnamt,
                SUM(h.commission) as total_commission,
                SUM(h.finalamount) as total_finalamount
                FROM handed_goods h
                LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
                WHERE h.date BETWEEN ? AND ?
                GROUP BY h.salesmanid, s.fullname
                ORDER BY total_finalamount DESC`;
            values = [from_date, to_date];
        } else if (month && year) {
            // Summary for specific month/year
            query = `SELECT 
                h.salesmanid,
                s.fullname as salesman_name,
                COUNT(*) as total_records,
                SUM(h.returnamt) as total_returnamt,
                SUM(h.commission) as total_commission,
                SUM(h.finalamount) as total_finalamount
                FROM handed_goods h
                LEFT JOIN salesman s ON h.salesmanid = s.salesmanid
                WHERE MONTH(h.date) = ? AND YEAR(h.date) = ?
                GROUP BY h.salesmanid, s.fullname
                ORDER BY total_finalamount DESC`;
            values = [month, year];
        } else {
            // Overall summary
            query = `SELECT 
                COUNT(*) as total_records,
                SUM(returnamt) as total_returnamt,
                SUM(commission) as total_commission,
                SUM(finalamount) as total_finalamount,
                AVG(returnamt) as avg_returnamt,
                AVG(commission) as avg_commission,
                AVG(finalamount) as avg_finalamount
                FROM handed_goods`;
        }

        pool.query(query, values, function (error, result) {
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
                message: "Success",
                data: result
            });
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

module.exports = router;