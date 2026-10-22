<?php
defined( 'ABSPATH' ) || exit;

function nlfp_table() {
	global $wpdb;
	return $wpdb->prefix . 'nlfp_subscribers';
}

function nlfp_create_table() {
	global $wpdb;
	require_once ABSPATH . 'wp-admin/includes/upgrade.php';

	$table   = nlfp_table();
	$charset = $wpdb->get_charset_collate();

	dbDelta(
		"CREATE TABLE $table (
			id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
			email varchar(190) NOT NULL,
			first_name varchar(100) NOT NULL DEFAULT '',
			source_url varchar(255) NOT NULL DEFAULT '',
			sync_status varchar(20) NOT NULL DEFAULT 'local',
			created_at datetime NOT NULL,
			PRIMARY KEY  (id),
			UNIQUE KEY email (email)
		) $charset;"
	);

	update_option( 'nlfp_db_version', NLFP_VERSION );
}

/**
 * @return int|string|false ID do novo subscritor, 'exists' se o email já existir, false em erro.
 */
function nlfp_add_subscriber( $email, $first_name, $source_url ) {
	global $wpdb;

	$exists = $wpdb->get_var( $wpdb->prepare( 'SELECT id FROM ' . nlfp_table() . ' WHERE email = %s', $email ) );
	if ( $exists ) {
		return 'exists';
	}

	$inserted = $wpdb->insert(
		nlfp_table(),
		array(
			'email'      => $email,
			'first_name' => $first_name,
			'source_url' => $source_url,
			'created_at' => current_time( 'mysql' ),
		)
	);

	return $inserted ? (int) $wpdb->insert_id : false;
}

function nlfp_set_sync_status( $id, $status ) {
	global $wpdb;
	$wpdb->update( nlfp_table(), array( 'sync_status' => $status ), array( 'id' => (int) $id ) );
}
