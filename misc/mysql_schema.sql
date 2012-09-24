-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE IF NOT EXISTS `jobs` (
  `_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `path` varchar(512) NOT NULL,
  `payload` varchar(512) NOT NULL,
  `host` varchar(512) NOT NULL,
  `port` int(11) NOT NULL,
  `receiver_id` int(10) unsigned NOT NULL,
  `timeout` int(11) NOT NULL,
  `status` varchar(512) NOT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Table structure for table `receivers`
--

CREATE TABLE IF NOT EXISTS `receivers` (
  `_id` int(10) unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(512) NOT NULL,
  `host` varchar(512) NOT NULL,
  `ip` varchar(512) DEFAULT NULL,
  `port` int(11) NOT NULL,
  `concurrency` int(11) NOT NULL,
  PRIMARY KEY (`_id`)
) ENGINE=MyISAM  DEFAULT CHARSET=latin1;
