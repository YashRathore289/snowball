const express = require('express')
const router = express.Router()
const pool = require('./pool')
const upload = require('./multer')

router.post("/login", function (req, res, next) {
    try {
        pool.query("SELECT * FROM admins where (username = ? or email = ? or phone = ?) and password = ?;",
            [req.body.email, req.body.email, req.body.email, req.body.phone],
            function (error, result) {
                if (error) {
                    console.log(error)
                    res.status(500).json({ status: false, message: "Database Error..." });
                } else {
                    if (result.length == 1) {
                        return res.status(200).json({ status: true, message: "Success", data: result[0] });
                    }
                    else
                        return res.status(200).json({ status: false, message: "Invalid credentials", data: [] });
                }
            }
        );
    } catch (e) {
        console.log(e)
        res.status(500).json({ status: false, message: "Technical Issue..." })
    }
});

// ==================== 1. RETRIEVE API ====================
// Get all salesmen or single salesman by ID
router.post("/retrieve-salesman", function (req, res, next) {
    try {
        const { salesmanid } = req.body;

        let query;
        let values = [];

        if (salesmanid) {
            // Get single salesman by ID
            query = `SELECT 
                salesmanid, fullname, fathername, mothername, 
                DATE_FORMAT(dob, '%Y-%m-%d') as dob, age, married, 
                permanentaddress, currentaddress, mobileno, emergencymobileno, 
                whatsappno, idproof, incomedetail, bankname, accountno, 
                ifsccode, aadharno, panno, licenseno, 
                salesmansignature, ownersignature, 
                DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') as createdat, 
                DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') as updatedat 
                FROM salesman WHERE salesmanid = ?`;
            values = [salesmanid];
        } else {
            // Get all salesmen
            query = `SELECT 
                salesmanid, fullname, fathername, mothername, 
                DATE_FORMAT(dob, '%Y-%m-%d') as dob, age, married, 
                permanentaddress, currentaddress, mobileno, emergencymobileno, 
                whatsappno, idproof, incomedetail, bankname, accountno, 
                ifsccode, aadharno, panno, licenseno, 
                salesmansignature, ownersignature, 
                DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') as createdat, 
                DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') as updatedat 
                FROM salesman ORDER BY salesmanid DESC`;
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
                if (salesmanid && result.length === 0) {
                    return res.status(404).json({
                        status: false,
                        message: "Salesman not found",
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

router.post("/retrieve-salesmen-without-attendance", function (req, res, next) {
    try {
        const { date } = req.body;
        const searchDate = date || new Date().toISOString().split('T')[0];

        const query = `
            SELECT 
                s.salesmanid, 
                s.fullname, 
                s.mobileno,
                s.photo
            FROM salesman s
            LEFT JOIN handed_goods hg ON s.salesmanid = hg.salesmanid 
                AND hg.date = ?
            WHERE hg.handedgoodsid IS NULL
            ORDER BY s.fullname ASC
        `;

        pool.query(query, [searchDate], function (error, result) {
            if (error) {
                console.log(error);
                res.status(500).json({
                    status: false,
                    message: "Database Error...",
                    error: error.sqlMessage
                });
            } else {
                return res.status(200).json({
                    status: true,
                    message: "Success",
                    count: result.length,
                    date: searchDate,
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
router.post("/insert-salesman", upload.fields([
    { name: 'idproof', maxCount: 1 },
    { name: 'salesmansignature', maxCount: 1 },
    { name: 'ownersignature', maxCount: 1 }
]), function (req, res, next) {
    try {
        console.log("Request Body:", req.body);
        console.log("Files:", req.files);

        // Get image filenames
        const idproof = req.files['idproof'] ? req.files['idproof'][0].filename : null;
        const salesmansignature = req.files['salesmansignature'] ? req.files['salesmansignature'][0].filename : null;
        const ownersignature = req.files['ownersignature'] ? req.files['ownersignature'][0].filename : null;

        const query = `INSERT INTO salesman (
            fullname, fathername, mothername, dob, age, married,
            permanentaddress, currentaddress, mobileno, emergencymobileno,
            whatsappno, idproof, incomedetail, bankname, accountno,
            ifsccode, aadharno, panno, licenseno,
            salesmansignature, ownersignature, createdat, updatedat
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

        const values = [
            req.body.fullname || null,
            req.body.fathername || null,
            req.body.mothername || null,
            req.body.dob || null,
            req.body.age || null,
            req.body.married || 'No',
            req.body.permanentaddress || null,
            req.body.currentaddress || null,
            req.body.mobileno || null,
            req.body.emergencymobileno || null,
            req.body.whatsappno || null,
            idproof,
            req.body.incomedetail || 0,
            req.body.bankname || null,
            req.body.accountno || null,
            req.body.ifsccode || null,
            req.body.aadharno || null,
            req.body.panno || null,
            req.body.licenseno || null,
            salesmansignature,
            ownersignature
        ];

        pool.query(query, values, function (error, result) {
            if (error) {
                console.log(error);
                res.status(500).json({
                    status: false,
                    message: "Database Error...",
                    error: error.sqlMessage
                });
            } else {
                // Retrieve the inserted record
                const selectQuery = `SELECT 
                    salesmanid, fullname, fathername, mothername, 
                    DATE_FORMAT(dob, '%Y-%m-%d') as dob, age, married, 
                    permanentaddress, currentaddress, mobileno, emergencymobileno, 
                    whatsappno, idproof, incomedetail, bankname, accountno, 
                    ifsccode, aadharno, panno, licenseno, 
                    salesmansignature, ownersignature, 
                    DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') as createdat, 
                    DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') as updatedat 
                    FROM salesman WHERE salesmanid = ?`;

                pool.query(selectQuery, [result.insertId], function (err, insertedData) {
                    if (err) {
                        return res.status(200).json({
                            status: true,
                            message: "Salesman added successfully",
                            data: { salesmanid: result.insertId }
                        });
                    }
                    return res.status(200).json({
                        status: true,
                        message: "Salesman added successfully",
                        data: insertedData[0]
                    });
                });
            }
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

// ==================== 3. UPDATE API ====================
router.post("/update-salesman", upload.fields([
    { name: 'idproof', maxCount: 1 },
    { name: 'salesmansignature', maxCount: 1 },
    { name: 'ownersignature', maxCount: 1 }
]), function (req, res, next) {
    try {
        const { salesmanid } = req.body;

        if (!salesmanid) {
            return res.status(400).json({
                status: false,
                message: "Salesman ID is required"
            });
        }

        console.log("Updating ID:", salesmanid);
        console.log("Request Body:", req.body);
        console.log("Files:", req.files);

        // Get image filenames (if new images uploaded)
        const idproof = req.files['idproof'] ? req.files['idproof'][0].filename : null;
        const salesmansignature = req.files['salesmansignature'] ? req.files['salesmansignature'][0].filename : null;
        const ownersignature = req.files['ownersignature'] ? req.files['ownersignature'][0].filename : null;

        // Build dynamic update query
        let updateFields = [];
        let values = [];

        // All fields that can be updated
        const fields = [
            'fullname', 'fathername', 'mothername', 'dob', 'age', 'married',
            'permanentaddress', 'currentaddress', 'mobileno', 'emergencymobileno',
            'whatsappno', 'incomedetail', 'bankname', 'accountno',
            'ifsccode', 'aadharno', 'panno', 'licenseno'
        ];

        fields.forEach(field => {
            if (req.body[field] !== undefined && req.body[field] !== '') {
                updateFields.push(`${field} = ?`);
                values.push(req.body[field]);
            }
        });

        // Add image fields if new images uploaded
        if (idproof) {
            updateFields.push('idproof = ?');
            values.push(idproof);
        }
        if (salesmansignature) {
            updateFields.push('salesmansignature = ?');
            values.push(salesmansignature);
        }
        if (ownersignature) {
            updateFields.push('ownersignature = ?');
            values.push(ownersignature);
        }

        // Add updated timestamp
        updateFields.push('updatedat = NOW()');

        if (updateFields.length === 0) {
            return res.status(400).json({
                status: false,
                message: "No fields to update"
            });
        }

        const query = `UPDATE salesman SET ${updateFields.join(', ')} WHERE salesmanid = ?`;
        values.push(salesmanid);

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
                        message: "Salesman not found"
                    });
                }

                // Retrieve the updated record
                const selectQuery = `SELECT 
                    salesmanid, fullname, fathername, mothername, 
                    DATE_FORMAT(dob, '%Y-%m-%d') as dob, age, married, 
                    permanentaddress, currentaddress, mobileno, emergencymobileno, 
                    whatsappno, idproof, incomedetail, bankname, accountno, 
                    ifsccode, aadharno, panno, licenseno, 
                    salesmansignature, ownersignature, 
                    DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') as createdat, 
                    DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') as updatedat 
                    FROM salesman WHERE salesmanid = ?`;

                pool.query(selectQuery, [salesmanid], function (err, updatedData) {
                    if (err) {
                        return res.status(200).json({
                            status: true,
                            message: "Salesman updated successfully",
                            affectedRows: result.affectedRows
                        });
                    }
                    return res.status(200).json({
                        status: true,
                        message: "Salesman updated successfully",
                        affectedRows: result.affectedRows,
                        data: updatedData[0]
                    });
                });
            }
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

// ==================== 4. DELETE API ====================
router.post("/delete-salesman", function (req, res, next) {
    try {
        const { salesmanid } = req.body;

        if (!salesmanid) {
            return res.status(400).json({
                status: false,
                message: "Salesman ID is required"
            });
        }

        // First, get the image filenames and data before deletion
        const selectQuery = `SELECT 
            salesmanid, fullname, mobileno, 
            idproof, salesmansignature, ownersignature 
            FROM salesman WHERE salesmanid = ?`;

        pool.query(selectQuery, [salesmanid], function (error, result) {
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
                    message: "Salesman not found"
                });
            }

            const salesmanData = result[0];

            // Delete the salesman
            const deleteQuery = "DELETE FROM salesman WHERE salesmanid = ?";

            pool.query(deleteQuery, [salesmanid], function (error, deleteResult) {
                if (error) {
                    console.log(error);
                    return res.status(500).json({
                        status: false,
                        message: "Database Error...",
                        error: error.sqlMessage
                    });
                }

                // Optional: Delete image files from server
                // const fs = require('fs');
                // const path = require('path');
                // const imageFields = ['idproof', 'salesmansignature', 'ownersignature'];
                // imageFields.forEach(field => {
                //     if (salesmanData[field]) {
                //         const imagePath = path.join(__dirname, '../public/images', salesmanData[field]);
                //         if (fs.existsSync(imagePath)) {
                //             fs.unlinkSync(imagePath);
                //         }
                //     }
                // });

                return res.status(200).json({
                    status: true,
                    message: "Salesman deleted successfully",
                    deletedData: {
                        salesmanid: salesmanData.salesmanid,
                        fullname: salesmanData.fullname,
                        mobileno: salesmanData.mobileno
                    }
                });
            });
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

module.exports = router