CREATE DATABASE  IF NOT EXISTS "snowball" /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;
USE `snowball`;
-- MySQL dump 10.13  Distrib 8.0.13, for Win64 (x86_64)
--
-- Host: snowball-snowball.i.aivencloud.com    Database: snowball
-- ------------------------------------------------------
-- Server version	8.4.8

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
SET @MYSQLDUMP_TEMP_LOG_BIN = @@SESSION.SQL_LOG_BIN;
SET @@SESSION.SQL_LOG_BIN= 0;

--
-- GTID state at the beginning of the backup 
--

SET @@GLOBAL.GTID_PURGED=/*!80000 '+'*/ '17f28430-6f79-11f1-a81c-0e54a06b0999:1-15,
d2c80908-6d8f-11f1-85e0-8ea3d0bee2fb:1-212';

--
-- Table structure for table `account_settlements`
--

DROP TABLE IF EXISTS `account_settlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `account_settlements` (
  `settlementid` int NOT NULL AUTO_INCREMENT,
  `salesmanid` int NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `account_settlements`
--

LOCK TABLES `account_settlements` WRITE;
/*!40000 ALTER TABLE `account_settlements` DISABLE KEYS */;
INSERT INTO `account_settlements` VALUES (1,1,7705.00,1285.00,6420.00,1925.00,4495.00,2895.00,'2026-06-22','2026-06-22 10:57:42','2026-06-22 11:00:00');
/*!40000 ALTER TABLE `account_settlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admins`
--

DROP TABLE IF EXISTS `admins`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `admins` (
  `adminid` int NOT NULL AUTO_INCREMENT,
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
INSERT INTO `admins` VALUES (1,'Snow Ball','snowballmahu142512','snowball142512@gmail.come','8224802102');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `batteries`
--

DROP TABLE IF EXISTS `batteries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `batteries` (
  `batteryid` int NOT NULL AUTO_INCREMENT,
  `batteryname` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`batteryid`),
  UNIQUE KEY `batteryname` (`batteryname`),
  KEY `idx_batteryname` (`batteryname`),
  KEY `idx_createdat` (`createdat`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `batteries`
--

LOCK TABLES `batteries` WRITE;
/*!40000 ALTER TABLE `batteries` DISABLE KEYS */;
INSERT INTO `batteries` VALUES (1,'N1','2026-06-22 10:08:03','2026-06-22 10:08:03'),(2,'N2','2026-06-22 10:08:15','2026-06-22 10:08:15'),(3,'N4','2026-06-22 10:08:23','2026-06-22 10:08:23'),(4,'B1','2026-06-22 10:08:30','2026-06-22 10:08:30'),(5,'B2','2026-06-22 10:08:38','2026-06-22 10:08:38'),(6,'B3','2026-06-22 10:08:47','2026-06-22 10:08:47');
/*!40000 ALTER TABLE `batteries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `company_products`
--

DROP TABLE IF EXISTS `company_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `company_products` (
  `companyproductid` int NOT NULL AUTO_INCREMENT,
  `icecreamname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `orderedqty` int NOT NULL DEFAULT '0',
  `orderedamount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `deliveredqty` int NOT NULL DEFAULT '0',
  `deliveredamount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `remainingqty` int GENERATED ALWAYS AS ((`orderedqty` - `deliveredqty`)) STORED,
  `entry_date` date NOT NULL COMMENT 'Entry date',
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`companyproductid`),
  KEY `idx_icecreamname` (`icecreamname`),
  KEY `idx_type` (`type`),
  KEY `idx_entry_date` (`entry_date`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `company_products`
--

LOCK TABLES `company_products` WRITE;
/*!40000 ALTER TABLE `company_products` DISABLE KEYS */;
/*!40000 ALTER TABLE `company_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `handed_goods`
--

DROP TABLE IF EXISTS `handed_goods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `handed_goods` (
  `handedgoodsid` int NOT NULL AUTO_INCREMENT,
  `salesmanid` int NOT NULL,
  `details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `handed_goods`
--

LOCK TABLES `handed_goods` WRITE;
/*!40000 ALTER TABLE `handed_goods` DISABLE KEYS */;
/*!40000 ALTER TABLE `handed_goods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `products` (
  `productid` int NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each product',
  `productname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Name of the product',
  `productprice` decimal(12,2) NOT NULL DEFAULT '0.00' COMMENT 'Price of the product',
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update timestamp',
  PRIMARY KEY (`productid`),
  KEY `idx_productname` (`productname`),
  KEY `idx_productprice` (`productprice`),
  KEY `idx_createdat` (`createdat`)
) ENGINE=InnoDB AUTO_INCREMENT=24 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Products table for storing product information';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (1,'Mini Cup',5.00,'2026-06-22 10:10:11','2026-06-22 10:10:11'),(2,'Mini Orange',5.00,'2026-06-22 10:11:10','2026-06-22 10:11:10'),(3,'Chocobar',10.00,'2026-06-22 10:12:01','2026-06-22 10:12:01'),(4,'Orange Cream',10.00,'2026-06-22 10:12:30','2026-06-22 10:12:30'),(5,'Mango Cream',10.00,'2026-06-22 10:14:15','2026-06-22 10:14:15'),(6,'St. Cream',10.00,'2026-06-22 10:14:39','2026-06-22 10:14:39'),(7,'Triple Boom',10.00,'2026-06-22 10:15:32','2026-06-22 10:15:32'),(8,'Butter Choco',10.00,'2026-06-22 10:15:49','2026-06-22 10:15:49'),(9,'Kacha Paka Aam',10.00,'2026-06-22 10:16:45','2026-06-22 10:16:45'),(10,'Blue Barry',10.00,'2026-06-22 10:16:59','2026-06-22 10:16:59'),(11,'Big Cup',10.00,'2026-06-22 10:17:13','2026-06-22 10:17:13'),(12,'Nutty',15.00,'2026-06-22 10:17:26','2026-06-22 10:17:26'),(13,'Sunday',30.00,'2026-06-22 10:17:40','2026-06-22 10:17:40'),(14,'Matka',25.00,'2026-06-22 10:18:12','2026-06-22 10:18:12'),(15,'Matka',40.00,'2026-06-22 10:18:25','2026-06-22 10:18:25'),(16,'Kulfi',10.00,'2026-06-22 10:18:41','2026-06-22 10:18:41'),(17,'Kulfi',15.00,'2026-06-22 10:18:51','2026-06-22 10:18:51'),(18,'Rajbhog',20.00,'2026-06-22 10:19:05','2026-06-22 10:19:05'),(19,'Fruit Cup',20.00,'2026-06-22 10:20:24','2026-06-22 10:20:24'),(20,'Cone',20.00,'2026-06-22 10:20:40','2026-06-22 10:20:40'),(21,'Cone',25.00,'2026-06-22 10:20:50','2026-06-22 10:20:50'),(22,'Cone',30.00,'2026-06-22 10:20:58','2026-06-22 10:20:58'),(23,'All Big',10.00,'2026-06-22 10:22:12','2026-06-22 10:22:12');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salesman`
--

DROP TABLE IF EXISTS `salesman`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `salesman` (
  `salesmanid` int NOT NULL AUTO_INCREMENT,
  `fullname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `photo` varchar(405) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fathername` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `mothername` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `dob` date DEFAULT NULL,
  `age` int DEFAULT NULL,
  `married` enum('Yes','No') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'No',
  `permanentaddress` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `currentaddress` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci,
  `mobileno` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `emergencymobileno` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `whatsappno` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `idproof` varchar(500) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `incomedetail` decimal(10,2) DEFAULT NULL,
  `bankname` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `accountno` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ifsccode` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `aadharno` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `panno` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `licenseno` varchar(30) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `salesmansignature` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `ownersignature` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`salesmanid`),
  UNIQUE KEY `mobileno` (`mobileno`),
  UNIQUE KEY `aadharno` (`aadharno`),
  UNIQUE KEY `panno` (`panno`),
  KEY `idx_mobileno` (`mobileno`),
  KEY `idx_aadharno` (`aadharno`),
  KEY `idx_panno` (`panno`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salesman`
--

LOCK TABLES `salesman` WRITE;
/*!40000 ALTER TABLE `salesman` DISABLE KEYS */;
INSERT INTO `salesman` VALUES (1,'Suraj Manjhi','https://res.cloudinary.com/ddjwpobcp/image/upload/v1782122286/salesman_docs/maymr6z9hkasks2oryaq.png','Bhagirath Manjhi','Rani Manjhi','1994-01-01',32,'Yes','Sarkari Boring Ke Pass Nadi Par Tal Morar Gwalior','Sarkari Boring Ke Pass Nadi Par Tal Morar Gwalior','91-6269875660','91-9131516895','91-6269875660','https://res.cloudinary.com/ddjwpobcp/image/upload/v1782122288/salesman_docs/bpghif85857xtxre0iyq.jpg',0.00,'Airtel','Nill','Nill','3985-3069-8612','FUIPM5142L','MP07N-2020-0289468','https://res.cloudinary.com/ddjwpobcp/image/upload/v1782122288/salesman_docs/fyncbgyo3g5uxlmbsixc.jpg','https://res.cloudinary.com/ddjwpobcp/image/upload/v1782122291/salesman_docs/pkymur4fy8rfz5yuxii3.png','2026-06-22 09:55:06','2026-06-22 09:58:14');
/*!40000 ALTER TABLE `salesman` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salesman_attendance`
--

DROP TABLE IF EXISTS `salesman_attendance`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `salesman_attendance` (
  `attendanceid` int NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each attendance record',
  `salesmanid` int NOT NULL COMMENT 'Reference to salesman table',
  `attendance_date` date NOT NULL COMMENT 'Date of attendance',
  `status` enum('Present','Absent','Half Day','Holiday','Leave') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'Absent' COMMENT 'Attendance status',
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update timestamp',
  PRIMARY KEY (`attendanceid`),
  UNIQUE KEY `unique_attendance` (`salesmanid`,`attendance_date`),
  KEY `idx_salesmanid` (`salesmanid`),
  KEY `idx_attendance_date` (`attendance_date`),
  KEY `idx_status` (`status`),
  KEY `idx_createdat` (`createdat`),
  CONSTRAINT `salesman_attendance_ibfk_1` FOREIGN KEY (`salesmanid`) REFERENCES `salesman` (`salesmanid`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Daily attendance tracking table for salesmen';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salesman_attendance`
--

LOCK TABLES `salesman_attendance` WRITE;
/*!40000 ALTER TABLE `salesman_attendance` DISABLE KEYS */;
INSERT INTO `salesman_attendance` VALUES (5,1,'2026-06-22','Present','2026-06-22 14:53:48','2026-06-22 14:53:48');
/*!40000 ALTER TABLE `salesman_attendance` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `salesman_debt`
--

DROP TABLE IF EXISTS `salesman_debt`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `salesman_debt` (
  `debtid` int NOT NULL AUTO_INCREMENT,
  `salesmanid` int NOT NULL,
  `type` varchar(45) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `debt_date` date NOT NULL,
  `amount` decimal(12,2) NOT NULL DEFAULT '0.00',
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`debtid`),
  KEY `idx_salesmanid` (`salesmanid`),
  KEY `idx_debt_date` (`debt_date`),
  CONSTRAINT `salesman_debt_ibfk_1` FOREIGN KEY (`salesmanid`) REFERENCES `salesman` (`salesmanid`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `salesman_debt`
--

LOCK TABLES `salesman_debt` WRITE;
/*!40000 ALTER TABLE `salesman_debt` DISABLE KEYS */;
/*!40000 ALTER TABLE `salesman_debt` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_goods`
--

DROP TABLE IF EXISTS `shop_goods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `shop_goods` (
  `shopgoodsid` int NOT NULL AUTO_INCREMENT,
  `shopownerid` int NOT NULL,
  `details` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_goods`
--

LOCK TABLES `shop_goods` WRITE;
/*!40000 ALTER TABLE `shop_goods` DISABLE KEYS */;
/*!40000 ALTER TABLE `shop_goods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `shop_owners`
--

DROP TABLE IF EXISTS `shop_owners`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
 SET character_set_client = utf8mb4 ;
CREATE TABLE `shop_owners` (
  `shopownerid` int NOT NULL AUTO_INCREMENT COMMENT 'Unique ID for each shop owner',
  `shopownername` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Shop owner name',
  `shopname` varchar(150) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Shop name',
  `mobileno` varchar(15) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Mobile number',
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci COMMENT 'Shop address',
  `createdat` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT 'Record creation timestamp',
  `updatedat` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Record update timestamp',
  PRIMARY KEY (`shopownerid`),
  UNIQUE KEY `unique_shopownername` (`shopownername`),
  KEY `idx_shopownername` (`shopownername`),
  KEY `idx_shopname` (`shopname`),
  KEY `idx_mobileno` (`mobileno`),
  KEY `idx_createdat` (`createdat`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Shop owners table with details';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `shop_owners`
--

LOCK TABLES `shop_owners` WRITE;
/*!40000 ALTER TABLE `shop_owners` DISABLE KEYS */;
/*!40000 ALTER TABLE `shop_owners` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'snowball'
--

--
-- Dumping routines for database 'snowball'
--
SET @@SESSION.SQL_LOG_BIN = @MYSQLDUMP_TEMP_LOG_BIN;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-24  8:37:04
