-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Jan 16, 2026 at 09:12 AM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.0.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `customer-service`
--

-- --------------------------------------------------------

--
-- Table structure for table `appointments`
--

CREATE TABLE `appointments` (
  `id` int(11) NOT NULL,
  `customer_id` int(11) DEFAULT NULL,
  `appointment_date` date DEFAULT NULL,
  `appointment_time` time DEFAULT NULL,
  `status` enum('pending','confirmed','completed') DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointments`
--

INSERT INTO `appointments` (`id`, `customer_id`, `appointment_date`, `appointment_time`, `status`) VALUES
(108, 12, '2026-01-15', '09:00:00', 'pending'),
(109, 13, '2026-01-20', '10:00:00', 'pending'),
(110, 14, '2026-01-16', '13:00:00', 'pending'),
(111, 15, '2026-01-17', '13:00:00', 'pending'),
(112, 14, '2026-01-17', '08:00:00', 'pending');

-- --------------------------------------------------------

--
-- Table structure for table `appointment_details`
--

CREATE TABLE `appointment_details` (
  `id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `purpose` varchar(100) DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `meeting_mode` enum('walk-in','office-visit','online') DEFAULT 'walk-in'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointment_details`
--

INSERT INTO `appointment_details` (`id`, `appointment_id`, `purpose`, `amount`, `meeting_mode`) VALUES
(1, 108, 'personal', 5000.00, 'walk-in'),
(2, 109, 'personal', 500000.00, 'walk-in'),
(3, 110, 'personal', 5000.00, 'walk-in'),
(4, 111, 'tuition', 30000.00, 'walk-in'),
(5, 112, 'business', 100000.00, 'walk-in');

-- --------------------------------------------------------

--
-- Table structure for table `appointment_notes`
--

CREATE TABLE `appointment_notes` (
  `id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `note` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointment_notes`
--

INSERT INTO `appointment_notes` (`id`, `appointment_id`, `note`, `created_at`) VALUES
(1, 111, 'Para sa iyang tuition sa school sa CTU Barili Campus.', '2026-01-16 05:54:51');

-- --------------------------------------------------------

--
-- Table structure for table `appointment_status`
--

CREATE TABLE `appointment_status` (
  `id` int(11) NOT NULL,
  `appointment_id` int(11) NOT NULL,
  `status` enum('pending','contacted','approved','declined','completed') DEFAULT 'pending',
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `appointment_status`
--

INSERT INTO `appointment_status` (`id`, `appointment_id`, `status`, `updated_at`) VALUES
(1, 108, 'pending', '2026-01-14 06:02:39'),
(2, 109, 'pending', '2026-01-14 06:16:03'),
(3, 110, 'pending', '2026-01-15 03:32:17'),
(4, 111, 'pending', '2026-01-16 05:54:51'),
(5, 112, 'pending', '2026-01-16 06:32:36');

-- --------------------------------------------------------

--
-- Table structure for table `customers`
--

CREATE TABLE `customers` (
  `id` int(11) NOT NULL,
  `name` varchar(100) DEFAULT NULL,
  `contact` varchar(255) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `customer_type` enum('New','Old') DEFAULT NULL,
  `created_at` date NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `customers`
--

INSERT INTO `customers` (`id`, `name`, `contact`, `address`, `email`, `customer_type`, `created_at`) VALUES
(12, 'Rodel John Aspera', '09280641714', '', '', 'New', '0000-00-00'),
(13, 'Adrienne Amigable', '09154520163', '', '', 'New', '0000-00-00'),
(14, 'Cham Mercado', '09123456789', '', '', 'New', '0000-00-00'),
(15, 'Rodel John Aspera', '09123456789', 'Bolocboloc', 'asperarodelj@gmail.com', '', '0000-00-00');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `appointments`
--
ALTER TABLE `appointments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `customer_id` (`customer_id`);

--
-- Indexes for table `appointment_details`
--
ALTER TABLE `appointment_details`
  ADD PRIMARY KEY (`id`),
  ADD KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `appointment_notes`
--
ALTER TABLE `appointment_notes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `appointment_status`
--
ALTER TABLE `appointment_status`
  ADD PRIMARY KEY (`id`),
  ADD KEY `appointment_id` (`appointment_id`);

--
-- Indexes for table `customers`
--
ALTER TABLE `customers`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `appointments`
--
ALTER TABLE `appointments`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=113;

--
-- AUTO_INCREMENT for table `appointment_details`
--
ALTER TABLE `appointment_details`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `appointment_notes`
--
ALTER TABLE `appointment_notes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `appointment_status`
--
ALTER TABLE `appointment_status`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `customers`
--
ALTER TABLE `customers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `appointments`
--
ALTER TABLE `appointments`
  ADD CONSTRAINT `appointments_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`);

--
-- Constraints for table `appointment_details`
--
ALTER TABLE `appointment_details`
  ADD CONSTRAINT `appointment_details_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `appointment_notes`
--
ALTER TABLE `appointment_notes`
  ADD CONSTRAINT `appointment_notes_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `appointment_status`
--
ALTER TABLE `appointment_status`
  ADD CONSTRAINT `appointment_status_ibfk_1` FOREIGN KEY (`appointment_id`) REFERENCES `appointments` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
