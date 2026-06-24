// employeeRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('./pool');
const upload = require('./multer');
const rateLimiter = require('./rateLimiter');

// ==================== LOGIN ====================
router.post("/login", rateLimiter.high(), (req, res) => {
  try {
    pool.query(
      "SELECT * FROM admins WHERE (username = ? OR email = ? OR phone = ?) AND password = ?",
      [req.body.email, req.body.email, req.body.email, req.body.phone],
      (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ status: false, message: "Database Error" });
        }
        if (result.length === 1) {
          return res.status(200).json({ status: true, message: "Success", data: result[0] });
        }
        return res.status(200).json({ status: false, message: "Invalid credentials", data: [] });
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== RETRIEVE SALESMAN ====================
router.post("/retrieve-salesman", rateLimiter.high(), (req, res) => {
  try {
    const { salesmanid } = req.body;
    let query;
    let values = [];

    if (salesmanid) {
      query = `SELECT 
        salesmanid, fullname, photo, fathername, mothername,
        DATE_FORMAT(dob, '%Y-%m-%d') AS dob, age, married,
        permanentaddress, currentaddress, mobileno, emergencymobileno,
        whatsappno, idproof, bankname, accountno,
        ifsccode, aadharno, panno, licenseno,
        salesmansignature, ownersignature,
        DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
        DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
        FROM salesman WHERE salesmanid = ?`;
      values = [salesmanid];
    } else {
      query = `SELECT 
        salesmanid, fullname, photo, fathername, mothername,
        DATE_FORMAT(dob, '%Y-%m-%d') AS dob, age, married,
        permanentaddress, currentaddress, mobileno, emergencymobileno,
        whatsappno, idproof, bankname, accountno,
        ifsccode, aadharno, panno, licenseno,
        salesmansignature, ownersignature,
        DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
        DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
        FROM salesman ORDER BY salesmanid DESC`;
    }

    pool.query(query, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      if (salesmanid && result.length === 0) {
        return res.status(404).json({ status: false, message: "Salesman not found", data: [] });
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

// ==================== RETRIEVE SALESMEN WITHOUT ATTENDANCE ====================
router.post("/retrieve-salesmen-without-attendance", rateLimiter.high(), (req, res) => {
  try {
    const { date } = req.body;
    const searchDate = date || new Date().toISOString().split('T')[0];

    const query = `
      SELECT s.salesmanid, s.fullname, s.mobileno, s.photo
      FROM salesman s
      LEFT JOIN handed_goods hg ON s.salesmanid = hg.salesmanid AND hg.date = ?
      WHERE hg.handedgoodsid IS NULL
      ORDER BY s.fullname ASC
    `;

    pool.query(query, [searchDate], (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      return res.status(200).json({
        status: true,
        message: "Success",
        count: result.length,
        date: searchDate,
        data: result
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== INSERT SALESMAN ====================
router.post("/insert-salesman", rateLimiter.critical(), upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'idproof', maxCount: 1 },
  { name: 'salesmansignature', maxCount: 1 },
  { name: 'ownersignature', maxCount: 1 }
]), (req, res) => {
  try {
    const photo = req.files['photo'] ? req.files['photo'][0].path : null;
    const idproof = req.files['idproof'] ? req.files['idproof'][0].path : null;
    const salesmansignature = req.files['salesmansignature'] ? req.files['salesmansignature'][0].path : null;
    const ownersignature = req.files['ownersignature'] ? req.files['ownersignature'][0].path : null;

    const query = `INSERT INTO salesman (
      fullname, photo, fathername, mothername, dob, age, married,
      permanentaddress, currentaddress, mobileno, emergencymobileno,
      whatsappno, idproof, bankname, accountno,
      ifsccode, aadharno, panno, licenseno,
      salesmansignature, ownersignature, createdat, updatedat
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`;

    const values = [
      req.body.fullname || null,
      photo,
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
      req.body.bankname || null,
      req.body.accountno || null,
      req.body.ifsccode || null,
      req.body.aadharno || null,
      req.body.panno || null,
      req.body.licenseno || null,
      salesmansignature,
      ownersignature
    ];

    pool.query(query, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }

      // Fetch the newly inserted record
      const selectQuery = `SELECT 
        salesmanid, fullname, photo, fathername, mothername,
        DATE_FORMAT(dob, '%Y-%m-%d') AS dob, age, married,
        permanentaddress, currentaddress, mobileno, emergencymobileno,
        whatsappno, idproof, bankname, accountno,
        ifsccode, aadharno, panno, licenseno,
        salesmansignature, ownersignature,
        DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
        DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
        FROM salesman WHERE salesmanid = ?`;

      pool.query(selectQuery, [result.insertId], (err, insertedData) => {
        if (err) {
          return res.status(200).json({ status: true, message: "Salesman added", data: { salesmanid: result.insertId } });
        }
        return res.status(200).json({ status: true, message: "Salesman added successfully", data: insertedData[0] });
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== UPDATE SALESMAN ====================
router.post("/update-salesman", rateLimiter.critical(), upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'idproof', maxCount: 1 },
  { name: 'salesmansignature', maxCount: 1 },
  { name: 'ownersignature', maxCount: 1 }
]), (req, res) => {
  try {
    const { salesmanid } = req.body;
    if (!salesmanid) {
      return res.status(400).json({ status: false, message: "Salesman ID is required" });
    }

    const photo = req.files['photo'] ? req.files['photo'][0].path : null;
    const idproof = req.files['idproof'] ? req.files['idproof'][0].path : null;
    const salesmansignature = req.files['salesmansignature'] ? req.files['salesmansignature'][0].path : null;
    const ownersignature = req.files['ownersignature'] ? req.files['ownersignature'][0].path : null;

    let updateFields = [];
    let values = [];

    const textFields = [
      'fullname', 'fathername', 'mothername', 'dob', 'age', 'married',
      'permanentaddress', 'currentaddress', 'mobileno', 'emergencymobileno',
      'whatsappno', 'bankname', 'accountno',
      'ifsccode', 'aadharno', 'panno', 'licenseno'
    ];

    textFields.forEach(field => {
      if (req.body[field] !== undefined && req.body[field] !== '') {
        updateFields.push(`${field} = ?`);
        values.push(req.body[field]);
      }
    });

    if (photo) { updateFields.push('photo = ?'); values.push(photo); }
    if (idproof) { updateFields.push('idproof = ?'); values.push(idproof); }
    if (salesmansignature) { updateFields.push('salesmansignature = ?'); values.push(salesmansignature); }
    if (ownersignature) { updateFields.push('ownersignature = ?'); values.push(ownersignature); }

    if (updateFields.length === 0) {
      return res.status(400).json({ status: false, message: "No fields to update" });
    }

    updateFields.push('updatedat = NOW()');
    const query = `UPDATE salesman SET ${updateFields.join(', ')} WHERE salesmanid = ?`;
    values.push(salesmanid);

    pool.query(query, values, (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      if (result.affectedRows === 0) {
        return res.status(404).json({ status: false, message: "Salesman not found" });
      }

      // Fetch updated record
      const selectQuery = `SELECT 
        salesmanid, fullname, photo, fathername, mothername,
        DATE_FORMAT(dob, '%Y-%m-%d') AS dob, age, married,
        permanentaddress, currentaddress, mobileno, emergencymobileno,
        whatsappno, idproof, bankname, accountno,
        ifsccode, aadharno, panno, licenseno,
        salesmansignature, ownersignature,
        DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
        DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
        FROM salesman WHERE salesmanid = ?`;

      pool.query(selectQuery, [salesmanid], (err, updatedData) => {
        if (err) {
          return res.status(200).json({ status: true, message: "Salesman updated" });
        }
        return res.status(200).json({ status: true, message: "Salesman updated successfully", data: updatedData[0] });
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== DELETE SALESMAN ====================
router.post("/delete-salesman", rateLimiter.critical(), (req, res) => {
  try {
    const { salesmanid } = req.body;
    if (!salesmanid) {
      return res.status(400).json({ status: false, message: "Salesman ID is required" });
    }

    const selectQuery = "SELECT salesmanid, fullname, mobileno, photo, idproof, salesmansignature, ownersignature FROM salesman WHERE salesmanid = ?";
    pool.query(selectQuery, [salesmanid], (error, result) => {
      if (error) {
        console.error(error);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      if (result.length === 0) {
        return res.status(404).json({ status: false, message: "Salesman not found" });
      }

      const salesmanData = result[0];

      pool.query("DELETE FROM salesman WHERE salesmanid = ?", [salesmanid], (error) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ status: false, message: "Database Error" });
        }

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
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

module.exports = router;