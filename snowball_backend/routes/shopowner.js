// shopOwnerRoutes.js
const express = require('express');
const router = express.Router();
const pool = require('./pool');
const rateLimiter = require('./ratelimiter');

// Global rate limit: 100 requests per 15 minutes per IP
router.use(rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests, please try again after 15 minutes.'
}));

// ==================== 1. RETRIEVE SHOP OWNERS ====================
router.post("/retrieve-shop-owners", (req, res) => {
  try {
    // Frontend always fetches all owners; ignore optional shopownerid
    const query = `SELECT 
      shopownerid,
      shopownername,
      shopname,
      mobileno,
      address,
      DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
      DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
    FROM shop_owners 
    ORDER BY shopownername ASC`;

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

// ==================== 2. INSERT SHOP OWNER ====================
router.post("/insert-shop-owner", (req, res) => {
  try {
    const { shopownername, shopname, mobileno, address } = req.body;

    if (!shopownername || !shopname || !mobileno) {
      return res.status(400).json({ status: false, message: "Shop owner name, shop name, and mobile number are required" });
    }

    // Check duplicate name
    pool.query("SELECT shopownerid FROM shop_owners WHERE shopownername = ?", [shopownername], (err, checkResult) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      if (checkResult.length > 0) {
        return res.status(400).json({ status: false, message: "Shop owner already exists" });
      }

      const query = `INSERT INTO shop_owners 
        (shopownername, shopname, mobileno, address, createdat, updatedat) 
        VALUES (?, ?, ?, ?, NOW(), NOW())`;
      const values = [shopownername, shopname, mobileno, address || null];

      pool.query(query, values, (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ status: false, message: "Database Error" });
        }

        // Return inserted record
        pool.query(
          `SELECT shopownerid, shopownername, shopname, mobileno, address,
          DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
          DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
          FROM shop_owners WHERE shopownerid = ?`,
          [result.insertId],
          (err, rows) => {
            if (err) {
              return res.status(200).json({ status: true, message: "Shop owner added", data: { shopownerid: result.insertId } });
            }
            return res.status(200).json({ status: true, message: "Shop owner added successfully", data: rows[0] });
          }
        );
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 3. UPDATE SHOP OWNER ====================
router.post("/update-shop-owner", (req, res) => {
  try {
    const { shopownerid, shopownername, shopname, mobileno, address } = req.body;

    if (!shopownerid) {
      return res.status(400).json({ status: false, message: "Shop owner ID is required" });
    }
    if (!shopownername || !shopname || !mobileno) {
      return res.status(400).json({ status: false, message: "Name, shop name, and mobile are required" });
    }

    // Check duplicate name (excluding current)
    pool.query("SELECT shopownerid FROM shop_owners WHERE shopownername = ? AND shopownerid != ?", [shopownername, shopownerid], (err, checkResult) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ status: false, message: "Database Error" });
      }
      if (checkResult.length > 0) {
        return res.status(400).json({ status: false, message: "Shop owner name already exists" });
      }

      const query = `UPDATE shop_owners 
        SET shopownername = ?, shopname = ?, mobileno = ?, address = ?, updatedat = NOW() 
        WHERE shopownerid = ?`;
      const values = [shopownername, shopname, mobileno, address || null, shopownerid];

      pool.query(query, values, (error, result) => {
        if (error) {
          console.error(error);
          return res.status(500).json({ status: false, message: "Database Error" });
        }
        if (result.affectedRows === 0) {
          return res.status(404).json({ status: false, message: "Shop owner not found" });
        }

        // Return updated data
        pool.query(
          `SELECT shopownerid, shopownername, shopname, mobileno, address,
          DATE_FORMAT(createdat, '%Y-%m-%d %H:%i:%s') AS createdat,
          DATE_FORMAT(updatedat, '%Y-%m-%d %H:%i:%s') AS updatedat
          FROM shop_owners WHERE shopownerid = ?`,
          [shopownerid],
          (err, rows) => {
            if (err) {
              return res.status(200).json({ status: true, message: "Shop owner updated" });
            }
            return res.status(200).json({ status: true, message: "Shop owner updated successfully", data: rows[0] });
          }
        );
      });
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

// ==================== 4. DELETE SHOP OWNER ====================
router.post("/delete-shop-owner", (req, res) => {
  try {
    const { shopownerid } = req.body;
    if (!shopownerid) {
      return res.status(400).json({ status: false, message: "Shop owner ID is required" });
    }

    // Fetch before delete
    pool.query(
      "SELECT shopownerid, shopownername, shopname, mobileno, address FROM shop_owners WHERE shopownerid = ?",
      [shopownerid],
      (err, result) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ status: false, message: "Database Error" });
        }
        if (result.length === 0) {
          return res.status(404).json({ status: false, message: "Shop owner not found" });
        }
        const ownerData = result[0];

        pool.query("DELETE FROM shop_owners WHERE shopownerid = ?", [shopownerid], (error) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ status: false, message: "Database Error" });
          }
          return res.status(200).json({ status: true, message: "Shop owner deleted successfully", data: ownerData });
        });
      }
    );
  } catch (e) {
    console.error(e);
    res.status(500).json({ status: false, message: "Technical Issue" });
  }
});

module.exports = router;