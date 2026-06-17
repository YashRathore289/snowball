const express = require('express');
const router = express.Router();
const pool = require('./pool'); // Your database connection

// ==================== 1. SELECT (Retrieve) API ====================
router.post("/retrieve-attendance", function (req, res, next) {
    try {
        const { attendanceid, salesmanid, attendance_date, month, year } = req.body;

        let query;
        let values = [];

        if (attendanceid) {
            // Get single attendance by ID
            query = `SELECT 
                sa.attendanceid,
                sa.salesmanid,
                s.fullname as salesman_name,
                DATE_FORMAT(sa.attendance_date, '%Y-%m-%d') as attendance_date,
                sa.status,
                DATE_FORMAT(sa.createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(sa.updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM salesman_attendance sa
                LEFT JOIN salesman s ON sa.salesmanid = s.salesmanid
                WHERE sa.attendanceid = ?`;
            values = [attendanceid];
        } else if (salesmanid && attendance_date) {
            // Get attendance for specific salesman on specific date
            query = `SELECT 
                sa.attendanceid,
                sa.salesmanid,
                s.fullname as salesman_name,
                DATE_FORMAT(sa.attendance_date, '%Y-%m-%d') as attendance_date,
                sa.status,
                DATE_FORMAT(sa.createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(sa.updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM salesman_attendance sa
                LEFT JOIN salesman s ON sa.salesmanid = s.salesmanid
                WHERE sa.salesmanid = ? AND sa.attendance_date = ?`;
            values = [salesmanid, attendance_date];
        } else if (salesmanid) {
            // Get attendance for specific salesman
            query = `SELECT 
                sa.attendanceid,
                sa.salesmanid,
                s.fullname as salesman_name,
                DATE_FORMAT(sa.attendance_date, '%Y-%m-%d') as attendance_date,
                sa.status,
                DATE_FORMAT(sa.createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(sa.updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM salesman_attendance sa
                LEFT JOIN salesman s ON sa.salesmanid = s.salesmanid
                WHERE sa.salesmanid = ?
                ORDER BY sa.attendance_date DESC`;
            values = [salesmanid];
        } else if (month && year) {
            // Get attendance for specific month/year
            query = `SELECT 
                sa.attendanceid,
                sa.salesmanid,
                s.fullname as salesman_name,
                DATE_FORMAT(sa.attendance_date, '%Y-%m-%d') as attendance_date,
                sa.status,
                DATE_FORMAT(sa.createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(sa.updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM salesman_attendance sa
                LEFT JOIN salesman s ON sa.salesmanid = s.salesmanid
                WHERE MONTH(sa.attendance_date) = ? AND YEAR(sa.attendance_date) = ?
                ORDER BY sa.attendance_date DESC, s.fullname`;
            values = [month, year];
        } else {
            // Get all attendance records
            query = `SELECT 
                sa.attendanceid,
                sa.salesmanid,
                s.fullname as salesman_name,
                DATE_FORMAT(sa.attendance_date, '%Y-%m-%d') as attendance_date,
                sa.status,
                DATE_FORMAT(sa.createdat, '%Y-%m-%d %H:%i:%s') as createdat,
                DATE_FORMAT(sa.updatedat, '%Y-%m-%d %H:%i:%s') as updatedat
                FROM salesman_attendance sa
                LEFT JOIN salesman s ON sa.salesmanid = s.salesmanid
                ORDER BY sa.attendance_date DESC, s.fullname`;
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
                if (attendanceid && result.length === 0) {
                    return res.status(404).json({
                        status: false,
                        message: "Attendance record not found",
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

// ==================== 2. INSERT or UPDATE API (Mark Attendance) ====================
router.post("/mark-attendance", function (req, res, next) {
    try {
        const { salesmanid, attendance_date, status } = req.body;

        if (!salesmanid || !attendance_date) {
            return res.status(400).json({
                status: false,
                message: "Salesman ID and Date are required"
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

            // Check if attendance already exists for this date
            const checkQuery = "SELECT attendanceid FROM salesman_attendance WHERE salesmanid = ? AND attendance_date = ?";
            pool.query(checkQuery, [salesmanid, attendance_date], function (err, checkResult) {
                if (err) {
                    console.log(err);
                    return res.status(500).json({
                        status: false,
                        message: "Database Error...",
                        error: err.sqlMessage
                    });
                }

                if (checkResult.length > 0) {
                    // Update existing attendance
                    const updateQuery = "UPDATE salesman_attendance SET status = ?, updatedat = NOW() WHERE salesmanid = ? AND attendance_date = ?";
                    pool.query(updateQuery, [status, salesmanid, attendance_date], function (err, updateResult) {
                        if (err) {
                            console.log(err);
                            return res.status(500).json({
                                status: false,
                                message: "Database Error...",
                                error: err.sqlMessage
                            });
                        }

                        return res.status(200).json({
                            status: true,
                            message: "Attendance updated successfully",
                            data: {
                                salesmanid: salesmanid,
                                attendance_date: attendance_date,
                                status: status
                            }
                        });
                    });
                } else {
                    // Insert new attendance
                    const insertQuery = "INSERT INTO salesman_attendance (salesmanid, attendance_date, status, createdat, updatedat) VALUES (?, ?, ?, NOW(), NOW())";
                    pool.query(insertQuery, [salesmanid, attendance_date, status], function (err, insertResult) {
                        if (err) {
                            console.log(err);
                            return res.status(500).json({
                                status: false,
                                message: "Database Error...",
                                error: err.sqlMessage
                            });
                        }

                        return res.status(200).json({
                            status: true,
                            message: "Attendance marked successfully",
                            data: {
                                attendanceid: insertResult.insertId,
                                salesmanid: salesmanid,
                                attendance_date: attendance_date,
                                status: status
                            }
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

// ==================== 3. DELETE API ====================
router.post("/delete-attendance", function (req, res, next) {
    try {
        const { attendanceid } = req.body;

        if (!attendanceid) {
            return res.status(400).json({
                status: false,
                message: "Attendance ID is required"
            });
        }

        const selectQuery = `SELECT 
            attendanceid,
            salesmanid,
            DATE_FORMAT(attendance_date, '%Y-%m-%d') as attendance_date,
            status
            FROM salesman_attendance WHERE attendanceid = ?`;

        pool.query(selectQuery, [attendanceid], function (error, result) {
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
                    message: "Attendance record not found"
                });
            }

            const attendanceData = result[0];
            const deleteQuery = "DELETE FROM salesman_attendance WHERE attendanceid = ?";

            pool.query(deleteQuery, [attendanceid], function (error, deleteResult) {
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
                    message: "Attendance record deleted successfully",
                    data: attendanceData
                });
            });
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

// ==================== 4. GET ATTENDANCE SUMMARY ====================
router.post("/attendance-summary", function (req, res, next) {
    try {
        const { salesmanid, month, year } = req.body;

        if (!salesmanid || !month || !year) {
            return res.status(400).json({
                status: false,
                message: "Salesman ID, Month, and Year are required"
            });
        }

        const query = `SELECT 
            DATE_FORMAT(attendance_date, '%Y-%m-%d') as date,
            status
            FROM salesman_attendance
            WHERE salesmanid = ? AND MONTH(attendance_date) = ? AND YEAR(attendance_date) = ?
            ORDER BY attendance_date`;

        pool.query(query, [salesmanid, month, year], function (error, result) {
            if (error) {
                console.log(error);
                return res.status(500).json({
                    status: false,
                    message: "Database Error...",
                    error: error.sqlMessage
                });
            }

            // Calculate summary
            let present = 0;
            let absent = 0;
            let halfDay = 0;
            let holiday = 0;
            let leave = 0;

            result.forEach(record => {
                switch(record.status) {
                    case 'Present':
                        present++;
                        break;
                    case 'Absent':
                        absent++;
                        break;
                    case 'Half Day':
                        halfDay++;
                        break;
                    case 'Holiday':
                        holiday++;
                        break;
                    case 'Leave':
                        leave++;
                        break;
                }
            });

            const totalDays = result.length;
            const attendancePercentage = totalDays > 0 ? ((present + halfDay * 0.5) / totalDays * 100).toFixed(2) : 0;

            return res.status(200).json({
                status: true,
                message: "Success",
                data: {
                    totalDays: totalDays,
                    present: present,
                    absent: absent,
                    halfDay: halfDay,
                    holiday: holiday,
                    leave: leave,
                    attendancePercentage: attendancePercentage,
                    records: result
                }
            });
        });
    } catch (e) {
        console.log(e);
        res.status(500).json({ status: false, message: "Technical Issue..." });
    }
});

module.exports = router;