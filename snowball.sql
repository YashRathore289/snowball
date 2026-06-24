CREATE DATABASE  IF NOT EXISTS `snowball` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */;
USE `snowball`;
-- MySQL dump 10.13  Distrib 8.0.13, for Win64 (x86_64)
--
-- Host: localhost    Database: snowball
-- ------------------------------------------------------
-- Server version	8.0.11

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
 SET NAMES utf8 ;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `account_settlements`
--

DROP TABLE IF EXISTS `account_settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `account_settlements` (
  `settlementid` int(11) NOT NULL AUTO_INCREMENT,
  `salesmanid` int(11) NOT NULL,
  `total_item_amount` decimal(10,2) DEFAULT '0.00',
  `return_amount` decimal(10,2) DEFAULT '0.00',
  `after_return` decimal(10,2) DEFAULT '0.00',
  `commission_amount` decimal(10,2) DEFAULT '0.00',
  `after_commission` decimal(10,2) DEFAULT '0.00',
  `final_balance` decimal(10,2) DEFAULT '0.00',
  `settlement_date` date DEFAULT NULL,
  `createdat` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedat` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`settlementid`),
  KEY `salesmanid` (`salesmanid`),
  CONSTRAINT `account_settlements_ibfk_1` FOREIGN KEY (`salesmanid`) REFERENCES `salesman` (`salesmanid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `account_settlements`
--

LOCK TABLES `account_settlements` WRITE;
/*!40000 ALTER TABLE `account_settlements` DISABLE KEYS */;
/*!40000 ALTER TABLE `account_settlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `admins` (
  `adminid` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(45) DEFAULT NULL,
  `password` varchar(45) DEFAULT NULL,
  `email` varchar(45) DEFAULT NULL,
  `phone` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`adminid`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admins`
--

LOCK TABLES `admins` WRITE;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` VALUES (1,'Rohan','12345','yashrathore930294@gmail.com','8224802102');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batteries`
--

DROP TABLE IF EXISTS `batteries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `batteries` (
  `batteryid` int(11) NOT NULL AUTO_INCREMENT,
  `batteryname` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`batteryid`),
  UNIQUE KEY `batteryname` (`batteryname`),
  KEY `idx_batteryname` (`batteryname`),
  KEY `idx_createdat` (`createdat`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batteries`
--

LOCK TABLES `batteries` WRITE;
/*!40000 ALTER TABLE `batteries` DISABLE KEYS */;
INSERT INTO `batteries` VALUES (1,'N1','2026-06-18 10:08:29','2026-06-18 10:08:29'),(2,'N2','2026-06-18 10:22:54','2026-06-18 10:22:54'),(3,'N4','2026-06-18 10:23:06','2026-06-18 10:23:06');
/*!40000 ALTER TABLE `batteries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_products`
--

DROP TABLE IF EXISTS `company_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `company_products` (
  `companyproductid` int(11) NOT NULL AUTO_INCREMENT,
  `entry_date` date NOT NULL COMMENT 'Entry date',
  `details` json DEFAULT NULL,
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`companyproductid`),
  KEY `idx_entry_date` (`entry_date`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_products`
--

LOCK TABLES `company_products` WRITE;
/*!40000 ALTER TABLE `company_products` DISABLE KEYS */;
INSERT INTO `company_products` VALUES (4,'2026-06-24','[{\"Type\": \"\", \"IceCream\": \"Chocobar\", \"OrderedQty\": 10, \"DeliveredQty\": 0, \"OrderedAmount\": 100, \"DeliveredAmount\": 0}, {\"Type\": \"\", \"IceCream\": \"Chocolate Cone\", \"OrderedQty\": 20, \"DeliveredQty\": 0, \"OrderedAmount\": 500, \"DeliveredAmount\": 0}, {\"Type\": \"\", \"IceCream\": \"Kulfi\", \"OrderedQty\": 20, \"DeliveredQty\": 0, \"OrderedAmount\": 200, \"DeliveredAmount\": 0}]','2026-06-24 04:00:29','2026-06-24 04:00:29');
/*!40000 ALTER TABLE `company_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `handed_goods`
--

DROP TABLE IF EXISTS `handed_goods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `handed_goods` (
  `handedgoodsid` int(11) NOT NULL AUTO_INCREMENT,
  `salesmanid` int(11) NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `returnamt` decimal(12,2) NOT NULL DEFAULT '0.00',
  `commission` decimal(12,2) NOT NULL DEFAULT '0.00',
  `finalamount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `clear_status` tinyint(1) DEFAULT '0',
  `submit_amount` decimal(10,2) DEFAULT '0.00',
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`handedgoodsid`),
  KEY `idx_salesmanid` (`salesmanid`),
  KEY `idx_date` (`date`),
  KEY `idx_createdat` (`createdat`),
  CONSTRAINT `handed_goods_ibfk_1` FOREIGN KEY (`salesmanid`) REFERENCES `salesman` (`salesmanid`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `handed_goods`
--

LOCK TABLES `handed_goods` WRITE;
/*!40000 ALTER TABLE `handed_goods` DISABLE KEYS */;
INSERT INTO `handed_goods` VALUES (13,6,'{\"batteries\":[],\"items\":[{\"productid\":\"1\",\"productname\":\"Chocobar\",\"qty\":100,\"price\":10,\"total\":1000}]}','2026-06-21',90.00,70.00,840.00,1,0.00,'2026-06-18 12:15:24','2026-06-21 10:13:43'),(14,5,'{\"batteries\":[\"N1\"],\"items\":[{\"productid\":\"1\",\"productname\":\"Chocobar\",\"qty\":100,\"price\":10,\"total\":1000}]}','2026-06-21',20.00,50.00,930.00,1,100.00,'2026-06-21 09:07:17','2026-06-21 10:01:43'),(15,6,'{\"batteries\":[],\"items\":[{\"productid\":\"1\",\"productname\":\"Chocobar\",\"qty\":100,\"price\":10,\"total\":1000}]}','2026-06-21',90.00,70.00,840.00,0,100.00,'2026-06-18 12:15:24','2026-06-21 10:03:53'),(17,5,'{\"batteries\":[\"N1\"],\"items\":[{\"productid\":\"1\",\"productname\":\"Chocobar\",\"qty\":90,\"price\":10,\"total\":900}]}','2026-06-22',0.00,0.00,900.00,0,0.00,'2026-06-23 10:11:40','2026-06-23 10:11:40'),(21,6,'{\"batteries\":[],\"items\":[{\"productid\":\"1\",\"productname\":\"Chocobar\",\"qty\":90,\"price\":10,\"total\":900}]}','2026-06-23',0.00,0.00,900.00,0,0.00,'2026-06-23 11:12:46','2026-06-23 11:12:46'),(22,6,'{\"batteries\":[],\"items\":[{\"productid\":\"allbig\",\"productname\":\"All Big\",\"qty\":70,\"price\":1,\"total\":70,\"isAllBig\":true,\"allBigExpr\":\"12+45+13\"}]}','2026-06-24',0.00,0.00,70.00,0,0.00,'2026-06-24 06:24:11','2026-06-24 06:24:11');
/*!40000 ALTER TABLE `handed_goods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `products` (
  `productid` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each product',
  `productname` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Name of the product',
  `productprice` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Price of the product',
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update timestamp',
  PRIMARY KEY (`productid`),
  KEY `idx_productname` (`productname`),
  KEY `idx_productprice` (`productprice`),
  KEY `idx_createdat` (`createdat`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Products table for storing product information';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Chocobar',10.00,'2026-06-16 10:27:43','2026-06-16 11:57:47'),(2,'Kulfi',10.00,'2026-06-16 10:33:04','2026-06-17 12:11:19'),(3,'Vanilla Cone',20.00,'2026-06-17 12:06:24','2026-06-17 12:06:24'),(4,'Chocolate Cone',25.00,'2026-06-17 12:06:53','2026-06-17 12:06:53'),(5,'Nutty',15.00,'2026-06-17 12:07:06','2026-06-17 12:07:06'),(6,'Orange Cream',10.00,'2026-06-17 12:07:33','2026-06-17 12:07:33');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salesman`
--

DROP TABLE IF EXISTS `salesman`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `salesman` (
  `salesmanid` int(11) NOT NULL AUTO_INCREMENT,
  `fullname` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `photo` varchar(405) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fathername` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mothername` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `age` int(11) DEFAULT NULL,
  `married` enum('Yes','No') COLLATE utf8mb4_unicode_ci DEFAULT 'No',
  `permanentaddress` text COLLATE utf8mb4_unicode_ci,
  `currentaddress` text COLLATE utf8mb4_unicode_ci,
  `mobileno` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL,
  `emergencymobileno` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsappno` varchar(15) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idproof` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `incomedetail` decimal(10,2) DEFAULT NULL,
  `bankname` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accountno` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ifsccode` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aadharno` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `panno` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `licenseno` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salesmansignature` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ownersignature` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`salesmanid`),
  UNIQUE KEY `mobileno` (`mobileno`),
  UNIQUE KEY `aadharno` (`aadharno`),
  UNIQUE KEY `panno` (`panno`),
  KEY `idx_mobileno` (`mobileno`),
  KEY `idx_aadharno` (`aadharno`),
  KEY `idx_panno` (`panno`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salesman`
--

LOCK TABLES `salesman` WRITE;
/*!40000 ALTER TABLE `salesman` DISABLE KEYS */;
INSERT INTO `salesman` VALUES (5,'Rohan Kumar',NULL,'Yash Singh','Mahak','1999-01-12',32,'No',';lsdgfoiv','lkjgpbbdx','45451245','45495661','89516589','5abde2a4-4adc-4ee1-87da-349211e0d083.png',-1.00,'l;gjp;kjrej',';lsdgojgolkj','kljsdfoi55','74187485565','5464546','46568596565','3d73038c-e0c0-4335-b938-368860deeedf.jfif','b0ad8519-eb3e-48ea-a927-2eb0cb46d01f.png','2026-06-17 09:22:06','2026-06-17 09:22:06'),(6,'Harsh',NULL,'Yash Singh','Mahak','2006-06-22',20,'Yes','lkjoivjlsdz','ljfgjk;lsz','+91 9441543333','+91 4545466666','+91 5465666666','fb60d4b7-8237-4e34-a4a7-2a13bb2cce27.png',545454.00,'njhcyguigher123','4632154965','65452621','548956254952','654945632','65487596452','b863ced8-b50d-40d3-ad28-1873490111d5.png','5e989c49-7743-4bca-ae0e-d4ad741f65e6.png','2026-06-17 09:26:06','2026-06-23 04:24:37');
/*!40000 ALTER TABLE `salesman` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salesman_attendance`
--

DROP TABLE IF EXISTS `salesman_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `salesman_attendance` (
  `attendanceid` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each attendance record',
  `salesmanid` int(11) NOT NULL COMMENT 'Reference to salesman table',
  `attendance_date` date NOT NULL COMMENT 'Date of attendance',
  `status` enum('Present','Absent','Half Day','Holiday','Leave') COLLATE utf8mb4_unicode_ci DEFAULT 'Absent' COMMENT 'Attendance status',
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update timestamp',
  PRIMARY KEY (`attendanceid`),
  UNIQUE KEY `unique_attendance` (`salesmanid`,`attendance_date`),
  KEY `idx_salesmanid` (`salesmanid`),
  KEY `idx_attendance_date` (`attendance_date`),
  KEY `idx_status` (`status`),
  KEY `idx_createdat` (`createdat`),
  CONSTRAINT `salesman_attendance_ibfk_1` FOREIGN KEY (`salesmanid`) REFERENCES `salesman` (`salesmanid`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily attendance tracking table for salesmen';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salesman_attendance`
--

LOCK TABLES `salesman_attendance` WRITE;
/*!40000 ALTER TABLE `salesman_attendance` DISABLE KEYS */;
INSERT INTO `salesman_attendance` VALUES (11,5,'2026-06-20','Present','2026-06-20 07:54:44','2026-06-20 07:54:44'),(12,6,'2026-06-20','Absent','2026-06-20 07:54:44','2026-06-20 09:21:01'),(13,6,'2026-06-09','Present','2026-06-20 09:33:31','2026-06-20 09:33:31'),(14,5,'2026-06-09','Present','2026-06-20 09:33:31','2026-06-20 09:33:31'),(15,5,'2026-05-19','Absent','2026-06-20 09:34:56','2026-06-20 09:34:56'),(16,6,'2026-05-19','Absent','2026-06-20 09:34:56','2026-06-20 09:34:56'),(17,6,'2026-06-19','Absent','2026-06-20 09:40:27','2026-06-20 09:40:27'),(18,5,'2026-06-19','Absent','2026-06-20 09:40:27','2026-06-20 09:40:27'),(21,6,'2026-06-12','Present','2026-06-21 11:21:02','2026-06-21 11:21:02'),(22,5,'2026-06-12','Present','2026-06-21 11:21:02','2026-06-21 11:21:02'),(23,6,'2026-06-21','Present','2026-06-21 11:25:32','2026-06-21 11:25:32'),(24,5,'2026-06-21','Present','2026-06-21 11:25:32','2026-06-21 11:25:32'),(25,6,'2026-06-23','Absent','2026-06-23 11:22:26','2026-06-23 11:33:45'),(26,5,'2026-06-23','Absent','2026-06-23 11:22:26','2026-06-23 11:33:45');
/*!40000 ALTER TABLE `salesman_attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salesman_debt`
--

DROP TABLE IF EXISTS `salesman_debt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `salesman_debt` (
  `debtid` int(11) NOT NULL AUTO_INCREMENT,
  `salesmanid` int(11) NOT NULL,
  `type` varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `debt_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`debtid`),
  KEY `idx_salesmanid` (`salesmanid`),
  KEY `idx_debt_date` (`debt_date`),
  CONSTRAINT `salesman_debt_ibfk_1` FOREIGN KEY (`salesmanid`) REFERENCES `salesman` (`salesmanid`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salesman_debt`
--

LOCK TABLES `salesman_debt` WRITE;
/*!40000 ALTER TABLE `salesman_debt` DISABLE KEYS */;
INSERT INTO `salesman_debt` VALUES (3,6,'give','2026-06-18',100.00,'2026-06-18 11:54:39','2026-06-18 11:54:39'),(4,6,'receive','2026-06-18',20.00,'2026-06-18 11:55:04','2026-06-18 11:55:04');
/*!40000 ALTER TABLE `salesman_debt` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_goods`
--

DROP TABLE IF EXISTS `shop_goods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `shop_goods` (
  `shopgoodsid` int(11) NOT NULL AUTO_INCREMENT,
  `shopownerid` int(11) NOT NULL,
  `details` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `date` date NOT NULL,
  `commission` decimal(5,2) NOT NULL DEFAULT '0.00',
  `finalamount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`shopgoodsid`),
  KEY `idx_shopownername` (`shopownerid`),
  KEY `idx_date` (`date`),
  KEY `idx_createdat` (`createdat`),
  CONSTRAINT `fk_so` FOREIGN KEY (`shopownerid`) REFERENCES `shop_owners` (`shopownerid`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_goods`
--

LOCK TABLES `shop_goods` WRITE;
/*!40000 ALTER TABLE `shop_goods` DISABLE KEYS */;
INSERT INTO `shop_goods` VALUES (4,1,'[{\"productid\":\"1\",\"productname\":\"Chocobar\",\"qty\":10,\"price\":10,\"total\":100}]','2026-06-19',30.00,70.00,'2026-06-19 10:41:49','2026-06-19 10:41:59');
/*!40000 ALTER TABLE `shop_goods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_owners`
--

DROP TABLE IF EXISTS `shop_owners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `shop_owners` (
  `shopownerid` int(11) NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each shop owner',
  `shopownername` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Shop owner name',
  `shopname` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Shop name',
  `mobileno` varchar(15) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Mobile number',
  `address` text COLLATE utf8mb4_unicode_ci COMMENT 'Shop address',
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update timestamp',
  PRIMARY KEY (`shopownerid`),
  UNIQUE KEY `unique_shopownername` (`shopownername`),
  KEY `idx_shopownername` (`shopownername`),
  KEY `idx_shopname` (`shopname`),
  KEY `idx_mobileno` (`mobileno`),
  KEY `idx_createdat` (`createdat`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Shop owners table with details';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_owners`
--

LOCK TABLES `shop_owners` WRITE;
/*!40000 ALTER TABLE `shop_owners` DISABLE KEYS */;
INSERT INTO `shop_owners` VALUES (1,'Yash Rathore','Yash ki cream','9876543210','Near Rashampura','2026-06-19 10:07:31','2026-06-19 10:07:31');
/*!40000 ALTER TABLE `shop_owners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'snowball'
--

--
-- Dumping routines for database 'snowball'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-24 13:11:40
